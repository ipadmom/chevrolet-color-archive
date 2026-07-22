from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any


CRAWLER_ROOT = Path(__file__).resolve().parents[1]
if str(CRAWLER_ROOT) not in sys.path:
    sys.path.insert(0, str(CRAWLER_ROOT))

from chevy_archive.color_table_batch import (
    CANDIDATE_SCHEMA,
    PAGE_SCHEMA,
    PIPELINE_VERSION,
    SOURCE_SCHEMA,
    source_shard,
    write_parquet,
)
from chevy_archive.color_table_corpus import ConsolidationError, consolidate


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.write_text(
        "".join(json.dumps(row, sort_keys=True) + "\n" for row in rows),
        encoding="utf-8",
    )


def shard_source_id(shard_index: int, shard_count: int) -> str:
    for suffix in range(10_000):
        source_id = f"gm-test-source-{shard_index}-{suffix}"
        if source_shard(source_id, shard_count) == shard_index:
            return source_id
    raise AssertionError("failed to find a synthetic shard source ID")


class SyntheticCorpus:
    def __init__(self, root: Path, shard_count: int = 2):
        self.root = root
        self.input_root = root / "extraction"
        self.input_root.mkdir()
        self.ledger_path = root / "artifact-ledger.json"
        self.shard_count = shard_count
        self.shard_rows: dict[int, dict[str, list[dict[str, Any]]]] = {}
        ledger_entries: list[dict[str, Any]] = []
        for shard_index in range(shard_count):
            source_id = shard_source_id(shard_index, shard_count)
            artifact_data = f"official-pdf-{source_id}".encode()
            artifact_sha = sha256(artifact_data)
            direct_url = f"https://www.gm.com/{source_id}.pdf"
            retrieved_at = "2026-07-21T00:00:00+00:00"
            source = {name: None for name in SOURCE_SCHEMA}
            source.update(
                {
                    "source_id": source_id,
                    "direct_url": direct_url,
                    "final_url": direct_url,
                    "document_title": f"Test {shard_index} Vehicle Information Kit",
                    "publisher": "General Motors",
                    "source_type": "official_vehicle_information_kit",
                    "officiality": "official",
                    "make": "Chevrolet",
                    "model": f"Test Model {shard_index}",
                    "year_start": 2000 + shard_index,
                    "year_end": 2000 + shard_index,
                    "pdf_metadata_json": "{}",
                    "retrieved_at": retrieved_at,
                    "artifact_sha256": artifact_sha,
                    "artifact_bytes": len(artifact_data),
                    "artifact_relpath": f"{artifact_sha[:2]}/{artifact_sha[2:4]}/{artifact_sha}.pdf",
                    "pdf_page_count": 1,
                    "pipeline_version": PIPELINE_VERSION,
                }
            )

            text_data = f"11 Summit White for {source_id}\n".encode()
            text_relpath = f"derived/page-text/{artifact_sha}/page-00001.txt"
            text_path = self.input_root / Path(*text_relpath.split("/"))
            text_path.parent.mkdir(parents=True, exist_ok=True)
            text_path.write_bytes(text_data)
            render_data = b"synthetic-png-evidence-" + bytes([shard_index])
            render_relpath = f"renders/{source_id}/page-00001.png"
            render_path = self.input_root / Path(*render_relpath.split("/"))
            render_path.parent.mkdir(parents=True, exist_ok=True)
            render_path.write_bytes(render_data)

            page = {name: None for name in PAGE_SCHEMA}
            page.update(
                {
                    "source_id": source_id,
                    "direct_url": direct_url,
                    "document_title": source["document_title"],
                    "model": source["model"],
                    "year_start": source["year_start"],
                    "year_end": source["year_end"],
                    "artifact_sha256": artifact_sha,
                    "artifact_bytes": len(artifact_data),
                    "retrieved_at": retrieved_at,
                    "pdf_page": 1,
                    "printed_page_locator": "BODY-1",
                    "candidate_page_score": 12,
                    "extraction_method": "native",
                    "extraction_engine": "PyMuPDF test",
                    "text_sha256": sha256(text_data),
                    "text_bytes": len(text_data),
                    "text_relpath": text_relpath,
                    "render_sha256": sha256(render_data),
                    "render_bytes": len(render_data),
                    "render_width": 2400,
                    "render_height": 3200,
                    "render_relpath": render_relpath,
                    "page_restrictions_json": "[]",
                    "visual_review_status": "required",
                    "pipeline_version": PIPELINE_VERSION,
                }
            )

            candidate = {name: None for name in CANDIDATE_SCHEMA}
            candidate.update(
                {
                    "source_id": source_id,
                    "direct_url": direct_url,
                    "document_title": source["document_title"],
                    "publisher": source["publisher"],
                    "source_type": source["source_type"],
                    "officiality": source["officiality"],
                    "make": source["make"],
                    "model": source["model"],
                    "model_year": source["year_start"],
                    "year_start": source["year_start"],
                    "year_end": source["year_end"],
                    "pdf_page": 1,
                    "printed_page_locator": page["printed_page_locator"],
                    "retrieved_at": retrieved_at,
                    "artifact_sha256": artifact_sha,
                    "artifact_bytes": len(artifact_data),
                    "color_name_raw": "Summit White",
                    "color_name_normalized": "SUMMIT WHITE",
                    "paint_code_raw": "11",
                    "paint_code_normalized": "11",
                    "row_kind": "solid_color",
                    "page_restrictions_json": "[]",
                    "availability_claim": "listed_in_source_candidate",
                    "record_status": "needs_review",
                    "verification_status": "unreviewed_candidate",
                    "confidence": 0.9,
                    "confidence_band": "high",
                    "evidence_text": "11 Summit White",
                    "evidence_line": 1,
                    "extraction_method": page["extraction_method"],
                    "extraction_engine": page["extraction_engine"],
                    "text_sha256": page["text_sha256"],
                    "text_relpath": text_relpath,
                    "render_sha256": page["render_sha256"],
                    "render_bytes": page["render_bytes"],
                    "render_relpath": render_relpath,
                    "visual_review_status": "required",
                    "pipeline_version": PIPELINE_VERSION,
                }
            )
            identity = "\0".join(
                (
                    source_id,
                    artifact_sha,
                    "1",
                    "solid_color",
                    "11",
                    "SUMMIT WHITE",
                    "",
                    "",
                )
            )
            candidate["candidate_id"] = sha256(identity.encode())
            self.shard_rows[shard_index] = {
                "source_documents": [source],
                "candidate_pages": [page],
                "color_candidates": [candidate],
            }
            ledger_entries.append(
                {
                    "source_id": source_id,
                    "canonical_url": direct_url,
                    "title": source["document_title"],
                    "artifact_sha256": artifact_sha,
                    "byte_length": len(artifact_data),
                    "media_type": "application/pdf",
                    "crawler_object_relpath": source["artifact_relpath"],
                    "integrity_status": "complete",
                    "final_url": direct_url,
                    "completed_at": retrieved_at,
                    "pdf_page_count": 1,
                }
            )
        self.ledger_path.write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "source_count": shard_count,
                    "file_audit": {
                        "all_objects_rehashed": True,
                        "all_byte_lengths_reconciled": True,
                        "all_pdfs_opened": True,
                    },
                    "entries": ledger_entries,
                },
                sort_keys=True,
            ),
            encoding="utf-8",
        )
        self.write_shards()

    def suffix(self, shard_index: int) -> str:
        return f".part-{shard_index:05d}-of-{self.shard_count:05d}"

    def write_shards(self) -> None:
        for shard_index, tables in self.shard_rows.items():
            suffix = self.suffix(shard_index)
            for table, schema in (
                ("source_documents", SOURCE_SCHEMA),
                ("candidate_pages", PAGE_SCHEMA),
                ("color_candidates", CANDIDATE_SCHEMA),
            ):
                rows = tables[table]
                write_jsonl(self.input_root / f"{table}{suffix}.jsonl", rows)
                write_parquet(self.input_root / f"{table}{suffix}.parquet", rows, schema)
            candidates = tables["color_candidates"]
            summary = {
                "pipeline_version": PIPELINE_VERSION,
                "started_at": "2026-07-21T00:00:00+00:00",
                "completed_at": "2026-07-21T00:01:00+00:00",
                "source_documents": len(tables["source_documents"]),
                "shard_count": self.shard_count,
                "shard_index": shard_index,
                "candidate_pages": len(tables["candidate_pages"]),
                "color_candidates": len(candidates),
                "rendered_candidate_pages": len(tables["candidate_pages"]),
                "rows_with_complete_provenance": len(candidates),
                "rows_with_paint_code": len(candidates),
                "rows_with_printed_page_locator": len(candidates),
                "rows_with_document_revision_date": 0,
                "rows_visually_inspected": 0,
                "parquet_written": True,
            }
            (self.input_root / f"run-summary{suffix}.json").write_text(
                json.dumps(summary, sort_keys=True), encoding="utf-8"
            )


