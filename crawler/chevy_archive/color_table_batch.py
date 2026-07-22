from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
import tempfile
import threading
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable, Sequence


PIPELINE_VERSION = "gm-official-color-tables-v1"

KNOWN_EXACT_SOURCE_ALIASES = {
    "gm-heritage-camaro-1967": "gm-heritage-1967-chevrolet-camaro",
    "gm-heritage-camaro-1968": "gm-heritage-1968-chevrolet-camaro",
    "gm-heritage-camaro-1969": "gm-heritage-1969-chevrolet-camaro",
}

SOURCE_ALIAS_IDENTITY_FIELDS = (
    "canonical_url",
    "title",
    "publisher",
    "source_type",
    "make",
    "model",
    "year_start",
    "year_end",
    "officiality",
    "artifact_sha256",
    "artifact_bytes",
    "artifact_relpath",
    "final_url",
)

COLOR_TERMS = {
    "aqua",
    "beige",
    "black",
    "blue",
    "bronze",
    "brown",
    "buckskin",
    "burgundy",
    "camel",
    "carmine",
    "chamois",
    "charcoal",
    "claret",
    "copper",
    "cream",
    "firethorn",
    "gold",
    "gray",
    "green",
    "grey",
    "ivory",
    "jade",
    "mahogany",
    "maroon",
    "orange",
    "pewter",
    "persimmon",
    "plum",
    "purple",
    "red",
    "rose",
    "russet",
    "saddle",
    "saffron",
    "sandalwood",
    "silver",
    "tan",
    "teal",
    "turquoise",
    "violet",
    "white",
    "yellow",
}

PAGE_PHRASES = (
    (re.compile(r"\binterior\s+and\s+exterior\s+color\s+availability", re.I), 12),
    (re.compile(r"\bexterior\s+color\s+availability", re.I), 11),
    (re.compile(r"\btwo[- ]tone\s+exterior\s+color", re.I), 10),
    (re.compile(r"\bexterior\s+(?:paint\s+)?colors\b", re.I), 9),
    (re.compile(r"\bcolor\s+and\s+trim\b", re.I), 7),
    (re.compile(r"\bcolor\s*&\s*trim\b", re.I), 7),
    (re.compile(r"\bpaint\s+color\b", re.I), 6),
    (re.compile(r"\bcolor\s+codes?\b", re.I), 4),
    (re.compile(r"\bsolid\s+colors?\b", re.I), 4),
    (re.compile(r"\bexterior\s+color\b", re.I), 3),
)

RESTRICTION_PATTERN = re.compile(
    r"\b(?:available\s+only|not\s+available|limited\s+to|except|requires?|"
    r"restriction|special\s+order|optional\s+at\s+extra\s+cost|"
    r"only\s+with|not\s+with|n/?a\s+on)\b",
    re.I,
)

DATE_PATTERN = re.compile(
    r"\b(?:(?:revised|revision|published|effective|dated)\s*:?\s*)?"
    r"(?:January|February|March|April|May|June|July|August|September|October|"
    r"November|December)\s+\d{1,2},\s+(?:19|20)\d{2}\b",
    re.I,
)

CODE = r"[0-9]{2,3}[UL]?"
CODE_FIRST_PATTERN = re.compile(
    rf"^[^A-Za-z0-9]*(?P<code>{CODE})\s*(?:[-:|]\s*)?"
    r"(?P<name>[A-Za-z][A-Za-z0-9 ,.'&/()_-]{2,74})$",
    re.I,
)
PAIR_PATTERN = re.compile(
    rf"^[^A-Za-z0-9]*(?P<code1>{CODE})\s+"
    r"(?P<name1>[A-Za-z][A-Za-z ,.'&/()_-]{2,42}?)\s+"
    rf"(?P<code2>{CODE})\s+"
    r"(?P<name2>[A-Za-z][A-Za-z ,.'&/()_-]{2,42}?)(?:\s{2,}|\s*\|\s*|$)",
    re.I,
)
NAME_CODES_PATTERN = re.compile(
    rf"^(?P<name>[A-Za-z][A-Za-z ,.'&/()_-]{{2,62}}?)\s+"
    rf"(?P<code1>{CODE})\s+(?P<code2>{CODE})(?:\s+.*)?$",
    re.I,
)

SOURCE_SCHEMA = {
    "source_id": "string",
    "direct_url": "string",
    "final_url": "string",
    "document_title": "string",
    "publisher": "string",
    "source_type": "string",
    "officiality": "string",
    "make": "string",
    "model": "string",
    "year_start": "int64",
    "year_end": "int64",
    "document_revision_date_raw": "string",
    "pdf_metadata_json": "string",
    "retrieved_at": "string",
    "artifact_sha256": "string",
    "artifact_bytes": "int64",
    "artifact_relpath": "string",
    "pdf_page_count": "int64",
    "pipeline_version": "string",
}

PAGE_SCHEMA = {
    "source_id": "string",
    "direct_url": "string",
    "document_title": "string",
    "model": "string",
    "year_start": "int64",
    "year_end": "int64",
    "artifact_sha256": "string",
    "artifact_bytes": "int64",
    "retrieved_at": "string",
    "pdf_page": "int64",
    "printed_page_locator": "string",
    "document_revision_date_raw": "string",
    "candidate_page_score": "int64",
    "extraction_method": "string",
    "extraction_engine": "string",
    "text_sha256": "string",
    "text_bytes": "int64",
    "text_relpath": "string",
    "render_sha256": "string",
    "render_bytes": "int64",
    "render_width": "int64",
    "render_height": "int64",
    "render_relpath": "string",
    "page_restrictions_json": "string",
    "visual_review_status": "string",
    "visual_reviewed_at": "string",
    "visual_reviewer": "string",
    "visual_review_notes": "string",
    "pipeline_version": "string",
}

