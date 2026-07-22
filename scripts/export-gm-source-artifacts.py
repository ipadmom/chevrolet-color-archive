from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export immutable GM PDF artifact provenance from crawler SQLite"
    )
    parser.add_argument(
        "--crawler-db",
        type=Path,
        default=ROOT / "tmp" / "crawler-state" / "queue.sqlite3",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=ROOT / "crawler" / "manifests" / "gm-heritage-chevrolet-all.jsonl",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "data" / "sources" / "gm-heritage-chevrolet-artifacts.json",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest_rows = [
        json.loads(line)
        for line in args.manifest.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    manifest_ids = [row["source_id"] for row in manifest_rows]
    if len(manifest_ids) != 691 or len(manifest_ids) != len(set(manifest_ids)):
        raise RuntimeError("expected 691 unique source IDs in the official GM manifest")

    connection = sqlite3.connect(args.crawler_db)
    connection.row_factory = sqlite3.Row
    object_root = args.crawler_db.parent / "objects" / "sha256"
    import fitz

    entries = []
    for manifest in manifest_rows:
        row = connection.execute(
            """
            SELECT s.source_id, s.canonical_url, s.title, s.manifest_sha256,
                   a.sha256 AS artifact_sha256, a.byte_length, a.media_type,
                   a.object_relpath, a.integrity_status,
                   f.requested_url, f.final_url, f.requested_at, f.completed_at,
                   f.http_status, f.bytes_received, f.expected_bytes, f.etag,
                   f.last_modified, f.response_headers_json,
                   p.page_count, p.inspector, p.inspected_at
            FROM sources s
            JOIN source_artifacts sa
              ON sa.source_id = s.source_id AND sa.is_current = 1
            JOIN artifacts a ON a.sha256 = sa.artifact_sha256
            JOIN source_fetches f ON f.fetch_id = sa.fetch_id
            LEFT JOIN pdf_documents p ON p.artifact_sha256 = a.sha256
            WHERE s.source_id = ?
            """,
            (manifest["source_id"],),
        ).fetchone()
        if row is None:
            raise RuntimeError(f"source has no complete current artifact: {manifest['source_id']}")
        if row["canonical_url"] != manifest["canonical_url"]:
            raise RuntimeError(f"canonical URL changed for {manifest['source_id']}")
        if row["http_status"] not in (200, 206):
            raise RuntimeError(f"source fetch is not complete: {manifest['source_id']}")
        if row["bytes_received"] != row["byte_length"]:
            raise RuntimeError(f"source byte count does not reconcile: {manifest['source_id']}")
        object_path = object_root / row["object_relpath"]
        if not object_path.is_file() or object_path.stat().st_size != row["byte_length"]:
            raise RuntimeError(f"source object is absent or incomplete: {manifest['source_id']}")
        if sha256_file(object_path) != row["artifact_sha256"]:
            raise RuntimeError(f"source object fails SHA-256 audit: {manifest['source_id']}")
        with fitz.open(object_path) as document:
            page_count = len(document)
        if page_count < 1:
            raise RuntimeError(f"source PDF has no pages: {manifest['source_id']}")
        entries.append(
            {
                "source_id": row["source_id"],
                "canonical_url": row["canonical_url"],
                "title": row["title"],
                "source_manifest_sha256": row["manifest_sha256"],
                "artifact_sha256": row["artifact_sha256"],
                "byte_length": row["byte_length"],
                "media_type": row["media_type"],
                "crawler_object_relpath": row["object_relpath"],
                "integrity_status": row["integrity_status"],
                "requested_url": row["requested_url"],
                "final_url": row["final_url"],
                "requested_at": row["requested_at"],
                "completed_at": row["completed_at"],
                "http_status": row["http_status"],
                "bytes_received": row["bytes_received"],
                "expected_bytes": row["expected_bytes"],
                "etag": row["etag"],
                "last_modified": row["last_modified"],
                "safe_response_headers": json.loads(row["response_headers_json"]),
                "pdf_page_count": page_count,
                "pdf_inspector": (
                    row["inspector"] or f"PyMuPDF {fitz.version[0]} artifact-ledger audit"
                ),
                "pdf_inspected_at": row["inspected_at"] or utc_now(),
            }
        )
    connection.close()
    entries.sort(key=lambda item: item["source_id"])
    artifact_ids = {item["artifact_sha256"] for item in entries}
    payload = {
        "schema_version": 1,
        "generated_at": utc_now(),
        "scope": (
            "Complete-file artifact records for all 691 sources in the official GM "
            "Heritage Chevrolet crawler manifest. Local object paths are operational; "
            "the SHA-256 and byte length are the durable artifact identity."
        ),
        "source_manifest": args.manifest.resolve().relative_to(ROOT).as_posix(),
        "crawler_database": "local ignored crawler state; not committed",
        "source_count": len(entries),
        "unique_artifact_count": len(artifact_ids),
        "total_source_bytes": sum(item["byte_length"] for item in entries),
        "unique_artifact_bytes": sum(
            next(item["byte_length"] for item in entries if item["artifact_sha256"] == digest)
            for digest in artifact_ids
        ),
        "file_audit": {
            "all_objects_rehashed": True,
            "all_byte_lengths_reconciled": True,
            "all_pdfs_opened": True,
            "total_pdf_pages": sum(item["pdf_page_count"] for item in entries),
        },
        "entries": entries,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "sources": payload["source_count"],
                "unique_artifacts": payload["unique_artifact_count"],
                "bytes": payload["unique_artifact_bytes"],
                "output": args.output.resolve().relative_to(ROOT).as_posix(),
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
