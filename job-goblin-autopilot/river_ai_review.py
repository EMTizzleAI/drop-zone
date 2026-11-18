#!/usr/bin/env python3
"""Assist with one River AI application. Never submits automatically.

Opens a visible Greenhouse page, waits for its dynamic form, fills only verified
private-profile details, and attaches the private technical résumé. The applicant
must review all information and personally submit.
"""
from __future__ import annotations

import json
from pathlib import Path
import sys

from playwright.sync_api import sync_playwright

from agent import has_challenge, has_confirmation, host_kind

JOB_URL = "https://job-boards.greenhouse.io/riverai/jobs/4480720009"
ROOT = Path(__file__).resolve().parent
PROFILE = ROOT / "profile.json"
RESUME = ROOT / "resumes" / "Technical_Resume.pdf"


def visible_fill(page, value, label, selectors):
    """Try semantic labels before exact HTML selectors; never fill unknown fields."""
    if not value:
        return False
    candidates = [
        page.get_by_label(label, exact=False).first,
        page.get_by_role("textbox", name=label, exact=False).first,
    ] + [page.locator(css).first for css in selectors]
    for node in candidates:
        try:
            if node.count() and node.is_visible():
                node.fill(str(value), timeout=5000)
                node.press("Tab", timeout=3000)
                return True
        except Exception:
            continue
    return False


def attach_resume(page):
    """Only attach the résumé to the first résumé-specific input or first Attach button."""
    selectors = (
        'input[type="file"][name*="resume" i]',
        'input[type="file"][id*="resume" i]',
        'input[type="file"][name*="cv" i]',
        'input[type="file"][id*="cv" i]',
        'input[type="file"]',
    )
    for css in selectors:
        try:
            field = page.locator(css).first
            if field.count():
                field.set_input_files(str(RESUME), timeout=7000)
                return True
        except Exception:
            continue
    try:
        attach = page.get_by_role("button", name="Attach", exact=True).first
        if attach.count() and attach.is_visible():
            with page.expect_file_chooser(timeout=6000) as picker:
                attach.click()
            picker.value.set_files(str(RESUME))
            return True
    except Exception:
        pass
    return False



def find_form(page):
    """Find a visible email control in page or embedded application frames."""
    contexts = [page] + [fr for fr in page.frames if fr != page.main_frame]
    for fr in contexts:
        try:
            nodes = fr.locator('input[type="email"], input[name*="email" i], input[id*="email" i], input[autocomplete="email"]')
            if nodes.count() and nodes.first.is_visible():
                return fr
            field = fr.get_by_label("Email", exact=False)
            if field.count() and field.first.is_visible():
                return fr
        except Exception:
            continue
    return None


def wait_for_form(page, seconds=18):
    import time
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        fr = find_form(page)
        if fr is not None:
            return fr
        page.wait_for_timeout(800)
    return None


def click_apply(page):
    for kind in ("button", "link"):
        try:
            node = page.get_by_role(kind, name="Apply", exact=True).first
            if node.count() and node.is_visible():
                node.click(timeout=5000)
                return
        except Exception:
            continue


def main():
    print("\nJOB GOBLIN // RIVER AI APPLICATION ASSISTANT", flush=True)
    print("Only the real posting is opened; Goblin NEVER clicks Submit.", flush=True)
    if not PROFILE.is_file():
        sys.exit("Missing job-goblin-autopilot/profile.json")
    if not RESUME.is_file():
        sys.exit("Missing job-goblin-autopilot/resumes/Technical_Resume.pdf")
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))
    if not all(profile.get(k) for k in ("first_name", "last_name", "email")):
        sys.exit("Profile missing first name, last name, or email.")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        try:
            page = browser.new_page()
            page.goto(JOB_URL, wait_until="domcontentloaded", timeout=45000)
            if host_kind(page.url) != "greenhouse":
                sys.exit("Redirected away from Greenhouse; no applicant details entered.")
            print("Looking for the application form...", flush=True)
            click_apply(page)
            form = wait_for_form(page)
            for _ in range(3):
                if form is not None:
                    break
                print("The form isn't accessible in this browser yet.")
                try:
                    print("Page title:", page.title()[:100], " | Browser frames:", len(page.frames))
                except Exception:
                    pass
                answer = input("Complete any verification/click Apply in browser; Enter to retry or q to quit: ").strip().lower()
                if answer == "q":
                    return
                if host_kind(page.url) != "greenhouse":
                    print("Redirected off Greenhouse; no applicant details entered.")
                    return
                click_apply(page)
                form = wait_for_form(page, seconds=12)
            if form is None:
                print("No accessible form. Use your normal browser and complete it manually.")
                input("Press Enter to close this browser...")
                return
            if has_challenge(page):
                print("Verification indicators detected; handle any challenge yourself before submission.")

            fields = {
                "First name": visible_fill(form, profile["first_name"], "First Name", [
                    'input[name="first_name"]', 'input[id="first_name"]',
                    'input[name*="first_name" i]', 'input[id*="first_name" i]']),
                "Last name": visible_fill(form, profile["last_name"], "Last Name", [
                    'input[name="last_name"]', 'input[id="last_name"]',
                    'input[name*="last_name" i]', 'input[id*="last_name" i]']),
                "Email": visible_fill(form, profile["email"], "Email", [
                    'input[type="email"]', 'input[name="email"]', 'input[id="email"]']),
                "Phone": visible_fill(form, profile.get("phone"), "Phone", [
                    'input[type="tel"]', 'input[name="phone"]', 'input[id="phone"]']),
                "LinkedIn": visible_fill(form, profile.get("linkedin"), "LinkedIn Profile", [
                    'input[name*="linkedin" i]', 'input[id*="linkedin" i]']),
                "Website": visible_fill(form, profile.get("website"), "Website", [
                    'input[name*="website" i]', 'input[id*="website" i]']),
            }
            fields["Technical résumé"] = attach_resume(form)
            print("\nAUTO-FILL RESULTS (no personal values shown):", flush=True)
            for name, ok in fields.items():
                print(("  OK     " if ok else "  CHECK  ") + name, flush=True)
            if not all(fields.get(key) for key in ("First name", "Last name", "Email", "Technical résumé")):
                print("Some required basics were not recognized. Fill CHECK fields manually.")
            print("\nYou must review/fill: country and phone, city, education, employer/title,")
            print("three actual projects, work authorization and sponsorship.")
            print("Check each autofilled entry and the résumé before submitting.")
            print("No legal answers or qualifications are invented. Submit is YOUR action.")
            input("\nLeave this terminal OPEN. After YOU submit, press Enter to check receipt...")
            if has_confirmation(page):
                print("Greenhouse displayed an application receipt.")
            else:
                print("No confirmed receipt. Check page and confirmation email.")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