CANDIDATE_SCHEMA = {
    "candidate_id": "string",
    "source_id": "string",
    "direct_url": "string",
    "document_title": "string",
    "publisher": "string",
    "source_type": "string",
    "officiality": "string",
    "make": "string",
    "model": "string",
    "model_year": "int64",
    "year_start": "int64",
    "year_end": "int64",
    "document_revision_date_raw": "string",
    "pdf_page": "int64",
    "printed_page_locator": "string",
    "retrieved_at": "string",
    "artifact_sha256": "string",
    "artifact_bytes": "int64",
    "color_name_raw": "string",
    "color_name_normalized": "string",
    "paint_code_raw": "string",
    "paint_code_normalized": "string",
    "secondary_color_name_raw": "string",
    "secondary_paint_code_raw": "string",
    "additional_columns_raw": "string",
    "row_kind": "string",
    "restriction_raw": "string",
    "page_restrictions_json": "string",
    "availability_claim": "string",
    "record_status": "string",
    "verification_status": "string",
    "confidence": "float64",
    "confidence_band": "string",
    "evidence_text": "string",
    "evidence_line": "int64",
    "extraction_method": "string",
    "extraction_engine": "string",
    "text_sha256": "string",
    "text_relpath": "string",
    "render_sha256": "string",
    "render_bytes": "int64",
    "render_relpath": "string",
    "visual_review_status": "string",
    "visual_reviewed_at": "string",
    "visual_reviewer": "string",
    "visual_review_notes": "string",
    "pipeline_version": "string",
}


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_write_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(
        f"{path.name}.{os.getpid()}.{threading.get_ident()}.tmp"
    )
    with temp.open("wb") as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp, path)


def atomic_write_text(path: Path, text: str) -> None:
    atomic_write_bytes(path, text.encode("utf-8"))


def write_jsonl(path: Path, rows: Sequence[dict[str, Any]]) -> None:
    rendered = "".join(
        json.dumps(row, sort_keys=True, ensure_ascii=False) + "\n" for row in rows
    )
    atomic_write_text(path, rendered)


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_color_name(value: str) -> str:
    value = normalize_space(value).strip(" .;,:|*-_")
    value = re.sub(r"\(MET\.?\)", "METALLIC", value, flags=re.I)
    value = re.sub(r"\(M\)", "METALLIC", value, flags=re.I)
    return normalize_space(value).upper()


def normalize_code(value: str | None) -> str | None:
    if not value:
        return None
    match = re.search(CODE, value.upper())
    return match.group(0) if match else None


def looks_like_color_name(value: str) -> bool:
    lowered = value.lower()
    words = set(re.findall(r"[a-z]+", lowered))
    if not words & COLOR_TERMS:
        return False
    if any(
        term in lowered
        for term in (
            "exterior color",
            "interior color",
            "paint color",
            "color code",
            "stripe color",
            "trim color",
            "vinyl",
            "cloth",
            "leather",
            "seat trim",
            "ordering code",
            "note:",
        )
    ):
        return False
    if RESTRICTION_PATTERN.search(value):
        return False
    letters = re.sub(r"[^A-Za-z]", "", value)
    return 3 <= len(letters) <= 60 and len(value) <= 82


def looks_like_marketing_name(value: str) -> bool:
    lowered = value.lower()
    if any(
        term in lowered
        for term in (
            "interior",
            "exterior",
            "vinyl",
            "cloth",
            "leather",
            "trim",
            "code",
            "model",
            "package",
            "note:",
        )
    ):
        return False
    words = re.findall(r"[A-Za-z]+", value)
    return 1 <= len(words) <= 7 and 3 <= sum(map(len, words)) <= 60


def clean_ocr_line(value: str) -> str:
    value = value.replace("\u2022", " ").replace("\u00a2", " ")
    value = re.sub(r"^[e¢@*•=\-—_$|]+\s+", "", value.strip())
    value = re.sub(r"\s+[|][^A-Za-z0-9]*$", "", value)
    return normalize_space(value)


def split_secondary_columns(value: str) -> tuple[str, str | None]:
    """Split a secondary paint name from later unlabelled OCR table columns.

    Tesseract flattens adjacent columns. Chevrolet color names normally end at
    the first hue or material term, plus a following metallic marker or
    parenthetical shade. The untouched tail is retained separately so this
    heuristic never discards an accent/stripe column.
    """
    tokens = value.split()
    end: int | None = None
    for index, token in enumerate(tokens):
        normalized = re.sub(r"[^A-Za-z]", "", token).lower()
        if normalized in COLOR_TERMS:
            end = index + 1
            break
    if end is None:
        return value, None
    while end < len(tokens) and (
        tokens[end].startswith("(")
        or re.sub(r"[^A-Za-z]", "", tokens[end]).lower() in {"metallic", "met"}
    ):
        end += 1
    secondary = " ".join(tokens[:end])
    extra = " ".join(tokens[end:]) or None
    return secondary, extra


def score_candidate_page(text: str) -> int:
    score = sum(weight for pattern, weight in PAGE_PHRASES if pattern.search(text))
    lowered = text.lower()
    color_hits = sum(1 for term in COLOR_TERMS if re.search(rf"\b{re.escape(term)}\b", lowered))
    if color_hits >= 12:
        score += 5
    elif color_hits >= 7:
        score += 3
    elif color_hits >= 4:
        score += 1
    code_hits = len(re.findall(rf"(?m)^\s*{CODE}\s+[A-Za-z]", text, re.I))
    if code_hits >= 8:
        score += 4
    elif code_hits >= 3:
        score += 2
    if re.search(r"\binterior\s+(?:fabric|trim|colors?)\b", text, re.I) and not re.search(
        r"\bexterior\b", text, re.I
    ):
        score -= 5
    return score


def detect_printed_page(text: str, pdf_page: int, pdf_label: str | None) -> str | None:
    lines = [normalize_space(line) for line in text.splitlines() if line.strip()]
    edge_lines = lines[:12] + lines[-18:]
    patterns = (
        re.compile(r"\b[A-Za-z][A-Za-z0-9 /&.-]{0,30}[—-]Page\s+\d+[A-Za-z]?\b", re.I),
        re.compile(r"\b(?:BODY-\d+|\d+-BODY|[A-Za-z][A-Za-z0-9]+/\d+)\b", re.I),
        re.compile(r"\bPage\s+\d+[A-Za-z]?\b", re.I),
    )
    for line in reversed(edge_lines):
        if re.search(r"\bsee\s+page\b", line, re.I):
            continue
        for pattern in patterns:
            match = pattern.search(line)
            if match:
                return match.group(0)
    if pdf_label and pdf_label != str(pdf_page):
        return pdf_label
    return None


def detect_revision_dates(text: str) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for match in DATE_PATTERN.finditer(text):
        value = normalize_space(match.group(0))
        key = value.casefold()
        if key not in seen:
            seen.add(key)
            result.append(value)
    return result


def restriction_lines(text: str) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for raw in text.splitlines():
        line = clean_ocr_line(raw)
        if 8 <= len(line) <= 500 and RESTRICTION_PATTERN.search(line):
            key = line.casefold()
            if key not in seen:
                seen.add(key)
                result.append(line)
    return result


def _is_exterior_section_line(line: str) -> bool:
    return bool(
        re.match(
            r"^[^A-Za-z0-9]*(?:exterior\s+(?:paint\s+)?colors?\b|"
            r"color\s+and\s+trim\b|"
            r"interior\s+and\s+exterior\s+color\s+availability)\b",
            line,
            re.I,
        )
    )


