"""Offline smoke tests for Job Goblin guardrails. Requires installed Playwright."""
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import agent


class AutopilotTests(unittest.TestCase):
    def test_ats_only_allows_actual_hostnames(self):
        self.assertEqual(agent.host_kind("https://boards.greenhouse.io/x/jobs/1"), "greenhouse")
        self.assertEqual(agent.host_kind("https://jobs.lever.co/example/role"), "lever")
        self.assertEqual(agent.host_kind("https://evilgreenhouse.io/x"), "")
        self.assertEqual(agent.host_kind("https://jobs.lever.co.bad.example/path"), "")
        self.assertEqual(agent.host_kind("https://example.com/jobs"), "")

    def test_resume_only_matches_private_directory(self):
        with tempfile.TemporaryDirectory() as td:
            folder = Path(td) / "resumes"
            folder.mkdir()
            (folder / "medical.pdf").write_bytes(b"%PDF-1.7\n")
            (Path(td) / "other.pdf").write_bytes(b"%PDF-1.7\n")
            profile = {"targets": [{"role": "EMT", "match_any": ["EMT"], "resume": "medical.pdf"}]}
            job = {"title": "EMT", "company": "Example"}
            self.assertEqual(agent.choose_resume(job, profile, folder).name, "medical.pdf")
            self.assertIsNone(agent.choose_resume(
                {"title": "Warehouse", "company": "Example", "resume": "../other.pdf"},
                profile, folder
            ))

    def test_duplicate_import_and_valid_queue(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "queue.json"
            p.write_text('{"applications":[{"title":"EMT","url":"https://jobs.lever.co/x/y"},'
                         '{"title":"Bad","url":"javascript:alert(1)"}]}')
            jobs = agent.import_queue(p)
            self.assertEqual(len(jobs), 1)
            self.assertEqual(jobs[0]["title"], "EMT")


if __name__ == "__main__":
    unittest.main()
