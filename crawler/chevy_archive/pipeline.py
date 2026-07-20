from __future__ import annotations

import hashlib
import json
import re
import socket
from pathlib import Path
from typing import Iterable

from .candidates import PARSER_VERSION, persist_candidates
from .config import CrawlerConfig
from .db import Database, Job, utc_now
from .download import download_source, validate_url
from .extract import (
    best_page_text,
    extract_native_page,
    extract_ocr_page,
    inspect_pdf,
)


REQUIRED_MANIFEST_FIELDS = {
    "source_id",
    "canonical_url",
    "title",
    "publisher",
    "source_type",
    "make",
    "model",
    "officiality",
}
SOURCE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{1,127}$")


def load_manifest(path: str | Path, config: CrawlerConfig) -> list[tuple[dict, str]]:
    manifest_path = Path(path)
    entries: list[tuple[dict, str]] = []
    seen_ids: set[str] = set()
    with manifest_path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{manifest_path}:{line_number}: invalid JSON: {exc}") from exc
            missing = sorted(REQUIRED_MANIFEST_FIELDS - record.keys())
            if missing:
                raise ValueError(
                    f"{manifest_path}:{line_number}: missing fields: {', '.join(missing)}"
                )
            source_id = record["source_id"]
            if not isinstance(source_id, str):
                raise ValueError(
                    f"{manifest_path}:{line_number}: source_id must be a string"
                )
            if source_id in seen_ids:
                raise ValueError(
                    f"{manifest_path}:{line_number}: duplicate source_id: {source_id}"
                )
            if not SOURCE_ID_PATTERN.fullmatch(source_id):
                raise ValueError(
                    f"{manifest_path}:{line_number}: source_id must match "
                    "[a-z0-9][a-z0-9._-]{1,127}"
                )
            for field in ("title", "publisher", "source_type", "make", "model"):
                if not isinstance(record[field], str) or not record[field].strip():
                    raise ValueError(
                        f"{manifest_path}:{line_number}: {field} must be a nonempty string"
                    )
            if not isinstance(record["canonical_url"], str):
                raise ValueError(
                    f"{manifest_path}:{line_number}: canonical_url must be a string"
                )
            validate_url(record["canonical_url"], config)
            if not isinstance(record["officiality"], str) or record["officiality"] not in {
                "official",
                "licensed",
                "secondary",
                "unknown",
            }:
                raise ValueError(
                    f"{manifest_path}:{line_number}: invalid officiality"
                )
            for field in ("year_start", "year_end"):
                if field in record and record[field] is not None:
                    record[field] = int(record[field])
            if (
                record.get("year_start") is not None
                and record.get("year_end") is not None
                and record["year_start"] > record["year_end"]
            ):
                raise ValueError(
                    f"{manifest_path}:{line_number}: year_start is after year_end"
                )
            record.setdefault("expected_media_type", "application/pdf")
            if record["expected_media_type"] != "application/pdf":
                raise ValueError(
                    f"{manifest_path}:{line_number}: only application/pdf is supported"
                )
            canonical = json.dumps(record, sort_keys=True, separators=(",", ":"))
            entries.append((record, hashlib.sha256(canonical.encode("utf-8")).hexdigest()))
            seen_ids.add(record["source_id"])
    if not entries:
        raise ValueError(f"manifest contains no source records: {manifest_path}")
    return entries


def enqueue_manifest(
    db: Database, config: CrawlerConfig, path: str | Path
) -> dict[str, int]:
    records = load_manifest(path, config)
    jobs_added = 0
    for record, manifest_hash in records:
        db.upsert_source(record, manifest_hash)
        if db.enqueue_job(
            kind="fetch_source",
            dedupe_key=f"fetch:{record['source_id']}:{manifest_hash}",
            source_id=record["source_id"],
            payload={"manifest_sha256": manifest_hash},
            priority=100,
            max_attempts=config.max_job_attempts,
        ):
            jobs_added += 1
    return {"sources": len(records), "jobs_added": jobs_added}


def _enqueue_extract_or_parse(
    db: Database,
    config: CrawlerConfig,
    artifact_sha256: str,
    page_number: int,
    source_ids: Iterable[str],
) -> None:
    page_rows = db.connection.execute(
        """
        SELECT * FROM page_text
        WHERE artifact_sha256 = ? AND page_number = ?
        ORDER BY character_count DESC
        """,
        (artifact_sha256, page_number),
    ).fetchall()
    if not page_rows:
        db.enqueue_job(
            kind="extract_page",
            dedupe_key=f"extract:{artifact_sha256}:{page_number}",
            artifact_sha256=artifact_sha256,
            page_number=page_number,
            max_attempts=config.max_job_attempts,
        )
        return
    best = page_rows[0]
    if best["extraction_status"] in ("empty", "weak") and not any(
        row["method"] == "ocr" for row in page_rows
    ):
        db.enqueue_job(
            kind="ocr_page",
            dedupe_key=f"ocr:{artifact_sha256}:{page_number}",
            artifact_sha256=artifact_sha256,
            page_number=page_number,
            max_attempts=config.max_job_attempts,
        )
        return
    for source_id in source_ids:
        db.enqueue_job(
            kind="parse_page",
            dedupe_key=(
                f"parse:{source_id}:{artifact_sha256}:{page_number}:"
                f"{best['text_sha256']}:{PARSER_VERSION}"
            ),
            source_id=source_id,
            artifact_sha256=artifact_sha256,
            page_number=page_number,
            max_attempts=config.max_job_attempts,
        )