def _candidate_from_line(
    line: str, *, in_exterior_section: bool, page_has_table: bool, had_bullet: bool
) -> tuple[str | None, str, str, str | None, str | None, str | None] | None:
    pair = PAIR_PATTERN.match(line)
    if pair and looks_like_color_name(pair.group("name1")) and looks_like_color_name(
        pair.group("name2")
    ):
        secondary, additional = split_secondary_columns(pair.group("name2"))
        return (
            pair.group("code1"),
            pair.group("name1"),
            "two_tone_combination",
            pair.group("code2"),
            secondary,
            additional,
        )

    name_codes = NAME_CODES_PATTERN.match(line)
    if name_codes and looks_like_color_name(name_codes.group("name")):
        letters = re.sub(r"[^A-Za-z]", "", name_codes.group("name"))
        is_uppercase = bool(letters) and letters == letters.upper()
        if is_uppercase or name_codes.group("code1") == name_codes.group("code2"):
            return (
                name_codes.group("code1"),
                name_codes.group("name"),
                "solid_color",
                None,
                None,
                None,
            )

    code_first = CODE_FIRST_PATTERN.match(line)
    if code_first:
        name = re.split(r"\s{2,}|\s+[Xx]{1,3}(?:\s|$)", code_first.group("name"))[0]
        if looks_like_color_name(name):
            return code_first.group("code"), name, "solid_color", None, None, None

    stripped = re.sub(r"^[^A-Za-z]+", "", line).strip()
    stripped = re.split(r"\s{2,}|\s+[Xx]{1,3}(?:\s|$)", stripped)[0].strip()
    if not looks_like_color_name(stripped) and not (
        in_exterior_section and had_bullet and looks_like_marketing_name(stripped)
    ):
        return None
    uppercase_letters = re.sub(r"[^A-Za-z]", "", stripped)
    is_uppercase = bool(uppercase_letters) and uppercase_letters == uppercase_letters.upper()
    if in_exterior_section and (had_bullet or is_uppercase or not page_has_table):
        return None, stripped, "solid_color", None, None, None
    if page_has_table and is_uppercase:
        return None, stripped, "solid_color", None, None, None
    return None


def parse_color_rows(text: str) -> list[dict[str, Any]]:
    lines = text.splitlines()
    exterior_start: int | None = None
    exterior_end: int | None = None
    for index, raw in enumerate(lines):
        line = clean_ocr_line(raw)
        if exterior_start is None and _is_exterior_section_line(line):
            exterior_start = index
            continue
        if exterior_start is not None and index > exterior_start + 1 and re.search(
            r"\binterior\s+(?:fabric|trim|colors?)\b", line, re.I
        ):
            exterior_end = index
            break
    page_has_table = bool(
        re.search(r"\b(?:availability\s+chart|color\s+code|primary\s+color)\b", text, re.I)
    )
    page_is_two_tone = bool(re.search(r"\btwo[- ]tone\b", text, re.I))
    rows: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for index, raw in enumerate(lines, 1):
        original = normalize_space(raw)
        line = clean_ocr_line(raw)
        if not line or len(line) > 180:
            continue
        in_section = exterior_start is not None and index - 1 > exterior_start and (
            exterior_end is None or index - 1 < exterior_end
        )
        had_bullet = original != line and bool(
            re.match(r"^[e¢@*•=\-—_$|]+\s+", original)
        )
        candidate = _candidate_from_line(
            line,
            in_exterior_section=in_section,
            page_has_table=page_has_table,
            had_bullet=had_bullet,
        )
        if candidate is None:
            continue
        code, name, row_kind, code2, name2, additional_columns = candidate
        if page_is_two_tone and row_kind == "solid_color":
            row_kind = "two_tone_component_candidate"
        normalized_name = normalize_color_name(name)
        normalized_code = normalize_code(code)
        normalized_secondary = normalize_color_name(name2) if name2 else ""
        normalized_secondary_code = normalize_code(code2) or ""
        key = (normalized_code or "", normalized_name, normalized_secondary_code, normalized_secondary)
        if key in seen:
            continue
        seen.add(key)
        line_restriction = line if RESTRICTION_PATTERN.search(line) else None
        confidence = 0.63
        if normalized_code:
            confidence += 0.13
        if in_section:
            confidence += 0.09
        if page_has_table:
            confidence += 0.05
        if row_kind == "two_tone_combination" and normalized_secondary_code:
            confidence += 0.04
        if re.search(r"[^\x20-\x7E]", original):
            confidence -= 0.05
        confidence = max(0.0, min(0.94, round(confidence, 3)))
        rows.append(
            {
                "color_name_raw": normalize_space(name).strip(" .;,:|*-_"),
                "color_name_normalized": normalized_name,
                "paint_code_raw": code,
                "paint_code_normalized": normalized_code,
                "secondary_color_name_raw": normalize_space(name2) if name2 else None,
                "secondary_paint_code_raw": code2,
                "additional_columns_raw": additional_columns,
                "row_kind": row_kind,
                "restriction_raw": line_restriction,
                "confidence": confidence,
                "evidence_text": original,
                "evidence_line": index,
            }
        )
    return rows


def _tesseract_prefix() -> Path | None:
    configured = os.environ.get("TESSDATA_PREFIX")
    if configured and (Path(configured) / "eng.traineddata").is_file():
        return Path(configured)
    candidates = (
        Path(sys.prefix) / "share" / "tessdata",
        Path(sys.prefix) / "Library" / "share" / "tessdata",
    )
    return next((path for path in candidates if (path / "eng.traineddata").is_file()), None)


def tesseract_version(command: str) -> str:
    result = subprocess.run(
        [command, "--version"],
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=30,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"tesseract is unavailable: {result.stderr.strip()}")
    return normalize_space(result.stdout.splitlines()[0])


def run_tesseract(command: str, image_path: Path, *, psm: int, dpi: int) -> str:
    environment = os.environ.copy()
    prefix = _tesseract_prefix()
    if prefix is not None:
        environment["TESSDATA_PREFIX"] = str(prefix)
    result = subprocess.run(
        [command, str(image_path), "stdout", "-l", "eng", "--psm", str(psm), "--dpi", str(dpi)],
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=environment,
        timeout=600,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"tesseract failed for {image_path.name}: "
            f"{normalize_space(result.stderr)[:500]}"
        )
    return result.stdout.replace("\r\n", "\n").replace("\r", "\n")


