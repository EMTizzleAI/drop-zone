#!/usr/bin/env python3
"""Job Goblin Cloud: AES-GCM vault, strict ATS allowlisting, durable encrypted ledger.

Only for the account owner's scheduled GitHub Actions run. Personal profile and
resumes are not in plaintext in Git, Actions artifacts, or console logs.
"""
from __future__ import annotations
import argparse
import base64
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import traceback
import zipfile
from datetime import datetime, timezone
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

VAULT_AAD = b"job-goblin-cloud-vault-v1"
LEDGER_AAD = b"job-goblin-cloud-ledger-v1"
MAGIC = b"JGC1"

def decode_secret(secret: str) -> bytes:
    key=bytes.fromhex(secret.strip())
    if len(key)!=32: raise ValueError("GOBLIN_VAULT_KEY must be 64 hexadecimal characters")
    return key

def decrypt_blob(ascii_blob: str, key: bytes, aad: bytes) -> bytes:
    blob=base64.b64decode(ascii_blob.strip(),validate=True)
    if not blob.startswith(MAGIC) or len(blob)<32:raise ValueError("Wrong encrypted file format")
    return AESGCM(key).decrypt(blob[4:16],blob[16:],aad)

def encrypt_blob(plain: bytes,key:bytes,aad:bytes) -> str:
    nonce=secrets.token_bytes(12)
    return base64.b64encode(MAGIC+nonce+AESGCM(key).encrypt(nonce,plain,aad)).decode("ascii")

def git(*args, cwd: Path):
    subprocess.run(["git", *args],cwd=str(cwd),check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)

def save_ledger(ledger_path: Path, ledger:dict,key:bytes):
    """Fail CLOSED: no application can proceed unless we persist its reservation."""
    ledger_path.write_text(encrypt_blob(json.dumps(ledger,sort_keys=True).encode(),key,LEDGER_AAD)+"\n")
    branch=ledger_path.parent
    git("add",ledger_path.name,cwd=branch)
    git("-c","user.name=job-goblin[bot]","-c","user.email=job-goblin@users.noreply.github.com",
        "commit","-m","Job Goblin encrypted application state",cwd=branch)
    git("push","origin","HEAD:job-goblin-state",cwd=branch)

def effective_run_mode(profile, requested):
    """Discovery remains available without permission to send applications."""
    settings=profile.get("autopilot") or {}
    if not isinstance(settings,dict):
        return "preview",0
    cap=settings.get("daily_max",0)
    if requested=="apply" and settings.get("enabled") is True:
        if type(cap) is not int or not 1<=cap<=10:
            raise ValueError("Cloud daily_max must be an integer between 1 and 10")
        return "apply",cap
    return "preview",0

