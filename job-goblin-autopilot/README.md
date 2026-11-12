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

## Privacy, reliability, and guardrails

- Résumé files stay on your own computer until uploaded directly to an employer's ATS.
- Never commit your real `profile.json`, `resumes/`, or logs to a public repository.
- The public Job Goblin website keeps its uploaded résumé vault in that browser's IndexedDB. **The browser vault and local runner are separate:** you must copy your résumé files into the local runner's `resumes/` folder.
- Avoid applying indiscriminately: narrow your `targets` to jobs you're qualified for and would actually accept.
- For Greenhouse/Lever changes, required screening questions, or verification steps, manual review is necessary.
- This is an early experimental tool, not a validated production job-application service. Test in preview mode first.
