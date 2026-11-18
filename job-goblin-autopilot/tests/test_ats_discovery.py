import unittest
from unittest.mock import patch
import ats_discovery as ats


class Tests(unittest.TestCase):
    def test_link_guard(self):
        self.assertTrue(ats._valid_application_url("https://job-boards.greenhouse.io/life360/jobs/123"))
        for url in ["https://evil.com/job", "http://job-boards.greenhouse.io/a",
                    "https://greenhouse.io.evil.com/a", "javascript:alert(1)"]:
            self.assertFalse(ats._valid_application_url(url))

    def test_match_location_and_title(self):
        target = {"role": "Technician", "match_any": ["Technician"], "locations": ["CA", "California"]}
        self.assertTrue(ats._matches({"title": "Hardware Technician", "location": "Fremont, CA"}, target))
        self.assertFalse(ats._matches({"title": "Hardware Technician", "location": "Berlin"}, target))
        self.assertFalse(ats._matches({"title": "Executive", "location": "Fremont, CA"}, target))

    def test_title_alias_and_configured_resume(self):
        target = {"role": "Emergency Medical Technician",
                  "match_any": ["EMT", "Emergency Medical Technician"],
                  "locations": ["California", "CA"],
                  "resume": "EMT_Resume.pdf"}
        sample = {"title": "Emergency Department Technician", "company": "Hospital",
                  "location": "San Jose, CA",
                  "url": "https://job-boards.greenhouse.io/hospital/jobs/321"}
        self.assertTrue(ats._matches(sample, target))
        with patch.object(ats, "_fetch_board", return_value=[sample]):
            jobs, stats = ats.discover({"targets": [target]}, {"hospital": "Hospital"})
        self.assertEqual(jobs[0]["resume"], "EMT_Resume.pdf")
        self.assertEqual(stats["title_matches"], 1)

    def test_location_filter_and_diagnostics(self):
        target = {"role": "AI Evaluator", "match_any": ["AI Evaluator"],
                  "locations": ["Remote", "United States"], "resume": "AI_Resume.pdf"}
        sample = {"title": "AI Training Specialist", "company": "Example",
                  "location": "London, UK",
                  "url": "https://job-boards.greenhouse.io/example/jobs/321"}
        self.assertTrue(ats._title_match(sample, target))
        self.assertFalse(ats._matches(sample, target))
        with patch.object(ats, "_fetch_board", return_value=[sample]):
            jobs, stats = ats.discover({"targets": [target]}, {"example": "Example"})
        self.assertEqual(len(jobs), 0)
        self.assertEqual(stats["location_rejections"], 1)

    def test_explicit_match_terms_not_overridden_by_broad_role(self):
        target = {"role": "Technician", "match_any": ["Data Center Technician"],
                  "locations": ["CA"]}
        sample = {"title": "Lab Technician", "location": "San Jose, CA"}
        self.assertFalse(ats._matches(sample, target))

    def test_dedup_and_source_failures(self):
        boards = {"a": "A", "b": "B", "c": "C"}
        data = [{"title": "Hardware Technician", "company": "A", "location": "Fremont, CA",
                 "url": "https://job-boards.greenhouse.io/a/jobs/123"}]

        def source(slug, company):
            if slug == "c":
                raise RuntimeError("feed down")
            return data

        with patch.object(ats, "_fetch_board", side_effect=source):
            jobs, stats = ats.discover(
                {"targets": [{"role": "Technician", "match_any": ["Technician"], "locations": ["CA"]}]},
                boards)
        self.assertEqual(len(jobs), 1)
        self.assertEqual(stats["boards_failed"], 1)
        self.assertEqual(stats["matched_posts"], 1)


if __name__ == "__main__":
    unittest.main()
