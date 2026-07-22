from __future__ import annotations

import sys
import unittest
from dataclasses import replace
from pathlib import Path


CRAWLER_ROOT = Path(__file__).resolve().parents[1]
if str(CRAWLER_ROOT) not in sys.path:
    sys.path.insert(0, str(CRAWLER_ROOT))

from chevy_archive.color_table_batch import (
    BatchOptions,
    detect_printed_page,
    detect_revision_dates,
    parse_color_rows,
    parse_page_hints,
    restriction_lines,
    score_candidate_page,
    source_checkpoint_configuration,
    source_checkpoint_path,
    source_shard,
    suppress_known_exact_source_aliases,
)


class ColorTableBatchTest(unittest.TestCase):
    def test_bullet_exterior_list_without_codes(self):
        text = """
        Vehicle Overview
        Color and Trim
        Exterior Colors:
        • Onyx Black
        • Indigo Blue Metallic
        • Victory Red
        • Summit White
        NOTE: Z71 colors limited to Onyx Black and Summit White.
        Interior Fabric and Colors
        • Graphite/Medium Gray Vinyl
        Page 10
        """
        rows = parse_color_rows(text)
        self.assertEqual(
            [row["color_name_normalized"] for row in rows],
            ["ONYX BLACK", "INDIGO BLUE METALLIC", "VICTORY RED", "SUMMIT WHITE"],
        )
        self.assertTrue(all(row["paint_code_normalized"] is None for row in rows))
        self.assertGreaterEqual(score_candidate_page(text), 15)
        self.assertEqual(detect_printed_page(text, 12, "12"), "Page 10")
        self.assertEqual(
            restriction_lines(text),
            ["NOTE: Z71 colors limited to Onyx Black and Summit White."],
        )

    def test_code_first_table_rows_and_revision(self):
        text = """
        EXTERIOR PAINT COLORS AND CODES
        11  Antique White
        19  Tuxedo Black
        65  Hugger Orange
        Not available with Z28 package.
        Camaro—Page 4
        REVISED: February 18, 1976
        """
        rows = parse_color_rows(text)
        self.assertEqual([row["paint_code_normalized"] for row in rows], ["11", "19", "65"])
        self.assertEqual(rows[2]["color_name_normalized"], "HUGGER ORANGE")
        self.assertEqual(
            detect_revision_dates(text), ["REVISED: February 18, 1976"]
        )
        self.assertEqual(detect_printed_page(text, 72, "72"), "Camaro—Page 4")

    def test_name_first_repeated_codes_are_not_part_of_the_name(self):
        text = """
        INTERIOR AND EXTERIOR COLOR AVAILABILITY CHART
        #EXTERIOR COLORS Primary Secondary
        BLACK, MIDNIGHT 86 86
        Blue, Lite 86 20
        BLUE, LITE (Light) 20 20
        TAN, SANTA FE 60 660
        """
        rows = parse_color_rows(text)
        self.assertEqual(
            [(row["color_name_normalized"], row["paint_code_normalized"]) for row in rows],
            [
                ("BLACK, MIDNIGHT", "86"),
                ("BLUE, LITE (LIGHT)", "20"),
                ("TAN, SANTA FE", "60"),
            ],
        )

    def test_unknown_marketing_name_is_allowed_only_as_exterior_bullet(self):
        text = """
        Color and Trim
        Exterior Colors:
        e Redfire Metallic
        Interior Fabric and Colors
        e Graphite Vinyl
        """
        rows = parse_color_rows(text)
        self.assertEqual([row["color_name_normalized"] for row in rows], ["REDFIRE METALLIC"])

    def test_color_chart_cross_reference_does_not_open_an_exterior_section(self):
        text = """
        EXTERIOR
        Color: See Interior and Exterior Color Selection Chart
        @ Windshield Wipers and Washers: Electric, 2-speed wipers
        INTERIOR
        @ Colors:
        Painted areas: Same as exterior primary color choice
        """
        self.assertLess(score_candidate_page(text), 7)
        self.assertEqual(parse_color_rows(text), [])

    def test_two_tone_pair_preserves_both_paints(self):
        text = """
        TWO-TONE EXTERIOR COLOR COMBINATIONS
        CODE PRIMARY COLOR CODE SECONDARY COLOR
        25 Mariner Blue (Dark) 20 Lite Blue (Light)
        43 Seamist Green (Light) 12 Frost White
        Suburban—Page 7
        August 9, 1976
        """
        rows = parse_color_rows(text)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["row_kind"], "two_tone_combination")
        self.assertEqual(rows[0]["paint_code_normalized"], "25")
        self.assertEqual(rows[0]["secondary_paint_code_raw"], "20")
        self.assertEqual(rows[0]["secondary_color_name_raw"], "Lite Blue (Light)")

    def test_two_tone_trailing_stripe_column_is_preserved_separately(self):
        text = """
        TWO-TONE EXTERIOR COLOR COMBINATIONS
        70 Cardinal Red (Medium) 12 Frost White Dark Red
        71 Metallic Red (Dark) 76 Mahogany Light Red
        """
        rows = parse_color_rows(text)
        self.assertEqual(rows[0]["secondary_color_name_raw"], "Frost White")
        self.assertEqual(rows[0]["additional_columns_raw"], "Dark Red")
        self.assertEqual(rows[1]["secondary_color_name_raw"], "Mahogany")
        self.assertEqual(rows[1]["additional_columns_raw"], "Light Red")

    def test_page_hints_are_grouped_and_validated(self):
        parsed = parse_page_hints(["source-a:6", "source-a:7", "source-b:12"])
        self.assertEqual(parsed["source-a"], frozenset({6, 7}))
        with self.assertRaises(ValueError):
            parse_page_hints(["source-a:0"])

    def test_source_sharding_is_stable_and_exclusive(self):
        source_ids = [f"gm-source-{index}" for index in range(100)]
        assignments = {
            source_id: [index for index in range(8) if source_shard(source_id, 8) == index]
            for source_id in source_ids
        }
        self.assertTrue(all(len(indexes) == 1 for indexes in assignments.values()))
        self.assertEqual(source_shard("gm-source-42", 8), source_shard("gm-source-42", 8))

    def test_known_camaro_aliases_are_suppressed_only_when_exact(self):
        shared = {
            "canonical_url": "https://www.gm.com/1967-Chevrolet-Camaro.pdf",
            "title": "1967 Chevrolet Camaro Vehicle Information Kit",
            "publisher": "General Motors",
            "source_type": "vehicle_information_kit",
            "make": "Chevrolet",
            "model": "Camaro",
            "year_start": 1967,
            "year_end": 1967,
            "officiality": "official",
            "artifact_sha256": "a" * 64,
            "artifact_bytes": 123,
            "artifact_relpath": "aa/test.pdf",
            "final_url": "https://www.gm.com/1967-Chevrolet-Camaro.pdf",
        }
        alias = {**shared, "source_id": "gm-heritage-camaro-1967"}
        canonical = {
            **shared,
            "source_id": "gm-heritage-1967-chevrolet-camaro",
        }
        unrelated = {**shared, "source_id": "gm-unrelated", "year_start": 1968}

        self.assertEqual(
            [row["source_id"] for row in suppress_known_exact_source_aliases(
                [alias, canonical, unrelated]
            )],
            ["gm-heritage-1967-chevrolet-camaro", "gm-unrelated"],
        )
        with self.assertRaisesRegex(ValueError, "no longer matches"):
            suppress_known_exact_source_aliases(
                [dict(alias, artifact_sha256="b" * 64), canonical]
            )
        self.assertEqual(
            suppress_known_exact_source_aliases([alias]),
            [alias],
        )

    def test_source_checkpoint_key_is_stable_and_configuration_sensitive(self):
        options = BatchOptions(
            state_root=Path("state"),
            output_root=Path("output"),
            source_ids=frozenset(),
            model=None,
            year=None,
            limit=None,
            page_hints={"gm-source-42": frozenset({6, 7})},
            candidate_threshold=7,
            discovery_dpi=150,
            render_dpi=300,
            tesseract_command="tesseract",
            visual_reviews={
                ("gm-source-42", 6): {
                    "status": "layout_inspected",
                    "notes": "Primary and secondary rows separated.",
                }
            },
            write_parquet=False,
            shard_count=4,
            shard_index=2,
            resume=True,
        )
        source = {
            "source_id": "gm-source-42",
            "artifact_sha256": "a" * 64,
        }
        configuration = source_checkpoint_configuration(
            options, source, "tesseract 5.5.0"
        )
        self.assertEqual(
            source_checkpoint_path(options, configuration),
            source_checkpoint_path(options, configuration),
        )
        changed = replace(options, candidate_threshold=8)
        changed_configuration = source_checkpoint_configuration(
            changed, source, "tesseract 5.5.0"
        )
        self.assertNotEqual(
            source_checkpoint_path(options, configuration),
            source_checkpoint_path(changed, changed_configuration),
        )
        changed_artifact = dict(source, artifact_sha256="b" * 64)
        changed_artifact_configuration = source_checkpoint_configuration(
            options, changed_artifact, "tesseract 5.5.0"
        )
        self.assertNotEqual(
            source_checkpoint_path(options, configuration),
            source_checkpoint_path(options, changed_artifact_configuration),
        )


if __name__ == "__main__":
    unittest.main()
