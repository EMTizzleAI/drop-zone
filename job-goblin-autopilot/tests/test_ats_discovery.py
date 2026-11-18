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
