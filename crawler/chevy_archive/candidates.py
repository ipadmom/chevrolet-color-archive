from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass
from typing import Any

from .db import Database, utc_now


PARSER_VERSION = "chevrolet-color-table-v1"
HEADER_PATTERN = re.compile(
    r"\b(?:exterior|paint|body).{0,24}\bcolors?\b|\bcolors?\b.{0,24}\bcodes?\b",
    re.I,
)
CODE_NAME_PATTERNS = (
    re.compile(
        r"^\s*(?:paint\s+)?(?:color\s+)?(?:code\s+)?"
        r"(?P<code>[A-Z0-9]{1,3})(?:[-/](?:[A-Z0-9]{1,3}))?"
        r"\s{2,}(?P<name>[A-Z][A-Z0-9 &'./()_-]{2,50}?)(?:\s{2,}.*)?$"
    ),
    re.compile(
        r"^\s*(?:paint\s+)?(?:color\s+)?(?:code\s+)?"
        r"(?P<code>[A-Z0-9]{1,3})(?:[-/](?:[A-Z0-9]{1,3}))?"
        r"\s*[-:|]\s*(?P<name>[A-Za-z][A-Za-z0-9 &'./()_-]{2,50})\s*$"
    ),
)
COLOR_WORDS = {
    "black",
    "blue",
    "bronze",
    "brown",
    "burgundy",
    "charcoal",
    "copper",
    "cream",
    "gold",
    "gray",
    "green",
    "grey",
    "ivory",
    "maroon",
    "orange",
    "red",
    "rose",
    "silver",
    "tan",
    "turquoise",
    "violet",
    "white",
    "yellow",
}
RESTRICTION_PATTERN = re.compile(
    r"\b(?:special order|not available|available only|except|restriction|stripe)\b",
    re.I,
)


@dataclass(frozen=True)
class Candidate:
    line_number: int
    color_code_raw: str
    color_name_raw: str
    confidence: float
    availability_claim: str
    evidence_text: str


def _clean_name(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    value = re.sub(r"\s+", " ", value).strip(" \t.;,*")
    return value


def _normalize_name(value: str) -> str:
    return _clean_name(value).upper()


def _normalize_code(value: str) -> str:
    pieces = re.findall(r"[A-Z0-9]+", value.upper())
    return "/".join(dict.fromkeys(pieces))


def _looks_like_color(name: str) -> bool:
    words = set(re.findall(r"[a-z]+", name.lower()))
    return bool(words & COLOR_WORDS)


def parse_color_candidates(text: str, extraction_method: str) -> list[Candidate]:
    lines = text.splitlines()
    header_lines = [index for index, line in enumerate(lines) if HEADER_PATTERN.search(line)]
    candidates: list[Candidate] = []
    seen: set[tuple[str, str, int]] = set()
    for index, line in enumerate(lines):
        nearest_header = min((abs(index - item) for item in header_lines), default=999)
        if nearest_header > 80:
            continue
        for pattern in CODE_NAME_PATTERNS:
            match = pattern.match(line)
            if not match:
                continue
            code = match.group("code").strip()
            name = _clean_name(match.group("name"))
            if not _looks_like_color(name):
                continue
            key = (_normalize_code(code), _normalize_name(name), index + 1)
            if key in seen:
                break
            seen.add(key)
            confidence = 0.92 if extraction_method == "native" else 0.76
            if nearest_header > 25:
                confidence -= 0.12
            evidence = line.strip()
            candidates.append(
                Candidate(
                    line_number=index + 1,
                    color_code_raw=code,
                    color_name_raw=name,
                    confidence=max(0.0, confidence),
                    availability_claim=(
                        "restriction_candidate"
                        if RESTRICTION_PATTERN.search(evidence)
                        else "listed_in_source_candidate"
                    ),
                    evidence_text=evidence,
                )
            )
            break
    return candidates


def persist_candidates(
    db: Database,
    *,
    source: Any,
    artifact_sha256: str,
    page_number: int,
    text: str,
    extraction_method: str,
    extraction_engine: str,
    text_sha256: str,
) -> int:
    parsed = parse_color_candidates(text, extraction_method)
    year_start = source["year_start"]
    year_end = source["year_end"]
    model_year = year_start if year_start is not None and year_start == year_end else None
    now = utc_now()
    source_url = source["canonical_url"]
    with db.transaction(immediate=True) as conn:
        conn.execute(
            """
            UPDATE color_candidates
            SET record_status = 'rejected', updated_at = ?
            WHERE source_id = ? AND artifact_sha256 = ? AND page_number = ?
              AND record_status IN (
                  'extracted_candidate', 'needs_review', 'needs_year_assignment'
              )
            """,
            (now, source["source_id"], artifact_sha256, page_number),
        )
        for candidate in parsed:
            normalized_name = _normalize_name(candidate.color_name_raw)
            normalized_code = _normalize_code(candidate.color_code_raw)
            identity = "\0".join(
                (
                    source["source_id"],
                    artifact_sha256,
                    str(page_number),
                    normalized_code,
                    normalized_name,
                )
            )
            candidate_id = hashlib.sha256(identity.encode("utf-8")).hexdigest()
            if model_year is None:
                record_status = "needs_year_assignment"
            elif extraction_method == "ocr" or candidate.confidence < 0.85:
                record_status = "needs_review"
            else:
                record_status = "extracted_candidate"
            locator = {
                "source_id": source["source_id"],
                "source_url": source_url,
                "artifact_sha256": artifact_sha256,
                "pdf_page": page_number,
                "printed_page": None,
                "text_line_start": candidate.line_number,
                "text_line_end": candidate.line_number,
                "text_sha256": text_sha256,
                "extraction_method": extraction_method,
                "extraction_engine": extraction_engine,
            }
            conn.execute(
                """
                INSERT INTO color_candidates (
                    candidate_id, source_id, artifact_sha256, page_number,
                    make, model, model_year, color_name_raw,
                    color_name_normalized, color_code_raw, color_code_normalized,
                    availability_claim, record_status, confidence,
                    extraction_method, extraction_engine, evidence_text,
                    evidence_locator_json,
                    parser_version, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(candidate_id) DO UPDATE SET
                    model_year = excluded.model_year,
                    color_name_raw = excluded.color_name_raw,
                    color_code_raw = excluded.color_code_raw,
                    availability_claim = excluded.availability_claim,
                    record_status = excluded.record_status,
                    confidence = excluded.confidence,
                    extraction_method = excluded.extraction_method,
                    extraction_engine = excluded.extraction_engine,
                    evidence_text = excluded.evidence_text,
                    evidence_locator_json = excluded.evidence_locator_json,
                    parser_version = excluded.parser_version,
                    updated_at = excluded.updated_at
                WHERE color_candidates.record_status != 'verified'
                """,
                (
                    candidate_id,
                    source["source_id"],
                    artifact_sha256,
                    page_number,
                    source["make"],
                    source["model"],
                    model_year,
                    candidate.color_name_raw,
                    normalized_name,
                    candidate.color_code_raw,
                    normalized_code,
                    candidate.availability_claim,
                    record_status,
                    candidate.confidence,
                    extraction_method,
                    extraction_engine,
                    candidate.evidence_text,
                    json.dumps(locator, sort_keys=True),
                    PARSER_VERSION,
                    now,
                    now,
                ),
            )
    return len(parsed)
