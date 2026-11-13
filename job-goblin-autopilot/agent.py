#!/usr/bin/env python3
"""Job Goblin Autopilot (local Linux runner).

Discovers leads via your existing Job Goblin proxy or imports its exported tracker.
Matches each role to a local resume. Fills simple Greenhouse and Lever application
forms using Playwright. Does not bypass CAPTCHA, logins, screening questions, or
site protections; never records "submitted" without a visible confirmation.

Run without --submit to preview and test form filling. Use --submit deliberately
only after configuring the profile and targets for truthful, relevant submissions.
"""
from __future__ import annotations
import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

PROXY = "https://pantry-goblin.vercel.app/api/jobs"
SUCCESS_PHRASES = [
    "thank you for applying", "application submitted", "application received",
    "we've received your application", "thanks for applying",
    "your application has been submitted", "your application was submitted",
]
CHALLENGE_PHRASES = ["captcha", "verify you are human", "cloudflare challenge", "security check"]
TIMEOUT = 25_000


def now():
    return datetime.now(timezone.utc).isoformat()


def text(value):
    return str(value or "").strip()


def host_kind(url):
    host = urlparse(url).hostname or ""
    if host == "greenhouse.io" or host.endswith(".greenhouse.io"):
        return "greenhouse"
    if host == "lever.co" or host.endswith(".lever.co"):
        return "lever"
    return ""


def get_json(url):
    req = Request(url, headers={"User-Agent": "JobGoblinAutopilot/0.1 (individual job seeker)"})
    with urlopen(req, timeout=22) as response:
        return json.load(response)


def discover(profile):
    leads = []
    for target in profile.get("targets", []):
        role = text(target.get("role"))
        location = text(target.get("location"))
        if not role:
            continue
        query = PROXY + "?" + urlencode({"q": role, "location": location})
        print("SCOUT:", role, "/", location)
        try:
            jobs = get_json(query).get("jobs", [])
        except Exception as exc:
            print("  Feed unavailable:", exc)
            continue
        terms = [s.lower() for s in target.get("match_any", []) if s]
        if not terms:
            terms = [role.lower()]
        for j in jobs:
            url = text(j.get("url"))
            title = text(j.get("title"))
            company = text(j.get("company"))
            where = text(j.get("location"))
            if not url.startswith("https://") or not title:
                continue
            if not any(t in title.lower() for t in terms):
                continue
            # Location must match when a target explicitly restricts it.
            allowed = [s.lower() for s in target.get("locations", []) if s]
            if allowed and not any(s in where.lower() for s in allowed):
                continue
            leads.append({"title": title, "company": company, "location": where,
                          "url": url, "resume": text(target.get("resume"))})
        time.sleep(2)  # respectful feed polling
    seen = set()
    out = []
    for job in leads:
        if job["url"] not in seen:
            seen.add(job["url"])
            out.append(job)
    return out


def import_queue(path):
    source = json.loads(path.read_text(encoding="utf-8"))
    queue = source.get("applications", source.get("queue", []))
    out = []
    for job in queue:
        obj = job.get("job", job)
        url = text(obj.get("url"))
        if url.startswith("https://"):
            out.append({"title": text(obj.get("title")), "company": text(obj.get("company")),
                        "location": text(obj.get("location")), "url": url})
    return out


def choose_resume(job, profile, resumes_dir):
    explicit = text(job.get("resume"))
    if explicit:
        file = (resumes_dir / explicit).resolve()
        if file.is_file() and file.parent == resumes_dir.resolve():
            return file
    haystack = (job.get("title", "") + " " + job.get("company", "")).lower()
    for target in profile.get("targets", []):
        matches = [s.lower() for s in target.get("match_any", []) if s]
        if not matches:
            matches = [text(target.get("role")).lower()]
        if any(term and term in haystack for term in matches):
            file = (resumes_dir / text(target.get("resume"))).resolve()
            if file.is_file() and file.parent == resumes_dir.resolve():
                return file
    return None


def first_match(page, selectors):
    for selector in selectors:
        try:
            nodes = page.locator(selector)
            if nodes.count() and nodes.first.is_visible():
                return nodes.first
        except Exception:
            pass
    return None


def fill_field(page, selectors, value):
    if not value:
        return False
    control = first_match(page, selectors)
    if control is None:
        return False
    try:
        control.fill(value, timeout=4000)
        return True
    except Exception:
        return False


def upload_resume(page, resume):
    # Only fill the first resume-type input. Never upload to an unknown domain.
    fields = ['input[type="file"][name*="resume" i]',
              'input[type="file"][id*="resume" i]',
              'input[type="file"][name*="cv" i]',
              'input[type="file"]']
    for selector in fields:
        node = first_match(page, [selector])
        # Hidden input[type=file] is normal for ATS file uploader.
        if node is None:
            try:
                node = page.locator(selector).first if page.locator(selector).count() else None
            except Exception:
                node = None
        if node:
            try:
                node.set_input_files(str(resume), timeout=10_000)
                return True
            except Exception:
                continue
    return False


