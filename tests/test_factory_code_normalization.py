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
        self.assertEqual(11, BUILD.SCHEMA_VERSION)
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
        self.assertFalse(
            BUILD.SCHEMAS["color_availability"].field("application_type").nullable
        )
        for field_name in (
            "rpo_code",
            "seo_code",
            "seo_code_status",
            "source_seo_code_raw",
            "source_seo_code_cell_state",
            "wa_code",
            "source_wa_code_raw",
            "source_wa_code_cell_state",
            "upfitter_code_1",
            "upfitter_code_2",
            "upfitter_solid_color_option",
            "upfitter_two_tone_color_option",
            "minimum_batch_units",
            "factory_installation_claim",
        ):
            self.assertTrue(
                BUILD.SCHEMAS["color_availability"].field(field_name).nullable
            )
        for field_name in (
            "transcribed_rpo_code",
            "transcribed_seo_code",
            "transcribed_seo_code_status",
            "transcribed_source_seo_code_raw",
            "transcribed_source_seo_code_cell_state",
            "transcribed_wa_code",
            "transcribed_source_wa_code_raw",
            "transcribed_source_wa_code_cell_state",
            "transcribed_upfitter_code_1",
            "transcribed_upfitter_code_2",
            "transcribed_upfitter_solid_color_option",
            "transcribed_upfitter_two_tone_color_option",
            "minimum_batch_units",
            "factory_installation_claim",
        ):
            self.assertTrue(BUILD.SCHEMAS["evidence_claims"].field(field_name).nullable)

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
        availability_by_id = {row["availability_id"]: row for row in self.availability}
        self.assertEqual(len(self.availability), len(self.claims))
        for claim in self.claims:
            availability = availability_by_id[claim["availability_id"]]
            for availability_field, claim_field in {
                "factory_code": "transcribed_factory_code",
                "factory_code_status": "transcribed_factory_code_status",
                "touch_up_code": "transcribed_touch_up_code",
                "rpo_code": "transcribed_rpo_code",
                "seo_code": "transcribed_seo_code",
                "seo_code_status": "transcribed_seo_code_status",
                "source_seo_code_raw": "transcribed_source_seo_code_raw",
                "source_seo_code_cell_state": (
                    "transcribed_source_seo_code_cell_state"
                ),
                "wa_code": "transcribed_wa_code",
                "source_wa_code_raw": "transcribed_source_wa_code_raw",
                "source_wa_code_cell_state": (
                    "transcribed_source_wa_code_cell_state"
                ),
                "upfitter_code_1": "transcribed_upfitter_code_1",
                "upfitter_code_2": "transcribed_upfitter_code_2",
                "upfitter_solid_color_option": (
                    "transcribed_upfitter_solid_color_option"
                ),
                "upfitter_two_tone_color_option": (
                    "transcribed_upfitter_two_tone_color_option"
                ),
                "minimum_batch_units": "minimum_batch_units",
                "factory_installation_claim": "factory_installation_claim",
            }.items():
                self.assertEqual(
                    availability[availability_field], claim[claim_field]
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
            {row["factory_code_status"] for row in rows if row["model_year"] == 2003},
        )
        recent_rows = [row for row in rows if row["model_year"] in {2005, 2006}]
        printed_rows = [
            row
            for row in recent_rows
            if row["factory_code_status"] == "printed_in_source"
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

    def test_impala_limited_kerr_codes_remain_post_build_upfitter_metadata(
        self,
    ) -> None:
        rows = [
            row
            for row in self.availability
            if row["model_id"] == "impala-limited"
            and row["model_year"] in {2015, 2016}
            and row["application_type"] == "authorized_upfitter_post_build"
        ]
        self.assertEqual(60, len(rows))
        self.assertEqual(
            {2015: 30, 2016: 30},
            {
                year: sum(row["model_year"] == year for row in rows)
                for year in {2015, 2016}
            },
        )
        self.assertEqual(
            {
                "gm-2015-impala-limited-9c1-9c3",
                "gm-2016-impala-limited-9c1-9c3",
            },
            {row["evidence_source_id"] for row in rows},
        )
        self.assertTrue(all(row["factory_code"] is None for row in rows))
        self.assertTrue(
            all(row["factory_code_status"] == "not_printed_in_source" for row in rows)
        )
        self.assertTrue(all(row["factory_installation_claim"] is False for row in rows))
        self.assertTrue(
            all(
                row["wa_code"] == f"WA-{row['source_wa_code_raw']}"
                and row["source_wa_code_cell_state"] == "printed_without_prefix"
                for row in rows
            )
        )
        self.assertTrue(
            all(
                row["seo_code"] is None
                and row["seo_code_status"] == "column_absent_in_source"
                and row["source_seo_code_cell_state"] == "column_absent"
                for row in rows
            )
        )
        self.assertTrue(
            all(
                row["upfitter_code_1"]
                and row["upfitter_code_2"]
                and row["upfitter_solid_color_option"] == "AAS"
                and row["upfitter_two_tone_color_option"] == "AAT"
                for row in rows
            )
        )

    def test_overlay_generations_have_explicit_model_year_memberships(self) -> None:
        memberships = self.builder.rows["model_year_generation_memberships"]
        overlays = [
            row for row in memberships if row["membership_role"] == "specialty_overlay"
        ]
        self.assertEqual(
            {
                "blazer-ev:2026",
                "blazer:1979",
                "blazer:1980",
                "bolt-euv:2023",
                "caprice-ppv:2011",
                "caprice-ppv:2012",
                "caprice-ppv:2013",
                "caprice-ppv:2014",
                "caprice-ppv:2015",
                "caprice-ppv:2016",
                "caprice-ppv:2017",
                "ck-series:1979",
                "ck-series:1980",
                "ck-series:1983",
                "ck-series:1993",
                "express:2012",
                "express:2013",
                "express:2014",
                "g-series-van:1979",
                "g-series-van:1980",
                "impala-limited:2014",
                "impala-limited:2015",
                "impala-limited:2016",
                "impala:2011",
                "impala:2012",
                "impala:2013",
                "s10:1993",
                "silverado:2012",
                "silverado:2014",
                "silverado:2026",
                "sportvan:1979",
                "sportvan:1980",
                "suburban:1979",
                "suburban:1980",
                "suburban:2005",
                "suburban:2007",
                "suburban:2011",
                "suburban:2012",
                "suburban:2013",
                "suburban:2014",
                "suburban:2019",
                "suburban:2020",
                "tahoe:2003",
                "tahoe:2005",
                "tahoe:2006",
                "tahoe:2012",
                "tahoe:2013",
                "tahoe:2014",
                "tahoe:2015",
                "tahoe:2016",
                "tahoe:2017",
                "tahoe:2018",
                "tahoe:2019",
                "tahoe:2020",
            },
            {row["model_year_id"] for row in overlays},
        )
        self.assertEqual(509, len(overlays))
        self.assertEqual(
            {"specialty_palette_subset"},
            {row["evidence_class"] for row in overlays},
        )
        qualified_historical_overlays = [
            row
            for row in memberships
            if row["membership_role"] == "qualified_historical_overlay"
        ]
        self.assertEqual(1, len(qualified_historical_overlays))
        self.assertEqual(
            "g-series-van:1981",
            qualified_historical_overlays[0]["model_year_id"],
        )
        self.assertEqual(
            "qualified_historical_table",
            qualified_historical_overlays[0]["evidence_class"],
        )
        program_partitions = [
            row for row in memberships if row["membership_role"] == "program_partition"
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
        self.assertEqual(
            {"image_region"}, {row["evidence_locator_type"] for row in claims}
        )
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
