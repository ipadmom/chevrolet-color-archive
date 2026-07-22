from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
from pathlib import Path, PurePosixPath
from typing import Any, Iterable, Mapping, Sequence

from .color_table_batch import (
    CANDIDATE_SCHEMA,
    PAGE_SCHEMA,
    PIPELINE_VERSION,
    SOURCE_SCHEMA,
    source_shard,
)


CORPUS_SCHEMA_VERSION = 1
DEFAULT_EXPECTED_SHARDS = 4
DEFAULT_EXPECTED_SOURCES = 691

TABLE_SCHEMAS: dict[str, dict[str, str]] = {
    "source_documents": SOURCE_SCHEMA,
    "candidate_pages": PAGE_SCHEMA,
    "color_candidates": CANDIDATE_SCHEMA,
}

PRIMARY_KEYS: dict[str, tuple[str, ...]] = {
    "source_documents": ("source_id",),
    "candidate_pages": ("source_id", "pdf_page"),
    "color_candidates": ("candidate_id",),
}

FOREIGN_KEYS: dict[str, dict[str, str]] = {
    "source_documents": {},
    "candidate_pages": {"source_id": "source_documents.source_id"},
    "color_candidates": {
        "source_id": "source_documents.source_id",
        "source_id,pdf_page": "candidate_pages.source_id,pdf_page",
    },
}

SOURCE_TO_PAGE_FIELDS = (
    "direct_url",
    "document_title",
    "model",
    "year_start",
    "year_end",
    "artifact_sha256",
    "artifact_bytes",
    "retrieved_at",
    "pipeline_version",
)

SOURCE_TO_CANDIDATE_FIELDS = (
    "direct_url",
    "document_title",
    "publisher",
    "source_type",
    "officiality",
    "make",
    "model",
    "year_start",
    "year_end",
    "retrieved_at",
    "artifact_sha256",
    "artifact_bytes",
    "pipeline_version",
)

PAGE_TO_CANDIDATE_FIELDS = (
    "direct_url",
    "document_title",
    "model",
    "year_start",
    "year_end",
    "document_revision_date_raw",
    "pdf_page",
    "printed_page_locator",
    "retrieved_at",
    "artifact_sha256",
    "artifact_bytes",
    "page_restrictions_json",
    "extraction_method",
    "extraction_engine",
    "text_sha256",
    "text_relpath",
    "render_sha256",
    "render_bytes",
    "render_relpath",
    "visual_review_status",
    "visual_reviewed_at",
    "visual_reviewer",
    "visual_review_notes",
    "pipeline_version",
)

CAVEATS = (
    "Every color row is an automated, unreviewed research candidate. It is not a published factory-availability finding.",
    "A missing candidate is not evidence that a color was unavailable.",
    "OCR can lose boldface, column boundaries, checkbox meaning, restrictions, body-style scope, and two-tone relationships.",
    "The tracked corpus does not contain full page text or page renders. text_relpath and render_relpath resolve only against the complete extraction artifact root supplied to the consolidator.",
    "Promotion requires visual comparison with the retained render and the complete official source PDF.",
)

SHARD_FILE_RE = re.compile(
    r"^(?P<table>source_documents|candidate_pages|color_candidates)"
    r"\.part-(?P<index>\d{5})-of-(?P<count>\d{5})"
    r"\.(?P<extension>jsonl|parquet)$"
)
SUMMARY_FILE_RE = re.compile(
    r"^run-summary\.part-(?P<index>\d{5})-of-(?P<count>\d{5})\.json$"
)


class ConsolidationError(ValueError):
    """The shard corpus is incomplete or fails an integrity invariant."""


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_json_bytes(value: Any) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode(
        "utf-8"
    )


