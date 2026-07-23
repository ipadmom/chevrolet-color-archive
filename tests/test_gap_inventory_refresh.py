from __future__ import annotations

import copy
import importlib.util
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "refresh-color-research-gap-inventory.py"
SPEC = importlib.util.spec_from_file_location("gap_inventory_refresh", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class GapInventoryRefreshTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.inventory = MODULE.build_inventory()

    def test_exact_snapshot_reconciliation(self) -> None:
        summary = self.inventory["summary"]
        self.assertEqual(149, summary["model_count"])
        self.assertEqual(1_792, summary["model_year_count"])
        self.assertEqual(2_010, summary["listing_count"])
        self.assertEqual(85, summary["completely_reviewed_count"])
        self.assertEqual(6, summary["reviewed_qualified_historical_table_count"])
        self.assertEqual(57, summary["reviewed_qualified_palette_union_count"])
        self.assertEqual(462, summary["reviewed_qualified_palette_union_listing_count"])
        self.assertEqual(42, summary["reviewed_specialty_palette_subset_count"])
        self.assertEqual(
            58, summary["reviewed_specialty_palette_subset_application_year_count"]
        )
        self.assertEqual(
            571, summary["reviewed_specialty_palette_subset_listing_count"]
        )
        self.assertEqual(973, summary["source_transcription_listing_count"])
        self.assertEqual(4, summary["reviewed_no_chart_count"])
        self.assertEqual(0, summary["source_located_chart_unreviewed_count"])
        self.assertEqual(1_598, summary["wholly_unreviewed_count"])
        self.assertEqual(1_862, summary["official_source_candidate_link_count"])
        self.assertEqual(691, summary["crawler_source_document_count"])
        self.assertEqual(2_774, summary["crawler_candidate_page_count"])
        self.assertEqual(11_733, summary["crawler_color_candidate_export_record_count"])
        self.assertEqual(0, summary["crawler_visually_reviewed_candidate_page_count"])
        self.assertTrue(
            all(check["pass"] for check in self.inventory["reconciliation"].values())
        )

    def test_suburban_explicit_no_chart_reviews_are_preserved(self) -> None:
        rows = {
            row["model_year"]: row
            for row in self.inventory["model_years"]
            if row["model_id"] == "suburban" and row["model_year"] in {1963, 1970, 1971}
        }
        self.assertEqual({1963, 1970, 1971}, set(rows))
        for row in rows.values():
            self.assertEqual("source_reviewed_no_color_chart_found", row["audit_state"])
            self.assertTrue(row["color_chart_reviewed"])
            self.assertFalse(row["completely_reviewed_color_chart"])
            self.assertEqual(0, row["exact_listing_count"])
            self.assertEqual(
                row["reviewed_no_chart_source"]["source_id"],
                row["current_app_source"]["sourceId"],
            )
            self.assertEqual(
                row["reviewed_no_chart_source"]["url"],
                next(
                    source["pdf_url"]
                    for source in row["official_source_records"]
                    if source["relation"] == "dedicated"
                ),
            )

    def test_model_year_rows_are_unique_and_self_counting(self) -> None:
        rows = self.inventory["model_years"]
        keys = [row["model_year_key"] for row in rows]
        self.assertEqual(len(keys), len(set(keys)))
        for row in rows:
            self.assertEqual(row["exact_listing_count"], len(row["listings"]))
            self.assertEqual(
                row["exact_listing_count"],
                sum(row["availability_state_counts"].values()),
            )
            if row["listings"]:
                self.assertIsNotNone(row["current_app_source"])

    def test_palette_union_remains_qualified(self) -> None:
        palette_rows = [
            row
            for row in self.inventory["model_years"]
            if row["audit_state"] == "reviewed_qualified_palette_union"
        ]
        self.assertEqual(57, len(palette_rows))
        self.assertTrue(all(row["color_chart_reviewed"] for row in palette_rows))
        self.assertTrue(
            all(not row["completely_reviewed_color_chart"] for row in palette_rows)
        )
        self.assertTrue(
            all(
                row["current_app_source"]["evidenceClass"] == "qualified_palette_union"
                for row in palette_rows
            )
        )
        self.assertIn(
            "reviewed_qualified_palette_union",
            self.inventory["parquet_schema_recommendation"]["audit_state_enum"],
        )

    def test_specialty_subsets_remain_incomplete_and_program_scoped(self) -> None:
        expected_counts = {
            "blazer:1979": 2,
            "blazer:1980": 3,
            "bolt-euv:2023": 7,
            "caprice-ppv:2011": 14,
            "caprice-ppv:2012": 16,
            "caprice-ppv:2013": 14,
            "caprice-ppv:2014": 7,
            "caprice-ppv:2015": 6,
            "caprice-ppv:2016": 6,
            "caprice-ppv:2017": 4,
            "ck-series:1979": 2,
            "ck-series:1980": 3,
            "ck-series:1983": 4,
            "ck-series:1993": 4,
            "express:2011": 1,
            "express:2012": 15,
            "express:2013": 15,
            "express:2014": 15,
            "g-series-van:1979": 3,
            "g-series-van:1980": 3,
            "impala:2011": 30,
            "impala:2012": 30,
            "impala:2013": 30,
            "impala-limited:2014": 30,
            "impala-limited:2015": 30,
            "impala-limited:2016": 30,
            "s10:1993": 4,
            "silverado:2012": 26,
            "silverado:2014": 10,
            "silverado-hd:2011": 1,
            "sportvan:1979": 3,
            "sportvan:1980": 3,
            "tahoe:2011": 1,
            "tahoe:2012": 16,
            "tahoe:2013": 16,
            "tahoe:2014": 2,
            "tahoe:2015": 7,
            "tahoe:2016": 14,
            "tahoe:2017": 6,
            "tahoe:2018": 5,
            "tahoe:2019": 5,
            "tahoe:2020": 5,
        }
        specialty_rows = [
            row
            for row in self.inventory["model_years"]
            if row["audit_state"] == "reviewed_specialty_palette_subset"
        ]
        self.assertEqual(
            set(expected_counts), {row["model_year_key"] for row in specialty_rows}
        )
        for row in specialty_rows:
            self.assertTrue(row["color_chart_reviewed"])
            self.assertFalse(row["completely_reviewed_color_chart"])
            self.assertEqual(
                expected_counts[row["model_year_key"]], row["exact_listing_count"]
            )
            self.assertEqual(0, row["listed_count"])
            self.assertEqual(
                row["exact_listing_count"],
                sum(row["availability_state_counts"].values()),
            )
            self.assertTrue(
                all(
                    listing["evidence_class"] == "specialty_palette_subset"
                    for listing in row["listings"]
                )
            )
            self.assertEqual(
                "specialty_palette_subset",
                row["current_app_source"]["evidenceClass"],
            )
        self.assertIn(
            "reviewed_specialty_palette_subset",
            self.inventory["parquet_schema_recommendation"]["audit_state_enum"],
        )

    def test_specialty_subset_overlays_a_governing_palette(self) -> None:
        row = next(
            row
            for row in self.inventory["model_years"]
            if row["model_year_key"] == "suburban:1980"
        )
        self.assertEqual(
            "suburban-1977-1981-audited-solid-colors", row["generation_id"]
        )
        self.assertEqual("verified_complete", row["audit_state"])
        self.assertEqual(18, row["exact_listing_count"])
        self.assertEqual(15, row["listed_count"])
        self.assertEqual(1, row["restricted_count"])
        self.assertEqual(
            {"available": 2, "listed": 15, "restricted": 1},
            row["availability_state_counts"],
        )
        woodland = next(
            listing
            for listing in row["listings"]
            if listing["display_label"] == "Woodland Green"
        )
        self.assertEqual("restricted", woodland["availability_state"])
        self.assertIsNone(row["current_app_source"].get("evidenceClass"))

        application_rows = [
            item
            for item in self.inventory["model_years"]
            if any(
                listing["evidence_class"] == "specialty_palette_subset"
                for listing in item["listings"]
            )
        ]
        self.assertEqual(58, len(application_rows))
        self.assertEqual(
            571,
            sum(
                listing["evidence_class"] == "specialty_palette_subset"
                for item in application_rows
                for listing in item["listings"]
            ),
        )

    def test_1981_standard_color_tables_are_qualified_not_specialty(self) -> None:
        expected = {
            "sportvan:1981": 1,
            "g-series-van:1981": 2,
            "p-series-step-van:1981": 1,
        }
        rows = {
            row["model_year_key"]: row
            for row in self.inventory["model_years"]
            if row["model_year_key"] in expected
        }
        self.assertEqual(set(expected), set(rows))
        for model_year_key, count in expected.items():
            row = rows[model_year_key]
            self.assertEqual("reviewed_qualified_historical_table", row["audit_state"])
            self.assertEqual(count, row["exact_listing_count"])
            self.assertTrue(
                all(
                    listing["evidence_class"] == "qualified_historical_table"
                    for listing in row["listings"]
                )
            )

    def test_forest_service_green_remains_a_non_route_research_lead(self) -> None:
        specialty = MODULE.load_json(
            ROOT / "data" / "sources" / "specialty-color-source-candidates.json"
        )
        lead = next(
            item
            for item in specialty["search_leads"]
            if item["id"] == "forest-service-green-fs-595-14260"
        )
        self.assertEqual(
            "research_only_unresolved_chevrolet_application", lead["status"]
        )
        self.assertNotIn("model_id", lead)
        self.assertNotIn("model_year", lead)
        self.assertTrue(
            all(
                record["label"] not in {"Forest Service Green", "Forestry Green"}
                for record in specialty["app_publication_records"]
            )
        )
        published_labels = {
            listing["display_label"]
            for row in self.inventory["model_years"]
            for listing in row["listings"]
        }
        self.assertNotIn("Forest Service Green", published_labels)
        self.assertNotIn("Forestry Green", published_labels)

    def test_specialty_candidate_ledger_does_not_promote_unreviewed_pages(self) -> None:
        specialty = MODULE.load_json(
            ROOT / "data" / "sources" / "specialty-color-source-candidates.json"
        )
        self.assertEqual(535, len(specialty["app_publication_records"]))
        self.assertEqual(8, len(specialty["verified_not_published"]))
        self.assertEqual(6, len(specialty["usda_primary_sources"]))
        self.assertEqual(2, len(specialty["comparison_sources"]))
        self.assertEqual(36, len(specialty["historic_gm_upfitter_candidates"]))
        self.assertEqual(24, len(specialty["modern_order_guide_snapshot_candidates"]))
        self.assertEqual(5, len(specialty["rejected_or_unresolved_leads"]))
        self.assertEqual(
            87,
            specialty["integrity_audit"]["unique_retained_artifacts_reconciled"],
        )
        self.assertTrue(specialty["integrity_audit"]["byte_lengths_reconciled"])
        self.assertTrue(specialty["integrity_audit"]["sha256_digests_reconciled"])

        for record in specialty["app_publication_records"]:
            source = record["source"]
            pages = source.get("pdf_pages") or [source.get("pdf_page")]
            self.assertIn(
                record["publication_status"],
                {
                    "published_specialty_subset",
                    "published_qualified_historical_subset",
                },
            )
            if record["publication_status"] == "published_qualified_historical_subset":
                self.assertEqual("qualified_historical_table", record["evidence_class"])
            self.assertTrue(source["url"].startswith("https://"))
            self.assertGreater(source["bytes"], 0)
            self.assertRegex(source["sha256"], r"^[0-9a-f]{64}$")
            self.assertTrue(
                all(page and page <= source["pdf_page_count"] for page in pages)
            )

        self.assertEqual(
            {"page_rendered_needs_visual_qc": 19, "visually_verified_and_published": 17},
            dict(
                Counter(
                    record["status"]
                    for record in specialty["historic_gm_upfitter_candidates"]
                )
            ),
        )
        modern_statuses = {
            record["status"]
            for record in specialty["modern_order_guide_snapshot_candidates"]
        }
        self.assertEqual(
            {"exact_snapshot_page_located", "visually_verified_exact_snapshot"},
            modern_statuses,
        )
        self.assertEqual(
            2,
            sum(
                record["status"] == "visually_verified_exact_snapshot"
                for record in specialty["modern_order_guide_snapshot_candidates"]
            ),
        )
        published_record_ids = {
            record["record_id"] for record in specialty["app_publication_records"]
        }
        self.assertTrue(
            published_record_ids.isdisjoint(
                record["record_id"] for record in specialty["verified_not_published"]
            )
        )

    def test_modern_fleet_guides_are_not_regular_palette_evidence(self) -> None:
        tahoe_2020 = next(
            row
            for row in self.inventory["model_years"]
            if row["model_year_key"] == "tahoe:2020"
        )
        self.assertEqual(
            "reviewed_specialty_palette_subset", tahoe_2020["audit_state"]
        )
        self.assertTrue(tahoe_2020["color_chart_reviewed"])
        self.assertFalse(tahoe_2020["completely_reviewed_color_chart"])
        self.assertEqual(5, tahoe_2020["exact_listing_count"])
        self.assertTrue(
            all(
                listing["evidence_class"] == "specialty_palette_subset"
                for listing in tahoe_2020["listings"]
            )
        )
        self.assertEqual(
            "generic_full_line_official_kit", tahoe_2020["likely_source_availability"]
        )
        self.assertEqual(1, tahoe_2020["official_source_record_count"])
        source = tahoe_2020["official_source_records"][0]
        self.assertEqual("gm-fleet-guide-us-2020", source["crawler_source_id"])
        self.assertEqual("generic_full_line", source["relation"])
        self.assertEqual("fleet_guide_pdf", source["source_type"])
        self.assertRegex(source["artifact_sha256"], r"^[a-f0-9]{64}$")

    def test_new_catalog_year_is_synthesized_without_inventing_candidates(self) -> None:
        base = MODULE.load_json(
            ROOT / "data" / "audits" / "color-research-gap-inventory.json"
        )
        base = copy.deepcopy(base)
        base["model_years"] = [
            row
            for row in base["model_years"]
            if row["model_year_key"] != "brightdrop-400:2026"
        ]
        catalog = MODULE.load_json(
            ROOT / "data" / "catalog" / "chevrolet-us-nameplates.json"
        )
        platforms = MODULE.load_json(
            ROOT / "data" / "catalog" / "chevrolet-platform-eras.json"
        )
        snapshot = MODULE.load_archive_snapshot()
        rows, _, _ = MODULE.build_model_years(
            base=base,
            catalog=catalog,
            platform_catalog=platforms,
            snapshot=snapshot,
        )
        synthesized = next(
            row for row in rows if row["model_year_key"] == "brightdrop-400:2026"
        )
        self.assertEqual("reviewed_qualified_palette_union", synthesized["audit_state"])
        self.assertEqual(1, synthesized["exact_listing_count"])
        self.assertEqual([], synthesized["official_source_records"])
        self.assertEqual(0, synthesized["official_source_record_count"])
        self.assertEqual(
            "gm-fleet-guide-us-2026-r2026-04-01",
            synthesized["current_app_source"]["sourceId"],
        )

    def test_tracked_outputs_are_current_and_deterministic(self) -> None:
        second = MODULE.build_inventory()
        self.assertEqual(
            MODULE.serialize_inventory(self.inventory),
            MODULE.serialize_inventory(second),
        )
        self.assertEqual(
            MODULE.render_document(self.inventory),
            MODULE.render_document(second),
        )
        self.assertEqual(
            (ROOT / "data" / "audits" / "color-research-gap-inventory.json").read_text(
                encoding="utf-8-sig"
            ),
            MODULE.serialize_inventory(self.inventory),
        )
        self.assertEqual(
            (ROOT / "docs" / "color-research-gap-inventory.md").read_text(
                encoding="utf-8-sig"
            ),
            MODULE.render_document(self.inventory),
        )


if __name__ == "__main__":
    unittest.main()
