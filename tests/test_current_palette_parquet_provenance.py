from __future__ import annotations

import unittest
from collections import Counter
from pathlib import Path

import pyarrow.parquet as pq


ROOT = Path(__file__).resolve().parents[1]
PARQUET = ROOT / "data" / "parquet"


class CurrentPaletteParquetProvenanceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.availability = pq.read_table(
            PARQUET / "color_availability.parquet"
        ).to_pylist()
        cls.claims = {
            row["availability_id"]: row
            for row in pq.read_table(
                PARQUET / "evidence_claims.parquet"
            ).to_pylist()
        }
        cls.sources = {
            row["source_id"]: row
            for row in pq.read_table(PARQUET / "sources.parquet").to_pylist()
        }
        cls.revisions = {
            row["source_revision_id"]: row
            for row in pq.read_table(
                PARQUET / "source_revisions.parquet"
            ).to_pylist()
        }
        cls.links = pq.read_table(PARQUET / "source_links.parquet").to_pylist()
        cls.model_photo_links = pq.read_table(
            PARQUET / "model_photo_links.parquet"
        ).to_pylist()

    def row(self, model_id: str, model_year: int, label: str) -> dict:
        matches = [
            row
            for row in self.availability
            if row["model_id"] == model_id
            and row["model_year"] == model_year
            and row["source_color_name"] == label
        ]
        self.assertEqual(1, len(matches))
        return matches[0]

    def assert_exact_claim(
        self,
        row: dict,
        *,
        source_id: str,
        factory_code: str,
        touch_up_code: str | None,
        page: int,
    ) -> None:
        self.assertEqual(source_id, row["evidence_source_id"])
        self.assertEqual(factory_code, row["factory_code"])
        self.assertEqual(touch_up_code, row["touch_up_code"])
        claim = self.claims[row["availability_id"]]
        self.assertEqual(source_id, claim["source_id"])
        self.assertEqual([page], claim["pdf_pages"])
        revision = self.revisions[claim["source_revision_id"]]
        self.assertEqual(source_id, revision["source_id"])
        self.assertEqual(
            "release_manifest_hash_recorded", revision["integrity_status"]
        )
        self.assertRegex(
            self.sources[source_id]["archive_url"],
            r"/current-order-guide-source-archive-v1/",
        )

    def test_blazer_ev_and_corvette_rows_point_to_their_exact_order_guides(
        self,
    ) -> None:
        habanero = self.row("blazer-ev", 2025, "Habanero Orange")
        self.assert_exact_claim(
            habanero,
            source_id="gm-online-order-guide-pdf-22878",
            factory_code="GAG",
            touch_up_code="WA-221K",
            page=35,
        )
        self.assertEqual("GAG", habanero["rpo_code"])
        self.assertEqual("WA-221K", habanero["wa_code"])
        self.assertEqual("WA-221K", habanero["source_wa_code_raw"])
        self.assertEqual(
            "printed_with_prefix", habanero["source_wa_code_cell_state"]
        )
        self.assertRegex(habanero["restriction"], r"SS only")

        blade = self.row("corvette", 2026, "Blade Silver Matte")
        self.assert_exact_claim(
            blade,
            source_id="gm-online-order-guide-pdf-23208",
            factory_code="GRF",
            touch_up_code="WA-730S",
            page=174,
        )
        self.assertEqual("GRF", blade["rpo_code"])
        self.assertEqual("WA-730S", blade["wa_code"])
        self.assertRegex(blade["restriction"], r"ZRA")
        self.assertRegex(blade["restriction"], r"D30")

    def test_low_cab_forward_union_preserves_body_family_and_identity(self) -> None:
        expected = {
            "Arc White": ("16U", "gm-online-order-guide-pdf-22745", 21),
            "Ebony Black": ("41U", "gm-online-order-guide-pdf-22775", 20),
            "Woodland Green": ("46U", "gm-online-order-guide-pdf-22775", 20),
            "Dark Blue": ("47U", "gm-online-order-guide-pdf-22775", 20),
            "Cardinal Red": ("74U", "gm-online-order-guide-pdf-22775", 20),
            "Wheatland Yellow": ("86U", "gm-online-order-guide-pdf-22775", 20),
        }
        for label, (code, source_id, page) in expected.items():
            row = self.row("low-cab-forward", 2025, label)
            self.assert_exact_claim(
                row,
                source_id=source_id,
                factory_code=code,
                touch_up_code=None,
                page=page,
            )
            self.assertIsNone(row["wa_code"])

        woodland = self.row("low-cab-forward", 2025, "Woodland Green")
        self.assertRegex(woodland["restriction"], r"Isuzu color code 46U")
        self.assertRegex(woodland["restriction"], r"no WA number")
        self.assertNotRegex(woodland["restriction"], r"WA-9015")

        arc_white = self.row("low-cab-forward", 2025, "Arc White")
        supporting = {
            link["source_id"]
            for link in self.links
            if link["entity_id"] == arc_white["availability_id"]
            and link["claim_type"]
            == "color_availability_supporting_evidence"
        }
        self.assertEqual(
            {
                "gm-online-order-guide-pdf-22775",
                "gm-online-order-guide-pdf-22821",
            },
            supporting,
        )

    def test_2024_current_model_fleet_guide_union_is_exact(self) -> None:
        rows = [
            row
            for row in self.availability
            if row["model_year"] == 2024
            and row["claim_status"] == "published_qualified_palette_union"
            and row["evidence_source_id"] == "gm-fleet-guide-us-2024-v3"
        ]
        expected_counts = {
            "blazer": 9,
            "blazer-ev": 8,
            "colorado": 8,
            "corvette": 14,
            "equinox": 8,
            "express": 4,
            "silverado": 11,
            "silverado-ev": 2,
            "silverado-hd": 14,
            "suburban": 9,
            "tahoe": 9,
            "trailblazer": 9,
            "trax": 10,
        }
        self.assertEqual(115, len(rows))
        self.assertEqual(
            expected_counts,
            dict(Counter(row["model_id"] for row in rows)),
        )
        self.assertTrue(
            all(
                row["factory_code"] is None
                and row["factory_code_status"] == "not_printed_in_source"
                and row["availability_state"] == "restricted"
                for row in rows
            )
        )
        self.assertFalse(
            {"traverse", "low-cab-forward", "equinox-ev"}
            & {row["model_id"] for row in rows}
        )

        cited_pages = set()
        for row in rows:
            claim = self.claims[row["availability_id"]]
            self.assertEqual("gm-fleet-guide-us-2024-v3", claim["source_id"])
            self.assertEqual(
                "human_checked_qualified_palette_union",
                claim["verification_status"],
            )
            self.assertEqual(
                "not_printed_in_source",
                claim["transcribed_factory_code_status"],
            )
            cited_pages.update(claim["pdf_pages"])
            revision = self.revisions[claim["source_revision_id"]]
            self.assertEqual(
                "7511f74a0edee3c396bbe2a42746f75d0d61871897686505f4899e65835c8851",
                revision["artifact_sha256"],
            )
            self.assertEqual(
                "complete_file_rehashed",
                revision["integrity_status"],
            )

        self.assertEqual(
            {
                17,
                20,
                32,
                36,
                37,
                40,
                47,
                53,
                54,
                61,
                66,
                70,
                76,
                77,
                87,
                89,
                91,
            },
            cited_pages,
        )
        self.assertRegex(
            self.sources["gm-fleet-guide-us-2024-v3"]["archive_url"],
            r"/brochure-source-archive-v1/2024-gm-fleet-guide-v3-mirror\.pdf$",
        )

        self.assertRegex(
            self.row("silverado-ev", 2024, "Black")["restriction"],
            r"Late model year availability",
        )
        self.assertRegex(
            self.row("corvette", 2024, "Sea Wolf Gray Tricoat")["restriction"],
            r"Premium paint; additional cost",
        )
        self.assertRegex(
            self.row("blazer-ev", 2024, "Iridescent Pearl Tricoat")[
                "restriction"
            ],
            r"Premium paint; additional charge",
        )

    def test_2024_low_cab_forward_uses_the_advance_model_year_pages(self) -> None:
        rows = [
            row
            for row in self.availability
            if row["model_id"] == "low-cab-forward"
            and row["model_year"] == 2024
            and row["claim_status"] == "published_qualified_palette_union"
            and row["evidence_source_id"] == "gm-fleet-guide-us-2023-v3"
        ]
        self.assertEqual(6, len(rows))
        self.assertEqual(
            {
                "Arc White",
                "Cardinal Red",
                "Dark Blue",
                "Ebony Black",
                "Wheatland Yellow",
                "Woodland Green",
            },
            {row["source_color_name"] for row in rows},
        )
        self.assertTrue(
            all(
                row["factory_code"] is None
                and row["factory_code_status"] == "not_printed_in_source"
                and row["availability_state"] == "restricted"
                for row in rows
            )
        )
        for row in rows:
            claim = self.claims[row["availability_id"]]
            self.assertEqual("gm-fleet-guide-us-2023-v3", claim["source_id"])
            self.assertEqual([77, 78], claim["pdf_pages"])
            revision = self.revisions[claim["source_revision_id"]]
            self.assertEqual(
                "697423b1c274d8fe30f9e58fc5dc9ecf365d119f7f1155f54dc4c3fd9d8484ef",
                revision["artifact_sha256"],
            )
        self.assertRegex(
            self.sources["gm-fleet-guide-us-2023-v3"]["archive_url"],
            r"/brochure-source-archive-v1/2023-gm-fleet-guide-v3-mirror\.pdf$",
        )
        self.assertRegex(
            self.row("low-cab-forward", 2024, "Woodland Green")["restriction"],
            r"6500 XD/7500 XD page lists Arc White only",
        )

    def test_brightdrop_400_photo_cross_reference_sources_are_exhaustive(
        self,
    ) -> None:
        photo_id = "commons-sha1-0389a3d594263d394933"
        matches = [
            row
            for row in self.model_photo_links
            if row["photo_id"] == photo_id
            and row["model_id"] == "brightdrop-400"
            and row["model_year"] == 2025
        ]
        self.assertEqual(1, len(matches))
        model_photo_link_id = matches[0]["model_photo_link_id"]
        links = [
            row
            for row in self.links
            if row["entity_type"] == "model_photo_link"
            and row["entity_id"] == model_photo_link_id
            and row["claim_type"] == "photo_model_identity_cross_reference"
        ]
        self.assertEqual(3, len(links))
        self.assertEqual(
            {
                "https://commons.wikimedia.org/wiki/File:2025_Chevrolet_Brightdrop_au_SIAM_2025.jpg",
                "https://en.wikipedia.org/wiki/Chevrolet_BrightDrop",
                "https://assets.salonautomontreal.com/wp-content/uploads/2025/01/27142725/PR_EN_SIAM_PositiveOutcome_80th-edition.pdf",
            },
            {self.sources[row["source_id"]]["canonical_url"] for row in links},
        )
        official_report = next(
            self.sources[row["source_id"]]
            for row in links
            if self.sources[row["source_id"]]["source_type"] == "event_report"
        )
        self.assertEqual("official", official_report["officiality"])
        self.assertTrue(
            all(
                row["locator"]
                == "official_event_roster_plus_exact_file_caption"
                for row in links
            )
        )


if __name__ == "__main__":
    unittest.main()
