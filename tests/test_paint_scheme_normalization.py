from __future__ import annotations

import importlib.util
import unittest
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "paint_scheme_normalized_builder",
    ROOT / "scripts" / "build-normalized-parquet.py",
)
assert SPEC and SPEC.loader
BUILD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD)

COMPILER_SPEC = importlib.util.spec_from_file_location(
    "suburban_paint_scheme_audit_compiler",
    ROOT / "scripts" / "compile-suburban-paint-scheme-audit.py",
)
assert COMPILER_SPEC and COMPILER_SPEC.loader
COMPILER = importlib.util.module_from_spec(COMPILER_SPEC)
COMPILER_SPEC.loader.exec_module(COMPILER)


class PaintSchemeNormalizationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.suburban_audit = BUILD.json_load(
            ROOT / "data" / "audits" / "suburban-paint-schemes-1977-1999.json"
        )

        # Build the complete relational rows in memory. write_outputs is
        # intentionally not called, so concurrent Parquet and source-registry
        # publication work cannot be overwritten by this focused test.
        cls.builder = BUILD.NormalizedArchiveBuilder()
        cls.builder.build_sources_first()
        cls.builder.apply_tracked_artifacts()
        cls.builder.apply_modern_artifacts()
        cls.builder.apply_crawler_artifacts()
        cls.builder.build_catalog_and_colors()
        cls.builder.build_paint_schemes()
        cls.builder.apply_specialty_artifacts()
        cls.builder.finalize_sources()
        availability = cls.builder.rows["color_availability"]
        cls.builder.rows["color_availability"] = []
        cls.builder.build_source_revisions_and_claims()
        cls.builder.rows["color_availability"] = availability
        cls.schemes = cls.builder.rows["paint_schemes"]
        cls.components = cls.builder.rows["paint_scheme_components"]
        cls.availability = availability
        cls.sources = {row["source_id"]: row for row in cls.builder.rows["sources"]}
        cls.revisions = {
            row["source_revision_id"]: row
            for row in cls.builder.rows["source_revisions"]
        }
        cls.components_by_scheme = defaultdict(list)
        for component in cls.components:
            cls.components_by_scheme[component["paint_scheme_id"]].append(component)

    def test_structured_suburban_audit_reconciles_every_documented_year(self) -> None:
        scheme_sets = {
            item["scheme_set_id"]: item for item in self.suburban_audit["scheme_sets"]
        }
        counts = Counter()
        package_counts = Counter()
        for year in self.suburban_audit["years"]:
            row_count = len(
                BUILD.expand_suburban_scheme_set(
                    self.suburban_audit,
                    scheme_sets[year["scheme_set_id"]],
                )
            )
            counts[year["year"]] += row_count
            package_counts[(year["year"], year["package_code"])] += row_count
        self.assertEqual(
            {
                1977: 6,
                1978: 6,
                1979: 6,
                1980: 6,
                1981: 8,
                1983: 8,
                1984: 23,
                1985: 23,
                1986: 23,
                1987: 56,
                1988: 112,
                1989: 188,
                1990: 135,
                1991: 147,
                1992: 168,
                1993: 31,
                1994: 43,
                1995: 47,
                1996: 51,
                1997: 43,
                1998: 21,
                1999: 34,
            },
            dict(counts),
        )
        self.assertEqual(
            {
                (1987, "ZY1 / ZY3"): 33,
                (1987, "ZY5"): 23,
                (1988, "ZY1 / ZY3"): 49,
                (1988, "ZY5"): 63,
                (1989, "ZY2"): 48,
                (1989, "ZY3"): 70,
                (1989, "ZY4"): 70,
                (1990, "ZY2"): 33,
                (1990, "ZY3"): 51,
                (1990, "ZY4"): 51,
                (1991, "ZY2"): 37,
                (1991, "ZY3"): 55,
                (1991, "ZY4"): 55,
                (1992, "ZY2"): 57,
                (1992, "ZY3"): 55,
                (1992, "ZY4"): 56,
                (1993, "ZY4"): 31,
                (1994, "ZY2"): 22,
                (1994, "ZY4"): 21,
                (1995, "ZY2"): 22,
                (1995, "ZY4"): 25,
                (1996, "ZY2"): 24,
                (1996, "ZY4"): 27,
                (1997, "ZY2"): 27,
                (1997, "ZY4"): 16,
                (1998, "ZY2"): 21,
                (1999, "ZY2"): 34,
            },
            {key: package_counts[key] for key in package_counts if key[0] >= 1987},
        )
        self.assertEqual(1185, sum(counts.values()))
        for year in self.suburban_audit["years"]:
            source = year["source"]
            self.assertTrue(source["source_id"].startswith("gm-heritage-"))
            self.assertTrue(source["url"].startswith("https://www.gm.com/"))
            self.assertRegex(source["locator"], r"PDF pp?\.")
            self.assertTrue(source["revision"])

    def test_structured_audit_is_in_sync_with_markdown_compiler(self) -> None:
        self.assertEqual(self.suburban_audit, COMPILER.build())

    def test_exact_scheme_and_component_counts(self) -> None:
        self.assertEqual(
            Counter({"tahoe": 184, "suburban": 1185}),
            Counter(row["model_id"] for row in self.schemes),
        )
        self.assertEqual(1369, len(self.schemes))
        self.assertEqual(2738, len(self.components))
        self.assertEqual(1369, len({row["paint_scheme_id"] for row in self.schemes}))
        self.assertEqual(
            2738,
            len({row["paint_scheme_component_id"] for row in self.components}),
        )

    def test_primary_and_secondary_roles_are_ordered_and_never_standalone(self) -> None:
        for scheme in self.schemes:
            components = sorted(
                self.components_by_scheme[scheme["paint_scheme_id"]],
                key=lambda row: row["component_order"],
            )
            self.assertEqual(2, len(components))
            self.assertEqual(
                [(1, "primary"), (2, "secondary")],
                [(row["component_order"], row["component_role"]) for row in components],
            )
            self.assertTrue(
                all(not row["standalone_availability_asserted"] for row in components)
            )
        self.assertNotIn(
            "color_identity_id",
            BUILD.SCHEMAS["paint_scheme_components"].names,
        )
        self.assertNotIn(
            "availability_id",
            BUILD.SCHEMAS["paint_scheme_components"].names,
        )

    def test_scheme_only_tahoe_gunmetal_is_not_flattened(self) -> None:
        gunmetal = [
            component
            for scheme in self.schemes
            if scheme["model_id"] == "tahoe" and scheme["model_year"] == 1995
            for component in self.components_by_scheme[scheme["paint_scheme_id"]]
            if component["component_role"] == "secondary"
            and component["source_color_name"] == "Gray, Gunmetal"
            and component["factory_code"] == "91L"
        ]
        self.assertEqual(7, len(gunmetal))
        self.assertFalse(
            any(
                row["model_id"] == "tahoe"
                and row["model_year"] == 1995
                and (
                    row["factory_code"] == "91L"
                    or row["source_color_name"] == "Gray, Gunmetal"
                )
                for row in self.availability
            )
        )

    def test_package_stripe_interior_and_duplicate_source_rows_are_preserved(
        self,
    ) -> None:
        carmine_schemes = []
        for scheme in self.schemes:
            if scheme["model_id"] != "suburban" or scheme["model_year"] != 1981:
                continue
            components = self.components_by_scheme[scheme["paint_scheme_id"]]
            primary = next(
                row for row in components if row["component_role"] == "primary"
            )
            secondary = next(
                row for row in components if row["component_role"] == "secondary"
            )
            if primary["factory_code"] == "70" and secondary["factory_code"] == "71":
                carmine_schemes.append(scheme)
        self.assertEqual(2, len(carmine_schemes))
        self.assertEqual(
            {"Vermillion/Dark Carmine Red", "Doeskin/Dark Carmine Red"},
            {row["stripe_colors"] for row in carmine_schemes},
        )
        self.assertEqual(
            {"Carmine or Slate", "Doeskin"},
            {row["interior_colors"] for row in carmine_schemes},
        )
        self.assertTrue(
            all(row["package_code"] == "ZY3 / ZY5" for row in carmine_schemes)
        )

    def test_late_square_body_printed_variants_are_preserved(self) -> None:
        def matching_schemes(year: int, package_code: str) -> list[dict]:
            return [
                scheme
                for scheme in self.schemes
                if scheme["model_id"] == "suburban"
                and scheme["model_year"] == year
                and scheme["package_code"] == package_code
            ]

        zy5_1988 = matching_schemes(1988, "ZY5")
        self.assertEqual(63, len(zy5_1988))
        self.assertEqual(
            49,
            len(
                {
                    tuple(
                        component["factory_code"]
                        for component in sorted(
                            self.components_by_scheme[scheme["paint_scheme_id"]],
                            key=lambda row: row["component_order"],
                        )
                    )
                    for scheme in zy5_1988
                }
            ),
        )

        for package_code in ("ZY3", "ZY4"):
            schemes = matching_schemes(1989, package_code)
            self.assertEqual(70, len(schemes))
            self.assertEqual(
                48,
                len(
                    {
                        tuple(
                            component["factory_code"]
                            for component in sorted(
                                self.components_by_scheme[scheme["paint_scheme_id"]],
                                key=lambda row: row["component_order"],
                            )
                        )
                        for scheme in schemes
                    }
                ),
            )

        def pair_50_96(package_code: str) -> list[dict]:
            return [
                scheme
                for scheme in matching_schemes(1989, package_code)
                if {
                    component["component_role"]: component["factory_code"]
                    for component in self.components_by_scheme[
                        scheme["paint_scheme_id"]
                    ]
                }
                == {"primary": "50", "secondary": "96"}
            ]

        zy3_pair = pair_50_96("ZY3")
        self.assertEqual(2, len(zy3_pair))
        self.assertEqual(
            {"Vermillion/Slate"},
            {scheme["stripe_colors"] for scheme in zy3_pair},
        )
        self.assertEqual(
            {"Dk. Blue", "Saddle"},
            {scheme["interior_colors"] for scheme in zy3_pair},
        )

        zy4_pair = pair_50_96("ZY4")
        self.assertEqual(2, len(zy4_pair))
        self.assertEqual(
            {"Dk. Blue/Slate", "Vermillion/Slate"},
            {scheme["stripe_colors"] for scheme in zy4_pair},
        )
        self.assertEqual(
            {"Dk. Blue", "Saddle"},
            {scheme["interior_colors"] for scheme in zy4_pair},
        )

    def test_recovered_brochure_years_create_standalone_availability(self) -> None:
        for year, expected_count in ((1989, 10), (1993, 10)):
            rows = [
                row
                for row in self.availability
                if row["model_id"] == "suburban" and row["model_year"] == year
            ]
            self.assertEqual(expected_count, len(rows))
            self.assertEqual(
                {"published_source_transcription"},
                {row["claim_status"] for row in rows},
            )

    def test_1991_source_anomaly_and_1992_d85_divergence_are_preserved(self) -> None:
        def matching(
            year: int, package: str, primary: str, secondary: str
        ) -> list[dict]:
            matches = []
            for scheme in self.schemes:
                if (
                    scheme["model_id"] != "suburban"
                    or scheme["model_year"] != year
                    or scheme["package_code"] != package
                ):
                    continue
                components = {
                    component["component_role"]: component["factory_code"]
                    for component in self.components_by_scheme[
                        scheme["paint_scheme_id"]
                    ]
                }
                if components == {"primary": primary, "secondary": secondary}:
                    matches.append(scheme)
            return matches

        anomalous = matching(1991, "ZY2", "97", "76")
        self.assertEqual(1, len(anomalous))
        self.assertIn("preserved without correction", anomalous[0]["source_annotation"])

        zy2_1992 = [
            row
            for row in self.schemes
            if row["model_id"] == "suburban"
            and row["model_year"] == 1992
            and row["package_code"] == "ZY2"
        ]
        self.assertEqual(57, len(zy2_1992))
        self.assertTrue(all(row["d85_stripe_colors"] for row in zy2_1992))
        self.assertTrue(all(row["stripe_colors"] is None for row in zy2_1992))

        zy3 = matching(1992, "ZY3", "96", "74")
        self.assertEqual(1, len(zy3))
        self.assertEqual("Vermilion/Silver", zy3[0]["stripe_colors"])
        self.assertEqual("Garnet, Gray", zy3[0]["interior_colors"])

        zy4 = matching(1992, "ZY4", "96", "74")
        self.assertEqual(2, len(zy4))
        self.assertEqual(
            {("Vermilion/Garnet", "Garnet"), ("Vermilion/Silver", "Gray")},
            {(row["stripe_colors"], row["interior_colors"]) for row in zy4},
        )
        self.assertTrue(
            all(row["restriction"] == "N/A K1500 w/B71 or K2500 models" for row in zy4)
        )

    def test_1993_scheme_only_chart_preserves_code_39(self) -> None:
        schemes = [
            row
            for row in self.schemes
            if row["model_id"] == "suburban" and row["model_year"] == 1993
        ]
        self.assertEqual(31, len(schemes))
        self.assertEqual({"ZY4"}, {row["package_code"] for row in schemes})
        indigo_components = [
            component
            for scheme in schemes
            for component in self.components_by_scheme[scheme["paint_scheme_id"]]
            if "indigo" in component["source_color_name"].lower()
        ]
        self.assertTrue(indigo_components)
        self.assertEqual({"39"}, {row["factory_code"] for row in indigo_components})

    def test_1994_1997_duplicate_variants_and_u_l_roles_are_preserved(self) -> None:
        expected_pair_counts = {
            (1994, "74", "50"): 2,
            (1995, "41U", "74L"): 3,
            (1996, "41U", "74L"): 3,
            (1997, "41U", "74L"): 2,
        }
        actual = Counter()
        for scheme in self.schemes:
            if (
                scheme["model_id"] != "suburban"
                or not 1994 <= scheme["model_year"] <= 1997
            ):
                continue
            if scheme["package_code"] != "ZY4":
                continue
            components = {
                component["component_role"]: component["factory_code"]
                for component in self.components_by_scheme[scheme["paint_scheme_id"]]
            }
            actual[
                (scheme["model_year"], components["primary"], components["secondary"])
            ] += 1
        for key, expected in expected_pair_counts.items():
            self.assertEqual(expected, actual[key], key)

        late_schemes = [
            scheme
            for scheme in self.schemes
            if scheme["model_id"] == "suburban" and 1995 <= scheme["model_year"] <= 1999
        ]
        for scheme in late_schemes:
            components = {
                component["component_role"]: component["factory_code"]
                for component in self.components_by_scheme[scheme["paint_scheme_id"]]
            }
            self.assertTrue(components["primary"].endswith("U"))
            self.assertTrue(components["secondary"].endswith("L"))

        scan_literal = [
            scheme
            for scheme in late_schemes
            if scheme["model_year"] == 1996
            and {
                component["component_role"]: component["factory_code"]
                for component in self.components_by_scheme[scheme["paint_scheme_id"]]
            }
            == {"primary": "96U", "secondary": "41L"}
            and scheme["package_code"] == "ZY4"
        ]
        self.assertEqual(1, len(scan_literal))
        self.assertEqual(
            "Silve [sic, terminal `r` not visible in scan]",
            scan_literal[0]["wheel_flare_color"],
        )

    def test_1998_1999_have_no_zy4_and_scheme_only_55l_is_not_promoted(self) -> None:
        for year in (1998, 1999):
            schemes = [
                row
                for row in self.schemes
                if row["model_id"] == "suburban" and row["model_year"] == year
            ]
            self.assertEqual({"ZY2"}, {row["package_code"] for row in schemes})
        autumnwood_components = [
            component
            for scheme in self.schemes
            if scheme["model_id"] == "suburban" and scheme["model_year"] == 1998
            for component in self.components_by_scheme[scheme["paint_scheme_id"]]
            if component["factory_code"] == "55L"
        ]
        self.assertTrue(autumnwood_components)
        self.assertFalse(
            any(
                row["model_id"] == "suburban"
                and row["model_year"] == 1998
                and row["factory_code"] in {"55L", "55U"}
                for row in self.availability
            )
        )

    def test_1990_1999_source_artifact_identity_is_exact(self) -> None:
        expected = {
            1990: (
                "46b985c6943036e27efd890122a3d3ffc5d0ba625d19305a978da5d3fec57df9",
                1130037,
                27,
            ),
            1991: (
                "24f2a80e283d48d02a137e0c71114e76d31466515130aa8b21a93d1ac1a0ff7f",
                1229801,
                29,
            ),
            1992: (
                "c91ee8f67a3e33f5e6485572f1347e90d12de287dcf8720e0529599032a05b78",
                746842,
                23,
            ),
            1993: (
                "607f0de7aa91612d9c406dd41df126b1959bd13d9d74c05c3137f01739b23341",
                573990,
                14,
            ),
            1994: (
                "895ef9992d0f5172084047683acfa8d543acea6bf37464df24fee50d9e3385df",
                1078053,
                28,
            ),
            1995: (
                "19161144f0aecfd285c1d4e51e549a8e39c70e7b3d42a139c240404fcef4fe9b",
                962051,
                28,
            ),
            1996: (
                "c7f1f9a1537331b0f4b5ba6bb96baf3d9bfe3919b4cb3e5241e2cf704ecdb217",
                770378,
                24,
            ),
            1997: (
                "1d28da68523c509ffce68ce2e96ef5566894dd886caf761071afce6b5b240a1d",
                948044,
                33,
            ),
            1998: (
                "7975a9871c0b41551bc5802aa1c833c25e31de238abce8d424def565261c3449",
                2294103,
                56,
            ),
            1999: (
                "684a88324706a990ad05687faee61b1d45f2e7af3ce7f291df4f47c3c3800598",
                1747598,
                47,
            ),
        }
        artifact_ledger = {
            item["source_id"]: item for item in self.builder.gm_artifacts["entries"]
        }
        for year in range(1990, 2000):
            sources = {
                (
                    item["source"]["artifact_sha256"],
                    item["source"]["artifact_bytes"],
                    item["source"]["pdf_page_count"],
                )
                for item in self.suburban_audit["years"]
                if item["year"] == year
            }
            self.assertEqual({expected[year]}, sources)
            ledger_entry = artifact_ledger[f"gm-heritage-{year}-chevrolet-suburban"]
            self.assertEqual(
                expected[year],
                (
                    ledger_entry["artifact_sha256"],
                    ledger_entry["byte_length"],
                    ledger_entry["pdf_page_count"],
                ),
            )

    def test_every_scheme_has_exact_source_and_immutable_revision(self) -> None:
        for scheme in self.schemes:
            source = self.sources[scheme["evidence_source_id"]]
            revision = self.revisions[scheme["evidence_source_revision_id"]]
            self.assertEqual(source["source_id"], revision["source_id"])
            self.assertTrue(source["canonical_url"].startswith("https://www.gm.com/"))
            self.assertTrue(scheme["pdf_pages"])
            self.assertRegex(scheme["evidence_locator"], r"PDF pp?\.")
            self.assertTrue(scheme["source_revision_label"])
            self.assertEqual("complete_file_rehashed", revision["integrity_status"])
        scheme_links = [
            row
            for row in self.builder.rows["source_links"]
            if row["claim_type"] == "paint_scheme_evidence"
        ]
        self.assertEqual(1369, len(scheme_links))
        self.assertEqual(
            {row["paint_scheme_id"] for row in self.schemes},
            {row["entity_id"] for row in scheme_links},
        )
        corroborating_links = [
            row
            for row in self.builder.rows["source_links"]
            if row["claim_type"] == "corroborating_paint_scheme_evidence"
        ]
        self.assertEqual(23, len(corroborating_links))
        self.assertTrue(
            all(row["model_id"] == "suburban" for row in corroborating_links)
        )

    def test_specialty_overlap_coalesces_without_losing_complete_chart_status(
        self,
    ) -> None:
        model_year_rows = {
            row["model_year_id"]: row for row in self.builder.rows["model_years"]
        }
        self.assertEqual(len(self.builder.rows["model_years"]), len(model_year_rows))
        suburban_1980 = model_year_rows["suburban:1980"]
        self.assertEqual("color_chart_verified", suburban_1980["research_status"])
        self.assertEqual(18, suburban_1980["verified_color_count"])
        tahoe_2011 = model_year_rows["tahoe:2011"]
        self.assertEqual(
            "reviewed_specialty_palette_subset", tahoe_2011["research_status"]
        )
        self.assertEqual(1, tahoe_2011["verified_color_count"])

    def test_specialty_overlap_keeps_the_governing_source_primary(self) -> None:
        availability = [
            row for row in self.availability if row["model_year_id"] == "suburban:1980"
        ]
        self.assertEqual(18, len(availability))
        self.assertEqual(2, len({row["evidence_source_id"] for row in availability}))
        primary_source_id = BUILD.primary_evidence_source_id(availability)
        primary_rows = [
            row
            for row in availability
            if row["evidence_source_id"] == primary_source_id
        ]
        overlay_rows = [
            row
            for row in availability
            if row["evidence_source_id"] != primary_source_id
        ]
        self.assertEqual(
            {"published_source_transcription"},
            {row["claim_status"] for row in primary_rows},
        )
        self.assertEqual(
            {"published_specialty_palette_subset"},
            {row["claim_status"] for row in overlay_rows},
        )

    def test_schema_manifest_contract_exposes_both_tables(self) -> None:
        self.assertEqual(11, BUILD.SCHEMA_VERSION)
        for field in ("d85_stripe_colors", "wheel_flare_color", "source_annotation"):
            self.assertIn(field, BUILD.SCHEMAS["paint_schemes"].names)
        self.assertEqual(["paint_scheme_id"], BUILD.PRIMARY_KEYS["paint_schemes"])
        self.assertEqual(
            ["paint_scheme_component_id"],
            BUILD.PRIMARY_KEYS["paint_scheme_components"],
        )
        self.assertEqual(
            "source_revisions.source_revision_id",
            BUILD.FOREIGN_KEYS["paint_schemes"]["evidence_source_revision_id"],
        )
        self.assertEqual(
            "paint_schemes.paint_scheme_id",
            BUILD.FOREIGN_KEYS["paint_scheme_components"]["paint_scheme_id"],
        )


if __name__ == "__main__":
    unittest.main()