def _require_object(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ConsolidationError(f"{label} must contain a JSON object")
    return value


def _load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ConsolidationError(f"cannot read {path}: {exc}") from exc
    return _require_object(value, str(path))


def _read_jsonl(path: Path, schema: Mapping[str, str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8-sig") as handle:
            for line_number, raw in enumerate(handle, 1):
                if not raw.strip():
                    raise ConsolidationError(f"{path}:{line_number}: blank JSONL line")
                try:
                    row = json.loads(raw)
                except json.JSONDecodeError as exc:
                    raise ConsolidationError(f"{path}:{line_number}: {exc}") from exc
                if not isinstance(row, dict):
                    raise ConsolidationError(
                        f"{path}:{line_number}: expected an object, got {type(row).__name__}"
                    )
                missing = sorted(set(schema) - set(row))
                extra = sorted(set(row) - set(schema))
                if missing or extra:
                    raise ConsolidationError(
                        f"{path}:{line_number}: schema mismatch; missing={missing}, extra={extra}"
                    )
                rows.append(row)
    except (OSError, UnicodeError) as exc:
        raise ConsolidationError(f"cannot read {path}: {exc}") from exc
    return rows


def _pyarrow_schema(schema: Mapping[str, str]) -> Any:
    try:
        import pyarrow as pa
    except ImportError as exc:
        raise RuntimeError("consolidation requires pyarrow") from exc
    types = {"string": pa.string(), "int64": pa.int64(), "float64": pa.float64()}
    return pa.schema([pa.field(name, types[kind]) for name, kind in schema.items()])


def _read_and_validate_parquet(
    path: Path, expected_rows: Sequence[dict[str, Any]], schema: Mapping[str, str]
) -> None:
    try:
        import pyarrow.parquet as pq
    except ImportError as exc:
        raise RuntimeError("consolidation requires pyarrow") from exc
    try:
        table = pq.read_table(path)
    except Exception as exc:
        raise ConsolidationError(f"cannot read {path}: {exc}") from exc
    expected_schema = _pyarrow_schema(schema)
    if table.schema.names != expected_schema.names or any(
        table.schema.field(name).type != expected_schema.field(name).type
        for name in expected_schema.names
    ):
        raise ConsolidationError(
            f"{path}: Parquet schema does not match the extraction schema"
        )
    normalized = [{name: row.get(name) for name in schema} for row in expected_rows]
    if table.to_pylist() != normalized:
        raise ConsolidationError(f"{path}: Parquet rows do not exactly match sibling JSONL")


def _discover_shard_files(
    input_root: Path, expected_shards: int
) -> dict[int, dict[str, Path]]:
    if expected_shards <= 0:
        raise ConsolidationError("expected shard count must be positive")
    if not input_root.is_dir():
        raise ConsolidationError(f"extraction directory not found: {input_root}")

    discovered: dict[int, dict[str, Path]] = {}
    recognized_counts: set[int] = set()
    for path in sorted(input_root.iterdir(), key=lambda item: item.name):
        if not path.is_file():
            continue
        match = SHARD_FILE_RE.match(path.name)
        if match:
            index = int(match.group("index"))
            count = int(match.group("count"))
            recognized_counts.add(count)
            key = f"{match.group('table')}.{match.group('extension')}"
        else:
            match = SUMMARY_FILE_RE.match(path.name)
            if not match:
                continue
            index = int(match.group("index"))
            count = int(match.group("count"))
            recognized_counts.add(count)
            key = "run-summary.json"
        slot = discovered.setdefault(index, {})
        if key in slot:
            raise ConsolidationError(f"duplicate shard component for index {index}: {key}")
        slot[key] = path

    if recognized_counts != {expected_shards}:
        raise ConsolidationError(
            "partition count mismatch: "
            f"expected only {expected_shards}, found {sorted(recognized_counts)}"
        )
    expected_indexes = set(range(expected_shards))
    if set(discovered) != expected_indexes:
        missing = sorted(expected_indexes - set(discovered))
        extra = sorted(set(discovered) - expected_indexes)
        raise ConsolidationError(
            f"incomplete shard numbering; missing={missing}, unexpected={extra}"
        )
    required = {
        *(f"{table}.jsonl" for table in TABLE_SCHEMAS),
        *(f"{table}.parquet" for table in TABLE_SCHEMAS),
        "run-summary.json",
    }
    for index in sorted(discovered):
        missing = sorted(required - set(discovered[index]))
        extra = sorted(set(discovered[index]) - required)
        if missing or extra:
            raise ConsolidationError(
                f"shard {index}: component mismatch; missing={missing}, unexpected={extra}"
            )
    return discovered


def _validate_ledger(path: Path, expected_sources: int) -> tuple[dict[str, Any], str]:
    ledger = _load_json(path)
    if ledger.get("schema_version") != 1:
        raise ConsolidationError(f"{path}: unsupported artifact-ledger schema")
    if ledger.get("source_count") != expected_sources:
        raise ConsolidationError(
            f"{path}: source_count is {ledger.get('source_count')}, expected {expected_sources}"
        )
    entries = ledger.get("entries")
    if not isinstance(entries, list) or len(entries) != expected_sources:
        raise ConsolidationError(
            f"{path}: expected {expected_sources} artifact entries, found "
            f"{len(entries) if isinstance(entries, list) else 'non-list'}"
        )
    audit = ledger.get("file_audit")
    if not isinstance(audit, dict) or not all(
        audit.get(field) is True
        for field in (
            "all_objects_rehashed",
            "all_byte_lengths_reconciled",
            "all_pdfs_opened",
        )
    ):
        raise ConsolidationError(f"{path}: artifact-ledger file audit is not complete")
    by_id: dict[str, Any] = {}
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("source_id"), str):
            raise ConsolidationError(f"{path}: invalid artifact entry")
        source_id = entry["source_id"]
        if source_id in by_id:
            raise ConsolidationError(f"{path}: duplicate source_id {source_id!r}")
        if entry.get("integrity_status") != "complete":
            raise ConsolidationError(f"{path}: {source_id}: artifact is not complete")
        if entry.get("media_type") != "application/pdf":
            raise ConsolidationError(f"{path}: {source_id}: artifact is not a PDF")
        by_id[source_id] = entry
    return by_id, sha256_file(path)


def _row_key(row: Mapping[str, Any], fields: Iterable[str]) -> tuple[Any, ...]:
    return tuple(row.get(field) for field in fields)


def _index_unique(
    table: str, rows: Sequence[dict[str, Any]], fields: tuple[str, ...]
) -> dict[tuple[Any, ...], dict[str, Any]]:
    index: dict[tuple[Any, ...], dict[str, Any]] = {}
    for row_number, row in enumerate(rows, 1):
        key = _row_key(row, fields)
        if any(value is None or value == "" for value in key):
            raise ConsolidationError(f"{table} row {row_number}: empty primary key {key}")
        if key in index:
            raise ConsolidationError(f"{table}: duplicate primary key {key}")
        index[key] = row
    return index


def _assert_equal_fields(
    child: Mapping[str, Any],
    parent: Mapping[str, Any],
    fields: Iterable[str],
    label: str,
) -> None:
    mismatched = [field for field in fields if child.get(field) != parent.get(field)]
    if mismatched:
        raise ConsolidationError(
            f"{label}: repeated provenance mismatch in {', '.join(mismatched)}"
        )


def _validate_source_against_ledger(
    source: Mapping[str, Any], ledger: Mapping[str, Any]
) -> None:
    mapping = {
        "direct_url": "canonical_url",
        "final_url": "final_url",
        "document_title": "title",
        "retrieved_at": "completed_at",
        "artifact_sha256": "artifact_sha256",
        "artifact_bytes": "byte_length",
        "artifact_relpath": "crawler_object_relpath",
        "pdf_page_count": "pdf_page_count",
    }
    mismatched = [
        source_field
        for source_field, ledger_field in mapping.items()
        if source.get(source_field) != ledger.get(ledger_field)
    ]
    if mismatched:
        raise ConsolidationError(
            f"{source.get('source_id')}: artifact-ledger mismatch in {', '.join(mismatched)}"
        )
    if source.get("pipeline_version") != PIPELINE_VERSION:
        raise ConsolidationError(
            f"{source.get('source_id')}: unexpected pipeline version "
            f"{source.get('pipeline_version')!r}"
        )
    try:
        metadata = json.loads(source.get("pdf_metadata_json") or "")
    except json.JSONDecodeError as exc:
        raise ConsolidationError(
            f"{source.get('source_id')}: invalid pdf_metadata_json"
        ) from exc
    if not isinstance(metadata, dict):
        raise ConsolidationError(
            f"{source.get('source_id')}: pdf_metadata_json must encode an object"
        )


def _safe_evidence_path(input_root: Path, relpath: Any, label: str) -> Path:
    if not isinstance(relpath, str) or not relpath:
        raise ConsolidationError(f"{label}: missing evidence relpath")
    if "\\" in relpath:
        raise ConsolidationError(f"{label}: evidence relpath must use POSIX separators")
    pure = PurePosixPath(relpath)
    if pure.is_absolute() or any(part in {"", ".", ".."} for part in pure.parts):
        raise ConsolidationError(f"{label}: unsafe evidence relpath {relpath!r}")
    root = input_root.resolve()
    resolved = (root / Path(*pure.parts)).resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise ConsolidationError(
            f"{label}: evidence relpath escapes extraction root: {relpath!r}"
        ) from exc
    if not resolved.is_file():
        raise ConsolidationError(f"{label}: evidence file does not exist: {relpath}")
    return resolved


def _validate_evidence_files(
    input_root: Path, pages: Sequence[dict[str, Any]]
) -> dict[str, int]:
    cache: dict[Path, tuple[int, str]] = {}
    totals = {"text_files": 0, "text_bytes": 0, "render_files": 0, "render_bytes": 0}
    references: dict[str, set[Path]] = {"text": set(), "render": set()}
    for page in pages:
        label = f"{page['source_id']} PDF page {page['pdf_page']}"
        for kind in ("text", "render"):
            path = _safe_evidence_path(input_root, page[f"{kind}_relpath"], label)
            if path not in cache:
                stat = path.stat()
                digest = sha256_file(path)
                after = path.stat()
                if stat.st_size != after.st_size or stat.st_mtime_ns != after.st_mtime_ns:
                    raise ConsolidationError(f"{label}: evidence file changed during audit")
                cache[path] = (after.st_size, digest)
            actual_bytes, actual_hash = cache[path]
            expected_bytes = page[f"{kind}_bytes"]
            expected_hash = page[f"{kind}_sha256"]
            if actual_bytes != expected_bytes or actual_hash != expected_hash:
                raise ConsolidationError(
                    f"{label}: {kind} evidence hash/byte mismatch at {page[f'{kind}_relpath']}"
                )
            references[kind].add(path)
    for kind in ("text", "render"):
        totals[f"{kind}_files"] = len(references[kind])
        totals[f"{kind}_bytes"] = sum(cache[path][0] for path in references[kind])
    return totals


def _expected_candidate_id(candidate: Mapping[str, Any]) -> str:
    identity = "\0".join(
        (
            str(candidate["source_id"]),
            str(candidate["artifact_sha256"]),
            str(candidate["pdf_page"]),
            str(candidate["row_kind"]),
            str(candidate.get("paint_code_normalized") or ""),
            str(candidate["color_name_normalized"]),
            str(candidate.get("secondary_paint_code_raw") or ""),
            str(candidate.get("secondary_color_name_raw") or ""),
        )
    )
    return sha256_bytes(identity.encode("utf-8"))


def _validate_rows(
    rows: Mapping[str, Sequence[dict[str, Any]]],
    row_shards: Mapping[str, Sequence[int]],
    ledger_by_id: Mapping[str, Any],
    expected_shards: int,
    input_root: Path,
) -> dict[str, int]:
    sources = list(rows["source_documents"])
    pages = list(rows["candidate_pages"])
    candidates = list(rows["color_candidates"])
    source_index = _index_unique("source_documents", sources, ("source_id",))
    page_index = _index_unique("candidate_pages", pages, ("source_id", "pdf_page"))
    _index_unique("color_candidates", candidates, ("candidate_id",))
    if set(key[0] for key in source_index) != set(ledger_by_id):
        missing = sorted(set(ledger_by_id) - {key[0] for key in source_index})
        extra = sorted({key[0] for key in source_index} - set(ledger_by_id))
        raise ConsolidationError(
            f"source_documents do not exactly cover artifact ledger; missing={missing}, extra={extra}"
        )

    for source, shard_index in zip(sources, row_shards["source_documents"], strict=True):
        source_id = source["source_id"]
        expected_shard = source_shard(source_id, expected_shards)
        if shard_index != expected_shard:
            raise ConsolidationError(
                f"{source_id}: found in shard {shard_index}, expected shard {expected_shard}"
            )
        _validate_source_against_ledger(source, ledger_by_id[source_id])

    for page, shard_index in zip(pages, row_shards["candidate_pages"], strict=True):
        source_id = page["source_id"]
        source = source_index.get((source_id,))
        if source is None:
            raise ConsolidationError(f"candidate_pages: missing source FK {source_id!r}")
        if shard_index != source_shard(source_id, expected_shards):
            raise ConsolidationError(f"{source_id} page {page['pdf_page']}: wrong shard")
        _assert_equal_fields(
            page, source, SOURCE_TO_PAGE_FIELDS, f"{source_id} PDF page {page['pdf_page']}"
        )
        pdf_page = page.get("pdf_page")
        if not isinstance(pdf_page, int) or not 1 <= pdf_page <= source["pdf_page_count"]:
            raise ConsolidationError(f"{source_id}: invalid PDF page {pdf_page!r}")
        if page.get("candidate_page_score") is None:
            raise ConsolidationError(f"{source_id} PDF page {pdf_page}: missing page score")
        try:
            restrictions = json.loads(page.get("page_restrictions_json") or "")
        except json.JSONDecodeError as exc:
            raise ConsolidationError(
                f"{source_id} PDF page {pdf_page}: invalid restrictions JSON"
            ) from exc
        if not isinstance(restrictions, list):
            raise ConsolidationError(
                f"{source_id} PDF page {pdf_page}: restrictions must encode a list"
            )
        if page.get("render_width", 0) <= 0 or page.get("render_height", 0) <= 0:
            raise ConsolidationError(
                f"{source_id} PDF page {pdf_page}: invalid render dimensions"
            )

    for candidate, shard_index in zip(
        candidates, row_shards["color_candidates"], strict=True
    ):
        source_id = candidate["source_id"]
        pdf_page = candidate["pdf_page"]
        source = source_index.get((source_id,))
        page = page_index.get((source_id, pdf_page))
        if source is None:
            raise ConsolidationError(f"{candidate['candidate_id']}: missing source FK")
        if page is None:
            raise ConsolidationError(f"{candidate['candidate_id']}: missing page FK")
        if shard_index != source_shard(source_id, expected_shards):
            raise ConsolidationError(f"{candidate['candidate_id']}: wrong shard")
        _assert_equal_fields(
            candidate, source, SOURCE_TO_CANDIDATE_FIELDS, candidate["candidate_id"]
        )
        _assert_equal_fields(
            candidate, page, PAGE_TO_CANDIDATE_FIELDS, candidate["candidate_id"]
        )
        if candidate["candidate_id"] != _expected_candidate_id(candidate):
            raise ConsolidationError(
                f"{candidate['candidate_id']}: candidate ID is not content-stable"
            )
        expected_model_year = (
            source["year_start"] if source["year_start"] == source["year_end"] else None
        )
        if candidate.get("model_year") != expected_model_year:
            raise ConsolidationError(
                f"{candidate['candidate_id']}: model_year does not match source scope"
            )
        confidence = candidate.get("confidence")
        if not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
            raise ConsolidationError(
                f"{candidate['candidate_id']}: confidence must be between zero and one"
            )

    return _validate_evidence_files(input_root, pages)


def _summary_metric(rows: Sequence[dict[str, Any]], name: str) -> int:
    if name == "rows_with_complete_provenance":
        fields = (
            "source_id",
            "direct_url",
            "document_title",
            "model",
            "model_year",
            "pdf_page",
            "retrieved_at",
            "artifact_sha256",
            "artifact_bytes",
            "extraction_method",
            "confidence",
            "render_sha256",
        )
        return sum(1 for row in rows if all(row.get(field) is not None for field in fields))
    if name == "rows_with_paint_code":
        return sum(1 for row in rows if row.get("paint_code_normalized"))
    if name == "rows_with_printed_page_locator":
        return sum(1 for row in rows if row.get("printed_page_locator"))
    if name == "rows_with_document_revision_date":
        return sum(1 for row in rows if row.get("document_revision_date_raw"))
    if name == "rows_visually_inspected":
        return sum(1 for row in rows if row.get("visual_review_status") != "required")
    raise AssertionError(name)


def _validate_summary(
    summary: Mapping[str, Any],
    shard_index: int,
    expected_shards: int,
    shard_rows: Mapping[str, Sequence[dict[str, Any]]],
) -> None:
    expected_values = {
        "pipeline_version": PIPELINE_VERSION,
        "shard_count": expected_shards,
        "shard_index": shard_index,
        "source_documents": len(shard_rows["source_documents"]),
        "candidate_pages": len(shard_rows["candidate_pages"]),
        "color_candidates": len(shard_rows["color_candidates"]),
        "rendered_candidate_pages": len(shard_rows["candidate_pages"]),
        "parquet_written": True,
    }
    for field, expected in expected_values.items():
        if summary.get(field) != expected:
            raise ConsolidationError(
                f"shard {shard_index} summary: {field}={summary.get(field)!r}, "
                f"expected {expected!r}"
            )
    candidates = shard_rows["color_candidates"]
    for field in (
        "rows_with_complete_provenance",
        "rows_with_paint_code",
        "rows_with_printed_page_locator",
        "rows_with_document_revision_date",
        "rows_visually_inspected",
    ):
        expected = _summary_metric(candidates, field)
        if summary.get(field) != expected:
            raise ConsolidationError(
                f"shard {shard_index} summary: {field}={summary.get(field)!r}, "
                f"expected {expected}"
            )
    if not summary.get("started_at") or not summary.get("completed_at"):
        raise ConsolidationError(f"shard {shard_index} summary lacks run timestamps")


def _sort_rows(table: str, rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    if table == "source_documents":
        key = lambda row: (row["source_id"],)
    elif table == "candidate_pages":
        key = lambda row: (row["source_id"], row["pdf_page"])
    elif table == "color_candidates":
        key = lambda row: (
            row["source_id"],
            row["pdf_page"],
            row["evidence_line"],
            row["candidate_id"],
        )
    else:
        raise AssertionError(table)
    return sorted(rows, key=key)


def _write_parquet(path: Path, rows: Sequence[dict[str, Any]], schema: Mapping[str, str]) -> None:
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError as exc:
        raise RuntimeError("consolidation requires pyarrow") from exc
    arrow_schema = _pyarrow_schema(schema)
    normalized = [{name: row.get(name) for name in schema} for row in rows]
    table = pa.Table.from_pylist(normalized, schema=arrow_schema)
    pq.write_table(
        table,
        path,
        compression="zstd",
        use_dictionary=False,
        write_statistics=True,
        data_page_version="1.0",
        row_group_size=65536,
    )


def _table_manifest_entry(
    table: str, path: Path, rows: Sequence[dict[str, Any]]
) -> dict[str, Any]:
    schema = TABLE_SCHEMAS[table]
    return {
        "table": table,
        "path": f"{table}.parquet",
        "rows": len(rows),
        "columns": len(schema),
        "sha256": sha256_file(path),
        "primary_key": list(PRIMARY_KEYS[table]),
        "foreign_keys": FOREIGN_KEYS[table],
        "schema": [
            {"name": name, "type": kind, "nullable": True}
            for name, kind in schema.items()
        ],
    }


def consolidate(
    *,
    input_root: Path,
    output_root: Path,
    artifact_ledger_path: Path,
    expected_shards: int = DEFAULT_EXPECTED_SHARDS,
    expected_sources: int = DEFAULT_EXPECTED_SOURCES,
) -> dict[str, Any]:
    input_root = input_root.resolve()
    output_root = output_root.resolve()
    artifact_ledger_path = artifact_ledger_path.resolve()
    if output_root == input_root or input_root in output_root.parents:
        raise ConsolidationError("tracked output must not be the extraction artifact directory")
    shards = _discover_shard_files(input_root, expected_shards)
    ledger_by_id, ledger_sha = _validate_ledger(artifact_ledger_path, expected_sources)

    rows: dict[str, list[dict[str, Any]]] = {table: [] for table in TABLE_SCHEMAS}
    row_shards: dict[str, list[int]] = {table: [] for table in TABLE_SCHEMAS}
    shard_manifest: list[dict[str, Any]] = []
    for shard_index in range(expected_shards):
        components = shards[shard_index]
        shard_rows: dict[str, list[dict[str, Any]]] = {}
        component_manifest: dict[str, Any] = {"shard_index": shard_index}
        for table, schema in TABLE_SCHEMAS.items():
            jsonl_path = components[f"{table}.jsonl"]
            parquet_path = components[f"{table}.parquet"]
            loaded = _read_jsonl(jsonl_path, schema)
            _read_and_validate_parquet(parquet_path, loaded, schema)
            shard_rows[table] = loaded
            rows[table].extend(loaded)
            row_shards[table].extend([shard_index] * len(loaded))
            component_manifest[f"{table}_jsonl"] = {
                "file": jsonl_path.name,
                "bytes": jsonl_path.stat().st_size,
                "sha256": sha256_file(jsonl_path),
            }
            component_manifest[f"{table}_parquet"] = {
                "file": parquet_path.name,
                "bytes": parquet_path.stat().st_size,
                "sha256": sha256_file(parquet_path),
            }
        summary_path = components["run-summary.json"]
        summary = _load_json(summary_path)
        _validate_summary(summary, shard_index, expected_shards, shard_rows)
        component_manifest["summary"] = {
            "file": summary_path.name,
            "bytes": summary_path.stat().st_size,
            "sha256": sha256_file(summary_path),
        }
        component_manifest["counts"] = {
            table: len(shard_rows[table]) for table in TABLE_SCHEMAS
        }
        shard_manifest.append(component_manifest)

    evidence = _validate_rows(
        rows, row_shards, ledger_by_id, expected_shards, input_root
    )
    if len(rows["source_documents"]) != expected_sources:
        raise ConsolidationError(
            f"found {len(rows['source_documents'])} sources, expected {expected_sources}"
        )
    sorted_rows = {table: _sort_rows(table, table_rows) for table, table_rows in rows.items()}

    output_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="gm-color-corpus-", dir=output_root.parent) as temp:
        temp_root = Path(temp)
        temp_tables: dict[str, Path] = {}
        for table, schema in TABLE_SCHEMAS.items():
            path = temp_root / f"{table}.parquet"
            _write_parquet(path, sorted_rows[table], schema)
            temp_tables[table] = path

        corpus_fingerprint = sha256_bytes(
            canonical_json_bytes(
                {
                    "artifact_ledger_sha256": ledger_sha,
                    "shards": shard_manifest,
                    "pipeline_version": PIPELINE_VERSION,
                }
            )
        )
        manifest = {
            "schema_version": CORPUS_SCHEMA_VERSION,
            "archive": "Chevrolet Color Archive",
            "corpus": "GM official color-table extraction review queue",
            "pipeline_version": PIPELINE_VERSION,
            "corpus_fingerprint": corpus_fingerprint,
            "artifact_ledger": {
                "path": "data/sources/gm-heritage-chevrolet-artifacts.json",
                "sha256": ledger_sha,
                "source_count": expected_sources,
            },
            "extraction_artifact_contract": {
                "root": "operator-supplied --input directory; intentionally not committed",
                "text_path_field": "candidate_pages.text_relpath",
                "render_path_field": "candidate_pages.render_relpath",
                **evidence,
            },
            "shard_count": expected_shards,
            "input_shards": shard_manifest,
            "coverage": {
                "source_documents": len(sorted_rows["source_documents"]),
                "candidate_pages": len(sorted_rows["candidate_pages"]),
                "color_candidates": len(sorted_rows["color_candidates"]),
                "visually_reviewed_candidate_pages": sum(
                    1
                    for row in sorted_rows["candidate_pages"]
                    if row["visual_review_status"] != "required"
                ),
            },
            "tables": [
                _table_manifest_entry(
                    table, temp_tables[table], sorted_rows[table]
                )
                for table in TABLE_SCHEMAS
            ],
            "caveats": list(CAVEATS),
        }
        manifest_path = temp_root / "manifest.json"
        manifest_path.write_bytes(canonical_json_bytes(manifest))

        for table in TABLE_SCHEMAS:
            os.replace(temp_tables[table], output_root / f"{table}.parquet")
        os.replace(manifest_path, output_root / "manifest.json")
    return manifest


def build_argument_parser() -> argparse.ArgumentParser:
    repository_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(
        description=(
            "Validate all complete GM color-table extraction shards and write a "
            "deterministic, compact Parquet review corpus"
        )
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=repository_root / "tmp" / "gm-color-tables",
        help="Complete extraction artifact root containing every numbered shard",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=repository_root / "data" / "research" / "gm-official-color-tables",
    )
    parser.add_argument(
        "--artifact-ledger",
        type=Path,
        default=repository_root / "data" / "sources" / "gm-heritage-chevrolet-artifacts.json",
    )
    parser.add_argument("--expected-shards", type=int, default=DEFAULT_EXPECTED_SHARDS)
    parser.add_argument("--expected-sources", type=int, default=DEFAULT_EXPECTED_SOURCES)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_argument_parser().parse_args(argv)
    try:
        manifest = consolidate(
            input_root=args.input,
            output_root=args.output,
            artifact_ledger_path=args.artifact_ledger,
            expected_shards=args.expected_shards,
            expected_sources=args.expected_sources,
        )
    except (ConsolidationError, OSError, RuntimeError) as exc:
        print(f"error: {exc}", file=__import__("sys").stderr)
        return 2
    print(
        json.dumps(
            {
                "status": "ok",
                "corpus_fingerprint": manifest["corpus_fingerprint"],
                **manifest["coverage"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0