def maybe_open_apply_form(page):
    # Some ATS list a "Apply" anchor before showing an application.
    if page.locator('input[type="email"]').count() or page.locator('input[name="email"]').count():
        return
    for label in ["Apply for this job", "Apply now", "Apply"]:
        try:
            candidate = page.get_by_role("link", name=label, exact=False)
            if candidate.count():
                candidate.first.click(timeout=3000)
                page.wait_for_timeout(750)
                return
        except Exception:
            pass


def fill_application(page, profile, resume):
    given = text(profile.get("first_name"))
    family = text(profile.get("last_name"))
    full = (given + " " + family).strip()
    completed = {}
    completed["name"] = fill_field(page,
        ['input[name="name"]', 'input[name="full_name"]',
         'input[id="name"]', 'input[autocomplete="name"]'], full)
    if not completed["name"]:
        completed["first"] = fill_field(page,
            ['input[name="first_name"]', 'input[id="first_name"]',
             'input[autocomplete="given-name"]'], given)
        completed["last"] = fill_field(page,
            ['input[name="last_name"]', 'input[id="last_name"]',
             'input[autocomplete="family-name"]'], family)
    completed["email"] = fill_field(page,
        ['input[type="email"]', 'input[name="email"]',
         'input[autocomplete="email"]'], text(profile.get("email")))
    completed["phone"] = fill_field(page,
        ['input[type="tel"]', 'input[name="phone"]',
         'input[autocomplete="tel"]'], text(profile.get("phone")))
    completed["linkedin"] = fill_field(page,
        ['input[name*="linkedin" i]', 'input[id*="linkedin" i]'], text(profile.get("linkedin")))
    completed["website"] = fill_field(page,
        ['input[name*="website" i]', 'input[id*="website" i]',
         'input[name*="portfolio" i]'], text(profile.get("website")))
    completed["resume"] = upload_resume(page, resume)
    return completed


def has_challenge(page):
    try:
        body = page.locator("body").inner_text(timeout=3000).lower()
        return any(s in body for s in CHALLENGE_PHRASES) or page.locator('iframe[src*="recaptcha"],iframe[src*="hcaptcha"]').count() > 0
    except Exception:
        return False


def has_confirmation(page):
    try:
        body = page.locator("body").inner_text(timeout=8000).lower()
        return any(s in body for s in SUCCESS_PHRASES)
    except Exception:
        return False


def safe_to_submit(page):
    # Don't guess answers to legal/work authorization, demographic, or
    # other additional questions. Only submit simple standard forms.
    try:
        required = page.locator('input[required]:not([type="hidden"]), select[required], textarea[required]')
        for i in range(min(required.count(), 50)):
            node = required.nth(i)
            kind = node.get_attribute("type") or ""
            if kind in ("checkbox", "radio"):
                # Explicit consent and screening answers must be user-entered.
                if not node.is_checked():
                    return False, "Unanswered required checkbox/radio (human review)"
            elif node.evaluate("(e) => !(e.value || '').trim()"):
                return False, "Unanswered required question (human review)"
    except Exception:
        return False, "Unable to inspect form fields"
    return True, ""


def try_apply(page, job, profile, resume, submit):
    url = job["url"]
    if host_kind(url) not in ("greenhouse", "lever"):
        return "unsupported", "Autofill only supports direct Greenhouse/Lever posting links"
    expected_kind = host_kind(url)
    page.goto(url, wait_until="domcontentloaded", timeout=TIMEOUT)
    page.wait_for_timeout(1600)
    maybe_open_apply_form(page)
    # Never upload a private resume if a posting redirects to a different host.
    if host_kind(page.url) != expected_kind:
        return "unsupported", "Application moved outside the verified ATS; resume not uploaded"
    if has_challenge(page):
        return "needs-human", "Human verification present; no CAPTCHA bypass"
    fields = fill_application(page, profile, resume)
    has_name = fields.get("name") or (fields.get("first") and fields.get("last"))
    if not has_name or not fields.get("email") or not fields.get("resume"):
        return "needs-human", "Name, email, or résumé field not recognized: " + str(fields)
    if not submit:
        return "preview", "Fields filled in local browser; no application submitted"
    okay, why = safe_to_submit(page)
    if not okay:
        return "needs-human", why
    # Only submit a standard ATS form. Never consent to a checkbox or
    # invent an answer to work authorization / salary / eligibility questions.
    selectors = [
        'button[type="submit"]', 'input[type="submit"]',
        'button:has-text("Submit Application")', 'button:has-text("Submit")',
    ]
    button = first_match(page, selectors)
    if button is None:
        return "needs-human", "Submit button not recognized"
    button.click(timeout=10000)
    page.wait_for_timeout(2500)
    if has_confirmation(page):
        return "submitted-confirmed", "ATS displayed an application receipt"
    return "uncertain", "Submit clicked but no receipt confirmed; check employer portal before retrying"