def render_page(page: Any, destination: Path, dpi: int) -> tuple[int, int]:
    matrix = page.derotation_matrix * __import__("fitz").Matrix(dpi / 72, dpi / 72)
    pixmap = page.get_pixmap(matrix=matrix, alpha=False, colorspace=__import__("fitz").csRGB)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp = destination.with_suffix(destination.suffix + ".tmp.png")
    pixmap.save(temp)
    os.replace(temp, destination)
    return pixmap.width, pixmap.height


@dataclass(frozen=True)
class BatchOptions:
    state_root: Path
    output_root: Path
    source_ids: frozenset[str]
    model: str | None
    year: int | None
    limit: int | None
    page_hints: dict[str, frozenset[int]]
    candidate_threshold: int
    discovery_dpi: int
    render_dpi: int
    tesseract_command: str
    visual_reviews: dict[tuple[str, int], dict[str, Any]]
    write_parquet: bool
    shard_count: int
    shard_index: int
    resume: bool


def load_visual_reviews(path: Path | None) -> dict[tuple[str, int], dict[str, Any]]:
    if path is None:
        return {}
    result: dict[tuple[str, int], dict[str, Any]] = {}
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            record = json.loads(line)
            key = (str(record["source_id"]), int(record["pdf_page"]))
            if key in result:
                raise ValueError(f"{path}:{line_number}: duplicate visual-review key {key}")
            result[key] = record
    return result


