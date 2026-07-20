from __future__ import annotations

import json
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

CRAWLER_ROOT = Path(__file__).resolve().parents[1]
if str(CRAWLER_ROOT) not in sys.path:
    sys.path.insert(0, str(CRAWLER_ROOT))

from chevy_archive.candidates import parse_color_candidates, persist_candidates
from chevy_archive.config import CrawlerConfig
from chevy_archive.db import Database
from chevy_archive.download import download_source
from chevy_archive.extract import store_page_text
from chevy_archive.pipeline import enqueue_manifest, schedule_document
from chevy_archive.reporting import audit_state, export_candidates


FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures"
SAMPLE_PDF = (FIXTURE_ROOT / "sample.pdf").read_bytes()


class FixtureHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/resume.pdf"):
            range_header = self.headers.get("Range")
            if range_header:
                start = int(range_header.removeprefix("bytes=").removesuffix("-"))
                body = SAMPLE_PDF[start:]
                self.send_response(206)
                self.send_header("Content-Type", "application/pdf")
                self.send_header("ETag", "\"fixture-v1\"")
                self.send_header("Content-Length", str(len(body)))
                self.send_header(
                    "Content-Range",
                    f"bytes {start}-{len(SAMPLE_PDF) - 1}/{len(SAMPLE_PDF)}",
                )
                self.end_headers()
                self.wfile.write(body)
                return
            body = SAMPLE_PDF[: len(SAMPLE_PDF) // 2]
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header("ETag", "\"fixture-v1\"")
            self.send_header("Content-Length", str(len(SAMPLE_PDF)))
            self.end_headers()
            self.wfile.write(body)
            self.wfile.flush()
            self.close_connection = True
            return
        if self.path.startswith("/truncated.pdf"):
            body = SAMPLE_PDF[:80]
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header("Content-Length", str(len(body) + 50))
            self.end_headers()
            self.wfile.write(body)
            self.wfile.flush()
            self.close_connection = True
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Content-Length", str(len(SAMPLE_PDF)))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        self.wfile.write(SAMPLE_PDF)

    def log_message(self, format, *args):
        return


class PipelineTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.config = CrawlerConfig(
            state_root=self.root / "state",
            allowed_hosts=("127.0.0.1",),
            allow_http=True,
            allow_private_networks=True,
            min_request_interval_seconds=0,
            retry_base_seconds=0,
        )
        self.config.ensure_directories()
        self.db = Database(self.config.db_path)
        self.db.initialize()
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.db.close()
        self.temp.cleanup()

    def write_manifest(self, records):
        path = self.root / "manifest.jsonl"
        path.write_text(
            "".join(json.dumps(record) + "\n" for record in records),
            encoding="utf-8",
        )
        return path

    def source(self, source_id, url, year=1969):
        return {
            "source_id": source_id,
            "canonical_url": url,
            "title": f"{year} Camaro fixture",
            "publisher": "General Motors",
            "source_type": "vehicle_information_kit",
            "make": "Chevrolet",
            "model": "Camaro",
            "year_start": year,
            "year_end": year,
            "officiality": "official",
            "expected_media_type": "application/pdf",
        }

    def test_manifest_fetch_preserves_full_bytes_and_deduplicates(self):
        records = [
            self.source("source-a", f"{self.base_url}/sample.pdf"),
            self.source("source-b", f"{self.base_url}/sample.pdf"),
        ]
        result = enqueue_manifest(self.db, self.config, self.write_manifest(records))
        self.assertEqual(result, {"sources": 2, "jobs_added": 2})

        for source_id in ("source-a", "source-b"):
            sha256 = download_source(self.db, self.config, source_id)
            artifact = self.db.fetch_artifact(sha256)
            object_path = self.config.object_root / artifact["object_relpath"]
            self.assertEqual(object_path.read_bytes(), SAMPLE_PDF)

        self.assertEqual(
            self.db.connection.execute("SELECT COUNT(*) FROM artifacts").fetchone()[0],
            1,
        )
        self.assertEqual(
            self.db.connection.execute(
                "SELECT COUNT(*) FROM source_artifacts"
            ).fetchone()[0],
            2,
        )

    def test_truncated_response_is_not_promoted(self):
        record = self.source("truncated", f"{self.base_url}/truncated.pdf")
        enqueue_manifest(self.db, self.config, self.write_manifest([record]))
        with self.assertRaises(Exception):
            download_source(self.db, self.config, "truncated")
        self.assertEqual(
            self.db.connection.execute("SELECT COUNT(*) FROM artifacts").fetchone()[0],
            0,
        )
        fetch = self.db.connection.execute(
            "SELECT outcome FROM source_fetches WHERE source_id = 'truncated'"
        ).fetchone()
        self.assertEqual(fetch["outcome"], "incomplete")
        self.assertTrue(any(self.config.spool_root.glob("*.part")))

    def test_partial_download_resumes_at_exact_byte_offset(self):
        record = self.source("resume-download", f"{self.base_url}/resume.pdf")
        enqueue_manifest(self.db, self.config, self.write_manifest([record]))
        with self.assertRaises(Exception):
            download_source(self.db, self.config, "resume-download")
        spool_path = next(self.config.spool_root.glob("*.part"))
        self.assertEqual(spool_path.stat().st_size, len(SAMPLE_PDF) // 2)

        sha256 = download_source(self.db, self.config, "resume-download")
        artifact = self.db.fetch_artifact(sha256)
        object_path = self.config.object_root / artifact["object_relpath"]
        self.assertEqual(object_path.read_bytes(), SAMPLE_PDF)
        outcomes = [
            row["outcome"]
            for row in self.db.connection.execute(
                """
                SELECT outcome FROM source_fetches
                WHERE source_id = 'resume-download' ORDER BY fetch_id
                """
            )
        ]
        self.assertEqual(outcomes, ["incomplete", "complete"])

    def test_expired_lease_is_reclaimed_without_duplicate_job(self):
        self.db.enqueue_job(
            kind="fetch_source",
            dedupe_key="fetch:test",
            source_id=None,
            max_attempts=3,
        )
        first = self.db.claim_job(owner="worker-one", lease_seconds=-1)
        second = self.db.claim_job(owner="worker-two", lease_seconds=30)
        self.assertIsNotNone(first)
        self.assertIsNotNone(second)
        self.assertEqual(first.job_id, second.job_id)
        self.assertEqual(second.attempts, 2)
        self.assertFalse(
            self.db.enqueue_job(
                kind="fetch_source",
                dedupe_key="fetch:test",
                source_id=None,
                max_attempts=3,
            )
        )

    def test_parser_emits_only_unreviewed_candidates_with_locators(self):
        record = self.source("camaro-1969", f"{self.base_url}/sample.pdf")
        enqueue_manifest(self.db, self.config, self.write_manifest([record]))
        sha256 = download_source(self.db, self.config, "camaro-1969")
        text = (FIXTURE_ROOT / "page-1969.txt").read_text(encoding="utf-8")
        status, text_sha256, _count = store_page_text(
            self.db, self.config, sha256, 1, "native", text
        )
        self.assertEqual(status, "usable")
        parsed = parse_color_candidates(text, "native")
        self.assertEqual([item.color_code_raw for item in parsed], ["A", "B", "72"])

        count = persist_candidates(
            self.db,
            source=self.db.fetch_source("camaro-1969"),
            artifact_sha256=sha256,
            page_number=1,
            text=text,
            extraction_method="native",
            extraction_engine="fixture-native",
            text_sha256=text_sha256,
        )
        self.assertEqual(count, 3)
        statuses = {
            row["record_status"]
            for row in self.db.connection.execute("SELECT * FROM color_candidates")
        }
        self.assertEqual(statuses, {"extracted_candidate"})

        output_path = self.root / "candidates.jsonl"
        self.assertEqual(export_candidates(self.db, output_path), 3)
        exported = [
            json.loads(line)
            for line in output_path.read_text(encoding="utf-8").splitlines()
        ]
        self.assertTrue(
            all(item["verification_status"] == "unreviewed_candidate" for item in exported)
        )
        self.assertEqual(exported[0]["evidence_locator"]["pdf_page"], 1)
        self.assertEqual(exported[0]["source"]["artifact_sha256"], sha256)

        verified_id = exported[0]["candidate_id"]
        self.db.connection.execute(
            """
            UPDATE color_candidates SET record_status = 'verified'
            WHERE candidate_id = ?
            """,
            (verified_id,),
        )
        persist_candidates(
            self.db,
            source=self.db.fetch_source("camaro-1969"),
            artifact_sha256=sha256,
            page_number=1,
            text=text,
            extraction_method="ocr",
            extraction_engine="fixture-ocr",
            text_sha256=text_sha256,
        )
        preserved = self.db.connection.execute(
            "SELECT record_status FROM color_candidates WHERE candidate_id = ?",
            (verified_id,),
        ).fetchone()
        self.assertEqual(preserved["record_status"], "verified")

    def test_document_scheduling_resumes_at_missing_pages(self):
        record = self.source("resume", f"{self.base_url}/sample.pdf")
        enqueue_manifest(self.db, self.config, self.write_manifest([record]))
        sha256 = download_source(self.db, self.config, "resume")
        self.db.connection.execute(
            """
            INSERT INTO pdf_documents (
                artifact_sha256, page_count, inspector, inspected_at
            ) VALUES (?, 3, 'fixture', '2026-01-01T00:00:00+00:00')
            """,
            (sha256,),
        )
        store_page_text(
            self.db,
            self.config,
            sha256,
            1,
            "native",
            (FIXTURE_ROOT / "page-1969.txt").read_text(encoding="utf-8"),
        )
        schedule_document(self.db, self.config, sha256)
        jobs = {
            (row["kind"], row["page_number"])
            for row in self.db.connection.execute(
                """
                SELECT kind, page_number FROM jobs
                WHERE artifact_sha256 = ?
                """,
                (sha256,),
            )
        }
        self.assertIn(("parse_page", 1), jobs)
        self.assertIn(("extract_page", 2), jobs)
        self.assertIn(("extract_page", 3), jobs)

    def test_audit_detects_tampered_derived_text(self):
        record = self.source("audit", f"{self.base_url}/sample.pdf")
        enqueue_manifest(self.db, self.config, self.write_manifest([record]))
        sha256 = download_source(self.db, self.config, "audit")
        store_page_text(self.db, self.config, sha256, 1, "native", "original text")
        row = self.db.connection.execute(
            "SELECT * FROM page_text WHERE artifact_sha256 = ?", (sha256,)
        ).fetchone()
        (self.config.derived_root / row["text_relpath"]).write_text(
            "tampered text", encoding="utf-8"
        )
        report = audit_state(self.db, self.config, full_hash=True)
        self.assertFalse(report["ok"])
        self.assertIn(
            "page_text_hash_mismatch",
            {error["kind"] for error in report["errors"]},
        )


if __name__ == "__main__":
    unittest.main()
