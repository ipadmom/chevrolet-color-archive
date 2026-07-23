from __future__ import annotations

import importlib.util
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "current_manual_provenance_builder",
    ROOT / "scripts" / "build-normalized-parquet.py",
)
assert SPEC and SPEC.loader
BUILD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD)


class CurrentManualProvenanceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.builder = BUILD.NormalizedArchiveBuilder()
        cls.builder.build_data_file_references()
        cls.builder.apply_current_manual_references()
        cls.builder.finalize_sources()
        cls.sources_by_url = {
            row["canonical_url"]: row for row in cls.builder.rows["sources"]
        }
        cls.links = cls.builder.rows["source_links"]
        cls.references = cls.builder.current_manual_references

    def test_manual_metadata_is_normalized_on_exact_model_years(self) -> None:
        owner_links = [
            row
            for row in self.links
            if row["claim_type"] == "official_owner_manual_reference"
        ]
        vri_links = [
            row
            for row in self.links
            if row["claim_type"]
            == "official_vehicle_reference_information_reference"
        ]
        self.assertEqual(18, len(owner_links))
        self.assertEqual(11, len(vri_links))
        self.assertTrue(all(row["entity_type"] == "model_year" for row in owner_links))
        self.assertTrue(all(row["model_year"] == 2026 for row in owner_links))
        self.assertEqual(
            {record["model_id"] for record in self.references["records"]},
            {row["model_id"] for row in owner_links},
        )
        for link in [*owner_links, *vri_links]:
            match = re.fullmatch(
                r"\$\.records\[(\d+)\]\."
                r"(owner_manual|vehicle_reference_information)",
                link["locator"],
            )
            self.assertIsNotNone(match, link["locator"])
            assert match is not None
            record = self.references["records"][int(match.group(1))]
            self.assertEqual(link["model_id"], record["model_id"])
            self.assertIsNotNone(record[match.group(2)])

        example = self.references["records"][0]["owner_manual"]
        normalized = self.sources_by_url[BUILD.canonical_url(example["url"])]
        self.assertEqual(example["title"], normalized["title"])
        self.assertEqual("official_owner_manual_pdf", normalized["source_type"])
        self.assertEqual("official", normalized["officiality"])
        self.assertEqual(
            "official_manufacturer_document", normalized["document_authority"]
        )
        self.assertEqual("official_live", normalized["retrieval_host_type"])
        self.assertEqual(example["live_http_status"], normalized["http_status"])
        self.assertEqual(example["live_content_type"], normalized["content_type"])
        self.assertEqual(
            example["live_content_length_bytes"],
            normalized["content_length_bytes"],
        )

    def test_manual_portal_and_order_guide_relationships_are_explicit(self) -> None:
        self.assertEqual(
            4,
            sum(
                row["claim_type"] == "current_manual_portal_reference"
                for row in self.links
            ),
        )
        self.assertEqual(
            3,
            sum(
                row["claim_type"] == "current_color_authority_endpoint_template"
                for row in self.links
            ),
        )
        reconciliation_links = [
            row
            for row in self.links
            if row["claim_type"] == "current_color_authority_reconciliation"
        ]
        self.assertEqual(1, len(reconciliation_links))
        self.assertEqual(
            "data/audits/current-model-order-guide-reconciliation.json",
            reconciliation_links[0]["entity_id"],
        )

        authority = self.references["current_color_authority"]
        for field in (
            "generated_pdf_endpoint_template",
            "color_trim_endpoint_template",
            "vehicle_metadata_endpoint_template",
        ):
            normalized = self.sources_by_url[BUILD.canonical_url(authority[field])]
            self.assertEqual(
                "official_api_endpoint_template", normalized["source_type"]
            )
            self.assertIn("endpoint template", normalized["title"])


if __name__ == "__main__":
    unittest.main()