def suppress_known_exact_source_aliases(
    rows: Sequence[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Remove only audited duplicate source IDs for the same exact document.

    The original first-generation Camaro manifest predates the complete GM index
    manifest. Both were enqueued in the current crawler database, leaving three
    source-ID aliases for URLs and PDF hashes already present under the canonical
    index IDs. The aliases must not create duplicate document or candidate rows.
    """
    by_id = {str(row["source_id"]): row for row in rows}
    if len(by_id) != len(rows):
        raise ValueError("crawler source rows repeat a source_id")
    suppressed: set[str] = set()
    for alias_id, canonical_id in KNOWN_EXACT_SOURCE_ALIASES.items():
        alias = by_id.get(alias_id)
        canonical = by_id.get(canonical_id)
        if alias is None or canonical is None:
            continue
        mismatched = [
            field
            for field in SOURCE_ALIAS_IDENTITY_FIELDS
            if alias.get(field) != canonical.get(field)
        ]
        if mismatched:
            raise ValueError(
                f"known source alias {alias_id!r} no longer matches {canonical_id!r} "
                f"in {', '.join(mismatched)}"
            )
        suppressed.add(alias_id)
    return [row for row in rows if str(row["source_id"]) not in suppressed]


def load_sources(options: BatchOptions) -> list[dict[str, Any]]:
    db_path = options.state_root / "queue.sqlite3"
    if not db_path.is_file():
        raise FileNotFoundError(f"crawler database not found: {db_path}")
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    try:
        rows = connection.execute(
            """
            SELECT
                s.*, a.sha256 AS artifact_sha256,
                a.byte_length AS artifact_bytes,
                a.object_relpath AS artifact_relpath,
                sf.final_url, sf.completed_at AS retrieved_at,
                sf.last_modified, sf.etag, sf.http_status
            FROM sources s
            JOIN source_artifacts sa
              ON sa.source_id = s.source_id AND sa.is_current = 1
            JOIN artifacts a ON a.sha256 = sa.artifact_sha256
            JOIN source_fetches sf ON sf.fetch_id = sa.fetch_id
            ORDER BY s.year_start, s.model, s.source_id
            """
        ).fetchall()
    finally:
        connection.close()
    records = suppress_known_exact_source_aliases([dict(row) for row in rows])
    selected: list[dict[str, Any]] = []
    for record in records:
        if options.source_ids and record["source_id"] not in options.source_ids:
            continue
        if options.model and record["model"].casefold() != options.model.casefold():
            continue
        if options.year is not None and not (
            record["year_start"] is not None
            and record["year_end"] is not None
            and record["year_start"] <= options.year <= record["year_end"]
        ):
            continue
        if source_shard(record["source_id"], options.shard_count) != options.shard_index:
            continue
        selected.append(record)
        if options.limit is not None and len(selected) >= options.limit:
            break
    return selected


def source_shard(source_id: str, shard_count: int) -> int:
    if shard_count <= 0:
        raise ValueError("shard_count must be positive")
    digest = hashlib.sha256(source_id.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big") % shard_count


def partition_suffix(shard_count: int, shard_index: int) -> str:
    if shard_count == 1:
        return ""
    return f".part-{shard_index:05d}-of-{shard_count:05d}"


def source_checkpoint_configuration(
    options: BatchOptions,
    source: dict[str, Any],
    tesseract_engine: str,
) -> dict[str, Any]:
    source_id = source["source_id"]
    reviews = [
        {"pdf_page": pdf_page, "review": review}
        for (review_source_id, pdf_page), review in sorted(
            options.visual_reviews.items()
        )
        if review_source_id == source_id
    ]
    return {
        "pipeline_version": PIPELINE_VERSION,
        "source_id": source_id,
        "artifact_sha256": source["artifact_sha256"],
        "page_hints": sorted(options.page_hints.get(source_id, ())),
        "candidate_threshold": options.candidate_threshold,
        "discovery_dpi": options.discovery_dpi,
        "render_dpi": options.render_dpi,
        "tesseract_engine": tesseract_engine,
        "visual_reviews": reviews,
    }


def source_checkpoint_path(
    options: BatchOptions,
    configuration: dict[str, Any],
) -> Path:
    rendered = json.dumps(
        configuration,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    fingerprint = sha256_bytes(rendered)
    safe_source_id = re.sub(
        r"[^a-zA-Z0-9._-]+", "-", configuration["source_id"]
    )
    return (
        options.output_root
        / "derived"
        / "source-checkpoints"
        / safe_source_id
        / f"{fingerprint}.json"
    )


def load_source_checkpoint(
    *,
    path: Path,
    configuration: dict[str, Any],
    source: dict[str, Any],
    output_root: Path,
) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"source checkpoint is unreadable: {path}") from exc
    if payload.get("configuration") != configuration:
        raise RuntimeError(f"source checkpoint configuration mismatch: {path}")
    source_id = configuration["source_id"]
    artifact_sha = configuration["artifact_sha256"]
    source_row = payload.get("source_row")
    page_rows = payload.get("page_rows")
    candidate_rows = payload.get("candidate_rows")
    if (
        not isinstance(source_row, dict)
        or not isinstance(page_rows, list)
        or not isinstance(candidate_rows, list)
    ):
        raise RuntimeError(f"source checkpoint row payload is invalid: {path}")
    if (
        source_row.get("source_id") != source_id
        or source_row.get("artifact_sha256") != artifact_sha
    ):
        raise RuntimeError(f"source checkpoint identity mismatch: {path}")
    expected_source_fields = {
        "direct_url": source["canonical_url"],
        "final_url": source["final_url"] or source["canonical_url"],
        "document_title": source["title"],
        "publisher": source["publisher"],
        "source_type": source["source_type"],
        "officiality": source["officiality"],
        "make": source["make"],
        "model": source["model"],
        "year_start": source["year_start"],
        "year_end": source["year_end"],
        "retrieved_at": source["retrieved_at"],
        "artifact_bytes": source["artifact_bytes"],
        "artifact_relpath": source["artifact_relpath"],
    }
    if any(
        source_row.get(field) != expected
        for field, expected in expected_source_fields.items()
    ):
        raise RuntimeError(f"source checkpoint provenance mismatch: {path}")

    seen_pages: set[int] = set()
    for page_row in page_rows:
        if (
            not isinstance(page_row, dict)
            or page_row.get("source_id") != source_id
            or page_row.get("artifact_sha256") != artifact_sha
        ):
            raise RuntimeError(f"source checkpoint page identity mismatch: {path}")
        pdf_page = page_row.get("pdf_page")
        if not isinstance(pdf_page, int) or pdf_page in seen_pages:
            raise RuntimeError(f"source checkpoint page key is invalid: {path}")
        seen_pages.add(pdf_page)
        for relpath_key, sha_key, bytes_key in (
            ("text_relpath", "text_sha256", "text_bytes"),
            ("render_relpath", "render_sha256", "render_bytes"),
        ):
            relpath = page_row.get(relpath_key)
            if not isinstance(relpath, str):
                raise RuntimeError(f"source checkpoint path is missing: {path}")
            artifact = output_root / Path(relpath)
            if (
                not artifact.is_file()
                or artifact.stat().st_size != page_row.get(bytes_key)
                or sha256_file(artifact) != page_row.get(sha_key)
            ):
                raise RuntimeError(
                    f"source checkpoint referenced artifact is invalid: {artifact}"
                )

    seen_candidates: set[str] = set()
    for candidate in candidate_rows:
        candidate_id = candidate.get("candidate_id") if isinstance(candidate, dict) else None
        if (
            not isinstance(candidate_id, str)
            or candidate_id in seen_candidates
            or candidate.get("source_id") != source_id
            or candidate.get("artifact_sha256") != artifact_sha
            or candidate.get("pdf_page") not in seen_pages
        ):
            raise RuntimeError(f"source checkpoint candidate identity mismatch: {path}")
        seen_candidates.add(candidate_id)
    return {
        "source_row": source_row,
        "page_rows": page_rows,
        "candidate_rows": candidate_rows,
    }


def write_source_checkpoint(
    *,
    path: Path,
    configuration: dict[str, Any],
    source_row: dict[str, Any],
    page_rows: Sequence[dict[str, Any]],
    candidate_rows: Sequence[dict[str, Any]],
) -> None:
    payload = {
        "configuration": configuration,
        "source_row": source_row,
        "page_rows": list(page_rows),
        "candidate_rows": list(candidate_rows),
    }
    atomic_write_text(
        path,
        json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
    )


def _page_cache_paths(output_root: Path, artifact_sha: str, pdf_page: int) -> tuple[Path, Path]:
    base = output_root / "derived" / "page-text" / artifact_sha
    return base / f"page-{pdf_page:05d}.txt", base / f"page-{pdf_page:05d}.json"


def _cached_discovery_text(
    output_root: Path,
    artifact_sha: str,
    pdf_page: int,
    discovery_dpi: int,
    tesseract_engine: str,
) -> tuple[str, dict[str, Any]] | None:
    text_path, metadata_path = _page_cache_paths(output_root, artifact_sha, pdf_page)
    if not text_path.is_file() or not metadata_path.is_file():
        return None
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if (
        metadata.get("artifact_sha256") != artifact_sha
        or metadata.get("pdf_page") != pdf_page
        or metadata.get("discovery_dpi") != discovery_dpi
        or not metadata.get("extraction_engine", "").startswith(
            f"PyMuPDF render + {tesseract_engine} psm=11"
        )
    ):
        return None
    data = text_path.read_bytes()
    if sha256_bytes(data) != metadata.get("text_sha256"):
        return None
    return data.decode("utf-8"), metadata


def discovery_text(
    *,
    page: Any,
    output_root: Path,
    artifact_sha: str,
    pdf_page: int,
    discovery_dpi: int,
    tesseract_command: str,
    tesseract_engine: str,
) -> tuple[str, dict[str, Any]]:
    native = page.get_text("text").replace("\r\n", "\n").replace("\r", "\n")
    if len(native.strip()) >= 80:
        data = native.encode("utf-8")
        metadata = {
            "artifact_sha256": artifact_sha,
            "pdf_page": pdf_page,
            "discovery_dpi": None,
            "extraction_method": "native",
            "extraction_engine": f"PyMuPDF {__import__('fitz').version[0]}",
            "text_sha256": sha256_bytes(data),
            "text_bytes": len(data),
        }
        text_path, metadata_path = _page_cache_paths(output_root, artifact_sha, pdf_page)
        atomic_write_bytes(text_path, data)
        atomic_write_text(metadata_path, json.dumps(metadata, indent=2, sort_keys=True) + "\n")
        return native, metadata

    cached = _cached_discovery_text(
        output_root, artifact_sha, pdf_page, discovery_dpi, tesseract_engine
    )
    if cached is not None:
        return cached
    with tempfile.TemporaryDirectory(dir=output_root / "tmp") as temp_dir:
        image_path = Path(temp_dir) / "page.png"
        render_page(page, image_path, discovery_dpi)
        text = run_tesseract(
            tesseract_command, image_path, psm=11, dpi=discovery_dpi
        )
    data = text.encode("utf-8")
    metadata = {
        "artifact_sha256": artifact_sha,
        "pdf_page": pdf_page,
        "discovery_dpi": discovery_dpi,
        "extraction_method": "ocr",
        "extraction_engine": f"PyMuPDF render + {tesseract_engine} psm=11",
        "text_sha256": sha256_bytes(data),
        "text_bytes": len(data),
    }
    text_path, metadata_path = _page_cache_paths(output_root, artifact_sha, pdf_page)
    atomic_write_bytes(text_path, data)
    atomic_write_text(metadata_path, json.dumps(metadata, indent=2, sort_keys=True) + "\n")
    return text, metadata


def candidate_page_text(
    *,
    page: Any,
    source_id: str,
    artifact_sha: str,
    pdf_page: int,
    discovery: tuple[str, dict[str, Any]],
    output_root: Path,
    render_dpi: int,
    tesseract_command: str,
    tesseract_engine: str,
) -> tuple[str, dict[str, Any], dict[str, Any]]:
    safe_source_id = re.sub(r"[^a-zA-Z0-9._-]+", "-", source_id)
    render_path = output_root / "renders" / safe_source_id / f"page-{pdf_page:05d}.png"
    width, height = render_page(page, render_path, render_dpi)
    render_bytes = render_path.stat().st_size
    render_metadata = {
        "render_sha256": sha256_file(render_path),
        "render_bytes": render_bytes,
        "render_width": width,
        "render_height": height,
        "render_relpath": render_path.relative_to(output_root).as_posix(),
    }
    discovery_value, discovery_metadata = discovery
    if discovery_metadata["extraction_method"] == "native":
        return discovery_value, discovery_metadata, render_metadata

    high_text_path = (
        output_root
        / "derived"
        / "table-text"
        / artifact_sha
        / f"page-{pdf_page:05d}.txt"
    )
    high_meta_path = high_text_path.with_suffix(".json")
    if high_text_path.is_file() and high_meta_path.is_file():
        high_metadata = json.loads(high_meta_path.read_text(encoding="utf-8"))
        data = high_text_path.read_bytes()
        if (
            high_metadata.get("artifact_sha256") == artifact_sha
            and high_metadata.get("pdf_page") == pdf_page
            and high_metadata.get("render_dpi") == render_dpi
            and high_metadata.get("extraction_engine", "").startswith(
                f"PyMuPDF render + {tesseract_engine}"
            )
            and sha256_bytes(data) == high_metadata.get("text_sha256")
        ):
            return data.decode("utf-8"), high_metadata, render_metadata

    alternatives: list[tuple[int, str, str]] = []
    for psm in (4, 6):
        text = run_tesseract(tesseract_command, render_path, psm=psm, dpi=render_dpi)
        score = score_candidate_page(text) + len(parse_color_rows(text)) * 2
        alternatives.append((score, text, f"PyMuPDF render + {tesseract_engine} psm={psm}"))
    _score, selected_text, selected_engine = max(alternatives, key=lambda item: item[0])
    selected_data = selected_text.encode("utf-8")
    metadata = {
        "artifact_sha256": artifact_sha,
        "pdf_page": pdf_page,
        "render_dpi": render_dpi,
        "extraction_method": "ocr",
        "extraction_engine": selected_engine,
        "text_sha256": sha256_bytes(selected_data),
        "text_bytes": len(selected_data),
    }
    atomic_write_bytes(high_text_path, selected_data)
    atomic_write_text(high_meta_path, json.dumps(metadata, indent=2, sort_keys=True) + "\n")
    return selected_text, metadata, render_metadata


def _parquet_type(pa: Any, name: str) -> Any:
    if name == "string":
        return pa.string()
    if name == "int64":
        return pa.int64()
    if name == "float64":
        return pa.float64()
    raise AssertionError(name)


def write_parquet(path: Path, rows: Sequence[dict[str, Any]], schema_map: dict[str, str]) -> None:
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError as exc:
        raise RuntimeError(
            "Parquet output requires pyarrow; install it or pass --no-parquet"
        ) from exc
    schema = pa.schema([(name, _parquet_type(pa, kind)) for name, kind in schema_map.items()])
    normalized = [{name: row.get(name) for name in schema_map} for row in rows]
    table = pa.Table.from_pylist(normalized, schema=schema)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(
        f"{path.name}.{os.getpid()}.{threading.get_ident()}.tmp"
    )
    pq.write_table(table, temp, compression="zstd")
    os.replace(temp, path)


def _confidence_band(value: float) -> str:
    if value >= 0.85:
        return "high"
    if value >= 0.65:
        return "medium"
    return "low"


def process_batch(options: BatchOptions) -> dict[str, Any]:
    import fitz

    options.output_root.mkdir(parents=True, exist_ok=True)
    (options.output_root / "tmp").mkdir(parents=True, exist_ok=True)
    sources = load_sources(options)
    if not sources:
        raise RuntimeError("no fetched source documents matched the selection")
    tesseract_engine = tesseract_version(options.tesseract_command)
    source_rows: list[dict[str, Any]] = []
    page_rows: list[dict[str, Any]] = []
    candidate_rows: list[dict[str, Any]] = []
    started_at = utc_now()
    resumed_sources = 0

    for source in sources:
        artifact_path = options.state_root / "objects" / "sha256" / source["artifact_relpath"]
        if not artifact_path.is_file():
            raise FileNotFoundError(f"artifact is missing: {artifact_path}")
        if artifact_path.stat().st_size != source["artifact_bytes"]:
            raise RuntimeError(f"artifact byte mismatch: {source['source_id']}")
        if sha256_file(artifact_path) != source["artifact_sha256"]:
            raise RuntimeError(f"artifact SHA-256 mismatch: {source['source_id']}")
        checkpoint_configuration = source_checkpoint_configuration(
            options, source, tesseract_engine
        )
        checkpoint_path = source_checkpoint_path(options, checkpoint_configuration)
        if options.resume and checkpoint_path.is_file():
            checkpoint = load_source_checkpoint(
                path=checkpoint_path,
                configuration=checkpoint_configuration,
                source=source,
                output_root=options.output_root,
            )
            source_rows.append(checkpoint["source_row"])
            page_rows.extend(checkpoint["page_rows"])
            candidate_rows.extend(checkpoint["candidate_rows"])
            resumed_sources += 1
            print(
                json.dumps(
                    {
                        "source_id": source["source_id"],
                        "pdf_pages_considered": checkpoint["source_row"][
                            "pdf_page_count"
                        ],
                        "candidate_pages": len(checkpoint["page_rows"]),
                        "color_candidates": len(checkpoint["candidate_rows"]),
                        "resumed_from_checkpoint": True,
                    },
                    sort_keys=True,
                ),
                flush=True,
            )
            continue
        document = fitz.open(artifact_path)
        pdf_metadata = {key: value for key, value in document.metadata.items() if value}
        labels = [document[index].get_label() for index in range(len(document))]
        page_numbers = list(range(1, len(document) + 1))
        if source["source_id"] in options.page_hints:
            page_numbers = sorted(options.page_hints[source["source_id"]])
            invalid = [number for number in page_numbers if not 1 <= number <= len(document)]
            if invalid:
                raise ValueError(f"invalid page hint for {source['source_id']}: {invalid}")

        document_dates: list[str] = []
        page_discovery: dict[int, tuple[str, dict[str, Any]]] = {}
        for pdf_page in page_numbers:
            extracted = discovery_text(
                page=document[pdf_page - 1],
                output_root=options.output_root,
                artifact_sha=source["artifact_sha256"],
                pdf_page=pdf_page,
                discovery_dpi=options.discovery_dpi,
                tesseract_command=options.tesseract_command,
                tesseract_engine=tesseract_engine,
            )
            page_discovery[pdf_page] = extracted
            for value in detect_revision_dates(extracted[0]):
                if value.casefold() not in {item.casefold() for item in document_dates}:
                    document_dates.append(value)

        manifest = json.loads(source["manifest_json"])
        manifest_date = manifest.get("document_revision") or manifest.get("document_date")
        if manifest_date and str(manifest_date).casefold() not in {
            item.casefold() for item in document_dates
        }:
            document_dates.insert(0, str(manifest_date))

        source_row = {
            "source_id": source["source_id"],
            "direct_url": source["canonical_url"],
            "final_url": source["final_url"] or source["canonical_url"],
            "document_title": source["title"],
            "publisher": source["publisher"],
            "source_type": source["source_type"],
            "officiality": source["officiality"],
            "make": source["make"],
            "model": source["model"],
            "year_start": source["year_start"],
            "year_end": source["year_end"],
            "document_revision_date_raw": "; ".join(document_dates) or None,
            "pdf_metadata_json": json.dumps(pdf_metadata, sort_keys=True, ensure_ascii=False),
            "retrieved_at": source["retrieved_at"],
            "artifact_sha256": source["artifact_sha256"],
            "artifact_bytes": source["artifact_bytes"],
            "artifact_relpath": source["artifact_relpath"],
            "pdf_page_count": len(document),
            "pipeline_version": PIPELINE_VERSION,
        }
        source_rows.append(source_row)
        source_page_start = len(page_rows)
        source_candidate_start = len(candidate_rows)

        source_candidate_pages = 0
        source_candidates = 0
        for pdf_page, discovery in page_discovery.items():
            discovery_score = score_candidate_page(discovery[0])
            if discovery_score < options.candidate_threshold:
                continue
            table_text, text_metadata, render_metadata = candidate_page_text(
                page=document[pdf_page - 1],
                source_id=source["source_id"],
                artifact_sha=source["artifact_sha256"],
                pdf_page=pdf_page,
                discovery=discovery,
                output_root=options.output_root,
                render_dpi=options.render_dpi,
                tesseract_command=options.tesseract_command,
                tesseract_engine=tesseract_engine,
            )
            score = max(discovery_score, score_candidate_page(table_text))
            printed_page = detect_printed_page(table_text, pdf_page, labels[pdf_page - 1])
            page_dates = detect_revision_dates(table_text)
            restrictions = restriction_lines(table_text)
            review = options.visual_reviews.get((source["source_id"], pdf_page), {})
            page_row = {
                "source_id": source["source_id"],
                "direct_url": source["canonical_url"],
                "document_title": source["title"],
                "model": source["model"],
                "year_start": source["year_start"],
                "year_end": source["year_end"],
                "artifact_sha256": source["artifact_sha256"],
                "artifact_bytes": source["artifact_bytes"],
                "retrieved_at": source["retrieved_at"],
                "pdf_page": pdf_page,
                "printed_page_locator": printed_page,
                "document_revision_date_raw": "; ".join(page_dates or document_dates) or None,
                "candidate_page_score": score,
                "extraction_method": text_metadata["extraction_method"],
                "extraction_engine": text_metadata["extraction_engine"],
                "text_sha256": text_metadata["text_sha256"],
                "text_bytes": text_metadata["text_bytes"],
                "text_relpath": (
                    options.output_root
                    / "derived"
                    / ("table-text" if text_metadata["extraction_method"] == "ocr" else "page-text")
                    / source["artifact_sha256"]
                    / f"page-{pdf_page:05d}.txt"
                ).relative_to(options.output_root).as_posix(),
                **render_metadata,
                "page_restrictions_json": json.dumps(restrictions, ensure_ascii=False),
                "visual_review_status": review.get("status", "required"),
                "visual_reviewed_at": review.get("reviewed_at"),
                "visual_reviewer": review.get("reviewer"),
                "visual_review_notes": review.get("notes"),
                "pipeline_version": PIPELINE_VERSION,
            }
            page_rows.append(page_row)
            source_candidate_pages += 1
            parsed_rows = parse_color_rows(table_text)
            for parsed in parsed_rows:
                identity = "\0".join(
                    (
                        source["source_id"],
                        source["artifact_sha256"],
                        str(pdf_page),
                        parsed["row_kind"],
                        parsed["paint_code_normalized"] or "",
                        parsed["color_name_normalized"],
                        parsed["secondary_paint_code_raw"] or "",
                        parsed["secondary_color_name_raw"] or "",
                    )
                )
                page_restrictions_json = json.dumps(restrictions, ensure_ascii=False)
                candidate = {
                    "candidate_id": hashlib.sha256(identity.encode("utf-8")).hexdigest(),
                    "source_id": source["source_id"],
                    "direct_url": source["canonical_url"],
                    "document_title": source["title"],
                    "publisher": source["publisher"],
                    "source_type": source["source_type"],
                    "officiality": source["officiality"],
                    "make": source["make"],
                    "model": source["model"],
                    "model_year": (
                        source["year_start"]
                        if source["year_start"] is not None
                        and source["year_start"] == source["year_end"]
                        else None
                    ),
                    "year_start": source["year_start"],
                    "year_end": source["year_end"],
                    "document_revision_date_raw": page_row["document_revision_date_raw"],
                    "pdf_page": pdf_page,
                    "printed_page_locator": printed_page,
                    "retrieved_at": source["retrieved_at"],
                    "artifact_sha256": source["artifact_sha256"],
                    "artifact_bytes": source["artifact_bytes"],
                    **parsed,
                    "page_restrictions_json": page_restrictions_json,
                    "availability_claim": "listed_in_source_candidate",
                    "record_status": (
                        "needs_year_assignment"
                        if source["year_start"] != source["year_end"]
                        else "needs_review"
                    ),
                    "verification_status": "unreviewed_candidate",
                    "confidence_band": _confidence_band(parsed["confidence"]),
                    "extraction_method": text_metadata["extraction_method"],
                    "extraction_engine": text_metadata["extraction_engine"],
                    "text_sha256": text_metadata["text_sha256"],
                    "text_relpath": page_row["text_relpath"],
                    "render_sha256": render_metadata["render_sha256"],
                    "render_bytes": render_metadata["render_bytes"],
                    "render_relpath": render_metadata["render_relpath"],
                    "visual_review_status": page_row["visual_review_status"],
                    "visual_reviewed_at": page_row["visual_reviewed_at"],
                    "visual_reviewer": page_row["visual_reviewer"],
                    "visual_review_notes": page_row["visual_review_notes"],
                    "pipeline_version": PIPELINE_VERSION,
                }
                candidate_rows.append(candidate)
                source_candidates += 1
        document.close()
        write_source_checkpoint(
            path=checkpoint_path,
            configuration=checkpoint_configuration,
            source_row=source_row,
            page_rows=page_rows[source_page_start:],
            candidate_rows=candidate_rows[source_candidate_start:],
        )
        print(
            json.dumps(
                {
                    "source_id": source["source_id"],
                    "pdf_pages_considered": len(page_numbers),
                    "candidate_pages": source_candidate_pages,
                    "color_candidates": source_candidates,
                    "resumed_from_checkpoint": False,
                },
                sort_keys=True,
            ),
            flush=True,
        )

    source_rows.sort(key=lambda row: row["source_id"])
    page_rows.sort(key=lambda row: (row["source_id"], row["pdf_page"]))
    candidate_rows.sort(
        key=lambda row: (
            row["source_id"],
            row["pdf_page"],
            row["evidence_line"],
            row["candidate_id"],
        )
    )
    suffix = partition_suffix(options.shard_count, options.shard_index)
    write_jsonl(options.output_root / f"source_documents{suffix}.jsonl", source_rows)
    write_jsonl(options.output_root / f"candidate_pages{suffix}.jsonl", page_rows)
    write_jsonl(options.output_root / f"color_candidates{suffix}.jsonl", candidate_rows)
    if options.write_parquet:
        write_parquet(
            options.output_root / f"source_documents{suffix}.parquet", source_rows, SOURCE_SCHEMA
        )
        write_parquet(
            options.output_root / f"candidate_pages{suffix}.parquet", page_rows, PAGE_SCHEMA
        )
        write_parquet(
            options.output_root / f"color_candidates{suffix}.parquet",
            candidate_rows,
            CANDIDATE_SCHEMA,
        )
    summary = {
        "pipeline_version": PIPELINE_VERSION,
        "started_at": started_at,
        "completed_at": utc_now(),
        "state_root": str(options.state_root.resolve()),
        "output_root": str(options.output_root.resolve()),
        "source_documents": len(source_rows),
        "resumed_source_documents": resumed_sources,
        "shard_count": options.shard_count,
        "shard_index": options.shard_index,
        "candidate_pages": len(page_rows),
        "color_candidates": len(candidate_rows),
        "rendered_candidate_pages": len(page_rows),
        "rows_with_complete_provenance": sum(
            1
            for row in candidate_rows
            if all(
                row.get(field) is not None
                for field in (
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
            )
        ),
        "rows_with_paint_code": sum(
            1 for row in candidate_rows if row["paint_code_normalized"]
        ),
        "rows_with_printed_page_locator": sum(
            1 for row in candidate_rows if row["printed_page_locator"]
        ),
        "rows_with_document_revision_date": sum(
            1 for row in candidate_rows if row["document_revision_date_raw"]
        ),
        "rows_visually_inspected": sum(
            1 for row in candidate_rows if row["visual_review_status"] != "required"
        ),
        "parquet_written": options.write_parquet,
        "warning": (
            "All rows remain unreviewed candidates. A missing row is not evidence that a "
            "color was unavailable. Page imagery must be reviewed before promotion."
        ),
    }
    atomic_write_text(
        options.output_root / f"run-summary{suffix}.json",
        json.dumps(summary, indent=2, sort_keys=True) + "\n",
    )
    return summary


def parse_page_hints(values: Iterable[str]) -> dict[str, frozenset[int]]:
    result: dict[str, set[int]] = {}
    for value in values:
        try:
            source_id, page_text = value.rsplit(":", 1)
            page = int(page_text)
        except ValueError as exc:
            raise ValueError(f"invalid --page value {value!r}; use SOURCE_ID:PDF_PAGE") from exc
        if page <= 0:
            raise ValueError("PDF page hints must be positive")
        result.setdefault(source_id, set()).add(page)
    return {key: frozenset(value) for key, value in result.items()}


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Extract provenance-complete color-table candidates from complete PDFs "
            "preserved by the Chevrolet official-source crawler"
        )
    )
    parser.add_argument("--state-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--source-id", action="append", default=[])
    parser.add_argument("--model")
    parser.add_argument("--year", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument(
        "--page",
        action="append",
        default=[],
        metavar="SOURCE_ID:PDF_PAGE",
        help="Restrict a source to one PDF page; repeat for additional page hints",
    )
    parser.add_argument("--candidate-threshold", type=int, default=7)
    parser.add_argument("--discovery-dpi", type=int, default=150)
    parser.add_argument("--render-dpi", type=int, default=300)
    parser.add_argument("--tesseract", default="tesseract")
    parser.add_argument("--visual-review-jsonl", type=Path)
    parser.add_argument("--no-parquet", action="store_true")
    parser.add_argument("--shard-count", type=int, default=1)
    parser.add_argument("--shard-index", type=int, default=0)
    parser.add_argument(
        "--resume",
        action="store_true",
        help=(
            "Reuse atomically written per-source checkpoints after validating their "
            "configuration and referenced text/render artifacts"
        ),
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_argument_parser().parse_args(argv)
    if args.limit is not None and args.limit <= 0:
        raise ValueError("--limit must be positive")
    if args.discovery_dpi < 96 or args.render_dpi < args.discovery_dpi:
        raise ValueError("render DPI must be at least discovery DPI, and discovery DPI at least 96")
    if args.shard_count <= 0 or not 0 <= args.shard_index < args.shard_count:
        raise ValueError("--shard-count must be positive and --shard-index within its range")
    options = BatchOptions(
        state_root=args.state_root.resolve(),
        output_root=args.output.resolve(),
        source_ids=frozenset(args.source_id),
        model=args.model,
        year=args.year,
        limit=args.limit,
        page_hints=parse_page_hints(args.page),
        candidate_threshold=args.candidate_threshold,
        discovery_dpi=args.discovery_dpi,
        render_dpi=args.render_dpi,
        tesseract_command=args.tesseract,
        visual_reviews=load_visual_reviews(args.visual_review_jsonl),
        write_parquet=not args.no_parquet,
        shard_count=args.shard_count,
        shard_index=args.shard_index,
        resume=args.resume,
    )
    summary = process_batch(options)
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, ValueError, sqlite3.Error) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(2)
