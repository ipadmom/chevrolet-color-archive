from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "validate-normalized-parquet.py"
SPEC = importlib.util.spec_from_file_location("normalized_validator", SCRIPT)
assert SPEC and SPEC.loader
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


class NormalizedValidatorGuardTest(unittest.TestCase):
    def test_unresolved_forest_service_identity_variants_are_blocked(self) -> None:
        for value in (
            "Forest Service Green",
            "U.S. Forest Service Green",
            "Forestry Green",
            "Federal Standard No. 595 No. 14260",
            "FS 595 14260",
            "5032",
        ):
            with self.subTest(value=value):
                self.assertTrue(
                    VALIDATOR.contains_unresolved_forest_green_identity(value)
                )

    def test_documented_distinct_chevrolet_greens_remain_allowed(self) -> None:
        for value in (
            "Woodland Green",
            "Forest Green",
            "Forest Green Metallic",
            "WA-9015",
            "SEO 9V5",
            "142600",
        ):
            with self.subTest(value=value):
                self.assertFalse(
                    VALIDATOR.contains_unresolved_forest_green_identity(value)
                )


if __name__ == "__main__":
    unittest.main()