class ColorTableCorpusTest(unittest.TestCase):
    def test_consolidation_is_deterministic_and_keeps_large_evidence_external(self):
        with tempfile.TemporaryDirectory() as temp:
            fixture = SyntheticCorpus(Path(temp))
            output_a = Path(temp) / "output-a"
            output_b = Path(temp) / "output-b"
            first = consolidate(
                input_root=fixture.input_root,
                output_root=output_a,
                artifact_ledger_path=fixture.ledger_path,
                expected_shards=2,
                expected_sources=2,
            )
            second = consolidate(
                input_root=fixture.input_root,
                output_root=output_b,
                artifact_ledger_path=fixture.ledger_path,
                expected_shards=2,
                expected_sources=2,
            )
            self.assertEqual(first, second)
            for filename in (
                "source_documents.parquet",
                "candidate_pages.parquet",
                "color_candidates.parquet",
                "manifest.json",
            ):
                self.assertEqual(
                    (output_a / filename).read_bytes(), (output_b / filename).read_bytes()
                )
            self.assertEqual(first["coverage"]["source_documents"], 2)
            self.assertEqual(first["coverage"]["candidate_pages"], 2)
            self.assertEqual(first["coverage"]["color_candidates"], 2)
            self.assertFalse(any(output_a.rglob("*.txt")))
            self.assertFalse(any(output_a.rglob("*.png")))

    def test_incomplete_shards_are_rejected_before_output(self):
        with tempfile.TemporaryDirectory() as temp:
            fixture = SyntheticCorpus(Path(temp))
            (fixture.input_root / f"run-summary{fixture.suffix(1)}.json").unlink()
            output = Path(temp) / "output"
            with self.assertRaisesRegex(ConsolidationError, "component mismatch"):
                consolidate(
                    input_root=fixture.input_root,
                    output_root=output,
                    artifact_ledger_path=fixture.ledger_path,
                    expected_shards=2,
                    expected_sources=2,
                )
            self.assertFalse((output / "manifest.json").exists())

    def test_repeated_provenance_and_evidence_hashes_are_enforced(self):
        with tempfile.TemporaryDirectory() as temp:
            fixture = SyntheticCorpus(Path(temp))
            candidate = fixture.shard_rows[0]["color_candidates"][0]
            candidate["direct_url"] = "https://www.gm.com/wrong.pdf"
            fixture.write_shards()
            with self.assertRaisesRegex(ConsolidationError, "repeated provenance mismatch"):
                consolidate(
                    input_root=fixture.input_root,
                    output_root=Path(temp) / "bad-provenance",
                    artifact_ledger_path=fixture.ledger_path,
                    expected_shards=2,
                    expected_sources=2,
                )

            candidate["direct_url"] = fixture.shard_rows[0]["source_documents"][0][
                "direct_url"
            ]
            fixture.write_shards()
            page = fixture.shard_rows[1]["candidate_pages"][0]
            evidence_path = fixture.input_root / Path(*page["text_relpath"].split("/"))
            evidence_path.write_text("tampered", encoding="utf-8")
            with self.assertRaisesRegex(ConsolidationError, "hash/byte mismatch"):
                consolidate(
                    input_root=fixture.input_root,
                    output_root=Path(temp) / "bad-evidence",
                    artifact_ledger_path=fixture.ledger_path,
                    expected_shards=2,
                    expected_sources=2,
                )


if __name__ == "__main__":
    unittest.main()