def run(args):
    key=decode_secret(os.environ["GOBLIN_VAULT_KEY"])
    body=decrypt_blob(Path(args.vault).read_text(),key,VAULT_AAD)
    ledger_path=Path(args.ledger)
    ledger=json.loads(decrypt_blob(ledger_path.read_text(),key,LEDGER_AAD)) if ledger_path.exists() and ledger_path.read_text().strip() else {"applications":{}}
    records=ledger.setdefault("applications",{})
    with tempfile.TemporaryDirectory(prefix="goblin-cloud-") as tmp:
        root=Path(tmp)
        with zipfile.ZipFile(io.BytesIO(body)) as zf:
            for item in zf.infolist():
                dest=(root/item.filename).resolve()
                if not dest.is_relative_to(root.resolve()):raise ValueError("Unsafe bundle path")
                if item.is_dir(): dest.mkdir(parents=True,exist_ok=True);continue
                dest.parent.mkdir(parents=True,exist_ok=True)
                dest.write_bytes(zf.read(item))
        profile=json.loads((root/"profile.json").read_text())
        resumes=root/"resumes"
        if not resumes.is_dir():raise ValueError("Missing resumes in private bundle")
        mode, daily_cap = effective_run_mode(profile, args.mode)
        if args.mode=="apply" and mode=="preview":
            print("Automatic submissions disabled: running discovery-only instead. No applications will be sent.")
        sys.path.insert(0,str(Path(args.agent_dir).resolve()))
        import agent
        import ats_discovery
        from playwright.sync_api import sync_playwright
        feed_output=io.StringIO()
        with contextlib.redirect_stdout(feed_output):
            jobs=agent.discover(profile)
        feed_failures=feed_output.getvalue().count("Feed unavailable:")
        print(f"General feed: {len(jobs)} matched leads; {feed_failures} unavailable target searches.")
        direct, ats_stats=ats_discovery.discover(profile)
        print(f"Employer ATS feeds: {ats_stats['boards_ok']}/{ats_stats['boards_checked']} available; "
              f"{ats_stats['published_posts']} open postings checked; "
              f"{ats_stats['title_matches']} title matches; "
              f"{ats_stats['location_rejections']} filtered by location; "
              f"{ats_stats['matched_posts']} target-matched leads.")
        jobs.extend(direct)
        # Deduplicate and limit to direct Greenhouse/Lever, matching configured resume files.
        eligible=[];seen=set()
        for job in jobs:
            u=job.get("url","")
            if not u.startswith("https://") or agent.host_kind(u) not in ("greenhouse","lever"):continue
            if u in seen:continue
            seen.add(u)
            r=agent.choose_resume(job,profile,resumes)
            if r is not None: eligible.append((job,r))
        print(f"Discovery complete: {len(jobs)} leads; {len(eligible)} supported ATS leads with matching resumes.")
        if mode=="preview":
            new_leads=[(job,resume) for job,resume in eligible
                       if hashlib.sha256(job["url"].encode()).hexdigest() not in records]
            print(f"Preview only: {len(new_leads)} eligible new leads; no forms submitted.")
            print(f"Found {len(jobs)} total matched leads, including listings requiring manual application.")
            # These are PUBLIC job-board details only. Never log applicant data,
            # private profile fields, decrypted vault content or form responses.
            def public_label(value):
                return " ".join(str(value or "").split())[:110]
            for index,(job,resume) in enumerate(new_leads[:10],start=1):
                print(f"REVIEW LEAD {index}: "
                      f"{public_label(job.get('title'))} | "
                      f"{public_label(job.get('company'))} | "
                      f"{public_label(job.get('location'))} | "
                      "matching resume available")
                print("PUBLIC JOB LINK:",job["url"])
            if len(new_leads)>10:
                print(f"Additional matching postings not displayed: {len(new_leads)-10}")
            # Show non-automatable public leads too, without applicant details.
            # This is especially important for hospital career portals.
            manual_seen=set()
            eligible_urls={job["url"] for job,_ in eligible}
            manual_count=0
            for job in jobs:
                url=job.get("url","")
                from urllib.parse import urlsplit
                try:
                    parsed=urlsplit(url)
                    valid=parsed.scheme=="https" and parsed.hostname and not parsed.username and not parsed.password
                except ValueError:
                    valid=False
                if not valid or url in eligible_urls or url in manual_seen:
                    continue
                manual_seen.add(url)
                if manual_count<15:
                    manual_count+=1
                    print(f"MANUAL LEAD {manual_count}: "
                          f"{public_label(job.get('title'))} | "
                          f"{public_label(job.get('company'))} | "
                          f"{public_label(job.get('location'))}")
                    # Strip query/fragment to avoid printing tracking tokens or private identifiers.
                    print("PUBLIC JOB PAGE:",parsed._replace(query="",fragment="").geturl())
            print(f"Manual review leads: {len(manual_seen)}; displayed {manual_count}.")
            print("Listing matches are leads, not verified application-form compatibility.")
            return
        today=datetime.now(timezone.utc).date().isoformat()
        past_today=sum(1 for x in records.values() if x.get("date","").startswith(today))
        remaining=max(0,daily_cap-past_today)
        if not remaining:
            print("Daily limit already reached; no applications attempted.");return
        attempted=0;confirmed=0;uncertain=0;needs_human=0
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True, args=["--no-sandbox"])
            context=browser.new_context(accept_downloads=False)
            page=context.new_page()
            for job,resume in eligible:
                if attempted>=remaining:break
                job_id=hashlib.sha256(job["url"].encode()).hexdigest()
                if job_id in records:continue
                # Persist BEFORE opening/applying so a crash won't cause a duplicate submission.
                entry={"date":datetime.now(timezone.utc).isoformat(),"status":"reserved", "title":job.get("title"),
                       "company":job.get("company"),"url":job.get("url"),"resume":resume.name}
                records[job_id]=entry
                save_ledger(ledger_path,ledger,key)
                attempted+=1
                try:
                    with contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
                        status,detail=agent.try_apply(page,job,profile,resume,True)
                except Exception as e:
                    status="error";detail=(type(e).__name__+": "+str(e))[:400]
                entry.update(status=status,detail=detail,finished_at=datetime.now(timezone.utc).isoformat())
                save_ledger(ledger_path,ledger,key)
                confirmed+=(status=="submitted-confirmed")
                uncertain+=(status=="uncertain")
                needs_human+=(status in ("needs-human","error","unsupported"))
            browser.close()
        print(f"Run finished: {attempted} reserved; {confirmed} confirmed; {uncertain} uncertain; {needs_human} needing review.")
        print("Private details exist only in encrypted state. Uncertain submissions are NEVER retried automatically.")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--vault",required=True)
    ap.add_argument("--ledger",required=True)
    ap.add_argument("--agent-dir",required=True)
    ap.add_argument("--mode",required=True,choices=["preview","apply"])
    args=ap.parse_args()
    try:
        run(args)
    except Exception as e:
        # Public GitHub Actions job logs must not contain candidate details, resume text, applicant PII, or URLs.
        print("Job Goblin failed closed:",type(e).__name__)
        sys.exit(1)

if __name__=="__main__":main()
