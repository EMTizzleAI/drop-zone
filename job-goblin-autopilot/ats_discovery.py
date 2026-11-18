"""Small, read-only discovery from public employer Greenhouse job-board APIs.

Only postings published by the ATS are returned. The caller still validates form
hosts and resumes; this module does not apply to jobs or handle applicant data.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import re
from urllib.parse import urlparse
from urllib.request import Request, urlopen

# Curated employer boards with roles near the user's job-search areas.
# This is a supplemental source, NOT a comprehensive US job search.
BOARDS = {
    "life360": "Life360",
    "doordashusa": "DoorDash",
    "sustainabletalent": "Sustainable Talent",
    "kodiak": "Kodiak",
    "skildai-careers": "Skild AI",
    "astropakllc": "Astro Pak",
    "ultimagenomics": "Ultima Genomics",
    "scaleai": "Scale AI",
    "aspectbiosystems": "Aspect Biosystems",
    "alamarbiosciences": "Alamar Biosciences",
    "riverai": "River AI",
    "spacex": "SpaceX",
}

def _valid_application_url(value):
    if not isinstance(value, str):
        return False
    try:
        url = urlparse(value)
        host = url.hostname or ""
        return (url.scheme == "https" and
                (host == "greenhouse.io" or host.endswith(".greenhouse.io")))
    except ValueError:
        return False

def _fetch_board(slug, company, timeout=13):
    if not re.fullmatch(r"[a-z0-9-]{2,80}", slug):
        return []
    url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs"
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "JobGoblin/0.2 (individual job seeker)"})
    with urlopen(request, timeout=timeout) as response:
        payload = json.load(response)
    if not isinstance(payload.get("jobs"), list):
        raise ValueError("Unexpected ATS response")
    jobs = []
    for item in payload["jobs"][:1200]:
        if not isinstance(item, dict):
            continue
        link = item.get("absolute_url", "")
        if not _valid_application_url(link):
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        location = item.get("location") or {}
        where = location.get("name", "") if isinstance(location, dict) else ""
        jobs.append({"title": title, "company": str(item.get("company_name") or company),
                     "location": str(where or ""), "url": link})
    return jobs

def _matches(job, target):
    title = job["title"].casefold()
    terms = target.get("match_any") or [target.get("role", "")]
    if not any(str(term).strip().casefold() in title for term in terms if str(term).strip()):
        return False
    allowed = target.get("locations") or []
    if allowed and not any(str(place).strip().casefold() in job["location"].casefold()
                           for place in allowed if str(place).strip()):
        return False
    return True

def discover(profile, boards=None):
    """Returns (deduplicated target-matched leads, non-sensitive source statistics)."""
    selected = boards if boards is not None else BOARDS
    stats = {"boards_checked": len(selected), "boards_ok": 0,
             "boards_failed": 0, "published_posts": 0, "matched_posts": 0}
    all_jobs = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        tasks = {pool.submit(_fetch_board, slug, company): slug
                 for slug, company in selected.items()}
        for task in as_completed(tasks):
            try:
                batch = task.result()
            except Exception:
                stats["boards_failed"] += 1
                continue
            stats["boards_ok"] += 1
            stats["published_posts"] += len(batch)
            all_jobs.extend(batch)
    out = []
    seen = set()
    for job in all_jobs:
        if any(_matches(job, target) for target in profile.get("targets", [])):
            if job["url"] not in seen:
                seen.add(job["url"])
                out.append(job)
    stats["matched_posts"] = len(out)
    return out, stats
