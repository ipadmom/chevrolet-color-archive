from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "factory_code_normalized_builder",
    ROOT / "scripts" / "build-normalized-parquet.py",
)
assert SPEC and SPEC.loader
BUILD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD)


class FactoryCodeNormalizationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.builder = BUILD.NormalizedArchiveBuilder()
        cls.builder.build()
        cls.availability = cls.builder.rows["color_availability"]
        cls.claims = cls.builder.rows["evidence_claims"]
        cls.components = cls.builder.rows["paint_scheme_components"]

    def test_schema_uses_nullable_codes_and_required_controlled_statuses(self) -> None:
        self.assertEqual(8, BUILD.SCHEMA_VERSION)
        expected = {
            "color_availability": ("factory_code", "factory_code_status"),
            "paint_scheme_components": ("factory_code", "factory_code_status"),
            "evidence_claims": (
                "transcribed_factory_code",
                "transcribed_factory_code_status",
            ),
            "supplemental_color_mentions": (
                "factory_code",
                "factory_code_status",
            ),
        }
        self.assertEqual(expected, BUILD.FACTORY_CODE_COLUMNS)
        for table_name, (code_field, status_field) in expected.items():
            schema = BUILD.SCHEMAS[table_name]
            self.assertTrue(schema.field(code_field).nullable)
            self.assertFalse(schema.field(status_field).nullable)
        self.assertEqual(
            {
                "explicit_none_in_source",
                "printed_in_source",
                "not_printed_in_source",
                "not_stated_in_source",
            },
            set(BUILD.FACTORY_CODE_STATUS_VALUES),
        )

    def test_placeholder_hosts_cannot_become_normalized_sources(self) -> None:
        self.assertFalse(
            any(
                (BUILD.urlsplit(row["canonical_url"]).hostname or "").lower()
                in BUILD.PLACEHOLDER_SOURCE_HOSTS
                for row in self.builder.rows["sources"]
            )
        )
        builder = BUILD.NormalizedArchiveBuilder()
        with self.assertRaisesRegex(ValueError, "placeholder host"):
            builder.ensure_source("https://example.com/source")

    def test_pdf_locator_does_not_parse_model_year_as_a_page(self) -> None:
        self.assertEqual(
            [125, 126, 127],
            BUILD.pdf_pages_from_locator(
                "PDF page 125, 2026 MODEL YEAR EXTERIOR COLORS. "
                "PDF page 126, 2026 MODEL YEAR EXTERIOR COLORS. "
                "PDF page 127, 2026 MODEL YEAR EXTERIOR COLORS."
            ),
        )

    def test_placeholder_markers_become_null_without_losing_reason(self) -> None:
        self.assertEqual(
            (None, "not_stated_in_source"),
            BUILD.normalize_factory_code("not stated"),
        )
        self.assertEqual(
            (None, "not_printed_in_source"),
            BUILD.normalize_factory_code("Not printed"),
        )
        self.assertEqual(
            ("WA-9015 / SEO 9V5", "printed_in_source"),
            BUILD.normalize_factory_code("WA-9015 / SEO 9V5"),
        )

        tahoe_2001 = [
            row
            for row in self.availability
            if row["model_id"] == "tahoe" and row["model_year"] == 2001
        ]
        tahoe_2022 = [
            row
            for row in self.availability
            if row["model_id"] == "tahoe" and row["model_year"] == 2022
        ]
        self.assertTrue(tahoe_2001)
        self.assertTrue(tahoe_2022)
        self.assertEqual({None}, {row["factory_code"] for row in tahoe_2001})
        self.assertEqual(
            {"not_printed_in_source"},
            {row["factory_code_status"] for row in tahoe_2001},
        )
        self.assertEqual({None}, {row["factory_code"] for row in tahoe_2022})
        self.assertEqual(
            {"not_printed_in_source"},
            {row["factory_code_status"] for row in tahoe_2022},
        )

    def test_claims_copy_both_nullable_value_and_status(self) -> None:
        availability_by_id = {
            row["availability_id"]: row for row in self.availability
        }
        self.assertEqual(len(self.availability), len(self.claims))
        for claim in self.claims:
            availability = availability_by_id[claim["availability_id"]]
            self.assertEqual(
                availability["factory_code"], claim["transcribed_factory_code"]
            )
            self.assertEqual(
                availability["factory_code_status"],
                claim["transcribed_factory_code_status"],
            )
            self.assertEqual(
                availability["touch_up_code"],
                claim["transcribed_touch_up_code"],
            )

    def test_suburban_seo_codes_and_touch_up_references_are_separate(self) -> None:
        seo_rows = [
            row
            for row in self.availability
            if row["model_id"] == "suburban"
            and row["model_year"] in {2005, 2007}
            and row["claim_status"] == "published_specialty_palette_subset"
        ]
        self.assertEqual(20, len(seo_rows))
        explicit_none = next(
            row
            for row in seo_rows
            if row["model_year"] == 2005
            and row["source_color_name"] == "Blue"
            and row["touch_up_code"] == "WA-5665"
        )
        self.assertIsNone(explicit_none["factory_code"])
        self.assertEqual(
            "explicit_none_in_source", explicit_none["factory_code_status"]
        )
        coded = next(
            row
            for row in seo_rows
            if row["model_year"] == 2005
            and row["source_color_name"] == "Green, Woodland"
        )
        self.assertEqual("9V5", coded["factory_code"])
        self.assertEqual("WA-9015", coded["touch_up_code"])

    def test_tahoe_specialty_order_codes_do_not_become_paint_codes(self) -> None:
        rows = [
            row
            for row in self.availability
            if row["model_id"] == "tahoe"
            and row["model_year"] in {2003, 2005, 2006}
            and row["claim_status"] == "published_specialty_palette_subset"
        ]
        self.assertEqual(14, len(rows))
        self.assertEqual(
            {"printed_in_source"},
            {
                row["factory_code_status"]
                for row in rows
                if row["model_year"] == 2003
            },
        )
        recent_rows = [row for row in rows if row["model_year"] in {2005, 2006}]
        printed_rows = [
            row for row in recent_rows if row["factory_code_status"] == "printed_in_source"
        ]
        self.assertEqual(
            {
                (2005, "Blue", "WA-5665"),
                (2005, "Victory Red", "WA-9260"),
                (2006, "Victory Red", "WA-9260"),
            },
            {
                (row["model_year"], row["source_color_name"], row["factory_code"])
                for row in printed_rows
            },
        )
        not_printed_rows = [
            row
            for row in recent_rows
            if row["factory_code_status"] == "not_printed_in_source"
        ]
        self.assertEqual(7, len(not_printed_rows))
        self.assertEqual({None}, {row["factory_code"] for row in not_printed_rows})

    def test_overlay_generations_have_explicit_model_year_memberships(self) -> None:
        memberships = self.builder.rows["model_year_generation_memberships"]
        overlays = [
            row for row in memberships if row["membership_role"] == "specialty_overlay"
        ]
        self.assertEqual(
            {
                "suburban:1980",
                "suburban:2005",
                "suburban:2007",
                "suburban:2011",
                "tahoe:2003",
                "tahoe:2005",
                "tahoe:2006",
            },
            {row["model_year_id"] for row in overlays},
        )
        self.assertEqual(18, len(overlays))
        self.assertEqual(
            {"specialty_palette_subset"},
            {row["evidence_class"] for row in overlays},
        )
        program_partitions = [
            row
            for row in memberships
            if row["membership_role"] == "program_partition"
        ]
        self.assertEqual(3, len(program_partitions))
        self.assertEqual(
            {"tahoe:2000"},
            {row["model_year_id"] for row in program_partitions},
        )
        suburban_2011 = next(
            row
            for row in self.builder.rows["model_years"]
            if row["model_year_id"] == "suburban:2011"
        )
        self.assertEqual(
            "suburban:gm-fleet-guide-qualified-2011",
            suburban_2011["generation_id"],
        )

    def test_image_evidence_uses_an_explicit_non_pdf_locator(self) -> None:
        claims = [
            row
            for row in self.claims
            if row["model_id"] == "suburban" and row["model_year"] == 1993
        ]
        self.assertEqual(10, len(claims))
        self.assertEqual({"image_region"}, {row["evidence_locator_type"] for row in claims})
        self.assertEqual({()}, {tuple(row["pdf_pages"]) for row in claims})
        revisions = {
            row["source_revision_id"]: row
            for row in self.builder.rows["source_revisions"]
        }
        self.assertEqual(
            {"image/jpeg"},
            {revisions[row["source_revision_id"]]["media_type"] for row in claims},
        )

    def test_no_normalized_code_column_contains_placeholder_prose(self) -> None:
        for table_name, rows in (
            ("color_availability", self.availability),
            ("paint_scheme_components", self.components),
            ("evidence_claims", self.claims),
        ):
            BUILD.validate_factory_code_rows(table_name, rows)

        for placeholder in (
            "unknown",
            "N/A",
            "none",
            "TBD",
            "not available",
            "not stated / 567",
            "Not printed (see order guide)",
        ):
            with self.subTest(placeholder=placeholder):
                with self.assertRaisesRegex(ValueError, "placeholder prose"):
                    BUILD.normalize_factory_code(placeholder)

        bad_row = dict(
            next(row for row in self.availability if row["factory_code"] is not None)
        )
        bad_row["factory_code"] = "Not printed"
        with self.assertRaisesRegex(ValueError, "not a normalized code"):
            BUILD.validate_factory_code_rows("color_availability", [bad_row])

    def test_complete_in_memory_schema_pk_and_fk_validation(self) -> None:
        BUILD.validate_normalized_rows(self.builder.rows)


if __name__ == "__main__":
    unittest.main()
