from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any

from .config import CrawlerConfig
from .db import Database, utc_now


def _hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def export_candidates(db: Database, output_path: str | Path) -> int:
    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp_path = destination.with_suffix(destination.suffix + ".tmp")
    rows = db.connection.execute(
        """
        SELECT
            c.*, s.title AS source_title, s.publisher, s.source_type,
            s.officiality, s.canonical_url
        FROM color_candidates c
        JOIN sources s USING(source_id)
        WHERE c.record_status != 'rejected'
        ORDER BY c.make, c.model, c.model_year, c.color_name_normalized,
                 c.page_number, c.candidate_id
        """
    )
    count = 0
    with temp_path.open("w", encoding="utf-8", newline="\n") as output:
        for row in rows:
            record = {
                "candidate_id": row["candidate_id"],
                "make": row["make"],
                "model": row["model"],
                "model_year": row["model_year"],
                "color": {
                    "name_raw": row["color_name_raw"],
                    "name_normalized": row["color_name_normalized"],
                    "code_raw": row["color_code_raw"],
                    "code_normalized": row["color_code_normalized"],
                },
                "availability_claim": row["availability_claim"],
                "record_status": row["record_status"],
                "verification_status": (
                    "human_verified"
                    if row["record_status"] == "verified"
                    else "unreviewed_candidate"
                ),
                "confidence": row["confidence"],
                "extraction": {
                    "method": row["extraction_method"],
                    "engine": row["extraction_engine"],
                },
                "evidence_text": row["evidence_text"],
                "evidence_locator": json.loads(row["evidence_locator_json"]),
                "source": {
                    "source_id": row["source_id"],
                    "title": row["source_title"],
                    "publisher": row["publisher"],
                    "source_type": row["source_type"],
                    "officiality": row["officiality"],
                    "canonical_url": row["canonical_url"],
                    "artifact_sha256": row["artifact_sha256"],
                },
                "parser_version": row["parser_version"],
            }
            output.write(json.dumps(record, sort_keys=True, ensure_ascii=False) + "\n")
            count += 1
        output.flush()
        os.fsync(output.fileno())
    os.replace(temp_path, destination)
    return count


