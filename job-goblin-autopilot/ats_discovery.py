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

# Narrow, interchangeable job-title wording. These do not override a target's
# location or résumé choice; they only recognize alternate titles in that domain.
TITLE_ALIASES = (
    (("emergency medical technician", "emt", "er tech", "emergency room technician"),
     ("emergency medical technician", "emt", "emergency department technician",
      "emergency room technician", "er tech", "ed tech")),
    (("data center", "datacenter", "hardware technician", "it technician"),
     ("data center technician", "datacenter technician", "data center operations technician",
      "data center operations specialist", "hardware technician", "hardware support technician",
      "it technician", "it support technician")),
    (("ai evaluator", "model evaluator", "ai trainer", "data annotat", "red team", "llm evaluator"),
     ("ai evaluator", "ai trainer", "model evaluator", "llm evaluator",
      "llm evaluation", "ai training specialist", "data annotator",
      "data annotation specialist", "ai data annotator", "red team")),
    (("qa tester", "quality assurance", "software tester", "game tester"),
     ("qa tester", "qa analyst", "quality assurance analyst", "quality assurance tester",
      "software tester", "game tester", "game qa tester")),
    (("robotics", "robot technician", "robot operator"),
     ("robotics technician", "robotics test technician", "robot technician",
      "robot operator", "robotics operator")),
    (("occupational health", "industrial emt"),
     ("occupational health technician", "occupational health emt", "industrial emt")),
    (("animal care", "veterinary assistant", "kennel"),
     ("animal care technician", "animal care attendant", "veterinary assistant",
      "kennel technician")),
    (("video annotat", "video label", "video review"),
     ("video annotator", "video annotation specialist", "video data annotator",
      "video labeling specialist")),
)

def _norm(value):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", str(value or "").casefold())).strip()

def _phrase_in(haystack, needle):
    query = _norm(needle)
    return bool(query) and (" " + query + " ") in (" " + _norm(haystack) + " ")

def _title_match(job, target):
    terms = [target.get("role", "")] + list(target.get("match_any") or [])
    if any(_phrase_in(job["title"], term) for term in terms):
        return True
    descriptor = " ".join(str(t or "") for t in terms)
    for triggers, aliases in TITLE_ALIASES:
        if any(_phrase_in(descriptor, trigger) for trigger in triggers):
            if any(_phrase_in(job["title"], alias) for alias in aliases):
                return True
    return False

def _location_match(job, target):
    allowed = target.get("locations") or []
    if not allowed:
        return True
    where = job.get("location", "")
    if any(_phrase_in(where, place) for place in allowed):
        return True
    # ATS listings vary between "US", "USA" and "United States".
    us = {"us", "usa", "united states", "united states of america"}
    if any(_norm(place) in us for place in allowed) and any(_phrase_in(where, alias) for alias in us):
        return True
    return False

def _matches(job, target):
    return _title_match(job, target) and _location_match(job, target)

def discover(profile, boards=None):
    """Returns (deduplicated target-matched leads, non-sensitive source statistics)."""
    selected = boards if boards is not None else BOARDS
    stats = {"boards_checked": len(selected), "boards_ok": 0,
             "boards_failed": 0, "published_posts": 0, "title_matches": 0,
             "location_rejections": 0, "matched_posts": 0}
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
        matching_targets = [target for target in profile.get("targets", [])
                            if _title_match(job, target)]
        if not matching_targets:
            continue
        stats["title_matches"] += 1
        eligible_targets = [target for target in matching_targets if _location_match(job, target)]
        if not eligible_targets:
            stats["location_rejections"] += 1
            continue
        if job["url"] in seen:
            continue
        seen.add(job["url"])
        # Keep the user's category-specific résumé from the matching target.
        matched = dict(job)
        chosen_resume = eligible_targets[0].get("resume")
        if chosen_resume:
            matched["resume"] = chosen_resume
        out.append(matched)
    stats["matched_posts"] = len(out)
    return out, stats