def schedule_document(
    db: Database, config: CrawlerConfig, artifact_sha256: str
) -> None:
    document = db.connection.execute(
        "SELECT * FROM pdf_documents WHERE artifact_sha256 = ?",
        (artifact_sha256,),
    ).fetchone()
    if document is None:
        db.enqueue_job(
            kind="inspect_pdf",
            dedupe_key=f"inspect:{artifact_sha256}",
            artifact_sha256=artifact_sha256,
            priority=50,
            max_attempts=config.max_job_attempts,
        )
        return
    source_ids = [
        row["source_id"]
        for row in db.connection.execute(
            """
            SELECT source_id FROM source_artifacts
            WHERE artifact_sha256 = ? AND is_current = 1
            """,
            (artifact_sha256,),
        )
    ]
    for page_number in range(1, document["page_count"] + 1):
        _enqueue_extract_or_parse(
            db, config, artifact_sha256, page_number, source_ids
        )


def reconcile_current_documents(db: Database, config: CrawlerConfig) -> int:
    artifacts = [
        row["artifact_sha256"]
        for row in db.connection.execute(
            """
            SELECT DISTINCT artifact_sha256
            FROM source_artifacts
            WHERE is_current = 1
            ORDER BY artifact_sha256
            """
        )
    ]
    for artifact_sha256 in artifacts:
        schedule_document(db, config, artifact_sha256)
    return len(artifacts)


def _handle_job(db: Database, config: CrawlerConfig, job: Job) -> None:
    if job.kind == "fetch_source":
        if job.source_id is None:
            raise ValueError("fetch_source job is missing source_id")
        manifest_sha256 = job.payload.get("manifest_sha256")
        prior = db.connection.execute(
            """
            SELECT artifact_sha256 FROM source_fetches
            WHERE source_id = ? AND manifest_sha256 = ?
              AND outcome = 'complete' AND artifact_sha256 IS NOT NULL
            ORDER BY fetch_id DESC LIMIT 1
            """,
            (job.source_id, manifest_sha256),
        ).fetchone()
        artifact_sha256 = (
            prior["artifact_sha256"]
            if prior
            else download_source(
                db,
                config,
                job.source_id,
                manifest_sha256=manifest_sha256,
            )
        )
        schedule_document(db, config, artifact_sha256)
        return

    if job.artifact_sha256 is None:
        raise ValueError(f"{job.kind} job is missing artifact_sha256")

    if job.kind == "inspect_pdf":
        page_count, inspector = inspect_pdf(db, config, job.artifact_sha256)
        db.connection.execute(
            """
            INSERT INTO pdf_documents (
                artifact_sha256, page_count, inspector, inspected_at
            ) VALUES (?, ?, ?, ?)
            ON CONFLICT(artifact_sha256) DO UPDATE SET
                page_count = excluded.page_count,
                inspector = excluded.inspector,
                inspected_at = excluded.inspected_at
            """,
            (job.artifact_sha256, page_count, inspector, utc_now()),
        )
        schedule_document(db, config, job.artifact_sha256)
        return

    if job.page_number is None:
        raise ValueError(f"{job.kind} job is missing page_number")

    if job.kind == "extract_page":
        status, _text_sha, _count = extract_native_page(
            db, config, job.artifact_sha256, job.page_number
        )
        source_ids = [
            row["source_id"]
            for row in db.connection.execute(
                """
                SELECT source_id FROM source_artifacts
                WHERE artifact_sha256 = ? AND is_current = 1
                """,
                (job.artifact_sha256,),
            )
        ]
        if status in ("weak", "empty"):
            db.enqueue_job(
                kind="ocr_page",
                dedupe_key=f"ocr:{job.artifact_sha256}:{job.page_number}",
                artifact_sha256=job.artifact_sha256,
                page_number=job.page_number,
                max_attempts=config.max_job_attempts,
            )
        else:
            _enqueue_extract_or_parse(
                db, config, job.artifact_sha256, job.page_number, source_ids
            )
        return

    if job.kind == "ocr_page":
        extract_ocr_page(db, config, job.artifact_sha256, job.page_number)
        source_ids = [
            row["source_id"]
            for row in db.connection.execute(
                """
                SELECT source_id FROM source_artifacts
                WHERE artifact_sha256 = ? AND is_current = 1
                """,
                (job.artifact_sha256,),
            )
        ]
        _enqueue_extract_or_parse(
            db, config, job.artifact_sha256, job.page_number, source_ids
        )
        return

    if job.kind == "parse_page":
        if job.source_id is None:
            raise ValueError("parse_page job is missing source_id")
        text, method, text_sha256, extraction_engine = best_page_text(
            db, config, job.artifact_sha256, job.page_number
        )
        source = db.fetch_source(job.source_id)
        persist_candidates(
            db,
            source=source,
            artifact_sha256=job.artifact_sha256,
            page_number=job.page_number,
            text=text,
            extraction_method=method,
            extraction_engine=extraction_engine,
            text_sha256=text_sha256,
        )
        return

    raise ValueError(f"unsupported job kind: {job.kind}")


def run_one_job(
    db: Database,
    config: CrawlerConfig,
    *,
    owner: str | None = None,
    kinds: Iterable[str] | None = None,
) -> Job | None:
    owner = owner or f"{socket.gethostname()}:{os_getpid()}"
    job = db.claim_job(owner=owner, lease_seconds=config.lease_seconds, kinds=kinds)
    if job is None:
        return None
    try:
        _handle_job(db, config, job)
    except Exception as exc:
        retry_seconds = config.retry_base_seconds * (2 ** max(0, job.attempts - 1))
        db.fail_job(job, f"{type(exc).__name__}: {exc}", retry_seconds)
    else:
        db.finish_job(job.job_id)
    return job


def os_getpid() -> int:
    import os

    return os.getpid()