def main():
    cli = argparse.ArgumentParser(description="Job Goblin local application autopilot")
    cli.add_argument("--profile", required=True, type=Path, help="private profile JSON")
    cli.add_argument("--resumes", required=True, type=Path, help="local résumé folder")
    cli.add_argument("--queue", type=Path, help="optional exported Job Goblin application JSON")
    cli.add_argument("--discover", action="store_true", help="search public feeds using configured targets")
    cli.add_argument("--submit", action="store_true", help="actually submit eligible ATS forms")
    cli.add_argument("--unattended", action="store_true", help="no per-run prompt; requires autopilot.enabled=true in private profile")
    cli.add_argument("--max", type=int, default=10, help="max leads processed (default: 10)")
    cli.add_argument("--log", type=Path, default=Path("applications.jsonl"))
    args = cli.parse_args()
    if not args.queue and not args.discover:
        cli.error("Provide --queue export.json or --discover")
    profile = json.loads(args.profile.read_text(encoding="utf-8"))
    if args.unattended and not args.submit:
        cli.error("--unattended is only for real submissions; use ordinary preview mode without it")
    if args.submit:
        if args.unattended:
            # Persistent, explicit opt-in replaces a prompt for every application/run.
            if profile.get("autopilot", {}).get("enabled") is not True:
                sys.exit("Unattended submission disabled. Set autopilot.enabled=true in your private profile.json.")
            print("UNATTENDED AUTO-SUBMIT ENABLED: only matching, supported simple ATS forms.")
        else:
            print("AUTO-SUBMIT ENABLED: eligible simple ATS forms may be sent to employers.")
            if input("Type APPLY to authorize this run: ").strip() != "APPLY":
                print("Canceled.")
                return
    if not all(text(profile.get(k)) for k in ("first_name","last_name","email")):
        sys.exit("Profile must contain your real first_name, last_name and email.")
    if not args.resumes.is_dir():
        sys.exit("Résumés directory missing.")
    jobs = []
    if args.queue:
        jobs += import_queue(args.queue)
    if args.discover:
        jobs += discover(profile)
    previously = set()
    submitted_today = 0
    if args.log.exists():
        for line in args.log.read_text(encoding="utf-8").splitlines():
            try:
                obj = json.loads(line)
                if obj.get("status") in ("submitted-confirmed", "uncertain"):
                    previously.add(obj.get("url"))
                    if str(obj.get("date", "")).startswith(now()[:10]):
                        submitted_today += 1
            except ValueError:
                pass
    today_remaining = max(1, args.max)
    if args.unattended:
        try:
            daily_max = int(profile.get("autopilot", {}).get("daily_max", 10))
        except (ValueError, TypeError):
            sys.exit("autopilot.daily_max must be an integer.")
        if not 1 <= daily_max <= 50:
            sys.exit("autopilot.daily_max must be between 1 and 50.")
        today_remaining = min(today_remaining, max(0, daily_max - submitted_today))
        if today_remaining == 0:
            print("Daily application cap reached. No submissions will be attempted today.")
            return
    seen = set()
    jobs = [j for j in jobs if not (j["url"] in seen or seen.add(j["url"]))]
    print("Candidates:", len(jobs), "| max this run:", today_remaining if args.unattended else args.max,
          "| submit:", args.submit, "| unattended:", args.unattended)
    processed = 0
    with sync_playwright() as pw, args.log.open("a", encoding="utf-8") as log:
        browser = pw.chromium.launch(headless=args.unattended, slow_mo=0 if args.unattended else 100)
        context = browser.new_context(accept_downloads=False)
        page = context.new_page()
        for job in jobs:
            if processed >= (today_remaining if args.unattended else max(1, args.max)):
                break
            url = job.get("url", "")
            if url in previously:
                print("SKIP duplicate submission:", job.get("title"));continue
            if host_kind(url) == "":
                print("SKIP unsupported ATS:", url);continue
            resume = choose_resume(job, profile, args.resumes)
            if not resume:
                print("SKIP no matching résumé:", job.get("title"));continue
            processed += 1
            print("ATTEMPT", processed, job.get("title"), "|", resume.name)
            try:
                status, info = try_apply(page, job, profile, resume, args.submit)
            except (PlaywrightTimeoutError, Exception) as exc:
                status, info = "error", str(exc)[:400]
            log.write(json.dumps({"date": now(), "title": job.get("title"),
                                  "company": job.get("company"), "url": url,
                                  "resume": resume.name, "status": status,
                                  "detail": info}) + "\n")
            log.flush()
            print("  =>", status, "|", info)
            time.sleep(3)  # avoid rapid-fire submissions
        print("Done. Review", args.log)
        browser.close()


if __name__ == "__main__":
    main()
