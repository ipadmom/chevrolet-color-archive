import unittest
from collections import Counter
from pathlib import Path

import pyarrow.parquet as pq


ROOT = Path(__file__).resolve().parents[1]
PARQUET = ROOT / "data" / "parquet"


class AuditedColorProgramParquetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.programs = pq.read_table(
            PARQUET / "audited_color_programs.parquet"
        ).to_pylist()
        cls.entries = pq.read_table(
            PARQUET / "audited_color_program_entries.parquet"
        ).to_pylist()
        cls.availability = pq.read_table(
            PARQUET / "color_availability.parquet"
        ).to_pylist()
        cls.sources = pq.read_table(PARQUET / "sources.parquet").to_pylist()
        cls.source_links = pq.read_table(
            PARQUET / "source_links.parquet"
        ).to_pylist()

    def test_every_audit_program_and_entry_is_normalized(self):
        self.assertEqual(80, len(self.programs))
        self.assertEqual(552, len(self.entries))
        self.assertEqual(
            Counter(
                {
                    "monte-carlo": 36,
                    "corvette": 28,
                    "p-series-step-van": 16,
                }
            ),
            Counter(row["model_id"] for row in self.programs),
        )
        self.assertEqual(
            Counter(
                {
                    "monte-carlo": 298,
                    "corvette": 155,
                    "p-series-step-van": 99,
                }
            ),
            Counter(row["model_id"] for row in self.entries),
        )

    def test_publication_roles_do_not_flatten_alternate_or_component_rows(self):
        self.assertEqual(
            Counter(
                {
                    "published_regular_palette": 258,
                    "alternate_complete_regular_palette": 30,
                    "research_only_component_program": 264,
                }
            ),
            Counter(row["publication_role"] for row in self.entries),
        )
        published = [
            row
            for row in self.entries
            if row["standalone_body_color_availability_asserted"]
        ]
        self.assertEqual(258, len(published))
        self.assertEqual(
            Counter(
                {"monte-carlo": 149, "corvette": 92, "p-series-step-van": 17}
            ),
            Counter(row["model_id"] for row in published),
        )
        self.assertTrue(
            all(
                row["publication_role"] == "published_regular_palette"
                for row in published
            )
        )

    def test_program_publication_matches_exact_app_availability(self):
        program_rows = sorted(
            (
                row["model_id"],
                row["model_year"],
                row["source_color_name"],
                row["factory_code"],
            )
            for row in self.entries
            if row["standalone_body_color_availability_asserted"]
        )
        app_rows = sorted(
            (
                row["model_id"],
                row["model_year"],
                row["source_color_name"],
                row["factory_code"],
            )
            for row in self.availability
            if row["claim_status"]
            == "published_qualified_exact_program_palette"
            and row["model_id"]
            in {"monte-carlo", "corvette", "p-series-step-van"}
        )
        self.assertEqual(program_rows, app_rows)

    def test_partial_step_van_years_remain_research_only(self):
        partial = [
            row
            for row in self.entries
            if row["model_id"] == "p-series-step-van"
            and 1969 <= row["model_year"] <= 1977
        ]
        self.assertTrue(partial)
        self.assertTrue(
            all(
                row["publication_role"].startswith("research_only")
                and not row["standalone_body_color_availability_asserted"]
                for row in partial
            )
        )
        self.assertFalse(
            any(
                row["model_id"] == "p-series-step-van"
                and 1969 <= row["model_year"] <= 1977
                and row["claim_status"]
                == "published_qualified_exact_program_palette"
                for row in self.availability
            )
        )

    def test_every_program_entry_has_an_exhaustive_source_link(self):
        source_ids = {row["source_id"] for row in self.sources}
        for program in self.programs:
            self.assertIn(program["primary_evidence_source_id"], source_ids)
            self.assertTrue(
                set(program["supporting_evidence_source_ids"]).issubset(source_ids)
            )
        linked_entry_ids = {
            row["entity_id"]
            for row in self.source_links
            if row["entity_type"] == "audited_color_program_entry"
            and row["claim_type"] == "audited_color_program_entry_evidence"
        }
        self.assertEqual(
            {row["audit_program_entry_id"] for row in self.entries},
            linked_entry_ids,
        )


if __name__ == "__main__":
    unittest.main()