def audit_state(
    db: Database, config: CrawlerConfig, *, full_hash: bool = False
) -> dict[str, Any]:
    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    artifact_count = 0
    for row in db.connection.execute("SELECT * FROM artifacts ORDER BY sha256"):
        artifact_count += 1
        path = config.object_root / row["object_relpath"]
        if not path.is_file():
            errors.append(
                {"kind": "missing_artifact", "sha256": row["sha256"], "path": str(path)}
            )
            continue
        actual_size = path.stat().st_size
        if actual_size != row["byte_length"]:
            errors.append(
                {
                    "kind": "artifact_size_mismatch",
                    "sha256": row["sha256"],
                    "expected": row["byte_length"],
                    "actual": actual_size,
                }
            )
        if full_hash:
            actual_hash = _hash_file(path)
            if actual_hash != row["sha256"]:
                errors.append(
                    {
                        "kind": "artifact_hash_mismatch",
                        "sha256": row["sha256"],
                        "actual": actual_hash,
                    }
                )

    page_text_count = 0
    for row in db.connection.execute("SELECT * FROM page_text"):
        page_text_count += 1
        path = config.derived_root / row["text_relpath"]
        if not path.is_file():
            errors.append(
                {
                    "kind": "missing_page_text",
                    "artifact_sha256": row["artifact_sha256"],
                    "pdf_page": row["page_number"],
                    "method": row["method"],
                }
            )
            continue
        actual_hash = _hash_file(path)
        if actual_hash != row["text_sha256"]:
            errors.append(
                {
                    "kind": "page_text_hash_mismatch",
                    "artifact_sha256": row["artifact_sha256"],
                    "pdf_page": row["page_number"],
                    "method": row["method"],
                }
            )

    known_objects = {
        row["object_relpath"]
        for row in db.connection.execute("SELECT object_relpath FROM artifacts")
    }
    if config.object_root.is_dir():
        for path in config.object_root.rglob("*.pdf"):
            relpath = path.relative_to(config.object_root).as_posix()
            if relpath not in known_objects:
                warnings.append(
                    {
                        "kind": "orphan_artifact_object",
                        "path": relpath,
                        "note": "preserve it; a retried fetch may adopt the object",
                    }
                )

    missing_pages = db.connection.execute(
        """
        WITH RECURSIVE pages(artifact_sha256, page_number, page_count) AS (
            SELECT artifact_sha256, 1, page_count FROM pdf_documents
            UNION ALL
            SELECT artifact_sha256, page_number + 1, page_count
            FROM pages WHERE page_number < page_count
        )
        SELECT pages.artifact_sha256, pages.page_number
        FROM pages
        LEFT JOIN page_text
          ON page_text.artifact_sha256 = pages.artifact_sha256
         AND page_text.page_number = pages.page_number
        WHERE page_text.artifact_sha256 IS NULL
        ORDER BY pages.artifact_sha256, pages.page_number
        """
    ).fetchall()
    for row in missing_pages:
        warnings.append(
            {
                "kind": "page_not_extracted",
                "artifact_sha256": row["artifact_sha256"],
                "pdf_page": row["page_number"],
            }
        )

    weak_pages = db.connection.execute(
        """
        SELECT artifact_sha256, page_number,
               MAX(CASE WHEN extraction_status = 'usable' THEN 1 ELSE 0 END) AS has_usable,
               MAX(character_count) AS best_character_count
        FROM page_text
        GROUP BY artifact_sha256, page_number
        HAVING has_usable = 0
        ORDER BY artifact_sha256, page_number
        """
    ).fetchall()
    for row in weak_pages:
        warnings.append(
            {
                "kind": "page_text_not_usable",
                "artifact_sha256": row["artifact_sha256"],
                "pdf_page": row["page_number"],
                "best_character_count": row["best_character_count"],
            }
        )

    for row in db.connection.execute(
        "SELECT job_id, kind, dedupe_key, last_error FROM jobs WHERE state = 'dead'"
    ):
        errors.append(
            {
                "kind": "dead_job",
                "job_id": row["job_id"],
                "job_kind": row["kind"],
                "dedupe_key": row["dedupe_key"],
                "error": row["last_error"],
            }
        )

    unreviewed = db.connection.execute(
        """
        SELECT COUNT(*) FROM color_candidates
        WHERE record_status IN (
            'extracted_candidate', 'needs_review', 'needs_year_assignment'
        )
        """
    ).fetchone()[0]
    if unreviewed:
        warnings.append(
            {
                "kind": "unreviewed_candidates",
                "count": unreviewed,
                "note": "automated candidates are not verified availability records",
            }
        )

    coverage: list[dict[str, Any]] = []
    source_rows = db.connection.execute(
        """
        SELECT
            s.source_id, s.make, s.model, s.year_start, s.year_end,
            sa.artifact_sha256,
            pd.page_count,
            COUNT(DISTINCT pt.page_number) AS extracted_pages,
            COUNT(DISTINCT CASE
                WHEN cc.record_status != 'rejected' THEN cc.candidate_id
            END) AS active_candidates
        FROM sources s
        LEFT JOIN source_artifacts sa
          ON sa.source_id = s.source_id AND sa.is_current = 1
        LEFT JOIN pdf_documents pd
          ON pd.artifact_sha256 = sa.artifact_sha256
        LEFT JOIN page_text pt
          ON pt.artifact_sha256 = sa.artifact_sha256
        LEFT JOIN color_candidates cc
          ON cc.source_id = s.source_id
         AND cc.artifact_sha256 = sa.artifact_sha256
        GROUP BY
            s.source_id, s.make, s.model, s.year_start, s.year_end,
            sa.artifact_sha256, pd.page_count
        ORDER BY s.make, s.model, s.year_start, s.source_id
        """
    ).fetchall()
    for row in source_rows:
        record = dict(row)
        coverage.append(record)
        if row["artifact_sha256"] is None:
            warnings.append(
                {"kind": "source_not_fetched", "source_id": row["source_id"]}
            )
        elif (
            row["page_count"] is not None
            and row["extracted_pages"] == row["page_count"]
            and row["active_candidates"] == 0
        ):
            warnings.append(
                {
                    "kind": "source_has_no_color_candidates",
                    "source_id": row["source_id"],
                    "note": "review the source image; absence is not a negative availability claim",
                }
            )

    return {
        "audited_at": utc_now(),
        "full_hash": full_hash,
        "ok": not errors,
        "counts": {
            "artifacts": artifact_count,
            "page_text_records": page_text_count,
            "errors": len(errors),
            "warnings": len(warnings),
        },
        "errors": errors,
        "warnings": warnings,
        "source_coverage": coverage,
    }
