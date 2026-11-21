"""Offline tests for authorization and bounded automatic applications."""
import unittest
from cloud_runner import effective_run_mode

class CloudModeTests(unittest.TestCase):
    def test_disabled_still_scouts(self):
        self.assertEqual(effective_run_mode({"autopilot":{"enabled":False,"daily_max":10}}, "apply"), ("preview",0))
        self.assertEqual(effective_run_mode({}, "apply"), ("preview",0))

    def test_manual_preview_never_submits(self):
        self.assertEqual(effective_run_mode({"autopilot":{"enabled":True,"daily_max":10}}, "preview"), ("preview",0))

    def test_explicit_enabled_respects_cap(self):
        self.assertEqual(effective_run_mode({"autopilot":{"enabled":True,"daily_max":3}}, "apply"), ("apply",3))

    def test_invalid_caps_fail_closed(self):
        for cap in [0,11,True,"10",None]:
            with self.assertRaises(ValueError):
                effective_run_mode({"autopilot":{"enabled":True,"daily_max":cap}}, "apply")

if __name__ == "__main__":
    unittest.main()
