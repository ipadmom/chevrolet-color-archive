from __future__ import annotations

import json
import sqlite3
import time
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Iterable, Iterator


SCHEMA_VERSION = 1


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def utc_after(seconds: int) -> str:
    return (datetime.now(UTC) + timedelta(seconds=seconds)).isoformat(timespec="seconds")


@dataclass(frozen=True)
class Job:
    job_id: int
    kind: str
    dedupe_key: str
    source_id: str | None
    artifact_sha256: str | None
    page_number: int | None
    payload: dict[str, Any]
    attempts: int
    max_attempts: int


class Database:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(self.path, timeout=30, isolation_level=None)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA foreign_keys = ON")
        self.connection.execute("PRAGMA journal_mode = WAL")
        self.connection.execute("PRAGMA synchronous = FULL")
        self.connection.execute("PRAGMA busy_timeout = 30000")

    def close(self) -> None:
        self.connection.close()

    @contextmanager
    def transaction(self, immediate: bool = False) -> Iterator[sqlite3.Connection]:
        self.connection.execute("BEGIN IMMEDIATE" if immediate else "BEGIN")
        try:
            yield self.connection
        except Exception:
            self.connection.rollback()
            raise
        else:
            self.connection.commit()

    def initialize(self) -> None:
        metadata_exists = self.connection.execute(
            """
            SELECT 1 FROM sqlite_master
            WHERE type = 'table' AND name = 'metadata'
            """
        ).fetchone()
        if metadata_exists:
            existing = self.connection.execute(
                "SELECT value FROM metadata WHERE key = 'schema_version'"
            ).fetchone()
            if existing is not None and int(existing["value"]) != SCHEMA_VERSION:
                raise RuntimeError(
                    f"database schema version {existing['value']} is not supported; "
                    f"this crawler requires {SCHEMA_VERSION}"
                )
        schema = """
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sources (
            source_id TEXT PRIMARY KEY,
            canonical_url TEXT NOT NULL,
            title TEXT NOT NULL,
            publisher TEXT NOT NULL,
            source_type TEXT NOT NULL,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            year_start INTEGER,
            year_end INTEGER,
            officiality TEXT NOT NULL CHECK (
                officiality IN ('official', 'licensed', 'secondary', 'unknown')
            ),
            expected_media_type TEXT NOT NULL,
            manifest_json TEXT NOT NULL,
            manifest_sha256 TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS artifacts (
            sha256 TEXT PRIMARY KEY,
            byte_length INTEGER NOT NULL CHECK (byte_length > 0),
            media_type TEXT NOT NULL,
            object_relpath TEXT NOT NULL UNIQUE,
            integrity_status TEXT NOT NULL CHECK (
                integrity_status IN ('complete', 'quarantined')
            ),
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS source_fetches (
            fetch_id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id TEXT NOT NULL REFERENCES sources(source_id),
            artifact_sha256 TEXT REFERENCES artifacts(sha256),
            manifest_sha256 TEXT NOT NULL,
            requested_url TEXT NOT NULL,
            final_url TEXT,
            requested_at TEXT NOT NULL,
            completed_at TEXT,
            http_status INTEGER,
            bytes_received INTEGER,
            expected_bytes INTEGER,
            etag TEXT,
            last_modified TEXT,
            response_headers_json TEXT NOT NULL,
            outcome TEXT NOT NULL CHECK (
                outcome IN ('started', 'complete', 'incomplete', 'failed')
            ),
            error TEXT
        );

        CREATE TABLE IF NOT EXISTS host_rate_limits (
            host TEXT PRIMARY KEY,
            next_allowed_epoch REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS source_artifacts (
            source_id TEXT NOT NULL REFERENCES sources(source_id),
            artifact_sha256 TEXT NOT NULL REFERENCES artifacts(sha256),
            fetch_id INTEGER NOT NULL REFERENCES source_fetches(fetch_id),
            is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0, 1)),
            linked_at TEXT NOT NULL,
            PRIMARY KEY (source_id, artifact_sha256)
        );

        CREATE TABLE IF NOT EXISTS pdf_documents (
            artifact_sha256 TEXT PRIMARY KEY REFERENCES artifacts(sha256),
            page_count INTEGER NOT NULL CHECK (page_count > 0),
            inspector TEXT NOT NULL,
            inspected_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS page_text (
            artifact_sha256 TEXT NOT NULL REFERENCES artifacts(sha256),
            page_number INTEGER NOT NULL CHECK (page_number > 0),
            method TEXT NOT NULL CHECK (method IN ('native', 'ocr')),
            extractor TEXT NOT NULL,
            text_relpath TEXT NOT NULL,
            text_sha256 TEXT NOT NULL,
            character_count INTEGER NOT NULL,
            extraction_status TEXT NOT NULL CHECK (
                extraction_status IN ('usable', 'weak', 'empty', 'unreadable')
            ),
            created_at TEXT NOT NULL,
            PRIMARY KEY (artifact_sha256, page_number, method)
        );

        CREATE TABLE IF NOT EXISTS color_candidates (
            candidate_id TEXT PRIMARY KEY,
            source_id TEXT NOT NULL REFERENCES sources(source_id),
            artifact_sha256 TEXT NOT NULL REFERENCES artifacts(sha256),
            page_number INTEGER NOT NULL,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            model_year INTEGER,
            color_name_raw TEXT NOT NULL,
            color_name_normalized TEXT NOT NULL,
            color_code_raw TEXT,
            color_code_normalized TEXT,
            availability_claim TEXT NOT NULL CHECK (
                availability_claim IN (
                    'listed_in_source_candidate',
                    'restriction_candidate',
                    'unknown'
                )
            ),
            record_status TEXT NOT NULL CHECK (
                record_status IN (
                    'extracted_candidate',
                    'needs_review',
                    'needs_year_assignment',
                    'rejected',
                    'verified'
                )
            ),
            confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
            extraction_method TEXT NOT NULL CHECK (extraction_method IN ('native', 'ocr')),
            extraction_engine TEXT NOT NULL,
            evidence_text TEXT NOT NULL,
            evidence_locator_json TEXT NOT NULL,
            parser_version TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS jobs (
            job_id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL CHECK (
                kind IN ('fetch_source', 'inspect_pdf', 'extract_page', 'ocr_page', 'parse_page')
            ),
            dedupe_key TEXT NOT NULL UNIQUE,
            source_id TEXT REFERENCES sources(source_id),
            artifact_sha256 TEXT REFERENCES artifacts(sha256),
            page_number INTEGER,
            payload_json TEXT NOT NULL,
            state TEXT NOT NULL CHECK (
                state IN ('queued', 'leased', 'done', 'failed', 'dead')
            ),
            priority INTEGER NOT NULL DEFAULT 0,
            attempts INTEGER NOT NULL DEFAULT 0,
            max_attempts INTEGER NOT NULL,
            available_at TEXT NOT NULL,
            lease_owner TEXT,
            lease_expires_at TEXT,
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS job_events (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL REFERENCES jobs(job_id),
            event_type TEXT NOT NULL CHECK (
                event_type IN ('enqueued', 'leased', 'done', 'failed', 'dead', 'requeued')
            ),
            owner TEXT,
            attempt INTEGER,
            detail TEXT,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS jobs_claim_idx
            ON jobs(state, available_at, priority DESC, job_id);
        CREATE INDEX IF NOT EXISTS job_events_job_idx
            ON job_events(job_id, event_id);
        CREATE INDEX IF NOT EXISTS sources_url_idx
            ON sources(canonical_url);
        CREATE INDEX IF NOT EXISTS candidates_model_year_idx
            ON color_candidates(make, model, model_year, record_status);
        CREATE INDEX IF NOT EXISTS page_text_artifact_idx
            ON page_text(artifact_sha256, page_number);
        """
        with self.transaction(immediate=True) as conn:
            conn.executescript(schema)
            conn.execute(
                "INSERT OR IGNORE INTO metadata(key, value) VALUES('schema_version', ?)",
                (str(SCHEMA_VERSION),),
            )

    def upsert_source(self, record: dict[str, Any], manifest_sha256: str) -> None:
        now = utc_now()
        manifest_json = json.dumps(record, sort_keys=True, separators=(",", ":"))
        with self.transaction(immediate=True) as conn:
            conn.execute(
                """
                INSERT INTO sources (
                    source_id, canonical_url, title, publisher, source_type,
                    make, model, year_start, year_end, officiality,
                    expected_media_type, manifest_json, manifest_sha256,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_id) DO UPDATE SET
                    canonical_url = excluded.canonical_url,
                    title = excluded.title,
                    publisher = excluded.publisher,
                    source_type = excluded.source_type,
                    make = excluded.make,
                    model = excluded.model,
                    year_start = excluded.year_start,
                    year_end = excluded.year_end,
                    officiality = excluded.officiality,
                    expected_media_type = excluded.expected_media_type,
                    manifest_json = excluded.manifest_json,
                    manifest_sha256 = excluded.manifest_sha256,
                    updated_at = excluded.updated_at
                """,
                (
                    record["source_id"],
                    record["canonical_url"],
                    record["title"],
                    record["publisher"],
                    record["source_type"],
                    record["make"],
                    record["model"],
                    record.get("year_start"),
                    record.get("year_end"),
                    record["officiality"],
                    record.get("expected_media_type", "application/pdf"),
                    manifest_json,
                    manifest_sha256,
                    now,
                    now,
                ),
            )

    def enqueue_job(
        self,
        *,
        kind: str,
        dedupe_key: str,
        source_id: str | None = None,
        artifact_sha256: str | None = None,
        page_number: int | None = None,
        payload: dict[str, Any] | None = None,
        priority: int = 0,
        max_attempts: int = 5,
    ) -> bool:
        now = utc_now()
        with self.transaction(immediate=True) as conn:
            result = conn.execute(
                """
                INSERT OR IGNORE INTO jobs (
                    kind, dedupe_key, source_id, artifact_sha256, page_number,
                    payload_json, state, priority, attempts, max_attempts,
                    available_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, 0, ?, ?, ?, ?)
                """,
                (
                    kind,
                    dedupe_key,
                    source_id,
                    artifact_sha256,
                    page_number,
                    json.dumps(payload or {}, sort_keys=True),
                    priority,
                    max_attempts,
                    now,
                    now,
                    now,
                ),
            )
            if result.rowcount == 1:
                job_id = int(result.lastrowid)
                conn.execute(
                    """
                    INSERT INTO job_events (
                        job_id, event_type, attempt, detail, created_at
                    ) VALUES (?, 'enqueued', 0, NULL, ?)
                    """,
                    (job_id, now),
                )
                return True
            return False

    def claim_job(
        self,
        *,
        owner: str,
        lease_seconds: int,
        kinds: Iterable[str] | None = None,
    ) -> Job | None:
        now = utc_now()
        kind_list = tuple(kinds or ())
        kind_sql = ""
        parameters: list[Any] = [now, now]
        if kind_list:
            placeholders = ",".join("?" for _ in kind_list)
            kind_sql = f" AND kind IN ({placeholders})"
            parameters.extend(kind_list)
        parameters.extend([owner, utc_after(lease_seconds), now])
        with self.transaction(immediate=True) as conn:
            row = conn.execute(
                f"""
                SELECT * FROM jobs
                WHERE (
                    (state IN ('queued', 'failed') AND available_at <= ?)
                    OR (state = 'leased' AND lease_expires_at <= ?)
                )
                AND attempts < max_attempts
                {kind_sql}
                ORDER BY priority DESC, job_id
                LIMIT 1
                """,
                parameters[: 2 + len(kind_list)],
            ).fetchone()
            if row is None:
                return None
            conn.execute(
                """
                UPDATE jobs
                SET state = 'leased', lease_owner = ?, lease_expires_at = ?,
                    attempts = attempts + 1, updated_at = ?
                WHERE job_id = ?
                """,
                (*parameters[-3:], row["job_id"]),
            )
            claimed = conn.execute("SELECT * FROM jobs WHERE job_id = ?", (row["job_id"],)).fetchone()
            conn.execute(
                """
                INSERT INTO job_events (
                    job_id, event_type, owner, attempt, detail, created_at
                ) VALUES (?, 'leased', ?, ?, NULL, ?)
                """,
                (row["job_id"], owner, claimed["attempts"], now),
            )
        return Job(
            job_id=claimed["job_id"],
            kind=claimed["kind"],
            dedupe_key=claimed["dedupe_key"],
            source_id=claimed["source_id"],
            artifact_sha256=claimed["artifact_sha256"],
            page_number=claimed["page_number"],
            payload=json.loads(claimed["payload_json"]),
            attempts=claimed["attempts"],
            max_attempts=claimed["max_attempts"],
        )

    def finish_job(self, job_id: int) -> None:
        now = utc_now()
        with self.transaction(immediate=True) as conn:
            conn.execute(
                """
                UPDATE jobs SET state = 'done', lease_owner = NULL,
                    lease_expires_at = NULL, last_error = NULL, updated_at = ?
                WHERE job_id = ?
                """,
                (now, job_id),
            )
            attempt = conn.execute(
                "SELECT attempts FROM jobs WHERE job_id = ?", (job_id,)
            ).fetchone()["attempts"]
            conn.execute(
                """
                INSERT INTO job_events (
                    job_id, event_type, attempt, detail, created_at
                ) VALUES (?, 'done', ?, NULL, ?)
                """,
                (job_id, attempt, now),
            )

    def fail_job(self, job: Job, error: str, retry_seconds: int) -> None:
        now = utc_now()
        state = "dead" if job.attempts >= job.max_attempts else "failed"
        with self.transaction(immediate=True) as conn:
            conn.execute(
                """
                UPDATE jobs SET state = ?, available_at = ?, lease_owner = NULL,
                    lease_expires_at = NULL, last_error = ?, updated_at = ?
                WHERE job_id = ?
                """,
                (state, utc_after(retry_seconds), error[:4000], now, job.job_id),
            )
            conn.execute(
                """
                INSERT INTO job_events (
                    job_id, event_type, attempt, detail, created_at
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (job.job_id, state, job.attempts, error[:4000], now),
            )

    def requeue_job(self, job_id: int) -> None:
        now = utc_now()
        with self.transaction(immediate=True) as conn:
            row = conn.execute(
                "SELECT state, attempts FROM jobs WHERE job_id = ?", (job_id,)
            ).fetchone()
            if row is None:
                raise ValueError(f"job does not exist: {job_id}")
            if row["state"] not in ("failed", "dead"):
                raise ValueError("only failed or dead jobs can be retried")
            conn.execute(
                """
                UPDATE jobs SET state = 'queued', attempts = 0,
                    available_at = ?, lease_owner = NULL, lease_expires_at = NULL,
                    last_error = NULL, updated_at = ?
                WHERE job_id = ?
                """,
                (now, now, job_id),
            )
            conn.execute(
                """
                INSERT INTO job_events (
                    job_id, event_type, attempt, detail, created_at
                ) VALUES (?, 'requeued', ?, 'manual retry', ?)
                """,
                (job_id, row["attempts"], now),
            )

    def fetch_source(self, source_id: str) -> sqlite3.Row:
        row = self.connection.execute(
            "SELECT * FROM sources WHERE source_id = ?", (source_id,)
        ).fetchone()
        if row is None:
            raise KeyError(f"unknown source_id: {source_id}")
        return row

    def fetch_artifact(self, sha256: str) -> sqlite3.Row:
        row = self.connection.execute(
            "SELECT * FROM artifacts WHERE sha256 = ?", (sha256,)
        ).fetchone()
        if row is None:
            raise KeyError(f"unknown artifact: {sha256}")
        return row

    def stats(self) -> dict[str, Any]:
        jobs = {
            row["state"]: row["count"]
            for row in self.connection.execute(
                "SELECT state, COUNT(*) AS count FROM jobs GROUP BY state"
            )
        }
        pages = {
            row["extraction_status"]: row["count"]
            for row in self.connection.execute(
                """
                SELECT extraction_status, COUNT(*) AS count
                FROM page_text GROUP BY extraction_status
                """
            )
        }
        return {
            "sources": self.connection.execute("SELECT COUNT(*) FROM sources").fetchone()[0],
            "artifacts": self.connection.execute("SELECT COUNT(*) FROM artifacts").fetchone()[0],
            "pdf_documents": self.connection.execute(
                "SELECT COUNT(*) FROM pdf_documents"
            ).fetchone()[0],
            "candidates": self.connection.execute(
                "SELECT COUNT(*) FROM color_candidates WHERE record_status != 'rejected'"
            ).fetchone()[0],
            "jobs": jobs,
            "page_text": pages,
        }

    def reserve_host_slot(self, host: str, interval_seconds: float) -> float:
        if interval_seconds <= 0:
            return 0.0
        current = time.time()
        with self.transaction(immediate=True) as conn:
            row = conn.execute(
                "SELECT next_allowed_epoch FROM host_rate_limits WHERE host = ?",
                (host,),
            ).fetchone()
            scheduled = max(current, row["next_allowed_epoch"] if row else current)
            conn.execute(
                """
                INSERT INTO host_rate_limits(host, next_allowed_epoch)
                VALUES (?, ?)
                ON CONFLICT(host) DO UPDATE SET
                    next_allowed_epoch = excluded.next_allowed_epoch
                """,
                (host, scheduled + interval_seconds),
            )
        return max(0.0, scheduled - current)
