#!/usr/bin/env python3
"""One-job, human-completed River AI application assistant.

Opens the genuine Greenhouse posting in a *visible local browser*, fills only
known personal fields from profile.json, attaches Technical_Resume.pdf and
stops. The applicant must review and finish the required questions and click
Submit herself. This script NEVER clicks the submit button.
"""
from __future__ import annotations

import json
from pathlib import Path
import sys

from playwright.sync_api import sync_playwright

from agent import fill_application, has_challenge, has_confirmation, host_kind

JOB_URL = "https://job-boards.greenhouse.io/riverai/jobs/4480720009"
ROOT = Path(__file__).resolve().parent
PROFILE = ROOT / "profile.json"
RESUME = ROOT / "resumes" / "Technical_Resume.pdf"


def main():
    print("\nJOB GOBLIN // ONE-POSTING ASSISTED APPLICATION")
    print("Employer: River AI; role: Data Center Operations Technician")
    print("Automatic submission: OFF. You will submit manually after review.")
    if not PROFILE.is_file():
        sys.exit("Missing private profile.json in job-goblin-autopilot/")
    if not RESUME.is_file():
        sys.exit("Missing resumes/Technical_Resume.pdf")
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))
    if not all(profile.get(field) for field in ("first_name", "last_name", "email")):
        sys.exit("Private profile lacks a first name, last name, or email. No browser opened.")
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        try:
            page = browser.new_page()
            page.goto(JOB_URL, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(1600)
            if host_kind(page.url) != "greenhouse":
                sys.exit("Posting redirected off Greenhouse. Nothing uploaded.")
            if has_challenge(page):
                print("Human verification present. Complete it yourself before proceeding.")
                input("Press Enter to continue if you completed the challenge...")
                if has_challenge(page):
                    sys.exit("Verification is still present; not uploading applicant details.")
            filled = fill_application(page, profile, RESUME)
            print("Basic fields:", ", ".join(k for k, success in filled.items() if success) or "none")
            print("Review the visible form before submission. Complete all mandatory items,")
            print("including education, city, recent employer/title, three real projects,")
            print("work authorization and visa sponsorship. Answer truthfully.")
            print("This helper WILL NOT press Submit or invent any answers.")
            print("Do not close the terminal while using the browser.")
            input("\nAfter YOU click Submit in the browser, press Enter here to check the receipt...")
            try:
                if has_confirmation(page):
                    print("Confirmed: Greenhouse displayed an application receipt.")
                else:
                    print("No receipt confirmed; check the employer page/email manually.")
            except Exception:
                print("Could not confirm submission. Check the employer page/email.")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
