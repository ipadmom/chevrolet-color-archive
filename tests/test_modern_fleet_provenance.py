from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_script(module_name: str, filename: str):
    spec = importlib.util.spec_from_file_location(
        module_name, ROOT / "scripts" / filename
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BUILD = load_script("normalized_parquet_builder", "build-normalized-parquet.py")
REFRESH = load_script(
    "gap_inventory_refresh_provenance", "refresh-color-research-gap-inventory.py"
)

ANCHOR_ARTIFACTS = {
    "gm-fleet-guide-us-2021-v3": {
        "sha256": "92aaec592e01b0dbf5aca290a34ea2f96908a7324fcd475446af09df8fa7ee1c",
        "bytes": 14_541_647,
        "pages": 110,
    },
    "gm-fleet-guide-us-2022-v6": {
        "sha256": "265ab13a565ccb5c733ce27af2b03f0ffe3d38bb196fd222650e2fff2043375c",
        "bytes": 20_549_478,
        "pages": 119,
    },
    "gm-fleet-guide-us-2024-v3": {
        "sha256": "7511f74a0edee3c396bbe2a42746f75d0d61871897686505f4899e65835c8851",
        "bytes": 14_780_183,
        "pages": 114,
    },
}

QUALIFIED_PALETTE_ARTIFACTS = {
    "chevrolet-ebrochure-us-2022-tahoe": {
        "sha256": "e9ae0dcf9355564fbdf34dfc09aa07d57d80983dd4350d8ccacc36f43856a8e1",
        "bytes": 6_929_934,
        "pages": 27,
        "retrieved_at": "2026-07-21T18:22:52Z",
    },
    "chevrolet-ebrochure-us-2023-colorado": {
        "sha256": "941d24b627ce7b660d3dec2d85c010abd91a3a1b3218ff7a3016b056c7497c59",
        "bytes": 4_426_440,
        "pages": 31,
        "retrieved_at": "2026-07-21T18:22:54Z",
    },
    "chevrolet-ebrochure-us-2023-silverado-hd-commercial": {
        "sha256": "add78758e31ea729e43593ad231eb4d3920548d89e1b03eff68f7650d4caf0b3",
        "bytes": 5_447_116,
        "pages": 32,
        "retrieved_at": "2026-07-21T18:22:56Z",
    },
    "chevrolet-ebrochure-us-2023-silverado-4500-6500-hd": {
        "sha256": "ca1c88edd10c30151a5533e6da2f8f5cfc8b1b8a4fb25f7de9c0535d596bc836",
        "bytes": 2_603_896,
        "pages": 23,
        "retrieved_at": "2026-07-21T18:22:57Z",
    },
}


class ModernFleetProvenanceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.modern_manifest = BUILD.json_load(
            ROOT / "data" / "sources" / "modern-chevrolet-color-source-candidates.json"
        )
        cls.fleet_manifest = {
            item["source_id"]: item
            for item in cls.modern_manifest["sources"]
            if item.get("source_type") == "fleet_guide_pdf"
        }
        cls.retained_manifest = {
            item["source_id"]: item
            for item in cls.modern_manifest["sources"]
            if item.get("local_file_path")
        }
        cls.qualified_palette_manifest = {
            source_id: cls.retained_manifest[source_id]
            for source_id in QUALIFIED_PALETTE_ARTIFACTS
        }

        # This focused builder path rehashes and opens every retained PDF. It does
        # not call write_outputs, so it cannot overwrite the concurrently rebuilt
        # project Parquet files or source registry.
        builder = object.__new__(BUILD.NormalizedArchiveBuilder)
        builder.modern_color_sources = cls.modern_manifest
        builder.modern_color_sources_by_id = {
            item["source_id"]: item for item in cls.modern_manifest["sources"]
        }
        builder.brochure_source_release_manifest = BUILD.json_load(
            BUILD.BROCHURE_SOURCE_RELEASE_MANIFEST_PATH
        )
        builder.rows = {name: [] for name in BUILD.SCHEMAS}
        builder.sources_by_url = {}
        builder.source_id_to_url = {}
        builder.source_pdf_page_counts = {}
        builder.source_links_seen = set()
        builder.specialty_artifacts_by_url = {}
        builder.brochure_release_entries_by_source_id = {}
        builder.brochure_release_source_ids_by_asset = {}
        builder.gm_artifacts = {"entries": []}
        builder.apply_modern_artifacts()
        builder.apply_brochure_release_artifacts()
        builder.finalize_sources()
        builder.build_source_revisions_and_claims()

        cls.builder = builder
        cls.sources = {row["source_id"]: row for row in builder.rows["sources"]}
        cls.revisions = {
            row["source_id"]: row for row in builder.rows["source_revisions"]
        }
        cls.brochure_manifest = builder.brochure_source_release_manifest
        cls.brochure_release_source_ids = (
            builder.brochure_release_source_ids_by_asset
        )

    def test_gap_inventory_binds_artifacts_to_retrieval_urls(self) -> None:
        records_by_year = REFRESH.modern_fleet_source_records()
        self.assertEqual(set(range(2008, 2027)), set(records_by_year))
        for year, records in records_by_year.items():
            self.assertEqual(1, len(records))
            record = records[0]
            manifest = self.fleet_manifest[record["crawler_source_id"]]
            self.assertEqual(manifest["retrieval_url"], record["pdf_url"])
            self.assertEqual(manifest["retrieval_url"], record["retrieval_url"])
            self.assertEqual(
                manifest.get("direct_official_url"), record["direct_official_url"]
            )
            self.assertEqual(
                manifest.get("historical_official_url"),
                record["historical_official_url"],
            )
            self.assertEqual(manifest.get("landing_url"), record["landing_url"])
            self.assertEqual(manifest["local_file_path"], record["artifact_relpath"])
            self.assertIsNone(record["http_status"], year)
            self.assertEqual("official", record["officiality"])
            self.assertEqual(
                "official_manufacturer_document", record["document_authority"]
            )

    def test_all_retained_fleet_guides_have_immutable_revisions(self) -> None:
        self.assertEqual(19, len(self.fleet_manifest))
        self.assertTrue(set(self.fleet_manifest) <= set(self.revisions))
        for source_id, manifest in self.fleet_manifest.items():
            source = self.sources[source_id]
            revision = self.revisions[source_id]
            self.assertEqual(
                BUILD.canonical_url(manifest["retrieval_url"]),
                source["canonical_url"],
            )
            self.assertEqual(manifest["sha256"], revision["artifact_sha256"])
            self.assertEqual(manifest["bytes"], revision["byte_length"])
            self.assertEqual(manifest["page_count"], revision["pdf_page_count"])
            self.assertEqual(manifest["local_file_path"], revision["artifact_relpath"])
            self.assertEqual("complete_file_rehashed", revision["integrity_status"])
            self.assertIsNone(source["http_status"])
            self.assertIsNone(revision["http_status"])

    def test_all_retained_modern_pdfs_have_immutable_revisions(self) -> None:
        self.assertEqual(23, len(self.retained_manifest))
        self.assertEqual(
            set(self.retained_manifest),
            set(self.revisions) - set(self.brochure_release_source_ids.values()),
        )
        self.assertEqual(
            set(QUALIFIED_PALETTE_ARTIFACTS),
            set(BUILD.QUALIFIED_MODERN_PALETTE_SOURCE_IDS),
        )

    def test_all_brochure_release_assets_have_immutable_revisions(self) -> None:
        entries = self.brochure_manifest["entries"]
        self.assertEqual(len(entries), len(self.brochure_release_source_ids))
        self.assertEqual(
            len(entries), len(set(self.brochure_release_source_ids.values()))
        )
        for entry in entries:
            source_id = self.brochure_release_source_ids[entry["asset_name"]]
            source = self.sources[source_id]
            revision = self.revisions[source_id]
            media_type = BUILD.release_asset_media_type(entry["asset_name"])
            self.assertEqual(
                BUILD.canonical_url(entry["archive_url"]), source["canonical_url"]
            )
            self.assertEqual(entry["archive_url"], source["archive_url"])
            self.assertEqual(entry["sha256"], revision["artifact_sha256"])
            self.assertEqual(entry["bytes"], revision["byte_length"])
            self.assertEqual(media_type, source["content_type"])
            self.assertEqual(media_type, revision["media_type"])
            self.assertEqual(
                entry.get("pdf_page_count"), revision["pdf_page_count"]
            )
            self.assertEqual(entry["archive_url"], revision["archive_url"])
            self.assertEqual(
                "release_manifest_hash_recorded", revision["integrity_status"]
            )
            metadata = BUILD.json.loads(source["notes"])
            self.assertEqual(entry["asset_name"], metadata["asset_name"])
            self.assertEqual(entry["role"], metadata["role"])
            self.assertEqual(
                self.brochure_manifest["release_tag"], metadata["release_tag"]
            )

    def test_brochure_release_provenance_urls_remain_separate_links(self) -> None:
        sources_by_id = {
            row["source_id"]: row for row in self.builder.rows["sources"]
        }
        links_by_entity_and_type = {
            (row["entity_id"], row["claim_type"]): row
            for row in self.builder.rows["source_links"]
            if row["entity_type"] == "brochure_release_asset"
        }
        release_tag = self.brochure_manifest["release_tag"]
        for entry in self.brochure_manifest["entries"]:
            entity_id = f"{release_tag}:{entry['asset_name']}"
            release_link = links_by_entity_and_type[
                (entity_id, "retained_release_asset")
            ]
            self.assertEqual(
                self.brochure_release_source_ids[entry["asset_name"]],
                release_link["source_id"],
            )
            for claim_type, field in (
                ("original_source_url", "original_source_url"),
                ("retrieval_url", "retrieval_url"),
                ("parent_source_url", "parent_source_url"),
            ):
                if not entry.get(field):
                    continue
                link = links_by_entity_and_type[(entity_id, claim_type)]
                self.assertEqual(
                    BUILD.canonical_url(entry[field]),
                    sources_by_id[link["source_id"]]["canonical_url"],
                )
                if claim_type == "original_source_url" and entry.get("source_id"):
                    self.assertEqual(entry["source_id"], link["source_id"])

    def test_qualified_palette_artifact_metadata_is_exact(self) -> None:
        for source_id, expected in QUALIFIED_PALETTE_ARTIFACTS.items():
            manifest = self.qualified_palette_manifest[source_id]
            source = self.sources[source_id]
            revision = self.revisions[source_id]
            artifact_path = ROOT / manifest["local_file_path"]

            self.assertEqual(manifest["retrieval_url"], manifest["direct_official_url"])
            self.assertEqual(
                BUILD.canonical_url(manifest["retrieval_url"]),
                source["canonical_url"],
            )
            self.assertEqual(expected["sha256"], BUILD.sha256_file(artifact_path))
            self.assertEqual(expected["bytes"], artifact_path.stat().st_size)
            self.assertEqual(
                expected["pages"],
                len(BUILD.PdfReader(artifact_path, strict=False).pages),
            )
            self.assertEqual(expected["sha256"], revision["artifact_sha256"])
            self.assertEqual(expected["bytes"], revision["byte_length"])
            self.assertEqual(expected["pages"], revision["pdf_page_count"])
            self.assertEqual(expected["retrieved_at"], revision["retrieved_at"])
            self.assertEqual(manifest["local_file_path"], revision["artifact_relpath"])
            self.assertEqual("complete_file_rehashed", revision["integrity_status"])
            self.assertIsNone(source["http_status"])
            self.assertIsNone(revision["http_status"])

    def test_artifact_hashes_bind_only_to_retrieval_and_release_urls(self) -> None:
        sources_by_url = {
            row["canonical_url"]: row for row in self.builder.rows["sources"]
        }
        for source_id, manifest in self.retained_manifest.items():
            retrieval_url = BUILD.canonical_url(manifest["retrieval_url"])
            matching_sources = [
                source
                for source in self.builder.rows["sources"]
                if source.get("content_sha256") == manifest["sha256"]
            ]
            expected_urls = sorted(
                {
                    retrieval_url,
                    BUILD.canonical_url(manifest["archive_url"]),
                }
            )
            self.assertEqual(
                expected_urls,
                sorted(row["canonical_url"] for row in matching_sources),
            )
            for related_url in (
                manifest.get("direct_official_url"),
                manifest.get("historical_official_url"),
                manifest.get("landing_url"),
            ):
                if related_url and BUILD.canonical_url(related_url) != retrieval_url:
                    related_source = sources_by_url[BUILD.canonical_url(related_url)]
                    self.assertIsNone(related_source["content_sha256"], source_id)
                    self.assertIsNone(related_source["content_length_bytes"], source_id)

    def test_anchor_artifact_metadata_is_exact(self) -> None:
        for source_id, expected in ANCHOR_ARTIFACTS.items():
            source = self.sources[source_id]
            revision = self.revisions[source_id]
            self.assertEqual(expected["sha256"], source["content_sha256"])
            self.assertEqual(expected["bytes"], source["content_length_bytes"])
            self.assertEqual(expected["sha256"], revision["artifact_sha256"])
            self.assertEqual(expected["bytes"], revision["byte_length"])
            self.assertEqual(expected["pages"], revision["pdf_page_count"])
            self.assertEqual("archival_mirror", source["retrieval_host_type"])
            self.assertEqual(
                "xr793.com", BUILD.urlsplit(source["canonical_url"]).hostname
            )

    def test_official_and_landing_urls_remain_separate_links(self) -> None:
        links_by_entity_and_type = {
            (row["entity_id"], row["claim_type"]): row
            for row in self.builder.rows["source_links"]
        }
        for source_id, manifest in self.retained_manifest.items():
            retrieval_link = links_by_entity_and_type[
                (source_id, "source_retrieval_url")
            ]
            self.assertEqual(
                BUILD.canonical_url(manifest["retrieval_url"]),
                self.sources[retrieval_link["source_id"]]["canonical_url"],
            )
            if manifest.get("direct_official_url"):
                official_link = links_by_entity_and_type[
                    (source_id, "direct_official_url")
                ]
                official_source = self.sources[official_link["source_id"]]
                self.assertEqual(
                    BUILD.canonical_url(manifest["direct_official_url"]),
                    official_source["canonical_url"],
                )
                if manifest["direct_official_url"] != manifest["retrieval_url"]:
                    self.assertIsNone(official_source["content_sha256"])
                    self.assertIsNone(official_source["content_length_bytes"])
            if manifest.get("historical_official_url"):
                historical_link = links_by_entity_and_type[
                    (source_id, "historical_official_url")
                ]
                historical_source = self.sources[historical_link["source_id"]]
                self.assertEqual(
                    BUILD.canonical_url(manifest["historical_official_url"]),
                    historical_source["canonical_url"],
                )
                self.assertIsNone(historical_source["content_sha256"])
                self.assertIsNone(historical_source["content_length_bytes"])
            if manifest.get("landing_url"):
                landing_link = links_by_entity_and_type[
                    (source_id, "source_landing_url")
                ]
                self.assertEqual(
                    BUILD.canonical_url(manifest["landing_url"]),
                    self.sources[landing_link["source_id"]]["canonical_url"],
                )

    def test_source_classification_uses_stable_enums(self) -> None:
        self.assertTrue(
            {row["officiality"] for row in self.builder.rows["sources"]}
            <= BUILD.SOURCE_OFFICIALITY_VALUES
        )
        for source_id in self.retained_manifest:
            source = self.sources[source_id]
            self.assertEqual("official", source["officiality"])
            self.assertEqual(
                "official_manufacturer_document", source["document_authority"]
            )
            self.assertIn(
                source["retrieval_host_type"], BUILD.RETRIEVAL_HOST_TYPE_VALUES
            )
        with self.assertRaises(ValueError):
            BUILD.normalized_officiality("invented_status")

    def test_explicit_source_id_rekeys_prior_anonymous_links(self) -> None:
        builder = object.__new__(BUILD.NormalizedArchiveBuilder)
        builder.rows = {name: [] for name in BUILD.SCHEMAS}
        builder.sources_by_url = {}
        builder.source_id_to_url = {}
        builder.source_links_seen = set()
        url = "https://www.gm.com/example/source.pdf"
        anonymous_id = builder.ensure_source(url)
        builder.add_source_link(
            anonymous_id,
            claim_type="platform_era_evidence",
            entity_type="platform_era",
            entity_id="example:2000-2001",
            claim_summary="Example source",
            confidence="catalogued",
            review_state="catalogued",
        )
        explicit_id = builder.ensure_source(url, source_id="gm-example-source")
        builder.finalize_sources()

        self.assertEqual("gm-example-source", explicit_id)
        self.assertEqual(
            {"gm-example-source"},
            {row["source_id"] for row in builder.rows["sources"]},
        )
        self.assertEqual(
            {"gm-example-source"},
            {row["source_id"] for row in builder.rows["source_links"]},
        )
        self.assertNotIn(anonymous_id, builder.source_id_to_url)

    def test_specialty_artifact_registration_contract_remains_62(self) -> None:
        specialty = BUILD.json_load(
            ROOT / "data" / "sources" / "specialty-color-source-candidates.json"
        )
        self.assertEqual(
            62, specialty["integrity_audit"]["unique_retained_files_rehashed"]
        )
        self.assertTrue(specialty["integrity_audit"]["byte_lengths_reconciled"])
        self.assertTrue(specialty["integrity_audit"]["sha256_digests_reconciled"])


if __name__ == "__main__":
    unittest.main()
