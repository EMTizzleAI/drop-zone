# 👹 Job Goblin Autopilot — local application runner

**What this does:** Job Goblin scouts job feeds or reads applications exported from the [Job Goblin Application Desk](../job-goblin.html), matches positions to a résumé in your own folder, and uses a visible Chromium browser to complete standard name/email/phone/résumé fields on **direct Greenhouse and Lever job posting pages**. It can attempt submission only when expressly enabled. The agent skips unfamiliar forms, required questions it cannot answer, and CAPTCHAs. It saves an audit log, marks submission successful only if the employer shows an explicit receipt, and avoids re-submitting confirmed/uncertain submissions.

**What this does NOT do:** It cannot apply to every job site, access your private LinkedIn/Indeed/Workday accounts, bypass anti-bot protections, answer legal/work eligibility questions for you, or run while your device is switched off. It is not affiliated with job boards or employers. Automated access may be restricted by job-site terms. **Review each employer's policies before using auto-submission.**

## Linux Mint setup (no API key required)

Install Python 3 and create a virtual environment:

```bash
cd job-goblin-autopilot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
```

Put your own PDF/DOCX/TXT résumés in a folder named `resumes`. Copy `profile.example.json` to `profile.json`, enter **accurate** contact details, and update the `targets`: job keywords, locations, and exact résumé filename for each category. Keep that profile and résumé folder **private**; `.gitignore` prevents them from being casually committed.

### First run: check everything before any submissions

Discover leads from the existing Job Goblin server proxy and open supported application forms without sending:

```bash
python agent.py --profile profile.json --resumes resumes --discover --max 5
```

Or export the queue using the **EXPORT TRACKER** button on the web page, copy the JSON to your computer, then:

```bash
python agent.py --profile profile.json --resumes resumes --queue /path/to/job-goblin-application-tracker.json --max 5
```

### Enable actual submissions (explicit opt-in per run)

Once you've verified that your profile, locations, certifications, and résumé routing are correct:

```bash
python agent.py --profile profile.json --resumes resumes --discover --max 10 --submit
```

Type `APPLY` at the confirmation prompt. The browser stays visible; supported, simple applications may be sent. **An attempt is not necessarily a submission.** The `applications.jsonl` log distinguishes `preview`, `needs-human`, `unsupported`, `error`, `uncertain` (clicked but no confirmation), and `submitted-confirmed` (explicit employer confirmation). Never report an uncertain submission as accepted, and check the employer site before retrying.

## 👹 Zero-touch mode — no approvals for individual applications

This mode is for **your own Linux Mint machine**. The public Job Goblin website is static and cannot apply to employers in the background. A local Playwright runner does the application work while the computer is **on and able to run user services**. No applications are submitted simply because you visit the webpage.

1. Complete the setup above, and copy `profile.example.json` to **private** `profile.json`. Add your real name, contact details, accurate résumé filenames, and narrow targets matching jobs you would actually accept. Put the résumé files in `resumes/`. Keep your profile and résumé files out of public GitHub.
2. Run a preview first: `python agent.py --profile profile.json --resumes resumes --discover --max 5`.
3. When ready to authorize all future *eligible* submissions without an individual approval, set `"autopilot": {"enabled": true, "daily_max": 10}` in your **private** `profile.json`. This is a one-time opt-in and daily limit, not a request for approval for every job.
4. Run a one-off unattended test: `bash run-autopilot.sh`. Or enable the daily 10 AM timer: `bash install-timer.sh`. A single unattended run can submit up to 10 supported matching applications, never more than `daily_max` confirmed/uncertain submission attempts in one UTC day. The timer is not installed or started until you execute the installer.

**Pause the robot immediately:**
```bash
systemctl --user disable --now job-goblin-autopilot.timer
```

**Check its activity:**
```bash
systemctl --user list-timers job-goblin-autopilot.timer
journalctl --user -u job-goblin-autopilot.service -n 100 --no-pager
tail -n 30 applications.jsonl
```

The runner skips applications on unsupported sites, redirects outside the ATS, unrecognized forms, human verification/CAPTCHAs, and unanswered required questions. It never invents credentials, certifications, legal answers, work authorization, or eligibility. A click without an explicit ATS receipt is logged **uncertain**, never as submitted. Entries marked uncertain are not automatically retried.

**Important limits:** This runner currently only fills direct **Greenhouse or Lever** postings that it can recognize. Other job platforms can be queued but are not auto-submitted. Some supported sites may prohibit automated access or change their forms. Respect their terms; stop using automation if a service disallows it. The discovery feed may miss jobs and does not guarantee a minimum hourly pay. No laptop, no local setup, no auto-applications.

**Test guardrails** after installing requirements:
```bash
python -m unittest discover -s tests
```

## Privacy, reliability, and guardrails

- Résumé files stay on your own computer until uploaded directly to an employer's ATS.
- Never commit your real `profile.json`, `resumes/`, or logs to a public repository.
- The public Job Goblin website keeps its uploaded résumé vault in that browser's IndexedDB. **The browser vault and local runner are separate:** you must copy your résumé files into the local runner's `resumes/` folder.
- Avoid applying indiscriminately: narrow your `targets` to jobs you're qualified for and would actually accept.
- For Greenhouse/Lever changes, required screening questions, or verification steps, manual review is necessary.
- This is an early experimental tool, not a validated production job-application service. Test in preview mode first.
