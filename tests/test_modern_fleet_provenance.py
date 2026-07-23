from __future__ import annotations

import importlib.util
import unittest
from collections import Counter
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


class SpecialtyProgramDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.specialty = BUILD.json_load(
            ROOT / "data" / "sources" / "specialty-color-source-candidates.json"
        )
        cls.records = cls.specialty["app_publication_records"]
        cls.records_by_id = {row["record_id"]: row for row in cls.records}

    @classmethod
    def program_rows(cls, program_id: str) -> list[dict]:
        return [row for row in cls.records if row.get("program_id") == program_id]

    def test_specialty_publication_boundary_is_exact(self) -> None:
        self.assertEqual(533, len(self.records))
        self.assertEqual(533, len(self.records_by_id))
        self.assertEqual(
            553,
            sum(len(row["catalog_model_ids"]) for row in self.records),
        )
        self.assertEqual(
            {
                "published_specialty_subset": 529,
                "published_qualified_historical_subset": 4,
            },
            dict(Counter(row["publication_status"] for row in self.records)),
        )
        self.assertTrue(
            all(
                row["source"]["archive_url"].startswith(
                    "https://github.com/ipadmom/chevrolet-color-archive/releases/"
                )
                for row in self.records
            )
        )
        new_source_counts = {
            "gm-2015-tahoe-5w4": 7,
            "gm-2016-tahoe-9c1": 7,
            "gm-2016-tahoe-5w4": 7,
            "gm-2017-tahoe-9c1-4wd": 6,
            "gm-2018-tahoe-9c1-4wd": 5,
            "gm-2019-tahoe-5w4": 5,
            "gm-2020-tahoe-5w4": 5,
            "gm-2015-impala-limited-9c1-9c3": 30,
            "gm-2016-impala-limited-9c1-9c3": 30,
            "gm-2019-suburban-1fl-3500hd": 5,
            "gm-2020-suburban-1fl": 5,
        }
        self.assertEqual(11, len(new_source_counts))
        self.assertEqual(112, sum(new_source_counts.values()))
        self.assertEqual(
            new_source_counts,
            dict(
                Counter(
                    row["source"]["source_id"]
                    for row in self.records
                    if row["source"]["source_id"] in new_source_counts
                )
            ),
        )

        nonpublished = self.specialty["verified_not_published"]
        self.assertEqual(10, len(nonpublished))
        self.assertEqual(10, len({row["record_id"] for row in nonpublished}))
        self.assertFalse(
            set(self.records_by_id) & {row["record_id"] for row in nonpublished}
        )

    def test_forest_service_green_stays_unresolved_and_nonrouting(self) -> None:
        self.assertFalse(
            any(row["label"] == "Forest Service Green" for row in self.records)
        )
        self.assertFalse(
            any(
                row["label"] == "Forest Service Green"
                for row in self.specialty["verified_not_published"]
            )
        )

        leads = self.specialty["search_leads"]
        self.assertEqual(1, len(leads))
        self.assertEqual(
            "research_only_unresolved_chevrolet_application",
            leads[0]["status"],
        )
        self.assertNotIn("catalog_model_ids", leads[0])
        self.assertNotIn("model_year", leads[0])

        identities = {
            row["identity_id"]: row for row in self.specialty["identity_ledger"]
        }
        self.assertEqual(
            "verified_agency_color_unresolved_chevrolet_application",
            identities["usfs-forest-service-green-fs595-14260"]["status"],
        )
        self.assertEqual(
            "verified_identifier_relationship_to_fs595_14260_unresolved",
            identities["usfs-forest-service-green-5032"]["status"],
        )
        ck_woodland = identities["gm-woodland-green-we9015-1993-ck"]
        self.assertEqual(["WE9015", "SEO 9V5"], ck_woodland["codes"])
        self.assertIn("Forest Service Green", ck_woodland["not_equated_to"])
        self.assertIn("Woodland Green WA-9015", ck_woodland["not_equated_to"])
        self.assertEqual(6, len(self.specialty["usda_primary_sources"]))

    def test_historic_factory_and_fleet_rows_preserve_printed_codes(self) -> None:
        rows_1979 = [row for row in self.records if row["model_year"] == 1979]
        self.assertEqual(
            {
                "9V2": (
                    "Tangier Orange",
                    "Not printed",
                    {
                        "ck-series",
                        "blazer",
                        "suburban",
                        "g-series-van",
                        "sportvan",
                    },
                ),
                "9V4": (
                    "Wheatland Yellow",
                    "Not printed",
                    {
                        "ck-series",
                        "blazer",
                        "suburban",
                        "g-series-van",
                        "sportvan",
                    },
                ),
                "9V8": (
                    "Crimson Red",
                    "Not printed",
                    {"g-series-van", "sportvan"},
                ),
            },
            {
                row["seo_code"]: (
                    row["label"],
                    row["paint_code"],
                    set(row["catalog_model_ids"]),
                )
                for row in rows_1979
            },
        )
        self.assertEqual(
            {"gm-heritage-1979-chevrolet-blazer"},
            {row["source"]["source_id"] for row in rows_1979},
        )
        self.assertEqual({14}, {row["source"]["pdf_page"] for row in rows_1979})

        rows_1980 = [row for row in self.records if row["model_year"] == 1980]
        self.assertEqual(
            {
                ("Woodland Green", "46", "9V5"),
                ("Tangier Orange", "Not printed", "9V2"),
                ("Wheatland Yellow", "Not printed", "9V4"),
                ("Crimson Red", "Not printed", "9V8"),
            },
            {(row["label"], row["paint_code"], row["seo_code"]) for row in rows_1980},
        )
        crimson_1980 = next(row for row in rows_1980 if row["seo_code"] == "9V8")
        restrictions = " ".join(crimson_1980["restrictions"])
        self.assertIn("Crimson Red", restrictions)
        self.assertIn("CARDINAL RED", restrictions)
        for code in ("9V2", "9V4"):
            row = next(item for item in rows_1980 if item["seo_code"] == code)
            self.assertTrue(
                any(
                    "not projected" in restriction
                    for restriction in row["restrictions"]
                )
            )

        rows_1993 = [
            row
            for row in self.records
            if row["model_year"] == 1993 and row["catalog_model_ids"] == ["s10"]
        ]
        self.assertEqual(
            {
                "9W4": ("Tangier Orange", "WE9417"),
                "9W3": ("Wheatland Yellow", "WE9418"),
                "9V5": ("Woodland Green", "WE7156"),
                "9V9": ("Doeskin Tan", "WE8265"),
            },
            {row["seo_code"]: (row["label"], row["paint_code"]) for row in rows_1993},
        )
        self.assertTrue(
            all(
                row["application_type"] == "factory_installed_special_equipment_option"
                and row["program_id"]
                == "gm-1993-s10-pickup-factory-installed-special-equipment-options"
                and row["factory_installation_claim"] is True
                for row in rows_1993
            )
        )
        s10_program = next(
            row
            for row in self.specialty["program_definitions"]
            if row["program_id"]
            == "gm-1993-s10-pickup-factory-installed-special-equipment-options"
        )
        self.assertTrue(s10_program["factory_installation_claim"])
        self.assertEqual("S-10 Pickup only", s10_program["source_scope"])
        self.assertEqual(
            {
                "gm-1993-s10-tangier-orange-we9417-9w4",
                "gm-1993-s10-wheatland-yellow-we9418-9w3",
                "gm-1993-s10-woodland-green-we7156-9v5",
                "gm-1993-s10-doeskin-tan-we8265-9v9",
            },
            set(
                self.specialty["integrity_audit"]["structured_field_backfills"][
                    0
                ]["record_ids"]
            ),
        )

        ck_rows_1993 = self.program_rows(
            "gm-1993-ck-pickup-special-equipment-option-paint"
        )
        self.assertEqual(4, len(ck_rows_1993))
        self.assertEqual(
            {
                "9W4": ("Tangier Orange", "Orange, Tangier", "WE9417"),
                "9W3": ("Wheatland Yellow", "Yellow, Wheatland", "WE9418"),
                "9V5": ("Woodland Green", "Green, Woodland", "WE9015"),
                "9V9": ("Doeskin Tan", "Tan, Doeskin", "WE9403"),
            },
            {
                row["seo_code"]: (
                    row["label"],
                    row["source_label_raw"],
                    row["paint_code"],
                )
                for row in ck_rows_1993
            },
        )
        self.assertTrue(
            all(
                row["catalog_model_ids"] == ["ck-series"]
                and row["source_model_scope"] == ["C/K Pickup"]
                and row["application_type"] == "manufacturer_special_equipment_option"
                and row["availability_state"] == "available"
                and row["lead_time_days"] == 0
                for row in ck_rows_1993
            )
        )
        self.assertTrue(
            all(
                row["source"]["source_id"] == "gm-heritage-1993-chevrolet-truck"
                and row["source"]["pdf_page"] == 12
                and row["source"]["printed_page"] == "Page 18 - C/K Pickup"
                and row["source"]["bytes"] == 13_034_550
                and row["source"]["pdf_page_count"] == 94
                and row["source"]["sha256"]
                == "5183176f4af0d61bd63cc7d6fb02117129c870c28c42bc9fe22abcc2eea52d3e"
                for row in ck_rows_1993
            )
        )
        self.assertTrue(
            all(
                any(
                    "does not state that the paint was installed at the assembly plant"
                    in restriction
                    for restriction in row["restrictions"]
                )
                for row in ck_rows_1993
            )
        )
        program = next(
            row
            for row in self.specialty["program_definitions"]
            if row["program_id"] == "gm-1993-ck-pickup-special-equipment-option-paint"
        )
        self.assertFalse(program["factory_installation_claim"])
        self.assertEqual("C/K Pickup only", program["source_scope"])
        self.assertTrue(
            all(
                any("0 days" in restriction for restriction in row["restrictions"])
                for row in rows_1993
            )
        )

    def test_kerr_program_is_complete_and_not_misclassified_as_factory_paint(
        self,
    ) -> None:
        expected_colors = {
            "121A": ("Adriatic Blue", "BEA", "BFE"),
            "311B": ("Olive", "BEB", "BFF"),
            "5120": ("Blue", "BEQ", "BFU"),
            "5236": ("Neutral", "BEC", "BFG"),
            "5322": ("Driftwood", "BER", "BFV"),
            "5665": ("Blue", "BED", "BFH"),
            "5749": ("Gold", "BES", "BFW"),
            "5845": ("Beige", "BEE", "BFI"),
            "7153": ("Blue", "BET", "BFX"),
            "7159": ("Blue", "BEF", "BFJ"),
            "7262": ("Brown", "BEU", "BFY"),
            "7801": ("Brown", "BEG", "BFK"),
            "7840": ("Silver", "BEV", "BFZ"),
            "7868": ("Blue", "BEH", "BFL"),
            "7888": ("Blue", "BEW", "BGA"),
            "7889": ("Blue", "BEP", "BFT"),
            "7964": ("Green", "BEI", "BFM"),
            "7999": ("Blue", "BEX", "BGB"),
            "8380": ("Blue", "BEJ", "BFN"),
            "8381": ("Gray", "BEY", "BGC"),
            "8401": ("Yellow", "BEK", "BFO"),
            "8412": ("Green", "BEZ", "BGD"),
            "8431": ("Rose Metallic", "BEL", "BFP"),
            "8554": ("White", "BFA", "BGE"),
            "8555": ("Black (41U)", "BEM", "BFQ"),
            "8624": ("Summit White (50U)", "BG8", "BGK"),
            "8743": ("Blue Black", "BFB", "BGF"),
            "9021": ("Silver", "BEN", "BFR"),
            "9382": ("Blue", "BFC", "BGG"),
            "9403": ("Tan", "BEO", "BFS"),
        }
        year_contracts = {
            2011: ("impala", "gm-2011-police-manual", [52, 53, 54, 55, 56, 57]),
            2012: ("impala", "gm-2012-municipal-manual", [54, 55, 56, 57, 58, 59]),
            2013: ("impala", "gm-2013-municipal-guide", [55, 56, 57]),
            2014: ("impala-limited", "gm-2014-police-guide", [50, 51, 52]),
            2015: ("impala-limited", "gm-2015-impala-limited-9c1-9c3", [8, 9]),
            2016: ("impala-limited", "gm-2016-impala-limited-9c1-9c3", [8, 9]),
        }

        for year, (model_id, source_id, pdf_pages) in year_contracts.items():
            expected_year_colors = dict(expected_colors)
            if year >= 2015:
                expected_year_colors["8555"] = ("Black", "BEM", "BFQ")
                expected_year_colors["8624"] = ("Summit White", "BG8", "BGK")
            rows = self.program_rows(
                f"gm-{year}-{'impala-limited' if year >= 2014 else 'impala'}-kerr-authorized-upfitter-paint"
            )
            self.assertEqual(30, len(rows), year)
            self.assertEqual(
                expected_year_colors,
                {
                    row["paint_code"]: (
                        row["label"],
                        row["upfitter_order_codes"]["code_1"],
                        row["upfitter_order_codes"]["code_2"],
                    )
                    for row in rows
                },
                year,
            )
            self.assertTrue(all(row["catalog_model_ids"] == [model_id] for row in rows))
            self.assertTrue(
                all(row["source"]["source_id"] == source_id for row in rows)
            )
            self.assertTrue(
                all(row["source"]["pdf_pages"] == pdf_pages for row in rows)
            )
            self.assertTrue(
                all(
                    row["application_type"] == "authorized_upfitter_post_build"
                    for row in rows
                )
            )
            self.assertTrue(
                all(
                    row["availability_state"] == "available_through_authorized_upfitter"
                    for row in rows
                )
            )
            self.assertTrue(all(row["paint_code_heading"] == "WA#" for row in rows))
            self.assertTrue(
                all(not row["paint_code"].startswith("WA-") for row in rows)
            )
            if year <= 2014:
                self.assertTrue(
                    all(row["seo_code"] == "Not applicable" for row in rows)
                )
            else:
                self.assertTrue(all(row["seo_code"] is None for row in rows))
                self.assertTrue(
                    all(
                        row["source_seo_code_cell_state"] == "column_absent"
                        for row in rows
                    )
                )

        self.assertEqual(18, len(self.specialty["program_definitions"]))
        program = next(
            row
            for row in self.specialty["program_definitions"]
            if row["program_id"] == "gm-impala-kerr-authorized-upfitter-paint-2011-2014"
        )
        self.assertEqual("authorized_upfitter_post_build", program["application_type"])
        self.assertFalse(program["factory_finish_claim"])
        self.assertEqual(["White 50U", "Black 41U"], program["base_rpo_requirement"])
        self.assertEqual(
            [
                ("W001", "1PA"),
                ("W002", "1PB"),
                ("W003", "1PC"),
                ("W006", "1PF"),
                ("W008", "1PH"),
                ("W009", "1PI"),
                ("W012", "1PL"),
            ],
            [
                (row["source_scheme"], row["order_code"])
                for row in program["two_tone_schemes"]
            ],
        )
        limited_program = next(
            row
            for row in self.specialty["program_definitions"]
            if row["program_id"]
            == "gm-impala-limited-kerr-authorized-upfitter-paint-2015-2016"
        )
        self.assertEqual(
            [
                "gm-2015-impala-limited-kerr-authorized-upfitter-paint",
                "gm-2016-impala-limited-kerr-authorized-upfitter-paint",
            ],
            limited_program["program_ids"],
        )
        self.assertEqual(["impala-limited"], limited_program["catalog_model_ids"])
        self.assertEqual(
            "authorized_upfitter_post_build", limited_program["application_type"]
        )
        self.assertFalse(limited_program["factory_installation_claim"])

    def test_caprice_ppv_program_palettes_and_source_precedence_are_exact(self) -> None:
        expected_counts = {
            "gm-2011-caprice-9c1-ppv-standard-palette": 7,
            "gm-2011-caprice-9c3-detective-standard-palette": 7,
            "gm-2012-caprice-9c1-ppv-standard-palette": 8,
            "gm-2012-caprice-9c3-detective-standard-palette": 8,
            "gm-2013-caprice-9c1-ppv-standard-palette": 7,
            "gm-2013-caprice-9c3-detective-standard-palette": 7,
            "gm-2014-caprice-9c1-ppv-standard-palette": 7,
            "gm-2015-caprice-9c1-ppv-standard-palette": 6,
            "gm-2016-caprice-9c1-ppv-standard-palette": 6,
            "gm-2017-caprice-9c1-ppv-standard-palette": 4,
        }
        caprice = [
            row for row in self.records if row["catalog_model_ids"] == ["caprice-ppv"]
        ]
        self.assertEqual(67, len(caprice))
        self.assertEqual(
            expected_counts,
            {
                program_id: len(self.program_rows(program_id))
                for program_id in expected_counts
            },
        )
        self.assertEqual(
            {"standard_program_palette"},
            {row["application_type"] for row in caprice},
        )
        self.assertTrue(all(row["paint_code"] == "Not printed" for row in caprice))
        self.assertTrue(all(row["factory_paint_code"] is None for row in caprice))
        self.assertTrue(all(row["wa_code"] is None for row in caprice))
        self.assertTrue(all(row["seo_code"] is None for row in caprice))
        self.assertTrue(
            all(
                row["code_display"].startswith(f"RPO {row['rpo_code']}")
                for row in caprice
            )
        )

        hugo = [row for row in caprice if row["rpo_code"] == "GYW"]
        self.assertEqual(7, len(hugo))
        self.assertEqual(
            {2012, 2013, 2014, 2015, 2016},
            {row["model_year"] for row in hugo},
        )
        self.assertTrue(
            all(
                row["availability_state"] == "available_with_minimum_batch"
                and row["minimum_batch_units"] == 20
                for row in hugo
            )
        )
        self.assertTrue(
            all(
                row["availability_state"] == "available"
                for row in caprice
                if row["rpo_code"] != "GYW"
            )
        )

        by_year = {
            year: {row["rpo_code"] for row in caprice if row["model_year"] == year}
            for year in range(2011, 2018)
        }
        self.assertNotIn("GST", by_year[2013])
        self.assertNotIn("GGG", by_year[2014])
        self.assertNotIn("GYW", by_year[2017])
        self.assertNotIn("GZ7", by_year[2017])
        self.assertFalse(
            any(
                row["program_code"] == "9C3" and row["model_year"] >= 2014
                for row in caprice
            )
        )

        self.assertEqual(6, len(self.specialty["source_conflict_assertions"]))
        self.assertEqual(12, len(self.specialty["program_lifecycle_assertions"]))
        self.assertTrue(
            all(
                row["precedence_policy_id"]
                == "caprice-model-specific-guide-over-fleet-summary"
                for row in self.specialty["source_conflict_assertions"]
            )
        )
        conflict_2014 = next(
            row
            for row in self.specialty["source_conflict_assertions"]
            if row["model_year"] == 2014
        )
        self.assertEqual(
            "Mystic Green (New)", conflict_2014["differences"][0]["model_guide"]
        )
        self.assertEqual(
            "Prussian Steel (new)", conflict_2014["differences"][0]["fleet_guide"]
        )

        retained = {
            row["source_id"]: row
            for row in self.specialty["historic_gm_upfitter_candidates"]
        }
        self.assertEqual(
            37, retained["gm-2015-caprice-9c1-specification-guide"]["pdf_page_count"]
        )
        self.assertEqual(
            37, retained["gm-2016-caprice-9c1-specification-guide"]["pdf_page_count"]
        )
        self.assertEqual(
            40, retained["gm-2017-caprice-9c1-specification-guide"]["pdf_page_count"]
        )

    def test_bolt_and_blazer_public_safety_availability_is_year_exact(self) -> None:
        bolt = self.program_rows("gm-2023-bolt-euv-5w4-ssv")
        self.assertEqual(
            {
                "GSJ": ("Silver Flare Metallic", "WA-251F"),
                "GB8": ("Mosaic Black Metallic", "WA-384A"),
                "G7X": ("Ice Blue Metallic", "WA-621G"),
                "GLT": ("Bright Blue Metallic", "WA-327E"),
                "GNT": ("Radiant Red Tintcoat", "WA-170H"),
                "GRC": ("Gray Ghost Metallic", "WA-247F"),
                "GAZ": ("Summit White", "WA-8624"),
            },
            {
                row["factory_order_code"]: (row["label"], row["paint_code"])
                for row in bolt
            },
        )
        self.assertTrue(all(row["availability_state"] == "available" for row in bolt))
        self.assertEqual(
            {"GLT", "GNT"},
            {
                row["factory_order_code"]
                for row in bolt
                if any("additional charge" in text for text in row["restrictions"])
            },
        )

        blazer_2026 = self.program_rows("gm-2026-blazer-ev-9c1-9c3-5w4-seo-paint")
        self.assertEqual(
            {
                "5T4": ("Victory Red", "WA-9260"),
                "9V2": ("MSP Blue Goose", "WA-5665"),
                "9V7": ("Dark Blue Metallic", "WA-722J"),
                "9W5": ("Silver Ice Metallic", "WA-636R"),
            },
            {row["seo_code"]: (row["label"], row["paint_code"]) for row in blazer_2026},
        )
        self.assertTrue(
            all(
                row["availability_state"] == "available_with_possible_extended_lead"
                for row in blazer_2026
            )
        )

        snapshots = [
            row
            for row in self.specialty["verified_not_published"]
            if "blazer-ev" in row["catalog_model_ids"]
        ]
        self.assertEqual(8, len(snapshots))
        self.assertEqual(
            {"not_available_at_snapshot"},
            {
                row["availability_state"]
                for row in snapshots
                if row["model_year"] == 2024
            },
        )
        self.assertEqual(
            {
                "planned_q1_2025_at_snapshot": 1,
                "not_available_at_snapshot": 3,
            },
            {
                state: len(
                    [
                        row
                        for row in snapshots
                        if row["model_year"] == 2025
                        and row["availability_state"] == state
                    ]
                )
                for state in {
                    row["availability_state"]
                    for row in snapshots
                    if row["model_year"] == 2025
                }
            },
        )
        self.assertFalse(
            any(
                row["model_year"] in {2024, 2025}
                and "blazer-ev" in row["catalog_model_ids"]
                for row in self.records
            )
        )

    def test_silverado_ppv_and_ssv_programs_remain_separate_and_complete(self) -> None:
        expected_standard = {
            "G7C": ("Red Hot", "WA-130X"),
            "GAZ": ("Summit White", "WA-8624"),
            "GNO": ("Sterling Gray Metallic", "WA-130H"),
            "GBA": ("Black", "WA-8555"),
        }
        expected_seo = {
            ("Doeskin Tan", "WA-9403", "Not printed"),
            ("Dark Toredor Red", "WA-334D", "Not printed"),
            ("Unripened Green Metallic", "WA-136X", "Not printed"),
            ("Indigo Blue", "WA-9792", "Not printed"),
            ("Yellow", "WA-5248", "Not printed"),
            ("Yellow", "WA-5445", "Not printed"),
            ("Yellow", "WA-5456", "Not printed"),
            ("Yellow", "WA-9414", "Not printed"),
            ("Orange", "WA-770H", "Not printed"),
            ("Blue", "WA-454N", "Not printed"),
            ("Lt. Autumnwood Metallic", "WA-228A", "Not printed"),
            ("Pewter", "WA-382E", "Not printed"),
            ("Blue", "WA-5405", "Not printed"),
            ("Blue", "WA-7154", "Not printed"),
            ("Orange", "WA-9419", "Not printed"),
            ("Arrival Blue Metallic", "WA-815K", "Not printed"),
            ("Green", "WA-7927", "Not printed"),
            ("Silver Ice Metallic", "WA-363R", "5IS"),
            ("Tangier Orange", "WA-9417", "9W4"),
            ("Wheatland Yellow", "WA-253A", "9W3"),
            ("Woodland Green", "WA-9015", "9V5"),
        }
        source_ids = {
            "gm-2026-silverado-9c1": "gm-2026-silverado-9c1-041426",
            "gm-2026-silverado-5w4": "gm-2026-silverado-5w4-041426",
        }

        for program_id, source_id in source_ids.items():
            rows = self.program_rows(program_id)
            self.assertEqual(25, len(rows), program_id)
            standard = [
                row
                for row in rows
                if row["application_type"] == "standard_program_palette"
            ]
            seo = [
                row
                for row in rows
                if row["application_type"] == "special_equipment_option_paint"
            ]
            self.assertEqual(
                expected_standard,
                {
                    row["factory_order_code"]: (row["label"], row["paint_code"])
                    for row in standard
                },
                program_id,
            )
            self.assertEqual(
                expected_seo,
                {(row["label"], row["paint_code"], row["seo_code"]) for row in seo},
                program_id,
            )
            self.assertTrue(
                all(row["availability_state"] == "available" for row in standard)
            )
            self.assertTrue(
                all(
                    row["availability_state"] == "closed_after_2026-02-02"
                    for row in seo
                )
            )
            self.assertTrue(
                all(row["source"]["source_id"] == source_id for row in rows)
            )
            self.assertTrue(all(row["source"]["pdf_pages"] == [3, 11] for row in rows))
            self.assertTrue(
                all(
                    any("five orders" in text for text in row["restrictions"])
                    for row in seo
                )
            )

        ppv_rows = self.program_rows("gm-2026-silverado-9c1")
        self.assertTrue(
            any(
                "5W4 SSV" in text
                for row in ppv_rows
                for text in row.get("restrictions", [])
            )
        )
        wheatland_ppv = next(row for row in ppv_rows if row["paint_code"] == "WA-253A")
        self.assertTrue(
            any(
                "Whealtland Yellow" in text
                for text in wheatland_ppv["source_literal_anomalies"]
            )
        )


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
        cls.brochure_release_source_ids = builder.brochure_release_source_ids_by_asset

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
            self.assertEqual(entry.get("pdf_page_count"), revision["pdf_page_count"])
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
        sources_by_id = {row["source_id"]: row for row in self.builder.rows["sources"]}
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

    def test_specialty_artifact_registration_contract_is_reconciled(self) -> None:
        specialty = BUILD.json_load(
            ROOT / "data" / "sources" / "specialty-color-source-candidates.json"
        )
        self.assertEqual(
            87,
            specialty["integrity_audit"]["unique_retained_artifacts_reconciled"],
        )
        last_rehash = specialty["integrity_audit"]["last_updater_rehash"]
        self.assertEqual(11, last_rehash["file_count"])
        self.assertEqual(
            "scripts/update-2015-2020-specialty-fleet-tranche.mjs",
            last_rehash["script"],
        )
        self.assertEqual(
            [
                "gm-2015-tahoe-5w4",
                "gm-2016-tahoe-9c1",
                "gm-2016-tahoe-5w4",
                "gm-2017-tahoe-9c1-4wd",
                "gm-2018-tahoe-9c1-4wd",
                "gm-2019-tahoe-5w4",
                "gm-2020-tahoe-5w4",
                "gm-2015-impala-limited-9c1-9c3",
                "gm-2016-impala-limited-9c1-9c3",
                "gm-2019-suburban-1fl-3500hd",
                "gm-2020-suburban-1fl",
            ],
            last_rehash["source_ids"],
        )
        updater = (ROOT / last_rehash["script"]).read_text(encoding="utf-8")
        self.assertNotIn("Math.max", updater)
        self.assertIn("collectArtifactIdentities", updater)
        self.assertTrue(specialty["integrity_audit"]["byte_lengths_reconciled"])
        self.assertTrue(specialty["integrity_audit"]["sha256_digests_reconciled"])


if __name__ == "__main__":
    unittest.main()
