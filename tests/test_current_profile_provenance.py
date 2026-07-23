from __future__ import annotations

import json
import unittest
from pathlib import Path

import pyarrow.parquet as pq


ROOT = Path(__file__).resolve().parents[1]
REFERENCE_PATH = (
    ROOT / "data" / "catalog" / "chevrolet-current-profile-references.json"
)
REGISTRY_PATH = ROOT / "data" / "sources" / "source-registry.json"
SOURCE_LINKS_PATH = ROOT / "data" / "parquet" / "source_links.parquet"
REFERENCE_ENTITY_ID = (
    "data/catalog/chevrolet-current-profile-references.json"
)


class CurrentProfileProvenanceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.references = json.loads(REFERENCE_PATH.read_text(encoding="utf-8"))
        cls.registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
        cls.sources_by_url = {
            row["canonical_url"]: row for row in cls.registry["sources"]
        }
        cls.sources_by_id = {
            row["source_id"]: row for row in cls.registry["sources"]
        }
        cls.links_by_locator = {
            row["locator"]: row
            for row in pq.read_table(SOURCE_LINKS_PATH).to_pylist()
            if row["entity_type"] == "data_file"
            and row["entity_id"] == REFERENCE_ENTITY_ID
        }

    def test_every_geometry_authority_is_normalized_and_source_linked(self) -> None:
        geometry_records = [
            (index, record)
            for index, record in enumerate(self.references["records"])
            if record.get("geometry_dimension_source")
        ]
        self.assertEqual(10, len(geometry_records))

        for record_index, record in geometry_records:
            geometry = record["geometry_dimension_source"]
            source_url = geometry["source_url"]
            source = self.sources_by_url[source_url]
            declared_source = self.sources_by_id[geometry["source_id"]]
            self.assertEqual(source_url, declared_source["canonical_url"])
            self.assertEqual(geometry["source_id"], source["source_id"])
            locator = (
                f"$.records[{record_index}]."
                "geometry_dimension_source.source_url"
            )
            link = self.links_by_locator[locator]
            self.assertEqual(geometry["source_id"], link["source_id"])
            self.assertEqual(source["source_id"], link["source_id"])
            self.assertEqual("data_file_reference", link["claim_type"])
            self.assertEqual("documented", link["review_state"])

            archive_url = geometry.get("archive_url")
            if archive_url:
                archive_source = self.sources_by_url[archive_url]
                archive_locator = (
                    f"$.records[{record_index}]."
                    "geometry_dimension_source.archive_url"
                )
                archive_link = self.links_by_locator[archive_locator]
                self.assertEqual(
                    archive_source["source_id"], archive_link["source_id"]
                )


if __name__ == "__main__":
    unittest.main()
