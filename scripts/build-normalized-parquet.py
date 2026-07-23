from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sqlite3
import subprocess
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlsplit, urlunsplit

import pyarrow as pa
import pyarrow.parquet as pq
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PARQUET_ROOT = ROOT / "data" / "parquet"
SOURCE_REGISTRY_PATH = ROOT / "data" / "sources" / "source-registry.json"
BROCHURE_SOURCE_RELEASE_MANIFEST_PATH = (
    ROOT / "data" / "sources" / "brochure-source-release-manifest.json"
)
ROCKAUTO_LEADS_PATH = ROOT / "data" / "sources" / "rockauto-paint-code-leads.json"
SUBURBAN_2000_2007_AUDIT_PATH = ROOT / "data" / "audits" / "suburban-2000-2007.json"
SCHEMA_VERSION = 11
URL_PATTERN = re.compile(r"https?://[^\s<>\"`]+")
PLACEHOLDER_SOURCE_HOSTS = frozenset(
    {"example.com", "example.net", "example.org", "example.invalid"}
)
FACTORY_CODE_STATUS_VALUES = frozenset(
    {
        "explicit_none_in_source",
        "printed_in_source",
        "not_printed_in_source",
        "not_stated_in_source",
    }
)
FACTORY_CODE_MISSING_MARKERS = {
    "not printed": "not_printed_in_source",
    "not stated": "not_stated_in_source",
}
FACTORY_CODE_REJECTED_PLACEHOLDERS = frozenset(
    {
        "missing",
        "n/a",
        "na",
        "none",
        "not available",
        "tbd",
        "unknown",
        "unavailable",
    }
)
SEO_CODE_STATUS_VALUES = frozenset(
    {
        "printed_in_source",
        "not_applicable_in_source",
        "not_printed_in_source",
        "not_stated_in_source",
        "column_absent_in_source",
    }
)
SEO_CODE_REJECTED_PLACEHOLDERS = frozenset(
    {"not applicable", "not printed", "not stated", "tbd"}
)
SOURCE_OFFICIALITY_VALUES = frozenset({"official", "secondary", "licensed", "unknown"})
DOCUMENT_AUTHORITY_VALUES = frozenset({"official_manufacturer_document"})
RETRIEVAL_HOST_TYPE_VALUES = frozenset({"official_live", "archival_mirror"})
MODERN_SOURCE_CLASSIFICATIONS = {
    "official_manufacturer_document_archival_mirror": (
        "official",
        "official_manufacturer_document",
        "archival_mirror",
    ),
    "official_manufacturer_live": (
        "official",
        "official_manufacturer_document",
        "official_live",
    ),
}
QUALIFIED_MODERN_PALETTE_SOURCE_IDS = frozenset(
    {
        "chevrolet-ebrochure-us-2022-tahoe",
        "chevrolet-ebrochure-us-2023-colorado",
        "chevrolet-ebrochure-us-2023-silverado-hd-commercial",
        "chevrolet-ebrochure-us-2023-silverado-4500-6500-hd",
    }
)
RELEASE_ASSET_MEDIA_TYPES = {
    ".html": "text/html",
    ".htm": "text/html",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".md": "text/markdown",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".txt": "text/plain",
}
AVAILABILITY_SOURCE_RANK = {
    "published_source_transcription": 0,
    "published_qualified_historical_table": 1,
    "published_qualified_palette_union": 2,
    "published_specialty_palette_subset": 3,
}


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def json_load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


SUBURBAN_SCHEME_VARIANT_FIELDS = (
    "stripe_colors",
    "d85_stripe_colors",
    "interior_colors",
    "wheel_flare_color",
    "restriction",
    "source_note",
    "source_annotation",
)


def expand_suburban_scheme_set(
    audit: dict[str, Any], scheme_set: dict[str, Any]
) -> list[dict[str, Any]]:
    """Expand source-shaped grouped pairs into exact printed scheme rows."""
    if "schemes" in scheme_set:
        return list(scheme_set["schemes"])

    legend_id = str(scheme_set.get("color_legend_id") or "")
    primary_legend_id = str(scheme_set.get("primary_color_legend_id") or legend_id)
    secondary_legend_id = str(scheme_set.get("secondary_color_legend_id") or legend_id)
    try:
        primary_legend = audit["color_legends"][primary_legend_id]
        secondary_legend = audit["color_legends"][secondary_legend_id]
    except KeyError as exc:
        raise ValueError(
            f"Suburban scheme set {scheme_set['scheme_set_id']} has no color legend "
            f"{primary_legend_id}/{secondary_legend_id}"
        ) from exc

    defaults = dict(scheme_set.get("defaults") or {})
    if "rows" in scheme_set:
        field_names = audit.get("compact_scheme_row_fields") or []
        if not field_names:
            raise ValueError(
                f"Suburban compact scheme set {scheme_set['scheme_set_id']} has no field contract"
            )
        rows: list[dict[str, Any]] = []
        for row_index, values in enumerate(scheme_set["rows"], start=1):
            if len(values) > len(field_names):
                raise ValueError(
                    f"Suburban compact scheme row {scheme_set['scheme_set_id']}:"
                    f"{row_index} has too many fields"
                )
            compact = dict(zip(field_names, values, strict=False))
            primary_code = str(compact.pop("primary_code"))
            secondary_code = str(compact.pop("secondary_code"))
            primary_name = compact.pop("primary_name", None) or primary_legend.get(
                primary_code
            )
            secondary_name = compact.pop(
                "secondary_name", None
            ) or secondary_legend.get(secondary_code)
            if not primary_name or not secondary_name:
                raise ValueError(
                    f"Suburban compact scheme row {scheme_set['scheme_set_id']}:"
                    f"{row_index} references unknown colors {primary_code}/{secondary_code}"
                )
            metadata = dict(defaults)
            metadata.update(
                {
                    field: compact[field]
                    for field in SUBURBAN_SCHEME_VARIANT_FIELDS
                    if field in compact and compact[field] is not None
                }
            )
            rows.append(
                {
                    "primary": {"code": primary_code, "name": primary_name},
                    "secondary": {"code": secondary_code, "name": secondary_name},
                    **{
                        field: metadata.get(field)
                        for field in SUBURBAN_SCHEME_VARIANT_FIELDS
                    },
                }
            )
        return rows

    rows: list[dict[str, Any]] = []
    for group in scheme_set.get("groups") or []:
        primary_code = str(group["primary_code"])
        if primary_code not in primary_legend:
            raise ValueError(
                f"Suburban scheme set {scheme_set['scheme_set_id']} references "
                f"unknown primary code {primary_code}"
            )

        has_secondary_codes = "secondary_codes" in group
        has_pairs = "pairs" in group
        if has_secondary_codes == has_pairs:
            raise ValueError(
                f"Suburban scheme group {scheme_set['scheme_set_id']}:{primary_code} "
                "must define exactly one of secondary_codes or pairs"
            )
        pairs = (
            [{"secondary_code": code} for code in group["secondary_codes"]]
            if has_secondary_codes
            else group["pairs"]
        )
        for pair in pairs:
            secondary_code = str(pair["secondary_code"])
            if secondary_code not in secondary_legend:
                raise ValueError(
                    f"Suburban scheme set {scheme_set['scheme_set_id']} references "
                    f"unknown secondary code {secondary_code}"
                )
            variants = pair.get("variants")
            if variants is None:
                variants = [{}]
            if not variants:
                raise ValueError(
                    f"Suburban scheme pair {scheme_set['scheme_set_id']}:"
                    f"{primary_code}/{secondary_code} has no printed variants"
                )
            for variant in variants:
                metadata = dict(defaults)
                metadata.update(
                    {
                        field: pair[field]
                        for field in SUBURBAN_SCHEME_VARIANT_FIELDS
                        if field in pair
                    }
                )
                metadata.update(variant)
                rows.append(
                    {
                        "primary": {
                            "code": primary_code,
                            "name": primary_legend[primary_code],
                        },
                        "secondary": {
                            "code": secondary_code,
                            "name": secondary_legend[secondary_code],
                        },
                        **{
                            field: metadata.get(field)
                            for field in SUBURBAN_SCHEME_VARIANT_FIELDS
                        },
                    }
                )
    return rows


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable_id(prefix: str, *parts: Any, length: int = 24) -> str:
    raw = "\x1f".join("" if part is None else str(part) for part in parts)
    return f"{prefix}_{sha256_bytes(raw.encode('utf-8'))[:length]}"


def normalize_factory_code(value: Any) -> tuple[str | None, str]:
    """Return a nullable code and an explicit, controlled source-status value."""
    if value is None:
        return None, "not_stated_in_source"
    code = str(value).strip()
    if not code:
        return None, "not_stated_in_source"
    normalized_marker = re.sub(r"\s+", " ", code.casefold())
    missing_status = FACTORY_CODE_MISSING_MARKERS.get(normalized_marker)
    if missing_status:
        return None, missing_status
    if normalized_marker in FACTORY_CODE_REJECTED_PLACEHOLDERS or any(
        marker in normalized_marker for marker in FACTORY_CODE_MISSING_MARKERS
    ):
        raise ValueError(f"factory-code field contains placeholder prose: {value!r}")
    return code, "printed_in_source"


def primary_evidence_source_id(
    availability_rows: list[dict[str, Any]],
) -> str | None:
    evidence_source_ids = sorted(
        {row["evidence_source_id"] for row in availability_rows}
    )
    if not evidence_source_ids:
        return None
    return min(
        evidence_source_ids,
        key=lambda source_id: min(
            AVAILABILITY_SOURCE_RANK[row["claim_status"]]
            for row in availability_rows
            if row["evidence_source_id"] == source_id
        ),
    )


def pdf_pages_from_locator(locator: str) -> list[int]:
    pages: set[int] = set()
    for match in re.finditer(
        r"PDF\s+(?:pp?\.|pages?)\s*([0-9][0-9,\sand\-–]*)",
        locator,
        re.I,
    ):
        expression = match.group(1)
        consumed: list[tuple[int, int]] = []
        for range_match in re.finditer(r"(\d+)\s*[\-–]\s*(\d+)", expression):
            start, end = (int(value) for value in range_match.groups())
            if start <= end and end - start <= 100:
                pages.update(range(start, end + 1))
            consumed.append(range_match.span())
        remainder = "".join(
            character
            for index, character in enumerate(expression)
            if not any(start <= index < end for start, end in consumed)
        )
        pages.update(
            page
            for value in re.findall(r"\d+", remainder)
            if not 1900 <= (page := int(value)) <= 2100
        )
    return sorted(pages)


def canonical_url(value: str) -> str:
    value = html.unescape(value).strip().rstrip(".,;:\\")
    while value.endswith(")") and value.count("(") < value.count(")"):
        value = value[:-1]
    parsed = urlsplit(value)
    scheme = "https" if parsed.scheme == "http" else parsed.scheme
    return urlunsplit((scheme, parsed.netloc.lower(), parsed.path, parsed.query, ""))


def release_asset_media_type(asset_name: str) -> str:
    return RELEASE_ASSET_MEDIA_TYPES.get(
        Path(asset_name).suffix.casefold(), "application/octet-stream"
    )


def is_official_manufacturer_url(value: str) -> bool:
    host = (urlsplit(value).hostname or "").lower()
    return any(
        host == domain or host.endswith(f".{domain}")
        for domain in (
            "gm.com",
            "chevrolet.com",
            "gmfleet.com",
            "gmfleetorderguide.com",
        )
    )


def modern_source_classification(item: dict[str, Any]) -> tuple[str, str, str]:
    raw_authority = item.get("document_authority")
    classification = MODERN_SOURCE_CLASSIFICATIONS.get(str(raw_authority))
    if classification is None:
        raise ValueError(
            f"modern source has an unsupported authority classification: "
            f"{item.get('source_id')} ({raw_authority})"
        )
    officiality, document_authority, retrieval_host_type = classification
    retrieval_url = item.get("retrieval_url")
    if not retrieval_url:
        raise ValueError(f"modern source has no retrieval URL: {item.get('source_id')}")
    retrieval_is_official = is_official_manufacturer_url(retrieval_url)
    if retrieval_host_type == "official_live" and not retrieval_is_official:
        raise ValueError(
            f"modern source classified as live official but retrieved elsewhere: "
            f"{item.get('source_id')}"
        )
    if retrieval_host_type == "archival_mirror" and retrieval_is_official:
        raise ValueError(
            f"modern source classified as an archival mirror but retrieved from an "
            f"official host: {item.get('source_id')}"
        )
    return officiality, document_authority, retrieval_host_type


def normalized_officiality(value: Any) -> str:
    normalized = str(value or "unknown")
    if normalized in SOURCE_OFFICIALITY_VALUES:
        return normalized
    if normalized in MODERN_SOURCE_CLASSIFICATIONS:
        return MODERN_SOURCE_CLASSIFICATIONS[normalized][0]
    raise ValueError(f"unsupported source officiality: {value}")


def validate_source_classification(source: dict[str, Any]) -> None:
    officiality = source.get("officiality")
    if officiality not in SOURCE_OFFICIALITY_VALUES:
        raise ValueError(
            f"source has unsupported officiality: {source.get('source_id')} "
            f"({officiality})"
        )
    document_authority = source.get("document_authority")
    if (
        document_authority is not None
        and document_authority not in DOCUMENT_AUTHORITY_VALUES
    ):
        raise ValueError(
            f"source has unsupported document authority: {source.get('source_id')} "
            f"({document_authority})"
        )
    retrieval_host_type = source.get("retrieval_host_type")
    if (
        retrieval_host_type is not None
        and retrieval_host_type not in RETRIEVAL_HOST_TYPE_VALUES
    ):
        raise ValueError(
            f"source has unsupported retrieval host type: {source.get('source_id')} "
            f"({retrieval_host_type})"
        )
    if source.get("source_type") == "fleet_guide_pdf":
        if officiality != "official":
            raise ValueError(
                f"Fleet Guide lost official document authority: {source.get('source_id')}"
            )
        if document_authority != "official_manufacturer_document":
            raise ValueError(
                f"Fleet Guide lacks normalized document authority: "
                f"{source.get('source_id')}"
            )
        if retrieval_host_type not in RETRIEVAL_HOST_TYPE_VALUES:
            raise ValueError(
                f"Fleet Guide lacks retrieval-host provenance: {source.get('source_id')}"
            )


def source_defaults(url: str) -> dict[str, Any]:
    parsed = urlsplit(url)
    host = parsed.hostname or ""
    basename = unquote(Path(parsed.path).name).replace("_", " ")
    title = basename or host or url
    publisher = host
    officiality = "unknown"
    source_type = "web_page"
    document_authority = None
    retrieval_host_type = None
    if is_official_manufacturer_url(url):
        publisher = (
            "Chevrolet"
            if host == "chevrolet.com" or host.endswith(".chevrolet.com")
            else "General Motors"
        )
        officiality = "official"
        source_type = "official_web_page"
        document_authority = "official_manufacturer_document"
        retrieval_host_type = "official_live"
    elif host == "commons.wikimedia.org":
        publisher = "Wikimedia Commons"
        officiality = "secondary"
        source_type = "media_description_page"
    elif host == "upload.wikimedia.org":
        publisher = "Wikimedia Commons"
        officiality = "secondary"
        source_type = "media_original"
    elif host.endswith("wikipedia.org"):
        publisher = "Wikipedia"
        officiality = "secondary"
        source_type = "encyclopedia_article"
    elif host == "github.com":
        publisher = "GitHub"
        officiality = "licensed"
        source_type = "archive_mirror"
    elif host == "web.archive.org":
        publisher = "Internet Archive"
        officiality = "secondary"
        source_type = "archived_web_page"
    if parsed.path.lower().endswith(".pdf"):
        source_type = "pdf"
    return {
        "title": title,
        "publisher": publisher,
        "source_type": source_type,
        "officiality": officiality,
        "document_authority": document_authority,
        "retrieval_host_type": retrieval_host_type,
    }


def load_archive_snapshot() -> dict[str, Any]:
    cli = ROOT / "node_modules" / "tsx" / "dist" / "cli.mjs"
    exporter = ROOT / "scripts" / "export-archive-snapshot.ts"
    if not cli.is_file():
        raise RuntimeError(
            "tsx is not installed; run npm install before building Parquet"
        )
    result = subprocess.run(
        ["node", str(cli), str(exporter)],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(result.stdout)


def schema(fields: list[tuple[str, pa.DataType, bool]]) -> pa.Schema:
    return pa.schema(
        [pa.field(name, dtype, nullable=nullable) for name, dtype, nullable in fields]
    )


SCHEMAS: dict[str, pa.Schema] = {
    "models": schema(
        [
            ("model_id", pa.string(), False),
            ("name", pa.string(), False),
            ("vehicle_class", pa.string(), False),
            ("aliases", pa.list_(pa.string()), False),
            ("current", pa.bool_(), False),
            ("first_model_year", pa.int16(), False),
            ("last_model_year", pa.int16(), False),
            ("model_year_count", pa.int16(), False),
            ("catalog_status", pa.string(), False),
            ("catalog_notes", pa.string(), False),
            ("catalog_retrieved_on", pa.string(), False),
        ]
    ),
    "generations": schema(
        [
            ("generation_id", pa.string(), False),
            ("model_id", pa.string(), False),
            ("generation_key", pa.string(), False),
            ("label", pa.string(), False),
            ("program_id", pa.string(), True),
            ("program_label", pa.string(), True),
            ("year_start", pa.int16(), False),
            ("year_end", pa.int16(), False),
            ("model_year_count", pa.int16(), False),
            ("platform_aliases", pa.list_(pa.string()), False),
            ("platform_confidence", pa.string(), True),
            ("platform_notes", pa.string(), True),
            ("revision_note", pa.string(), False),
            ("verified_listing_count", pa.int32(), False),
        ]
    ),
    "model_years": schema(
        [
            ("model_year_id", pa.string(), False),
            ("model_id", pa.string(), False),
            ("model_year", pa.int16(), False),
            ("generation_id", pa.string(), False),
            ("platform_era_id", pa.string(), True),
            ("catalog_confidence", pa.string(), False),
            ("research_status", pa.string(), False),
            ("verified_color_count", pa.int16(), False),
            ("evidence_source_count", pa.int16(), False),
            ("research_note", pa.string(), False),
        ]
    ),
    "model_year_generation_memberships": schema(
        [
            ("model_year_generation_membership_id", pa.string(), False),
            ("model_year_id", pa.string(), False),
            ("model_id", pa.string(), False),
            ("model_year", pa.int16(), False),
            ("generation_id", pa.string(), False),
            ("membership_role", pa.string(), False),
            ("evidence_class", pa.string(), False),
            ("has_published_availability", pa.bool_(), False),
            ("published_availability_count", pa.int16(), False),
        ]
    ),
    "platform_eras": schema(
        [
            ("platform_era_id", pa.string(), False),
            ("model_id", pa.string(), False),
            ("year_start", pa.int16(), False),
            ("year_end", pa.int16(), False),
            ("label", pa.string(), False),
            ("aliases", pa.list_(pa.string()), False),
            ("confidence", pa.string(), False),
            ("notes", pa.string(), False),
        ]
    ),
    "color_identities": schema(
        [
            ("color_identity_id", pa.string(), False),
            ("model_id", pa.string(), False),
            ("generation_id", pa.string(), False),
            ("archive_color_key", pa.string(), False),
            ("display_name", pa.string(), False),
            ("normalized_name", pa.string(), False),
            ("interpretive_swatch_hex", pa.string(), False),
            ("row_code_summary", pa.string(), False),
            ("identity_note", pa.string(), True),
        ]
    ),
    "color_availability": schema(
        [
            ("availability_id", pa.string(), False),
            ("model_year_id", pa.string(), False),
            ("model_id", pa.string(), False),
            ("model_year", pa.int16(), False),
            ("generation_id", pa.string(), False),
            ("color_identity_id", pa.string(), False),
            ("source_color_name", pa.string(), False),
            ("factory_code", pa.string(), True),
            ("factory_code_status", pa.string(), False),
            ("touch_up_code", pa.string(), True),
            ("rpo_code", pa.string(), True),
            ("seo_code", pa.string(), True),
            ("seo_code_status", pa.string(), True),
            ("source_seo_code_raw", pa.string(), True),
            ("source_seo_code_cell_state", pa.string(), True),
            ("wa_code", pa.string(), True),
            ("source_wa_code_raw", pa.string(), True),
            ("source_wa_code_cell_state", pa.string(), True),
            ("upfitter_code_1", pa.string(), True),
            ("upfitter_code_2", pa.string(), True),
            ("upfitter_solid_color_option", pa.string(), True),
            ("upfitter_two_tone_color_option", pa.string(), True),
            ("minimum_batch_units", pa.int16(), True),
            ("factory_installation_claim", pa.bool_(), True),
            ("availability_state", pa.string(), False),
            ("application_type", pa.string(), False),
            ("restriction", pa.string(), True),
            ("claim_status", pa.string(), False),
            ("evidence_source_id", pa.string(), False),
            ("evidence_chart", pa.string(), False),
            ("evidence_locator", pa.string(), False),
            ("source_revision", pa.string(), False),
        ]
    ),
    "paint_schemes": schema(
        [
            ("paint_scheme_id", pa.string(), False),
            ("model_year_id", pa.string(), False),
            ("model_id", pa.string(), False),
            ("model_year", pa.int16(), False),
            ("scheme_type", pa.string(), False),
            ("package_code", pa.string(), True),
            ("package_name", pa.string(), False),
            ("body_style_scope", pa.string(), True),
            ("stripe_colors", pa.string(), True),
            ("d85_stripe_colors", pa.string(), True),
            ("interior_colors", pa.string(), True),
            ("wheel_flare_color", pa.string(), True),
            ("placement_note", pa.string(), True),
            ("restriction", pa.string(), True),
            ("source_note", pa.string(), True),
            ("source_annotation", pa.string(), True),
            ("claim_status", pa.string(), False),
            ("evidence_source_id", pa.string(), False),
            ("evidence_source_revision_id", pa.string(), False),
            ("evidence_chart", pa.string(), False),
            ("evidence_locator", pa.string(), False),
            ("pdf_pages", pa.list_(pa.int16()), False),
            ("source_revision_label", pa.string(), False),
        ]
    ),
    "paint_scheme_components": schema(
        [
            ("paint_scheme_component_id", pa.string(), False),
            ("paint_scheme_id", pa.string(), False),
            ("component_order", pa.int8(), False),
            ("component_role", pa.string(), False),
            ("source_color_name", pa.string(), False),
            ("normalized_color_name", pa.string(), False),
            ("factory_code", pa.string(), True),
            ("factory_code_status", pa.string(), False),
            ("source_note", pa.string(), True),
            ("standalone_availability_asserted", pa.bool_(), False),
        ]
    ),
    "model_year_research": schema(
        [
            ("model_year_id", pa.string(), False),
            ("audit_state", pa.string(), False),
            ("color_chart_reviewed", pa.bool_(), False),
            ("completely_reviewed_color_chart", pa.bool_(), False),
            ("audit_note", pa.string(), True),
            ("exact_listing_count", pa.int16(), False),
            ("listed_count", pa.int16(), False),
            ("restricted_count", pa.int16(), False),
            ("other_availability_state_count", pa.int16(), False),
            ("likely_source_availability", pa.string(), False),
            ("official_source_record_count", pa.int16(), False),
            ("crawler_source_record_count", pa.int16(), False),
            ("crawler_color_candidate_count", pa.int16(), False),
            ("crawler_candidate_state", pa.string(), False),
            ("catalog_official_evidence_count", pa.int16(), False),
            ("catalog_nonofficial_evidence_count", pa.int16(), False),
            ("current_app_source_id", pa.string(), True),
        ]
    ),
    "model_year_source_candidates": schema(
        [
            ("source_candidate_link_id", pa.string(), False),
            ("model_year_id", pa.string(), False),
            ("model_id", pa.string(), False),
            ("model_year", pa.int16(), False),
            ("source_id", pa.string(), False),
            ("relation", pa.string(), False),
            ("candidate_rank", pa.int8(), False),
            ("candidate_status", pa.string(), False),
            ("source_title", pa.string(), False),
            ("source_model_label", pa.string(), False),
            ("source_years", pa.list_(pa.int16()), False),
            ("http_status", pa.int16(), True),
            ("content_type", pa.string(), True),
            ("content_length_bytes", pa.int64(), True),
        ]
    ),
    "secondary_catalog_configurations": schema(
        [
            ("catalog_configuration_id", pa.string(), False),
            ("source_id", pa.string(), False),
            ("cc", pa.string(), False),
            ("source_make_label", pa.string(), False),
            ("source_year", pa.int16(), False),
            ("source_model_label", pa.string(), False),
            ("source_engine_label", pa.string(), False),
            ("canonical_model_id", pa.string(), False),
            ("canonical_model_year", pa.int16(), False),
            ("source_variant", pa.string(), True),
            ("mapping_status", pa.string(), False),
            ("listing_url", pa.string(), False),
            ("retrieval_detail", pa.string(), False),
            ("observed_fitment_count", pa.int16(), False),
            ("observed_coded_fitment_count", pa.int16(), False),
            ("observed_uncoded_fitment_count", pa.int16(), False),
            ("observed_at", pa.string(), False),
        ]
    ),
    "secondary_paint_products": schema(
        [
            ("product_id", pa.string(), False),
            ("pk", pa.string(), False),
            ("pt", pa.string(), False),
            ("manufacturer", pa.string(), False),
            ("manufacturer_part_number", pa.string(), False),
            ("product_color_label_raw", pa.string(), False),
            ("paint_code_raw", pa.string(), True),
            ("paint_code_normalized", pa.string(), True),
            ("has_explicit_paint_code", pa.bool_(), False),
            ("selection_prompt_raw", pa.string(), True),
            ("candidate_eligibility", pa.string(), False),
        ]
    ),
    "secondary_paint_fitments": schema(
        [
            ("fitment_id", pa.string(), False),
            ("catalog_configuration_id", pa.string(), False),
            ("product_id", pa.string(), False),
            ("listing_url", pa.string(), False),
            ("info_url", pa.string(), False),
            ("observed_price_usd", pa.float64(), True),
            ("fitment_state", pa.string(), False),
            ("candidate_status", pa.string(), False),
            ("observed_at", pa.string(), False),
        ]
    ),
    "color_code_crosswalk_candidates": schema(
        [
            ("candidate_id", pa.string(), False),
            ("fitment_id", pa.string(), False),
            ("product_id", pa.string(), False),
            ("canonical_model_id", pa.string(), False),
            ("model_year", pa.int16(), False),
            ("source_variant", pa.string(), True),
            ("paint_code_raw", pa.string(), False),
            ("retailer_color_label_raw", pa.string(), False),
            ("verification_status", pa.string(), False),
            ("governing_official_source_id", pa.string(), True),
        ]
    ),
    "supplemental_color_mentions": schema(
        [
            ("supplemental_mention_id", pa.string(), False),
            ("model_year_id", pa.string(), False),
            ("model_id", pa.string(), False),
            ("model_year", pa.int16(), False),
            ("source_id", pa.string(), False),
            ("source_revision_id", pa.string(), False),
            ("source_color_name", pa.string(), False),
            ("factory_code", pa.string(), True),
            ("factory_code_status", pa.string(), False),
            ("evidence_class", pa.string(), False),
            ("scope", pa.string(), False),
            ("source_locator", pa.string(), False),
            ("pdf_pages", pa.list_(pa.int16()), False),
            ("source_revision_label", pa.string(), False),
            ("publication_status", pa.string(), False),
            ("limitations", pa.string(), False),
        ]
    ),
    "sources": schema(
        [
            ("source_id", pa.string(), False),
            ("canonical_url", pa.string(), False),
            ("title", pa.string(), False),
            ("publisher", pa.string(), False),
            ("source_type", pa.string(), False),
            ("officiality", pa.string(), False),
            ("document_authority", pa.string(), True),
            ("retrieval_host_type", pa.string(), True),
            ("retrieved_on", pa.string(), True),
            ("discovered_from_url", pa.string(), True),
            ("http_status", pa.int16(), True),
            ("content_type", pa.string(), True),
            ("content_length_bytes", pa.int64(), True),
            ("content_sha256", pa.string(), True),
            ("last_modified", pa.string(), True),
            ("archive_url", pa.string(), True),
            ("archive_relpath", pa.string(), True),
            ("citation_count", pa.int32(), False),
            ("notes", pa.string(), True),
        ]
    ),
    "source_revisions": schema(
        [
            ("source_revision_id", pa.string(), False),
            ("source_id", pa.string(), False),
            ("artifact_sha256", pa.string(), False),
            ("byte_length", pa.int64(), False),
            ("media_type", pa.string(), False),
            ("retrieved_at", pa.string(), True),
            ("http_status", pa.int16(), True),
            ("etag", pa.string(), True),
            ("last_modified", pa.string(), True),
            ("pdf_page_count", pa.int32(), True),
            ("artifact_relpath", pa.string(), True),
            ("archive_url", pa.string(), True),
            ("integrity_status", pa.string(), False),
            ("is_current", pa.bool_(), False),
        ]
    ),
    "evidence_claims": schema(
        [
            ("evidence_claim_id", pa.string(), False),
            ("availability_id", pa.string(), False),
            ("source_id", pa.string(), False),
            ("source_revision_id", pa.string(), False),
            ("model_id", pa.string(), False),
            ("model_year", pa.int16(), False),
            ("color_identity_id", pa.string(), False),
            ("transcribed_color_name", pa.string(), False),
            ("transcribed_factory_code", pa.string(), True),
            ("transcribed_factory_code_status", pa.string(), False),
            ("transcribed_touch_up_code", pa.string(), True),
            ("transcribed_rpo_code", pa.string(), True),
            ("transcribed_seo_code", pa.string(), True),
            ("transcribed_seo_code_status", pa.string(), True),
            ("transcribed_source_seo_code_raw", pa.string(), True),
            ("transcribed_source_seo_code_cell_state", pa.string(), True),
            ("transcribed_wa_code", pa.string(), True),
            ("transcribed_source_wa_code_raw", pa.string(), True),
            ("transcribed_source_wa_code_cell_state", pa.string(), True),
            ("transcribed_upfitter_code_1", pa.string(), True),
            ("transcribed_upfitter_code_2", pa.string(), True),
            ("transcribed_upfitter_solid_color_option", pa.string(), True),
            ("transcribed_upfitter_two_tone_color_option", pa.string(), True),
            ("minimum_batch_units", pa.int16(), True),
            ("factory_installation_claim", pa.bool_(), True),
            ("availability_state", pa.string(), False),
            ("restriction", pa.string(), True),
            ("chart_title", pa.string(), False),
            ("source_locator", pa.string(), False),
            ("evidence_locator_type", pa.string(), False),
            ("pdf_pages", pa.list_(pa.int16()), False),
            ("source_revision_label", pa.string(), False),
            ("verification_status", pa.string(), False),
        ]
    ),
    "source_links": schema(
        [
            ("source_link_id", pa.string(), False),
            ("source_id", pa.string(), False),
            ("claim_type", pa.string(), False),
            ("entity_type", pa.string(), False),
            ("entity_id", pa.string(), False),
            ("model_id", pa.string(), True),
            ("model_year", pa.int16(), True),
            ("year_start", pa.int16(), True),
            ("year_end", pa.int16(), True),
            ("locator", pa.string(), True),
            ("revision", pa.string(), True),
            ("claim_summary", pa.string(), False),
            ("confidence", pa.string(), False),
            ("review_state", pa.string(), False),
        ]
    ),
    "photo_assets": schema(
        [
            ("photo_id", pa.string(), False),
            ("review_status", pa.string(), False),
            ("source_page_source_id", pa.string(), False),
            ("source_original_source_id", pa.string(), False),
            ("archive_source_id", pa.string(), False),
            ("preview_archive_source_id", pa.string(), False),
            ("source_page_url", pa.string(), False),
            ("source_original_url", pa.string(), False),
            ("archive_url", pa.string(), False),
            ("preview_archive_url", pa.string(), True),
            ("author", pa.string(), False),
            ("credit", pa.string(), False),
            ("license", pa.string(), False),
            ("license_url", pa.string(), False),
            ("attribution", pa.string(), False),
            ("description", pa.string(), True),
            ("source_timestamp", pa.string(), True),
            ("sha256", pa.string(), False),
            ("commons_sha1", pa.string(), True),
            ("mime", pa.string(), False),
            ("width", pa.int32(), False),
            ("height", pa.int32(), False),
            ("byte_length", pa.int64(), False),
            ("release_tag", pa.string(), False),
            ("release_asset_name", pa.string(), False),
        ]
    ),
    "model_photo_links": schema(
        [
            ("model_photo_link_id", pa.string(), False),
            ("photo_id", pa.string(), False),
            ("model_id", pa.string(), False),
            ("model_year", pa.int16(), True),
            ("selection_kind", pa.string(), False),
            ("identification_status", pa.string(), False),
            ("evidence", pa.string(), True),
        ]
    ),
    "photo_color_links": schema(
        [
            ("photo_color_link_id", pa.string(), False),
            ("photo_id", pa.string(), False),
            ("model_id", pa.string(), False),
            ("model_year", pa.int16(), False),
            ("archive_color_key", pa.string(), False),
            ("color_identity_id", pa.string(), True),
            ("visual_review_status", pa.string(), False),
            ("factory_paint_match_status", pa.string(), False),
            ("note", pa.string(), True),
        ]
    ),
}


PRIMARY_KEYS = {
    "models": ["model_id"],
    "generations": ["generation_id"],
    "model_years": ["model_year_id"],
    "model_year_generation_memberships": ["model_year_generation_membership_id"],
    "platform_eras": ["platform_era_id"],
    "color_identities": ["color_identity_id"],
    "color_availability": ["availability_id"],
    "paint_schemes": ["paint_scheme_id"],
    "paint_scheme_components": ["paint_scheme_component_id"],
    "model_year_research": ["model_year_id"],
    "model_year_source_candidates": ["source_candidate_link_id"],
    "secondary_catalog_configurations": ["catalog_configuration_id"],
    "secondary_paint_products": ["product_id"],
    "secondary_paint_fitments": ["fitment_id"],
    "color_code_crosswalk_candidates": ["candidate_id"],
    "supplemental_color_mentions": ["supplemental_mention_id"],
    "sources": ["source_id"],
    "source_revisions": ["source_revision_id"],
    "evidence_claims": ["evidence_claim_id"],
    "source_links": ["source_link_id"],
    "photo_assets": ["photo_id"],
    "model_photo_links": ["model_photo_link_id"],
    "photo_color_links": ["photo_color_link_id"],
}


FOREIGN_KEYS = {
    "generations": {"model_id": "models.model_id"},
    "model_years": {
        "model_id": "models.model_id",
        "generation_id": "generations.generation_id",
        "platform_era_id": "platform_eras.platform_era_id",
    },
    "model_year_generation_memberships": {
        "model_year_id": "model_years.model_year_id",
        "model_id": "models.model_id",
        "generation_id": "generations.generation_id",
    },
    "platform_eras": {"model_id": "models.model_id"},
    "color_identities": {
        "model_id": "models.model_id",
        "generation_id": "generations.generation_id",
    },
    "color_availability": {
        "model_year_id": "model_years.model_year_id",
        "model_id": "models.model_id",
        "generation_id": "generations.generation_id",
        "color_identity_id": "color_identities.color_identity_id",
        "evidence_source_id": "sources.source_id",
    },
    "paint_schemes": {
        "model_year_id": "model_years.model_year_id",
        "model_id": "models.model_id",
        "evidence_source_id": "sources.source_id",
        "evidence_source_revision_id": "source_revisions.source_revision_id",
    },
    "paint_scheme_components": {
        "paint_scheme_id": "paint_schemes.paint_scheme_id",
    },
    "model_year_research": {
        "model_year_id": "model_years.model_year_id",
        "current_app_source_id": "sources.source_id",
    },
    "model_year_source_candidates": {
        "model_year_id": "model_years.model_year_id",
        "model_id": "models.model_id",
        "source_id": "sources.source_id",
    },
    "secondary_catalog_configurations": {
        "source_id": "sources.source_id",
        "canonical_model_id": "models.model_id",
    },
    "secondary_paint_fitments": {
        "catalog_configuration_id": (
            "secondary_catalog_configurations.catalog_configuration_id"
        ),
        "product_id": "secondary_paint_products.product_id",
    },
    "color_code_crosswalk_candidates": {
        "fitment_id": "secondary_paint_fitments.fitment_id",
        "product_id": "secondary_paint_products.product_id",
        "canonical_model_id": "models.model_id",
        "governing_official_source_id": "sources.source_id",
    },
    "supplemental_color_mentions": {
        "model_year_id": "model_years.model_year_id",
        "model_id": "models.model_id",
        "source_id": "sources.source_id",
        "source_revision_id": "source_revisions.source_revision_id",
    },
    "source_revisions": {"source_id": "sources.source_id"},
    "evidence_claims": {
        "availability_id": "color_availability.availability_id",
        "source_id": "sources.source_id",
        "source_revision_id": "source_revisions.source_revision_id",
        "model_id": "models.model_id",
        "color_identity_id": "color_identities.color_identity_id",
    },
    "source_links": {"source_id": "sources.source_id"},
    "photo_assets": {
        "source_page_source_id": "sources.source_id",
        "source_original_source_id": "sources.source_id",
        "archive_source_id": "sources.source_id",
        "preview_archive_source_id": "sources.source_id",
    },
    "model_photo_links": {
        "photo_id": "photo_assets.photo_id",
        "model_id": "models.model_id",
    },
    "photo_color_links": {
        "photo_id": "photo_assets.photo_id",
        "model_id": "models.model_id",
        "color_identity_id": "color_identities.color_identity_id",
    },
}


FACTORY_CODE_COLUMNS = {
    "color_availability": ("factory_code", "factory_code_status"),
    "paint_scheme_components": ("factory_code", "factory_code_status"),
    "evidence_claims": (
        "transcribed_factory_code",
        "transcribed_factory_code_status",
    ),
    "supplemental_color_mentions": ("factory_code", "factory_code_status"),
}


def validate_factory_code_rows(table_name: str, rows: list[dict[str, Any]]) -> None:
    code_field, status_field = FACTORY_CODE_COLUMNS[table_name]
    for index, row in enumerate(rows):
        code = row.get(code_field)
        status = row.get(status_field)
        if status not in FACTORY_CODE_STATUS_VALUES:
            raise ValueError(
                f"{table_name}[{index}].{status_field} has unsupported value: "
                f"{status!r}"
            )
        if code is None:
            if status == "printed_in_source":
                raise ValueError(
                    f"{table_name}[{index}] claims a printed factory code but is null"
                )
            continue
        normalized_code, normalized_status = normalize_factory_code(code)
        if normalized_code != code or normalized_status != "printed_in_source":
            raise ValueError(
                f"{table_name}[{index}].{code_field} is not a normalized code: {code!r}"
            )
        if status != "printed_in_source":
            raise ValueError(
                f"{table_name}[{index}] has a code but status is {status!r}"
            )


def validate_specialty_code_rows(
    table_name: str,
    rows: list[dict[str, Any]],
    *,
    prefix: str = "",
) -> None:
    code_field = f"{prefix}seo_code"
    status_field = f"{prefix}seo_code_status"
    raw_field = f"{prefix}source_seo_code_raw"
    state_field = f"{prefix}source_seo_code_cell_state"
    for index, row in enumerate(rows):
        code = row[code_field]
        status = row[status_field]
        raw = row[raw_field]
        cell_state = row[state_field]
        if status is not None and status not in SEO_CODE_STATUS_VALUES:
            raise ValueError(
                f"{table_name}[{index}].{status_field} has unsupported value: "
                f"{status!r}"
            )
        if code is not None:
            normalized = re.sub(r"\s+", " ", str(code).strip().casefold())
            if not str(code).strip() or normalized in SEO_CODE_REJECTED_PLACEHOLDERS:
                raise ValueError(
                    f"{table_name}[{index}].{code_field} contains placeholder prose: "
                    f"{code!r}"
                )
            if status != "printed_in_source":
                raise ValueError(
                    f"{table_name}[{index}] has an SEO code but status is {status!r}"
                )
        elif status == "printed_in_source":
            raise ValueError(
                f"{table_name}[{index}] claims a printed SEO code but is null"
            )
        if cell_state not in {
            None,
            "printed",
            "blank",
            "tbd",
            "em_dash",
            "literal_none",
            "column_absent",
        }:
            raise ValueError(
                f"{table_name}[{index}].{state_field} has unsupported value: "
                f"{cell_state!r}"
            )
        if cell_state is None:
            if raw is not None:
                raise ValueError(
                    f"{table_name}[{index}] has raw SEO text without a cell state"
                )
        elif cell_state == "printed":
            if raw != code or status != "printed_in_source":
                raise ValueError(
                    f"{table_name}[{index}] printed SEO metadata is inconsistent"
                )
        elif cell_state == "blank":
            if raw is not None or code is not None or status != "not_printed_in_source":
                raise ValueError(
                    f"{table_name}[{index}] blank SEO metadata is inconsistent"
                )
        elif cell_state == "tbd" and (
            raw != "TBD" or code is not None or status != "not_stated_in_source"
        ):
            raise ValueError(
                f"{table_name}[{index}] TBD SEO metadata is inconsistent"
            )
        elif cell_state == "em_dash" and (
            raw != "—" or code is not None or status != "not_printed_in_source"
        ):
            raise ValueError(
                f"{table_name}[{index}] em-dash SEO metadata is inconsistent"
            )
        elif cell_state == "literal_none" and (
            raw != "NONE" or code is not None or status != "not_applicable_in_source"
        ):
            raise ValueError(
                f"{table_name}[{index}] literal-NONE SEO metadata is inconsistent"
            )
        elif cell_state == "column_absent" and (
            raw is not None
            or code is not None
            or status != "column_absent_in_source"
        ):
            raise ValueError(
                f"{table_name}[{index}] absent-column SEO metadata is inconsistent"
            )
        minimum_batch_units = row["minimum_batch_units"]
        if minimum_batch_units is not None and minimum_batch_units <= 0:
            raise ValueError(
                f"{table_name}[{index}].minimum_batch_units must be positive"
            )


def validate_wa_upfitter_rows(
    table_name: str,
    rows: list[dict[str, Any]],
    *,
    prefix: str = "",
) -> None:
    wa_field = f"{prefix}wa_code"
    raw_field = f"{prefix}source_wa_code_raw"
    state_field = f"{prefix}source_wa_code_cell_state"
    upfitter_fields = [
        f"{prefix}upfitter_code_1",
        f"{prefix}upfitter_code_2",
        f"{prefix}upfitter_solid_color_option",
        f"{prefix}upfitter_two_tone_color_option",
    ]
    for index, row in enumerate(rows):
        wa_code = row[wa_field]
        raw = row[raw_field]
        cell_state = row[state_field]
        if wa_code is not None and not re.fullmatch(r"WA-[0-9A-Z]+", wa_code):
            raise ValueError(
                f"{table_name}[{index}].{wa_field} is not a normalized WA code: "
                f"{wa_code!r}"
            )
        if cell_state not in {
            None,
            "printed_with_prefix",
            "printed_without_prefix",
        }:
            raise ValueError(
                f"{table_name}[{index}].{state_field} has unsupported value: "
                f"{cell_state!r}"
            )
        if cell_state is None:
            if raw is not None:
                raise ValueError(
                    f"{table_name}[{index}] has raw WA text without a cell state"
                )
        elif cell_state == "printed_with_prefix":
            if raw != wa_code:
                raise ValueError(
                    f"{table_name}[{index}] prefixed WA metadata is inconsistent"
                )
        elif cell_state == "printed_without_prefix":
            if wa_code is None or f"WA-{raw}" != wa_code:
                raise ValueError(
                    f"{table_name}[{index}] unprefixed WA metadata is inconsistent"
                )

        upfitter_values = [row[field] for field in upfitter_fields]
        if any(value is not None for value in upfitter_values):
            if any(value is None or not str(value).strip() for value in upfitter_values):
                raise ValueError(
                    f"{table_name}[{index}] has an incomplete upfitter order-code set"
                )
            if prefix == "" and not str(row["application_type"]).startswith(
                "authorized_upfitter"
            ):
                raise ValueError(
                    f"{table_name}[{index}] has upfitter codes outside an "
                    "authorized-upfitter program"
                )


def validate_normalized_rows(rows_by_table: dict[str, list[dict[str, Any]]]) -> None:
    """Validate schemas, primary keys, foreign keys, and code null semantics."""
    if set(rows_by_table) != set(SCHEMAS):
        missing = sorted(set(SCHEMAS) - set(rows_by_table))
        extra = sorted(set(rows_by_table) - set(SCHEMAS))
        raise ValueError(
            f"normalized table set drifted; missing={missing}, extra={extra}"
        )

    for table_name, table_schema in SCHEMAS.items():
        expected_fields = set(table_schema.names)
        for index, row in enumerate(rows_by_table[table_name]):
            actual_fields = set(row)
            if actual_fields != expected_fields:
                missing = sorted(expected_fields - actual_fields)
                extra = sorted(actual_fields - expected_fields)
                raise ValueError(
                    f"{table_name}[{index}] schema drift; missing={missing}, extra={extra}"
                )
            for field in table_schema:
                if not field.nullable and row[field.name] is None:
                    raise ValueError(
                        f"{table_name}[{index}].{field.name} unexpectedly contains null"
                    )
        pa.Table.from_pylist(rows_by_table[table_name], schema=table_schema).validate(
            full=True
        )

    key_values: dict[str, set[Any]] = {}
    for table_name, primary_key in PRIMARY_KEYS.items():
        values = [
            tuple(row[field] for field in primary_key)
            for row in rows_by_table[table_name]
        ]
        if any(any(value is None for value in key) for key in values):
            raise ValueError(f"{table_name} has a null primary key")
        if len(values) != len(set(values)):
            raise ValueError(f"{table_name} has duplicate primary keys")
        if len(primary_key) == 1:
            key_values[f"{table_name}.{primary_key[0]}"] = {
                value[0] for value in values
            }

    for table_name, foreign_keys in FOREIGN_KEYS.items():
        table_schema = SCHEMAS[table_name]
        for field_name, target_name in foreign_keys.items():
            target_values = key_values[target_name]
            nullable = table_schema.field(field_name).nullable
            for row in rows_by_table[table_name]:
                value = row[field_name]
                if value is None and nullable:
                    continue
                if value not in target_values:
                    raise ValueError(
                        f"{table_name}.{field_name} has missing foreign key: {value!r}"
                    )

    for table_name in FACTORY_CODE_COLUMNS:
        validate_factory_code_rows(table_name, rows_by_table[table_name])
    validate_specialty_code_rows(
        "color_availability", rows_by_table["color_availability"]
    )
    validate_specialty_code_rows(
        "evidence_claims", rows_by_table["evidence_claims"], prefix="transcribed_"
    )
    validate_wa_upfitter_rows(
        "color_availability", rows_by_table["color_availability"]
    )
    validate_wa_upfitter_rows(
        "evidence_claims", rows_by_table["evidence_claims"], prefix="transcribed_"
    )


class NormalizedArchiveBuilder:
    def __init__(self, crawler_db: Path | None = None):
        self.snapshot = load_archive_snapshot()
        self.catalog = json_load(
            ROOT / "data" / "catalog" / "chevrolet-us-nameplates.json"
        )
        self.platform_catalog = json_load(
            ROOT / "data" / "catalog" / "chevrolet-platform-eras.json"
        )
        self.gm_inventory = json_load(
            ROOT / "data" / "sources" / "gm-heritage-chevrolet-kits.json"
        )
        self.gm_artifacts = json_load(
            ROOT / "data" / "sources" / "gm-heritage-chevrolet-artifacts.json"
        )
        self.photos = json_load(
            ROOT / "data" / "photos" / "commons-release-manifest.json"
        )
        self.gap_inventory = json_load(
            ROOT / "data" / "audits" / "color-research-gap-inventory.json"
        )
        self.modern_color_sources = json_load(
            ROOT / "data" / "sources" / "modern-chevrolet-color-source-candidates.json"
        )
        self.modern_color_sources_by_id = {
            item["source_id"]: item for item in self.modern_color_sources["sources"]
        }
        self.brochure_source_release_manifest = json_load(
            BROCHURE_SOURCE_RELEASE_MANIFEST_PATH
        )
        self.specialty_color_sources = json_load(
            ROOT / "data" / "sources" / "specialty-color-source-candidates.json"
        )
        self.rockauto_paint_code_leads = json_load(ROCKAUTO_LEADS_PATH)
        self.suburban_2000_2007_audit = json_load(SUBURBAN_2000_2007_AUDIT_PATH)
        self.tahoe_paint_schemes = json_load(
            ROOT / "data" / "audits" / "tahoe-1995-2000.json"
        )
        self.suburban_paint_schemes = json_load(
            ROOT / "data" / "audits" / "suburban-paint-schemes-1977-1999.json"
        )
        self.crawler_db = crawler_db if crawler_db and crawler_db.is_file() else None
        self.rows: dict[str, list[dict[str, Any]]] = {name: [] for name in SCHEMAS}
        self.sources_by_url: dict[str, dict[str, Any]] = {}
        self.source_id_to_url: dict[str, str] = {}
        self.source_pdf_page_counts: dict[str, int] = {}
        self.source_links_seen: set[tuple[Any, ...]] = set()
        self.specialty_artifacts_by_url: dict[str, dict[str, Any]] = {}
        self.brochure_release_entries_by_source_id: dict[str, dict[str, Any]] = {}
        self.brochure_release_source_ids_by_asset: dict[str, str] = {}

    def rekey_anonymous_source_links(self, old_id: str, new_id: str) -> None:
        rekeyed_rows: list[dict[str, Any]] = []
        rekeyed_seen: set[tuple[Any, ...]] = set()
        for original in self.rows["source_links"]:
            row = dict(original)
            if row["source_id"] == old_id:
                row["source_id"] = new_id
            dedupe = (
                row["source_id"],
                row["claim_type"],
                row["entity_type"],
                row["entity_id"],
                row["model_id"],
                row["model_year"],
                row["year_start"],
                row["year_end"],
                row["locator"],
                row["revision"],
                row["claim_summary"],
                row["confidence"],
                row["review_state"],
            )
            if dedupe in rekeyed_seen:
                continue
            rekeyed_seen.add(dedupe)
            row["source_link_id"] = stable_id("lnk", *dedupe)
            rekeyed_rows.append(row)
        self.rows["source_links"] = rekeyed_rows
        self.source_links_seen = rekeyed_seen

    def ensure_source(self, raw_url: str, **updates: Any) -> str:
        url = canonical_url(raw_url)
        if not url.startswith(("https://", "http://")):
            raise ValueError(f"source is not an HTTP URL: {raw_url}")
        host = (urlsplit(url).hostname or "").lower().rstrip(".")
        if any(
            host == placeholder or host.endswith(f".{placeholder}")
            for placeholder in PLACEHOLDER_SOURCE_HOSTS
        ):
            raise ValueError(f"source uses a placeholder host: {raw_url}")
        if updates.get("officiality") not in (None, ""):
            updates["officiality"] = normalized_officiality(updates["officiality"])
        if updates.get("document_authority") not in (
            None,
            "",
            *DOCUMENT_AUTHORITY_VALUES,
        ):
            raise ValueError(
                f"unsupported document authority for {raw_url}: "
                f"{updates['document_authority']}"
            )
        if updates.get("retrieval_host_type") not in (
            None,
            "",
            *RETRIEVAL_HOST_TYPE_VALUES,
        ):
            raise ValueError(
                f"unsupported retrieval host type for {raw_url}: "
                f"{updates['retrieval_host_type']}"
            )
        existing = self.sources_by_url.get(url)
        requested_id = updates.pop("source_id", None)
        source_id = (
            requested_id
            or (existing and existing["source_id"])
            or stable_id("src", url)
        )
        other_url = self.source_id_to_url.get(source_id)
        if other_url and other_url != url:
            raise ValueError(
                f"source ID collision: {source_id} maps to {other_url} and {url}"
            )
        if existing and requested_id and existing["source_id"] != requested_id:
            old_id = existing["source_id"]
            if old_id != stable_id("src", url):
                raise ValueError(
                    f"source URL already has an explicit ID: {url} maps to {old_id}, "
                    f"not {requested_id}"
                )
            if old_id in self.source_id_to_url:
                del self.source_id_to_url[old_id]
            existing["source_id"] = requested_id
            self.rekey_anonymous_source_links(old_id, requested_id)
            source_id = requested_id
        if existing is None:
            defaults = source_defaults(url)
            existing = {
                "source_id": source_id,
                "canonical_url": url,
                **defaults,
                "retrieved_on": None,
                "discovered_from_url": None,
                "http_status": None,
                "content_type": None,
                "content_length_bytes": None,
                "content_sha256": None,
                "last_modified": None,
                "archive_url": None,
                "archive_relpath": None,
                "citation_count": 0,
                "notes": None,
            }
            self.sources_by_url[url] = existing
        officiality_rank = {
            "unknown": 0,
            "secondary": 1,
            "licensed": 2,
            "official": 3,
        }
        for key, value in updates.items():
            if value is None or value == "":
                continue
            if key == "officiality":
                if officiality_rank.get(str(value), 0) >= officiality_rank.get(
                    str(existing.get(key)), 0
                ):
                    existing[key] = value
            elif existing.get(key) in (
                None,
                "",
                source_defaults(url).get(key),
            ) or key in {
                "content_sha256",
                "content_length_bytes",
                "archive_url",
                "archive_relpath",
                "http_status",
                "last_modified",
            }:
                existing[key] = value
        self.source_id_to_url[existing["source_id"]] = url
        return existing["source_id"]

    def add_source_link(
        self,
        source_id: str,
        *,
        claim_type: str,
        entity_type: str,
        entity_id: str,
        claim_summary: str,
        confidence: str,
        review_state: str,
        model_id: str | None = None,
        model_year: int | None = None,
        year_start: int | None = None,
        year_end: int | None = None,
        locator: str | None = None,
        revision: str | None = None,
    ) -> str:
        dedupe = (
            source_id,
            claim_type,
            entity_type,
            entity_id,
            model_id,
            model_year,
            year_start,
            year_end,
            locator,
            revision,
            claim_summary,
            confidence,
            review_state,
        )
        if dedupe in self.source_links_seen:
            for row in self.rows["source_links"]:
                if row["source_link_id"] == stable_id("lnk", *dedupe):
                    return row["source_link_id"]
        self.source_links_seen.add(dedupe)
        source_link_id = stable_id("lnk", *dedupe)
        self.rows["source_links"].append(
            {
                "source_link_id": source_link_id,
                "source_id": source_id,
                "claim_type": claim_type,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "model_id": model_id,
                "model_year": model_year,
                "year_start": year_start,
                "year_end": year_end,
                "locator": locator,
                "revision": revision,
                "claim_summary": claim_summary,
                "confidence": confidence,
                "review_state": review_state,
            }
        )
        return source_link_id

    def apply_brochure_release_artifacts(self) -> None:
        manifest = self.brochure_source_release_manifest
        entries = manifest.get("entries")
        if not isinstance(entries, list) or not entries:
            raise ValueError("brochure source Release manifest has no asset entries")
        release_tag = str(manifest.get("release_tag") or "").strip()
        release_url = str(manifest.get("release_url") or "").strip()
        captured_at = str(manifest.get("captured_at") or "").strip()
        if not release_tag or not release_url or not captured_at:
            raise ValueError(
                "brochure source Release manifest lacks tag, URL, or capture date"
            )

        self.brochure_release_entries_by_source_id = {}
        self.brochure_release_source_ids_by_asset = {}
        seen_asset_names: set[str] = set()
        seen_archive_urls: set[str] = set()
        upstream_source_id_urls: dict[str, str] = {}

        for entry in entries:
            asset_name = str(entry.get("asset_name") or "").strip()
            archive_url = str(entry.get("archive_url") or "").strip()
            artifact_sha256 = str(entry.get("sha256") or "").strip().casefold()
            byte_length = entry.get("bytes")
            role = str(entry.get("role") or "").strip()
            if not asset_name or asset_name in seen_asset_names:
                raise ValueError(
                    f"brochure source Release has a missing or duplicate asset name: "
                    f"{asset_name!r}"
                )
            seen_asset_names.add(asset_name)
            normalized_archive_url = canonical_url(archive_url)
            if (
                not normalized_archive_url.startswith("https://github.com/")
                or normalized_archive_url in seen_archive_urls
            ):
                raise ValueError(
                    "brochure source Release has a missing, non-GitHub, or duplicate "
                    f"archive URL: {archive_url!r}"
                )
            seen_archive_urls.add(normalized_archive_url)
            if not re.fullmatch(r"[0-9a-f]{64}", artifact_sha256):
                raise ValueError(
                    f"brochure source Release asset has an invalid SHA-256: {asset_name}"
                )
            if not isinstance(byte_length, int) or byte_length <= 0:
                raise ValueError(
                    f"brochure source Release asset has an invalid byte length: {asset_name}"
                )
            if not role:
                raise ValueError(
                    f"brochure source Release asset has no role: {asset_name}"
                )

            media_type = release_asset_media_type(asset_name)
            pdf_page_count = entry.get("pdf_page_count")
            if media_type == "application/pdf" and (
                not isinstance(pdf_page_count, int) or pdf_page_count <= 0
            ):
                raise ValueError(
                    f"brochure source Release PDF has no valid page count: {asset_name}"
                )
            if media_type != "application/pdf" and pdf_page_count is not None:
                raise ValueError(
                    "non-PDF brochure source Release asset has a PDF page count: "
                    f"{asset_name}"
                )

            upstream_source_id = entry.get("source_id")
            original_source_url = entry.get("original_source_url")
            if upstream_source_id and not original_source_url:
                raise ValueError(
                    "brochure source Release source ID lacks an original source URL: "
                    f"{asset_name}"
                )
            if upstream_source_id:
                normalized_original_url = canonical_url(str(original_source_url))
                prior_url = upstream_source_id_urls.get(str(upstream_source_id))
                if prior_url and prior_url != normalized_original_url:
                    raise ValueError(
                        "brochure source Release source ID maps to multiple URLs: "
                        f"{upstream_source_id}"
                    )
                upstream_source_id_urls[str(upstream_source_id)] = (
                    normalized_original_url
                )

            metadata = {
                "asset_name": asset_name,
                "release_tag": release_tag,
                "role": role,
                "upstream_source_id": upstream_source_id,
            }
            existing_release_source = self.sources_by_url.get(normalized_archive_url)
            if existing_release_source and existing_release_source.get("notes"):
                metadata["prior_notes"] = existing_release_source["notes"]
            release_source_id = self.ensure_source(
                normalized_archive_url,
                title=f"Retained source Release asset: {asset_name}",
                publisher="Chevrolet Color Archive on GitHub",
                source_type="archive_mirror",
                officiality="secondary",
                retrieval_host_type="archival_mirror",
                retrieved_on=captured_at,
                discovered_from_url=release_url,
                content_type=media_type,
                content_length_bytes=byte_length,
                content_sha256=artifact_sha256,
                archive_url=normalized_archive_url,
            )
            self.sources_by_url[normalized_archive_url]["notes"] = json.dumps(
                metadata, sort_keys=True, separators=(",", ":")
            )
            if pdf_page_count is not None:
                self.source_pdf_page_counts[release_source_id] = int(pdf_page_count)
            self.brochure_release_source_ids_by_asset[asset_name] = release_source_id
            self.brochure_release_entries_by_source_id[release_source_id] = dict(entry)

            entity_id = f"{release_tag}:{asset_name}"
            self.add_source_link(
                release_source_id,
                claim_type="retained_release_asset",
                entity_type="brochure_release_asset",
                entity_id=entity_id,
                locator=asset_name,
                revision=artifact_sha256,
                claim_summary=f"Retained Release asset with role {role}",
                confidence="manifest_hash_recorded",
                review_state="archived",
            )

            related_sources = (
                (
                    "original_source_url",
                    original_source_url,
                    upstream_source_id,
                    "Original source URL recorded for the retained Release asset",
                ),
                (
                    "retrieval_url",
                    entry.get("retrieval_url"),
                    None,
                    "Retrieval URL used to obtain the retained Release asset",
                ),
                (
                    "parent_source_url",
                    entry.get("parent_source_url"),
                    None,
                    "Parent source URL recorded for the retained Release asset",
                ),
            )
            for claim_type, raw_url, related_source_id, summary in related_sources:
                if not raw_url:
                    continue
                source_updates = (
                    {"source_id": str(related_source_id)} if related_source_id else {}
                )
                relation_source_id = self.ensure_source(str(raw_url), **source_updates)
                self.add_source_link(
                    relation_source_id,
                    claim_type=claim_type,
                    entity_type="brochure_release_asset",
                    entity_id=entity_id,
                    locator=asset_name,
                    revision=artifact_sha256,
                    claim_summary=summary,
                    confidence="manifest_recorded",
                    review_state="documented",
                )

    def build_sources_first(self) -> None:
        inventory = self.gm_inventory
        index = inventory["source_index_url"]
        index_source_id = self.ensure_source(
            index,
            source_id="gm-heritage-chevrolet-kit-index",
            title=inventory["source_name"],
            publisher="General Motors",
            source_type="official_source_index",
            officiality="official",
            retrieved_on=inventory["retrieved_on"],
            http_status=inventory["index_response"].get("http_status"),
            content_type=inventory["index_response"].get("content_type"),
            content_sha256=inventory["index_response"].get("sha256"),
            last_modified=inventory["index_response"].get("last_modified"),
            notes=inventory["scope"],
        )
        self.add_source_link(
            index_source_id,
            claim_type="source_inventory_scope",
            entity_type="source_inventory",
            entity_id="gm-heritage-chevrolet-kits-2026-07-20",
            claim_summary=inventory["scope"],
            confidence="high",
            review_state="verified_snapshot",
        )
        manifest_records = {
            item["canonical_url"]: item
            for item in (
                json.loads(line)
                for line in (
                    ROOT / "crawler" / "manifests" / "gm-heritage-chevrolet-all.jsonl"
                )
                .read_text(encoding="utf-8")
                .splitlines()
                if line.strip()
            )
        }
        for entry in inventory["entries"]:
            url = canonical_url(entry["pdf_url"])
            manifest = manifest_records[url]
            source_id = self.ensure_source(
                url,
                source_id=manifest["source_id"],
                title=manifest["title"],
                publisher=manifest["publisher"],
                source_type=manifest["source_type"],
                officiality=manifest["officiality"],
                retrieved_on=entry["retrieved_on"],
                discovered_from_url=entry["source_index_url"],
                http_status=entry["http"].get("status"),
                content_type=entry["http"].get("content_type"),
                content_length_bytes=entry["http"].get("content_length_bytes"),
                notes=f"Official index title: {entry['title']}",
            )
            years = entry.get("years") or [entry["year"]]
            self.add_source_link(
                source_id,
                claim_type="source_discovery",
                entity_type="gm_heritage_kit_entry",
                entity_id=source_id,
                claim_summary=(
                    f"Official GM Heritage index entry for {entry['title']}; "
                    "presence in the index is not proof that a color table exists."
                ),
                confidence="high",
                review_state="endpoint_verified_not_fully_screened",
                model_year=int(years[0]),
                year_start=int(min(years)),
                year_end=int(max(years)),
                locator=entry["title"],
            )

    def apply_crawler_artifacts(self) -> None:
        if not self.crawler_db:
            return
        connection = sqlite3.connect(self.crawler_db)
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT s.source_id, s.canonical_url, a.sha256, a.byte_length,
                   a.object_relpath, f.final_url, f.last_modified, f.http_status
            FROM sources s
            JOIN source_artifacts sa ON sa.source_id = s.source_id AND sa.is_current = 1
            JOIN artifacts a ON a.sha256 = sa.artifact_sha256
            JOIN source_fetches f ON f.fetch_id = sa.fetch_id
            """
        ).fetchall()
        for row in rows:
            self.ensure_source(
                row["canonical_url"],
                source_id=row["source_id"],
                content_sha256=row["sha256"],
                content_length_bytes=row["byte_length"],
                archive_relpath=row["object_relpath"],
                last_modified=row["last_modified"],
                http_status=row["http_status"],
            )
        connection.close()

    def apply_tracked_artifacts(self) -> None:
        if self.gm_artifacts["source_count"] != 691:
            raise ValueError("tracked GM artifact inventory is incomplete")
        for item in self.gm_artifacts["entries"]:
            self.ensure_source(
                item["canonical_url"],
                source_id=item["source_id"],
                content_sha256=item["artifact_sha256"],
                content_length_bytes=int(item["byte_length"]),
                archive_relpath=item["crawler_object_relpath"],
                last_modified=item.get("last_modified"),
                http_status=item.get("http_status"),
            )

    def apply_modern_artifacts(self) -> None:
        retained_modern_sources = [
            item
            for item in self.modern_color_sources["sources"]
            if item.get("local_file_path")
        ]
        retained_fleet_guides = [
            item
            for item in retained_modern_sources
            if item.get("source_type") == "fleet_guide_pdf"
        ]
        if len(retained_fleet_guides) != 19:
            raise ValueError(
                "modern source inventory must retain exactly 19 Fleet Guide PDFs"
            )
        retained_source_ids = {item["source_id"] for item in retained_modern_sources}
        missing_qualified_palettes = sorted(
            QUALIFIED_MODERN_PALETTE_SOURCE_IDS - retained_source_ids
        )
        if missing_qualified_palettes:
            raise ValueError(
                "published modern palettes lack retained source PDFs: "
                f"{missing_qualified_palettes}"
            )
        for item in self.modern_color_sources["sources"]:
            officiality, document_authority, retrieval_host_type = (
                modern_source_classification(item)
            )
            local_relpath = item.get("local_file_path")
            local_path = (ROOT / local_relpath).resolve() if local_relpath else None
            if local_path and not local_path.is_relative_to(ROOT.resolve()):
                raise ValueError(
                    f"retained modern source escapes the repository: {item['source_id']}"
                )
            if local_path and not local_path.is_file():
                raise ValueError(
                    f"retained modern source is missing: {item['source_id']}"
                )
            if local_path:
                actual_bytes = local_path.stat().st_size
                actual_sha256 = sha256_file(local_path)
                if actual_bytes != int(item["bytes"]):
                    raise ValueError(
                        f"modern source byte length changed: {item['source_id']}"
                    )
                if actual_sha256 != item["sha256"]:
                    raise ValueError(f"modern source hash changed: {item['source_id']}")
                try:
                    actual_page_count = len(PdfReader(local_path, strict=False).pages)
                except Exception as exc:
                    raise ValueError(
                        f"retained modern PDF cannot be opened: {item['source_id']}"
                    ) from exc
                if actual_page_count != int(item["page_count"]):
                    raise ValueError(
                        f"modern source page count changed: {item['source_id']}"
                    )
            retrieval_url = item["retrieval_url"]
            direct_official_url = item.get("direct_official_url")
            historical_official_url = item.get("historical_official_url")
            landing_url = item.get("landing_url")
            observed_http_status = item.get("http_status")
            source_id = self.ensure_source(
                retrieval_url,
                source_id=item["source_id"],
                title=item["title"],
                publisher=item["publisher"],
                source_type=item["source_type"],
                officiality=officiality,
                document_authority=document_authority,
                retrieval_host_type=retrieval_host_type,
                retrieved_on=item["retrieved_at"],
                discovered_from_url=landing_url,
                http_status=observed_http_status,
                content_type=item["content_type"],
                content_length_bytes=(
                    int(item["bytes"]) if item.get("bytes") is not None else None
                ),
                content_sha256=item.get("sha256"),
                archive_relpath=local_relpath,
                notes="; ".join(item.get("limitations") or []),
            )
            self.add_source_link(
                source_id,
                claim_type="source_retrieval_url",
                entity_type="modern_color_source",
                entity_id=item["source_id"],
                claim_summary=(
                    "URL from which the retained artifact bytes were retrieved"
                    if local_relpath
                    else "Recorded retrieval endpoint for the modern source"
                ),
                confidence="artifact_rehashed"
                if local_relpath
                else "manifest_recorded",
                review_state="verified_snapshot" if local_relpath else "documented",
                revision=item.get("revision_or_document_date"),
            )
            if direct_official_url:
                direct_source_id = self.ensure_source(
                    direct_official_url,
                    title=f"{item['title']} direct official URL",
                    publisher=item["publisher"],
                    officiality="official",
                    document_authority=document_authority,
                    retrieval_host_type="official_live",
                    source_type="official_document_endpoint",
                )
                self.add_source_link(
                    direct_source_id,
                    claim_type="direct_official_url",
                    entity_type="modern_color_source",
                    entity_id=item["source_id"],
                    claim_summary=(
                        "Publisher-hosted URL recorded separately from the artifact "
                        "retrieval URL"
                    ),
                    confidence="manifest_recorded",
                    review_state="documented",
                    revision=item.get("revision_or_document_date"),
                )
            if historical_official_url:
                historical_source_id = self.ensure_source(
                    historical_official_url,
                    title=f"{item['title']} historical official URL",
                    publisher=item["publisher"],
                    officiality="official",
                    document_authority=document_authority,
                    retrieval_host_type="official_live",
                    source_type="historical_official_document_endpoint",
                )
                self.add_source_link(
                    historical_source_id,
                    claim_type="historical_official_url",
                    entity_type="modern_color_source",
                    entity_id=item["source_id"],
                    claim_summary=(
                        "Historical publisher-hosted URL recorded separately; it does "
                        "not byte-verify the retained artifact revision"
                    ),
                    confidence="manifest_recorded",
                    review_state="documented",
                    revision=item.get("revision_or_document_date"),
                )
            if landing_url:
                landing_source_id = self.ensure_source(
                    landing_url,
                    title="GM Fleet guides and manuals landing page",
                    publisher="General Motors",
                    officiality="official",
                    document_authority="official_manufacturer_document",
                    retrieval_host_type="official_live",
                    source_type="official_source_landing_page",
                )
                self.add_source_link(
                    landing_source_id,
                    claim_type="source_landing_url",
                    entity_type="modern_color_source",
                    entity_id=item["source_id"],
                    claim_summary="Publisher landing page associated with the source",
                    confidence="manifest_recorded",
                    review_state="documented",
                    revision=item.get("revision_or_document_date"),
                )

    def apply_specialty_artifacts(self) -> None:
        audit = self.specialty_color_sources.get("integrity_audit") or {}
        if not audit.get("byte_lengths_reconciled") or not audit.get(
            "sha256_digests_reconciled"
        ):
            raise ValueError("specialty source artifact audit is incomplete")

        artifact_records: list[dict[str, Any]] = []

        def locator_for(artifact: dict[str, Any]) -> str | None:
            pages = artifact.get("pdf_pages") or artifact.get("candidate_pages")
            if pages:
                return "PDF pp. " + ", ".join(str(page) for page in pages)
            page = artifact.get("pdf_page") or artifact.get("page")
            return f"PDF p. {page}" if page is not None else None

        def add_record(
            *,
            category: str,
            entity_id: str,
            artifact: dict[str, Any],
            title: str | None,
            publisher: str,
            source_type: str,
            confidence: str,
            review_state: str,
            claim_summary: str,
            model_id: str | None = None,
            model_year: int | None = None,
        ) -> None:
            artifact_records.append(
                {
                    "category": category,
                    "entity_id": entity_id,
                    "artifact": artifact,
                    "title": title,
                    "publisher": publisher,
                    "source_type": source_type,
                    "confidence": confidence,
                    "review_state": review_state,
                    "claim_summary": claim_summary,
                    "model_id": model_id,
                    "model_year": model_year,
                    "locator": locator_for(artifact),
                }
            )

        for record in self.specialty_color_sources["app_publication_records"]:
            artifact = record["source"]
            model_ids = list(record.get("catalog_model_ids") or [])
            is_qualified_historical_table = (
                record.get("evidence_class") == "qualified_historical_table"
            )
            add_record(
                category="app_publication_records",
                entity_id=f"app_publication_records:{record['record_id']}",
                artifact=artifact,
                title=artifact.get("title"),
                publisher=artifact.get("publisher") or "General Motors",
                source_type=artifact.get("source_type")
                or "specialty_paint_primary_pdf",
                confidence="human_checked_primary_source",
                review_state=(
                    "reviewed_qualified_historical_table"
                    if is_qualified_historical_table
                    else "reviewed_specialty_palette_subset"
                ),
                claim_summary=(
                    f"Retained and rehashed primary-source artifact for "
                    f"{record['record_id']}. Publication remains limited to the "
                    + (
                        "reviewed qualified historical table subset."
                        if is_qualified_historical_table
                        else "reviewed specialty-paint subset."
                    )
                ),
                model_id=model_ids[0] if len(model_ids) == 1 else None,
                model_year=int(record["model_year"]),
            )

        for record in self.specialty_color_sources["verified_not_published"]:
            artifact = record["source"]
            model_ids = list(record.get("catalog_model_ids") or [])
            add_record(
                category="verified_not_published",
                entity_id=f"verified_not_published:{record['record_id']}",
                artifact=artifact,
                title=f"{record['model_year']} Chevrolet Electronic Order Guide",
                publisher="General Motors",
                source_type="official_electronic_order_guide",
                confidence="human_checked_not_published",
                review_state="verified_not_published",
                claim_summary=(
                    f"Retained and rehashed source artifact for {record['record_id']}. "
                    "The reviewed record is deliberately not published as a second "
                    "model-year color source."
                ),
                model_id=model_ids[0] if len(model_ids) == 1 else None,
                model_year=int(record["model_year"]),
            )

        for artifact in self.specialty_color_sources["usda_primary_sources"]:
            add_record(
                category="usda_primary_sources",
                entity_id=f"usda_primary_sources:{artifact['source_id']}",
                artifact=artifact,
                title=artifact.get("title"),
                publisher="USDA Forest Service",
                source_type="official_specification_pdf",
                confidence="primary_source_identity_only",
                review_state="retained_research_lead",
                claim_summary=(
                    "Retained and rehashed USDA primary source for the named "
                    "Forest Service Green research lead. It does not establish a "
                    "Chevrolet model-year application."
                ),
            )

        for artifact in self.specialty_color_sources["comparison_sources"]:
            add_record(
                category="comparison_sources",
                entity_id=f"comparison_sources:{artifact['source_id']}",
                artifact=artifact,
                title=f"{artifact['source_id']} comparison source",
                publisher="General Motors",
                source_type="official_vehicle_information_kit",
                confidence="human_checked_comparison_only",
                review_state="reviewed_comparison_only",
                claim_summary=(
                    f"Retained and rehashed comparison source for "
                    f"{artifact['label']}. The comparison does not bridge that label "
                    "to Forest Service Green or Woodland Green."
                ),
            )

        for artifact in self.specialty_color_sources["historic_gm_upfitter_candidates"]:
            add_record(
                category="historic_gm_upfitter_candidates",
                entity_id=(f"historic_gm_upfitter_candidates:{artifact['source_id']}"),
                artifact=artifact,
                title=(
                    f"{artifact['year']} Chevrolet municipal/fleet manual candidate"
                ),
                publisher="General Motors",
                source_type="official_municipal_fleet_manual_candidate",
                confidence="candidate_artifact_preserved",
                review_state=artifact["status"],
                claim_summary=(
                    f"Retained and rehashed {artifact['year']} GM Upfitter source "
                    "candidate. Located or rendered pages remain unpromoted until "
                    "direct visual review establishes an exact application."
                ),
                model_year=int(artifact["year"]),
            )

        for artifact in self.specialty_color_sources[
            "modern_order_guide_snapshot_candidates"
        ]:
            add_record(
                category="modern_order_guide_snapshot_candidates",
                entity_id=(
                    "modern_order_guide_snapshot_candidates:"
                    f"{artifact['year']}:{artifact['vehicle_id']}"
                ),
                artifact=artifact,
                title=(
                    f"{artifact['year']} Chevrolet {artifact['vehicle']} "
                    "Electronic Order Guide snapshot"
                ),
                publisher="General Motors",
                source_type="official_electronic_order_guide_snapshot_candidate",
                confidence="exact_snapshot_page_located",
                review_state=artifact["status"],
                claim_summary=(
                    f"Retained and rehashed {artifact['year']} {artifact['vehicle']} "
                    "order-guide snapshot. The snapshot is a searchable research "
                    "candidate and is not published as model-year availability."
                ),
                model_year=int(artifact["year"]),
            )

        for lead_index, lead in enumerate(
            self.specialty_color_sources["rejected_or_unresolved_leads"]
        ):
            for source_index, artifact in enumerate(lead.get("sources") or []):
                add_record(
                    category="rejected_or_unresolved_leads",
                    entity_id=(
                        "rejected_or_unresolved_leads:"
                        f"{lead_index}:source:{source_index}"
                    ),
                    artifact=artifact,
                    title="Reviewed Chevrolet vehicle information kit",
                    publisher="General Motors",
                    source_type="reviewed_official_vehicle_information_kit",
                    confidence="human_checked_no_bridge",
                    review_state=lead["disposition"],
                    claim_summary=(
                        "Retained and rehashed reviewed source candidate. The review "
                        "found no Chevrolet model-year bridge for Forest Service Green."
                    ),
                )

        for record in artifact_records:
            artifact = record["artifact"]
            raw_url = artifact.get("url")
            byte_length = artifact.get("bytes")
            artifact_sha256 = artifact.get("sha256")
            if not raw_url or byte_length is None or not artifact_sha256:
                raise ValueError(
                    f"specialty artifact metadata is incomplete: {record['entity_id']}"
                )
            if not re.fullmatch(r"[0-9a-f]{64}", str(artifact_sha256)):
                raise ValueError(
                    f"specialty artifact hash is invalid: {record['entity_id']}"
                )
            url = canonical_url(raw_url)
            normalized = {
                "canonical_url": url,
                "source_id": artifact.get("source_id"),
                "title": record["title"],
                "publisher": record["publisher"],
                "source_type": record["source_type"],
                "retrieved_at": artifact.get("retrieved_at"),
                "content_length_bytes": int(byte_length),
                "content_sha256": str(artifact_sha256),
                "pdf_page_count": (
                    int(artifact["pdf_page_count"])
                    if artifact.get("pdf_page_count") is not None
                    else None
                ),
                "categories": {record["category"]},
            }
            existing = self.specialty_artifacts_by_url.get(url)
            if existing is None:
                self.specialty_artifacts_by_url[url] = normalized
            else:
                for field in (
                    "content_length_bytes",
                    "content_sha256",
                    "pdf_page_count",
                ):
                    if (
                        existing.get(field) is not None
                        and normalized.get(field) is not None
                        and existing[field] != normalized[field]
                    ):
                        raise ValueError(
                            f"specialty source metadata conflicts: {url} ({field})"
                        )
                    if existing.get(field) is None:
                        existing[field] = normalized.get(field)
                for field in (
                    "source_id",
                    "title",
                    "publisher",
                    "source_type",
                    "retrieved_at",
                ):
                    if (
                        existing.get(field) is None
                        and normalized.get(field) is not None
                    ):
                        existing[field] = normalized[field]
                existing["categories"].update(normalized["categories"])

        expected_artifact_count = int(
            audit.get("unique_retained_artifacts_reconciled", -1)
        )
        if len(self.specialty_artifacts_by_url) != expected_artifact_count:
            raise ValueError(
                "specialty artifact count does not match the integrity audit: "
                f"{len(self.specialty_artifacts_by_url)} != {expected_artifact_count}"
            )

        for url in sorted(self.specialty_artifacts_by_url):
            artifact = self.specialty_artifacts_by_url[url]
            existing_source = self.sources_by_url.get(url)
            if existing_source:
                if (
                    existing_source.get("content_sha256") is not None
                    and existing_source["content_sha256"] != artifact["content_sha256"]
                ):
                    raise ValueError(
                        f"specialty artifact hash conflicts with source: {url}"
                    )
                if (
                    existing_source.get("content_length_bytes") is not None
                    and int(existing_source["content_length_bytes"])
                    != artifact["content_length_bytes"]
                ):
                    raise ValueError(
                        f"specialty artifact byte count conflicts with source: {url}"
                    )
            source_id = self.ensure_source(
                url,
                source_id=(None if existing_source else artifact.get("source_id")),
                title=artifact.get("title"),
                publisher=artifact.get("publisher"),
                source_type=artifact.get("source_type"),
                officiality="official",
                retrieved_on=artifact.get("retrieved_at"),
                content_type="application/pdf",
                content_length_bytes=artifact["content_length_bytes"],
                content_sha256=artifact["content_sha256"],
                notes=(
                    "Retained color-research artifact; categories: "
                    + ", ".join(sorted(artifact["categories"]))
                ),
            )
            artifact["resolved_source_id"] = source_id

        for record in artifact_records:
            artifact = self.specialty_artifacts_by_url[
                canonical_url(record["artifact"]["url"])
            ]
            model_year = record.get("model_year")
            self.add_source_link(
                artifact["resolved_source_id"],
                claim_type="specialty_source_artifact_provenance",
                entity_type="specialty_source_record",
                entity_id=record["entity_id"],
                model_id=record.get("model_id"),
                model_year=model_year,
                year_start=model_year,
                year_end=model_year,
                locator=record.get("locator"),
                claim_summary=record["claim_summary"],
                confidence=record["confidence"],
                review_state=record["review_state"],
            )

    def build_catalog_and_colors(self) -> None:
        gap_audit_state_by_model_year = {
            item["model_year_key"]: item["audit_state"]
            for item in self.gap_inventory["model_years"]
        }
        catalog_models = {item["id"]: item for item in self.catalog["models"]}
        generation_keys: set[str] = set()
        model_year_keys: set[str] = set()
        color_keys: set[str] = set()
        availability_keys: set[str] = set()
        platform_for_year: dict[tuple[str, int], str] = {}
        model_year_evidence_classes: dict[str, set[str]] = {}
        model_year_source_ids: dict[str, set[str]] = {}
        membership_keys: set[tuple[str, str]] = set()

        for model_id, eras in self.platform_catalog.items():
            for era in eras:
                platform_era_id = f"{model_id}:{era['start']}-{era['end']}"
                self.rows["platform_eras"].append(
                    {
                        "platform_era_id": platform_era_id,
                        "model_id": model_id,
                        "year_start": int(era["start"]),
                        "year_end": int(era["end"]),
                        "label": era["label"],
                        "aliases": list(era.get("aliases") or []),
                        "confidence": era["confidence"],
                        "notes": era["notes"],
                    }
                )
                for year in range(int(era["start"]), int(era["end"]) + 1):
                    key = (model_id, year)
                    if key in platform_for_year:
                        raise ValueError(
                            f"overlapping platform eras for {model_id} {year}"
                        )
                    platform_for_year[key] = platform_era_id
                for url in era["evidence_urls"]:
                    source_id = self.ensure_source(url)
                    self.add_source_link(
                        source_id,
                        claim_type="platform_era_evidence",
                        entity_type="platform_era",
                        entity_id=platform_era_id,
                        model_id=model_id,
                        year_start=int(era["start"]),
                        year_end=int(era["end"]),
                        claim_summary=era["label"],
                        confidence=era["confidence"],
                        review_state="catalogued",
                    )

        for resolved_model in self.snapshot["models"]:
            model_id = resolved_model["id"]
            catalog_model = catalog_models[model_id]
            year_ranges = catalog_model["model_year_ranges"]
            all_years = sorted(
                {
                    year
                    for item in year_ranges
                    for year in range(int(item["start"]), int(item["end"]) + 1)
                }
            )
            self.rows["models"].append(
                {
                    "model_id": model_id,
                    "name": catalog_model["name"],
                    "vehicle_class": catalog_model["vehicle_class"],
                    "aliases": list(catalog_model.get("aliases") or []),
                    "current": bool(catalog_model["current"]),
                    "first_model_year": min(all_years),
                    "last_model_year": max(all_years),
                    "model_year_count": len(all_years),
                    "catalog_status": resolved_model["status"],
                    "catalog_notes": catalog_model["notes"],
                    "catalog_retrieved_on": self.catalog["retrieved_on"],
                }
            )
            for range_item in year_ranges:
                range_id = f"{model_id}:{range_item['start']}-{range_item['end']}"
                for url in range_item["evidence_urls"]:
                    source_id = self.ensure_source(url)
                    self.add_source_link(
                        source_id,
                        claim_type="model_year_range_evidence",
                        entity_type="model_year_range",
                        entity_id=range_id,
                        model_id=model_id,
                        year_start=int(range_item["start"]),
                        year_end=int(range_item["end"]),
                        claim_summary=(
                            f"Chevrolet {catalog_model['name']} model-year range "
                            f"{range_item['start']}-{range_item['end']}"
                        ),
                        confidence=range_item["confidence"],
                        review_state="catalogued",
                    )

            for generation in resolved_model["generations"]:
                generation_id = f"{model_id}:{generation['id']}"
                if generation_id in generation_keys:
                    raise ValueError(f"duplicate generation ID: {generation_id}")
                generation_keys.add(generation_id)
                years = sorted(int(year) for year in generation["years"])
                if not years:
                    raise ValueError(f"generation has no years: {generation_id}")
                self.rows["generations"].append(
                    {
                        "generation_id": generation_id,
                        "model_id": model_id,
                        "generation_key": generation["id"],
                        "label": generation["label"],
                        "program_id": generation.get("programId"),
                        "program_label": generation.get("programLabel"),
                        "year_start": min(years),
                        "year_end": max(years),
                        "model_year_count": len(years),
                        "platform_aliases": list(
                            generation.get("platformAliases") or []
                        ),
                        "platform_confidence": generation.get("platformConfidence"),
                        "platform_notes": generation.get("platformNotes"),
                        "revision_note": generation["revisionNote"],
                        "verified_listing_count": int(generation["listingCount"]),
                    }
                )
                for url in generation.get("catalogSources") or []:
                    source_id = self.ensure_source(url)
                    self.add_source_link(
                        source_id,
                        claim_type="generation_evidence",
                        entity_type="generation",
                        entity_id=generation_id,
                        model_id=model_id,
                        year_start=min(years),
                        year_end=max(years),
                        claim_summary=generation["label"],
                        confidence=generation.get("platformConfidence") or "catalogued",
                        review_state="catalogued",
                    )

                color_count_by_year: Counter[int] = Counter()
                source_ids_by_year: dict[int, set[str]] = {}
                evidence_classes_by_year: dict[int, set[str]] = {}
                year_sources: dict[int, dict[str, Any]] = {}
                for raw_year, year_source in generation["sources"].items():
                    year = int(raw_year)
                    evidence_class = year_source.get("evidenceClass")
                    is_palette_union = evidence_class == "qualified_palette_union"
                    is_specialty_subset = evidence_class == "specialty_palette_subset"
                    is_qualified_historical_table = (
                        evidence_class == "qualified_historical_table"
                    )
                    is_qualified_source = (
                        is_palette_union
                        or is_specialty_subset
                        or is_qualified_historical_table
                    )
                    source_id = self.ensure_source(
                        year_source["url"],
                        source_id=year_source.get("sourceId"),
                        publisher=year_source.get("publisher") or "General Motors",
                        officiality="official",
                        source_type=(
                            year_source.get("sourceType") or "fleet_guide_pdf"
                            if is_palette_union
                            else "specialty_paint_primary_pdf"
                            if is_specialty_subset
                            else year_source.get("sourceType")
                            or "vehicle_information_kit"
                        ),
                        title=(
                            year_source["name"]
                            if is_qualified_source or year_source.get("sourceType")
                            else f"{year} Chevrolet {resolved_model['name']} Vehicle Information Kit"
                        ),
                        retrieved_on=year_source.get("retrievedAt"),
                        content_type=(
                            year_source.get("contentType")
                            or ("application/pdf" if is_qualified_source else None)
                        ),
                        content_length_bytes=year_source.get("artifactBytes"),
                        content_sha256=year_source.get("artifactSha256"),
                        document_authority=year_source.get("documentAuthority"),
                        retrieval_host_type=year_source.get("retrievalHostType"),
                        archive_url=year_source.get("archiveUrl"),
                        notes=year_source.get("sourceNotes"),
                    )
                    if year_source.get("pdfPageCount") is not None:
                        pdf_page_count = int(year_source["pdfPageCount"])
                        prior_page_count = self.source_pdf_page_counts.get(source_id)
                        if prior_page_count not in (None, pdf_page_count):
                            raise ValueError(
                                f"source PDF page-count conflict: {source_id} "
                                f"({prior_page_count} != {pdf_page_count})"
                            )
                        self.source_pdf_page_counts[source_id] = pdf_page_count
                    year_sources[year] = {**year_source, "source_id": source_id}
                    source_ids_by_year.setdefault(year, set()).add(source_id)
                    evidence_classes_by_year.setdefault(year, set()).add(
                        evidence_class or "governing_color_chart"
                    )
                    model_year_id = f"{model_id}:{year}"
                    self.add_source_link(
                        source_id,
                        claim_type=(
                            "qualified_palette_union"
                            if is_palette_union
                            else "specialty_palette_subset"
                            if is_specialty_subset
                            else "qualified_historical_table"
                            if is_qualified_historical_table
                            else "audited_color_chart"
                        ),
                        entity_type="model_year",
                        entity_id=model_year_id,
                        model_id=model_id,
                        model_year=year,
                        year_start=year,
                        year_end=year,
                        locator=year_source["locator"],
                        revision=year_source["revision"],
                        claim_summary=year_source["chart"],
                        confidence=(
                            "human_checked_palette_union"
                            if is_palette_union
                            else "human_checked_specialty_subset"
                            if is_specialty_subset
                            else "human_checked_qualified_historical_table"
                            if is_qualified_historical_table
                            else "source_transcribed"
                        ),
                        review_state=(
                            "reviewed_qualified_palette_union"
                            if is_palette_union
                            else "reviewed_specialty_palette_subset"
                            if is_specialty_subset
                            else "reviewed_qualified_historical_table"
                            if is_qualified_historical_table
                            else "verified"
                        ),
                    )
                    for supporting_source in year_source.get("supportingSources") or []:
                        supporting_source_id = self.ensure_source(
                            supporting_source["url"],
                            source_id=supporting_source.get("sourceId"),
                            publisher=supporting_source.get("publisher"),
                            officiality=(
                                "official"
                                if supporting_source.get("documentAuthority")
                                == "official_manufacturer_document"
                                else "secondary"
                            ),
                            source_type=(
                                supporting_source.get("sourceType")
                                or "supporting_color_evidence"
                            ),
                            title=supporting_source["name"],
                            retrieved_on=supporting_source.get("retrievedAt"),
                            content_type=supporting_source.get("contentType"),
                            content_length_bytes=supporting_source.get("artifactBytes"),
                            content_sha256=supporting_source.get("artifactSha256"),
                            document_authority=supporting_source.get(
                                "documentAuthority"
                            ),
                            retrieval_host_type=supporting_source.get(
                                "retrievalHostType"
                            ),
                            archive_url=supporting_source.get("archiveUrl"),
                            notes=(
                                f"Original retrieval URL: "
                                f"{supporting_source.get('retrievalUrl')}"
                                if supporting_source.get("retrievalUrl")
                                else None
                            ),
                        )
                        if supporting_source.get("pdfPageCount") is not None:
                            supporting_page_count = int(
                                supporting_source["pdfPageCount"]
                            )
                            prior_supporting_page_count = (
                                self.source_pdf_page_counts.get(supporting_source_id)
                            )
                            if prior_supporting_page_count not in (
                                None,
                                supporting_page_count,
                            ):
                                raise ValueError(
                                    "supporting source PDF page-count conflict: "
                                    f"{supporting_source_id} "
                                    f"({prior_supporting_page_count} != "
                                    f"{supporting_page_count})"
                                )
                            self.source_pdf_page_counts[supporting_source_id] = (
                                supporting_page_count
                            )
                        self.add_source_link(
                            supporting_source_id,
                            claim_type="supporting_color_evidence",
                            entity_type="model_year",
                            entity_id=model_year_id,
                            model_id=model_id,
                            model_year=year,
                            year_start=year,
                            year_end=year,
                            locator=supporting_source["locator"],
                            revision=supporting_source["revision"],
                            claim_summary=supporting_source["chart"],
                            confidence="corroborating_source",
                            review_state="supporting_only",
                        )

                for color in generation["colors"]:
                    color_identity_id = f"{generation_id}:{color['id']}"
                    if color_identity_id in color_keys:
                        raise ValueError(
                            f"duplicate color identity: {color_identity_id}"
                        )
                    color_keys.add(color_identity_id)
                    normalized_name = re.sub(
                        r"[^a-z0-9]+", " ", color["name"].lower()
                    ).strip()
                    self.rows["color_identities"].append(
                        {
                            "color_identity_id": color_identity_id,
                            "model_id": model_id,
                            "generation_id": generation_id,
                            "archive_color_key": color["id"],
                            "display_name": color["name"],
                            "normalized_name": normalized_name,
                            "interpretive_swatch_hex": color["swatch"],
                            "row_code_summary": color["rowCode"],
                            "identity_note": color.get("note"),
                        }
                    )
                    for raw_year, availability in color["availability"].items():
                        year = int(raw_year)
                        if year not in year_sources:
                            raise ValueError(
                                f"availability has no source: {model_id} {year} {color['id']}"
                            )
                        year_source = year_sources[year]
                        availability_id = (
                            f"{model_id}:{year}:{generation['id']}:{color['id']}"
                        )
                        if availability_id in availability_keys:
                            raise ValueError(
                                f"duplicate availability ID: {availability_id}"
                            )
                        availability_keys.add(availability_id)
                        color_count_by_year[year] += 1
                        is_palette_union = (
                            year_source.get("evidenceClass")
                            == "qualified_palette_union"
                        )
                        is_specialty_subset = (
                            year_source.get("evidenceClass")
                            == "specialty_palette_subset"
                        )
                        is_qualified_historical_table = (
                            year_source.get("evidenceClass")
                            == "qualified_historical_table"
                        )
                        source_factory_code_status = availability.get(
                            "factoryCodeStatus"
                        )
                        if source_factory_code_status == "explicit none":
                            if availability.get("factoryCode") != "none":
                                raise ValueError(
                                    f"explicit-none factory code changed: {availability_id}"
                                )
                            factory_code = None
                            factory_code_status = "explicit_none_in_source"
                        elif source_factory_code_status == "not printed":
                            if availability.get("factoryCode") is not None:
                                raise ValueError(
                                    f"not-printed factory code has a value: {availability_id}"
                                )
                            factory_code = None
                            factory_code_status = "not_printed_in_source"
                        elif source_factory_code_status == "printed":
                            factory_code, factory_code_status = normalize_factory_code(
                                availability.get("factoryCode")
                            )
                            if factory_code_status != "printed_in_source":
                                raise ValueError(
                                    f"printed factory code is missing: {availability_id}"
                                )
                        elif source_factory_code_status is None:
                            factory_code, factory_code_status = normalize_factory_code(
                                availability.get("code")
                            )
                        else:
                            raise ValueError(
                                f"unsupported source factory-code status: "
                                f"{availability_id} ({source_factory_code_status})"
                            )
                        self.rows["color_availability"].append(
                            {
                                "availability_id": availability_id,
                                "model_year_id": f"{model_id}:{year}",
                                "model_id": model_id,
                                "model_year": year,
                                "generation_id": generation_id,
                                "color_identity_id": color_identity_id,
                                "source_color_name": availability["label"],
                                "factory_code": factory_code,
                                "factory_code_status": factory_code_status,
                                "touch_up_code": availability.get("touchUpCode"),
                                "rpo_code": availability.get("rpoCode"),
                                "seo_code": availability.get("seoCode"),
                                "seo_code_status": availability.get("seoCodeStatus"),
                                "source_seo_code_raw": availability.get(
                                    "sourceSeoCodeRaw"
                                ),
                                "source_seo_code_cell_state": availability.get(
                                    "sourceSeoCodeCellState"
                                ),
                                "wa_code": availability.get("waCode"),
                                "source_wa_code_raw": availability.get(
                                    "sourceWaCodeRaw"
                                ),
                                "source_wa_code_cell_state": availability.get(
                                    "sourceWaCodeCellState"
                                ),
                                "upfitter_code_1": (
                                    availability.get("upfitterOrderCodes") or {}
                                ).get("code1"),
                                "upfitter_code_2": (
                                    availability.get("upfitterOrderCodes") or {}
                                ).get("code2"),
                                "upfitter_solid_color_option": (
                                    availability.get("upfitterOrderCodes") or {}
                                ).get("solidColorOption"),
                                "upfitter_two_tone_color_option": (
                                    availability.get("upfitterOrderCodes") or {}
                                ).get("twoToneColorOption"),
                                "minimum_batch_units": availability.get(
                                    "minimumBatchUnits"
                                ),
                                "factory_installation_claim": availability.get(
                                    "factoryInstallationClaim"
                                ),
                                "availability_state": availability["state"],
                                "application_type": availability.get("applicationType")
                                or (
                                    "specialty_program_unspecified"
                                    if is_specialty_subset
                                    else "manufacturer_listed"
                                ),
                                "restriction": availability.get("restriction"),
                                "claim_status": (
                                    "published_qualified_palette_union"
                                    if is_palette_union
                                    else "published_specialty_palette_subset"
                                    if is_specialty_subset
                                    else "published_qualified_historical_table"
                                    if is_qualified_historical_table
                                    else "published_source_transcription"
                                ),
                                "evidence_source_id": year_source["source_id"],
                                "evidence_chart": year_source["chart"],
                                "evidence_locator": year_source["locator"],
                                "source_revision": year_source["revision"],
                            }
                        )
                        self.add_source_link(
                            year_source["source_id"],
                            claim_type="color_availability_evidence",
                            entity_type="color_availability",
                            entity_id=availability_id,
                            model_id=model_id,
                            model_year=year,
                            year_start=year,
                            year_end=year,
                            locator=year_source["locator"],
                            revision=year_source["revision"],
                            claim_summary=(
                                f"{availability['label']}"
                                + (
                                    f" ({factory_code})"
                                    if factory_code is not None
                                    else f" (factory code {factory_code_status.replace('_', ' ')})"
                                )
                                + f" is {availability['state']} for "
                                + f"{resolved_model['name']} {year}."
                            ),
                            confidence=(
                                "human_checked_palette_union"
                                if is_palette_union
                                else "human_checked_specialty_subset"
                                if is_specialty_subset
                                else "human_checked_qualified_historical_table"
                                if is_qualified_historical_table
                                else "source_transcribed"
                            ),
                            review_state=(
                                "reviewed_qualified_palette_union"
                                if is_palette_union
                                else "reviewed_specialty_palette_subset"
                                if is_specialty_subset
                                else "reviewed_qualified_historical_table"
                                if is_qualified_historical_table
                                else "verified"
                            ),
                        )

                for year in years:
                    model_year_id = f"{model_id}:{year}"
                    membership_key = (model_year_id, generation_id)
                    if membership_key in membership_keys:
                        raise ValueError(
                            f"duplicate model-year generation membership: "
                            f"{model_year_id} {generation_id}"
                        )
                    membership_keys.add(membership_key)
                    generation_source = generation["sources"].get(str(year))
                    generation_evidence_class = (
                        generation_source.get("evidenceClass")
                        if generation_source
                        else None
                    )
                    if generation_evidence_class is None:
                        if color_count_by_year[year] > 0:
                            generation_evidence_class = "governing_color_chart"
                        elif generation_source is not None:
                            generation_evidence_class = "source_linked_no_availability"
                        else:
                            generation_evidence_class = "catalog_only"
                    self.rows["model_year_generation_memberships"].append(
                        {
                            "model_year_generation_membership_id": stable_id(
                                "myg", model_year_id, generation_id
                            ),
                            "model_year_id": model_year_id,
                            "model_id": model_id,
                            "model_year": year,
                            "generation_id": generation_id,
                            "membership_role": "pending",
                            "evidence_class": generation_evidence_class,
                            "has_published_availability": color_count_by_year[year] > 0,
                            "published_availability_count": color_count_by_year[year],
                        }
                    )
                    matching_range = next(
                        item
                        for item in year_ranges
                        if int(item["start"]) <= year <= int(item["end"])
                    )
                    color_count = color_count_by_year[year]
                    evidence_classes = evidence_classes_by_year.get(year, set())
                    existing_classes = model_year_evidence_classes.get(
                        model_year_id, set()
                    )
                    combined_classes = existing_classes | evidence_classes
                    combined_color_count = color_count
                    if model_year_id in model_year_keys:
                        existing_row = next(
                            row
                            for row in self.rows["model_years"]
                            if row["model_year_id"] == model_year_id
                        )
                        is_exact_program_partition = (
                            model_year_id == "tahoe:2000"
                            and generation_id.startswith("tahoe:tahoe-2000-")
                            and existing_row["generation_id"].startswith(
                                "tahoe:tahoe-2000-"
                            )
                        )
                        if (
                            not combined_classes.intersection(
                                {
                                    "specialty_palette_subset",
                                    "qualified_historical_table",
                                }
                            )
                            and not is_exact_program_partition
                        ):
                            raise ValueError(
                                f"overlapping model-year generations: {model_year_id}"
                            )
                        combined_color_count += int(
                            existing_row["verified_color_count"]
                        )
                    governing_classes = combined_classes - {
                        "qualified_palette_union",
                        "specialty_palette_subset",
                        "qualified_historical_table",
                    }
                    audit_state = gap_audit_state_by_model_year.get(model_year_id)
                    if combined_color_count and (
                        audit_state == "reviewed_qualified_historical_table"
                        or "qualified_historical_table" in combined_classes
                    ):
                        status = "reviewed_qualified_historical_table"
                    elif combined_color_count and governing_classes:
                        status = "color_chart_verified"
                    elif (
                        combined_color_count
                        and "qualified_palette_union" in combined_classes
                    ):
                        status = "reviewed_qualified_palette_union"
                    elif (
                        combined_color_count
                        and "specialty_palette_subset" in combined_classes
                    ):
                        status = "reviewed_specialty_palette_subset"
                    elif audit_state == "source_reviewed_no_color_chart_found":
                        status = "official_kit_reviewed_no_color_table_found"
                    else:
                        status = "color_chart_unverified"
                    current_source_ids = source_ids_by_year.get(year, set())
                    combined_source_ids = (
                        model_year_source_ids.get(model_year_id, set())
                        | current_source_ids
                    )
                    model_year_evidence_classes[model_year_id] = combined_classes
                    model_year_source_ids[model_year_id] = combined_source_ids
                    if model_year_id in model_year_keys:
                        if existing_classes.issubset(
                            {
                                "specialty_palette_subset",
                                "qualified_historical_table",
                            }
                        ) and evidence_classes - {
                            "specialty_palette_subset",
                            "qualified_historical_table",
                        }:
                            existing_row["generation_id"] = generation_id
                        existing_row["research_status"] = status
                        existing_row["verified_color_count"] = combined_color_count
                        existing_row["evidence_source_count"] = len(combined_source_ids)
                        if (
                            generation["revisionNote"]
                            not in existing_row["research_note"]
                        ):
                            existing_row["research_note"] += (
                                " | " + generation["revisionNote"]
                            )
                        continue
                    model_year_keys.add(model_year_id)
                    self.rows["model_years"].append(
                        {
                            "model_year_id": model_year_id,
                            "model_id": model_id,
                            "model_year": year,
                            "generation_id": generation_id,
                            "platform_era_id": platform_for_year.get((model_id, year)),
                            "catalog_confidence": matching_range["confidence"],
                            "research_status": status,
                            "verified_color_count": combined_color_count,
                            "evidence_source_count": len(combined_source_ids),
                            "research_note": generation["revisionNote"],
                        }
                    )

        expected_catalog_years = sum(
            sum(int(r["end"]) - int(r["start"]) + 1 for r in m["model_year_ranges"])
            for m in self.catalog["models"]
        )
        if len(model_year_keys) != expected_catalog_years:
            raise ValueError(
                f"model-year reconciliation failed: {len(model_year_keys)} != {expected_catalog_years}"
            )
        primary_generation_by_model_year = {
            row["model_year_id"]: row["generation_id"]
            for row in self.rows["model_years"]
        }
        for membership in self.rows["model_year_generation_memberships"]:
            if (
                membership["generation_id"]
                == primary_generation_by_model_year[membership["model_year_id"]]
            ):
                membership["membership_role"] = "primary"
            elif membership["evidence_class"] == "specialty_palette_subset":
                membership["membership_role"] = "specialty_overlay"
            elif membership["evidence_class"] == "qualified_historical_table":
                membership["membership_role"] = "qualified_historical_overlay"
            elif membership["model_year_id"] == "tahoe:2000" and membership[
                "generation_id"
            ].startswith("tahoe:tahoe-2000-"):
                membership["membership_role"] = "program_partition"
            else:
                raise ValueError(
                    "non-primary model-year generation is not an explicit specialty "
                    "overlay or exact program partition: "
                    f"{membership['model_year_id']} "
                    f"{membership['generation_id']}"
                )

    def append_paint_scheme(
        self,
        *,
        model_id: str,
        model_year: int,
        package_code: str | None,
        package_name: str,
        body_style_scope: str | None,
        stripe_colors: str | None,
        d85_stripe_colors: str | None,
        interior_colors: str | None,
        wheel_flare_color: str | None,
        placement_note: str | None,
        restriction: str | None,
        source_note: str | None,
        source_annotation: str | None,
        source: dict[str, Any],
        primary: dict[str, Any],
        secondary: dict[str, Any],
    ) -> str:
        model_year_id = f"{model_id}:{model_year}"
        if not any(
            row["model_year_id"] == model_year_id for row in self.rows["model_years"]
        ):
            raise ValueError(f"paint scheme has no catalog model-year: {model_year_id}")
        model_name = next(
            row["name"] for row in self.rows["models"] if row["model_id"] == model_id
        )
        pages = pdf_pages_from_locator(source["locator"])
        if not pages:
            raise ValueError(
                f"paint scheme source has no machine-readable PDF page: {model_year_id}"
            )
        source_id = self.ensure_source(
            source["url"],
            source_id=source.get("source_id"),
            title=source["title"],
            publisher="General Motors",
            source_type="vehicle_information_kit",
            officiality="official",
        )
        paint_scheme_id = stable_id(
            "ps",
            model_id,
            model_year,
            package_code,
            package_name,
            body_style_scope,
            primary["code"],
            primary["name"],
            secondary["code"],
            secondary["name"],
            stripe_colors,
            d85_stripe_colors,
            interior_colors,
            wheel_flare_color,
            restriction,
            source_note,
            source_annotation,
        )
        self.rows["paint_schemes"].append(
            {
                "paint_scheme_id": paint_scheme_id,
                "model_year_id": model_year_id,
                "model_id": model_id,
                "model_year": model_year,
                "scheme_type": "two_tone",
                "package_code": package_code,
                "package_name": package_name,
                "body_style_scope": body_style_scope,
                "stripe_colors": stripe_colors,
                "d85_stripe_colors": d85_stripe_colors,
                "interior_colors": interior_colors,
                "wheel_flare_color": wheel_flare_color,
                "placement_note": placement_note,
                "restriction": restriction,
                "source_note": source_note,
                "source_annotation": source_annotation,
                "claim_status": "published_paint_scheme_transcription",
                "evidence_source_id": source_id,
                "evidence_source_revision_id": None,
                "evidence_chart": source["chart"],
                "evidence_locator": source["locator"],
                "pdf_pages": pages,
                "source_revision_label": source["revision"],
            }
        )
        for component_order, (component_role, component) in enumerate(
            (("primary", primary), ("secondary", secondary)), start=1
        ):
            component_note = source_note if component_role == "secondary" else None
            factory_code, factory_code_status = normalize_factory_code(
                component.get("code")
            )
            self.rows["paint_scheme_components"].append(
                {
                    "paint_scheme_component_id": stable_id(
                        "psc", paint_scheme_id, component_order, component_role
                    ),
                    "paint_scheme_id": paint_scheme_id,
                    "component_order": component_order,
                    "component_role": component_role,
                    "source_color_name": component["name"],
                    "normalized_color_name": re.sub(
                        r"[^a-z0-9]+", " ", component["name"].lower()
                    ).strip(),
                    "factory_code": factory_code,
                    "factory_code_status": factory_code_status,
                    "source_note": component_note,
                    "standalone_availability_asserted": False,
                }
            )
        self.add_source_link(
            source_id,
            claim_type="paint_scheme_evidence",
            entity_type="paint_scheme",
            entity_id=paint_scheme_id,
            model_id=model_id,
            model_year=model_year,
            year_start=model_year,
            year_end=model_year,
            locator=source["locator"],
            revision=source["revision"],
            claim_summary=(
                f"{model_year} Chevrolet {model_name} paint scheme: "
                f"{primary['name']} ({primary['code']}) primary with "
                f"{secondary['name']} ({secondary['code']}) secondary. "
                "The component roles do not establish standalone availability."
            ),
            confidence="human_transcribed_source_linked",
            review_state="verified",
        )
        return paint_scheme_id

    def build_paint_schemes(self) -> None:
        tahoe_count_before = len(self.rows["paint_schemes"])
        for year_record in self.tahoe_paint_schemes["years"]:
            combinations = year_record.get("two_tone_combinations") or []
            if not combinations:
                continue
            publication = year_record["publication"]
            source = {
                "title": publication["title"],
                "url": publication["url"],
                "chart": f"{publication['title']} two-tone availability chart",
                "locator": "; ".join(
                    publication.get("pages") or ["Official chart page"]
                ),
                "revision": (
                    publication.get("publication_date_note")
                    or publication.get("publication_date")
                    or "Model-year publication; chart date not printed"
                ),
            }
            for combination in combinations:
                self.append_paint_scheme(
                    model_id="tahoe",
                    model_year=int(year_record["year"]),
                    package_code=combination.get("scheme"),
                    package_name="Conventional Two-Tone",
                    body_style_scope=combination.get("body_style"),
                    stripe_colors=None,
                    d85_stripe_colors=None,
                    interior_colors=None,
                    wheel_flare_color=None,
                    placement_note=None,
                    restriction=combination.get("restriction"),
                    source_note=combination.get("source_anomaly"),
                    source_annotation=None,
                    source=source,
                    primary={
                        "name": combination["color_1"],
                        "code": combination["code_1"],
                    },
                    secondary={
                        "name": combination["color_2"],
                        "code": combination["code_2"],
                    },
                )
        tahoe_count = len(self.rows["paint_schemes"]) - tahoe_count_before
        if tahoe_count != 184:
            raise ValueError(
                f"Tahoe paint-scheme audit count drifted: {tahoe_count} != 184"
            )

        scheme_sets = {
            item["scheme_set_id"]: item
            for item in self.suburban_paint_schemes["scheme_sets"]
        }
        suburban_count_before = len(self.rows["paint_schemes"])
        for year_record in self.suburban_paint_schemes["years"]:
            scheme_set = scheme_sets[year_record["scheme_set_id"]]
            for scheme in expand_suburban_scheme_set(
                self.suburban_paint_schemes, scheme_set
            ):
                paint_scheme_id = self.append_paint_scheme(
                    model_id="suburban",
                    model_year=int(year_record["year"]),
                    package_code=year_record.get("package_code"),
                    package_name=year_record["package_name"],
                    body_style_scope=year_record.get("body_style_scope"),
                    stripe_colors=scheme.get("stripe_colors"),
                    d85_stripe_colors=scheme.get("d85_stripe_colors"),
                    interior_colors=scheme.get("interior_colors"),
                    wheel_flare_color=scheme.get("wheel_flare_color"),
                    placement_note=year_record.get("placement_note"),
                    restriction=scheme.get("restriction"),
                    source_note=scheme.get("source_note"),
                    source_annotation=scheme.get("source_annotation"),
                    source=year_record["source"],
                    primary=scheme["primary"],
                    secondary=scheme["secondary"],
                )
                for corroborating in year_record.get("corroborating_sources") or []:
                    corroborating_source_id = self.ensure_source(
                        corroborating["url"],
                        source_id=corroborating.get("source_id"),
                        publisher="General Motors",
                        source_type="vehicle_information_kit",
                        officiality="official",
                    )
                    self.add_source_link(
                        corroborating_source_id,
                        claim_type="corroborating_paint_scheme_evidence",
                        entity_type="paint_scheme",
                        entity_id=paint_scheme_id,
                        model_id="suburban",
                        model_year=int(year_record["year"]),
                        year_start=int(year_record["year"]),
                        year_end=int(year_record["year"]),
                        locator=corroborating["locator"],
                        revision=year_record["source"]["revision"],
                        claim_summary=corroborating["note"],
                        confidence="human_transcribed_source_linked",
                        review_state="verified_corroboration",
                    )
        suburban_count = len(self.rows["paint_schemes"]) - suburban_count_before
        if suburban_count != 1185:
            raise ValueError(
                f"Suburban paint-scheme audit count drifted: {suburban_count} != 1185"
            )

        if len(self.rows["paint_scheme_components"]) != 2 * len(
            self.rows["paint_schemes"]
        ):
            raise ValueError(
                "paint schemes must retain exactly primary and secondary components"
            )

    def build_research_inventory(self) -> None:
        rank = {
            "dedicated": 1,
            "related_line": 2,
            "generic_full_line": 3,
        }
        expected_model_year_ids = {
            row["model_year_id"] for row in self.rows["model_years"]
        }
        model_year_rows = {
            row["model_year_id"]: row for row in self.rows["model_years"]
        }
        availability_by_model_year: dict[str, list[dict[str, Any]]] = {}
        for availability in self.rows["color_availability"]:
            availability_by_model_year.setdefault(
                availability["model_year_id"], []
            ).append(availability)
        seen_model_year_ids: set[str] = set()
        seen_candidates: set[str] = set()
        for item in self.gap_inventory["model_years"]:
            model_year_id = item["model_year_key"]
            if model_year_id not in expected_model_year_ids:
                raise ValueError(
                    f"gap inventory has unknown model-year: {model_year_id}"
                )
            if model_year_id in seen_model_year_ids:
                raise ValueError(f"gap inventory repeats model-year: {model_year_id}")
            seen_model_year_ids.add(model_year_id)
            model_year = model_year_rows[model_year_id]
            availability_rows = availability_by_model_year.get(model_year_id, [])
            audit_state = item["audit_state"]
            color_chart_reviewed = bool(item["color_chart_reviewed"])
            completely_reviewed_color_chart = bool(
                item["completely_reviewed_color_chart"]
            )
            audit_note = item.get("audit_note")
            if model_year["research_status"] == "reviewed_qualified_palette_union":
                audit_state = "reviewed_qualified_palette_union"
                color_chart_reviewed = True
                completely_reviewed_color_chart = False
                audit_note = (
                    "Official GM Fleet Guide palette union visually checked against "
                    "the cited pages. Exterior colors vary by trim; the Online Order "
                    "Guide remains controlling for option codes and restrictions."
                )
            elif model_year["research_status"] == "reviewed_specialty_palette_subset":
                audit_state = "reviewed_specialty_palette_subset"
                color_chart_reviewed = True
                completely_reviewed_color_chart = False
                audit_note = (
                    "Exact General Motors specialty-paint evidence was visually checked "
                    "for the cited model variant. The published restricted listing is a "
                    "subset, not a complete model-year exterior-color palette."
                )
            current_source = item.get("current_app_source")
            current_source_id = None
            current_source_url = None
            current_source_id = primary_evidence_source_id(availability_rows)
            if current_source_id:
                current_source_url = self.source_id_to_url[current_source_id]
            elif current_source:
                current_source_url = canonical_url(current_source["url"])
                current_source_id = self.ensure_source(
                    current_source_url,
                    publisher="General Motors",
                    officiality="official",
                    source_type="vehicle_information_kit",
                )
            self.rows["model_year_research"].append(
                {
                    "model_year_id": model_year_id,
                    "audit_state": audit_state,
                    "color_chart_reviewed": color_chart_reviewed,
                    "completely_reviewed_color_chart": completely_reviewed_color_chart,
                    "audit_note": audit_note,
                    "exact_listing_count": len(availability_rows),
                    "listed_count": sum(
                        row["availability_state"] == "listed"
                        for row in availability_rows
                    ),
                    "restricted_count": sum(
                        row["availability_state"] == "restricted"
                        for row in availability_rows
                    ),
                    "other_availability_state_count": sum(
                        row["availability_state"] not in {"listed", "restricted"}
                        for row in availability_rows
                    ),
                    "likely_source_availability": item["likely_source_availability"],
                    "official_source_record_count": int(
                        item["official_source_record_count"]
                    ),
                    "crawler_source_record_count": int(
                        item["crawler_source_record_count"]
                    ),
                    "crawler_color_candidate_count": int(
                        item["crawler_color_candidate_count"]
                    ),
                    "crawler_candidate_state": item["crawler_candidate_state"],
                    "catalog_official_evidence_count": len(
                        item["catalog_official_evidence_urls"]
                    ),
                    "catalog_nonofficial_evidence_count": len(
                        item["catalog_nonofficial_evidence_urls"]
                    ),
                    "current_app_source_id": current_source_id,
                }
            )
            for source in item["official_source_records"]:
                source_url = source["pdf_url"]
                source_officiality = normalized_officiality(
                    source.get("officiality") or "official"
                )
                document_authority = source.get("document_authority")
                retrieval_host_type = source.get("retrieval_host_type")
                artifact_relpath = source.get("artifact_relpath")
                source_http_status = source.get("http_status")
                source_content_type = source.get("content_type")
                source_content_length = source.get("content_length_bytes")
                source_content_sha256 = source.get("artifact_sha256")
                modern_manifest_source = self.modern_color_sources_by_id.get(
                    source["crawler_source_id"]
                )
                if source.get("source_type") == "fleet_guide_pdf":
                    if modern_manifest_source is None:
                        raise ValueError(
                            "Fleet Guide candidate is absent from the retained-source "
                            f"manifest: {source['crawler_source_id']}"
                        )
                    source_url = modern_manifest_source["retrieval_url"]
                    (
                        source_officiality,
                        document_authority,
                        retrieval_host_type,
                    ) = modern_source_classification(modern_manifest_source)
                    artifact_relpath = modern_manifest_source.get("local_file_path")
                    source_http_status = modern_manifest_source.get("http_status")
                    source_content_type = modern_manifest_source.get("content_type")
                    source_content_length = modern_manifest_source.get("bytes")
                    source_content_sha256 = modern_manifest_source.get("sha256")
                source_id = self.ensure_source(
                    source_url,
                    source_id=source["crawler_source_id"],
                    title=(
                        source["title"]
                        if source.get("source_type")
                        else f"{source['title']} Vehicle Information Kit"
                    ),
                    publisher=source.get("publisher") or "General Motors",
                    source_type=source.get("source_type") or "vehicle_information_kit",
                    officiality=source_officiality,
                    document_authority=document_authority,
                    retrieval_host_type=retrieval_host_type,
                    http_status=source_http_status,
                    content_type=source_content_type,
                    content_length_bytes=source_content_length,
                    content_sha256=source_content_sha256,
                    archive_relpath=artifact_relpath,
                )
                relation = source["relation"]
                candidate_id = stable_id("mys", model_year_id, source_id, relation)
                if candidate_id in seen_candidates:
                    raise ValueError(
                        f"duplicate model-year source candidate: {candidate_id}"
                    )
                seen_candidates.add(candidate_id)
                if current_source_url == canonical_url(source_url):
                    candidate_status = "governing_source_reviewed"
                elif (
                    audit_state == "source_reviewed_no_color_chart_found"
                    and item.get("reviewed_no_chart_source")
                    and canonical_url(item["reviewed_no_chart_source"]["url"])
                    == canonical_url(source_url)
                ):
                    candidate_status = "source_reviewed_no_color_chart_found"
                elif audit_state == "source_located_chart_unreviewed":
                    candidate_status = "source_located_chart_unreviewed"
                else:
                    candidate_status = "retrieval_candidate_unreviewed"
                self.rows["model_year_source_candidates"].append(
                    {
                        "source_candidate_link_id": candidate_id,
                        "model_year_id": model_year_id,
                        "model_id": item["model_id"],
                        "model_year": int(item["model_year"]),
                        "source_id": source_id,
                        "relation": relation,
                        "candidate_rank": rank[relation],
                        "candidate_status": candidate_status,
                        "source_title": source["title"],
                        "source_model_label": source["model_label"],
                        "source_years": [int(year) for year in source["years"]],
                        "http_status": source_http_status,
                        "content_type": source_content_type,
                        "content_length_bytes": source_content_length,
                    }
                )
                self.add_source_link(
                    source_id,
                    claim_type="model_year_source_candidate",
                    entity_type="model_year_source_candidate",
                    entity_id=candidate_id,
                    model_id=item["model_id"],
                    model_year=int(item["model_year"]),
                    year_start=int(item["model_year"]),
                    year_end=int(item["model_year"]),
                    locator=source["title"],
                    claim_summary=(
                        f"{relation.replace('_', ' ')} official-source retrieval lead for "
                        f"{item['model_name']} {item['model_year']}"
                    ),
                    confidence=(
                        "retrieval_lead"
                        if candidate_status.endswith("unreviewed")
                        else "reviewed"
                    ),
                    review_state=candidate_status,
                )
        if seen_model_year_ids != expected_model_year_ids:
            missing = sorted(expected_model_year_ids - seen_model_year_ids)
            raise ValueError(f"gap inventory omits model-years: {missing[:5]}")

    def build_photos(self) -> None:
        color_lookup = {
            (row["model_id"], row["archive_color_key"]): row["color_identity_id"]
            for row in self.rows["color_identities"]
        }
        for asset in self.photos["assets"]:
            page_source_id = self.ensure_source(
                asset["source_page_url"],
                title=f"Wikimedia Commons file page: {asset['original_filename']}",
                publisher="Wikimedia Commons",
                source_type="media_description_page",
                officiality="secondary",
                retrieved_on=self.photos["generated_at"],
            )
            original_source_id = self.ensure_source(
                asset["source_original_url"],
                title=asset["original_filename"],
                publisher="Wikimedia Commons",
                source_type="media_original",
                officiality="secondary",
                retrieved_on=self.photos["generated_at"],
                content_type=asset["mime"],
                content_length_bytes=int(asset["bytes"]),
                content_sha256=asset["sha256"],
            )
            archive_source_id = self.ensure_source(
                asset["release_asset_url"],
                title=f"Archived photo: {asset['release_asset_name']}",
                publisher="Chevrolet Color Archive on GitHub",
                source_type="archive_mirror",
                officiality="licensed",
                retrieved_on=self.photos["generated_at"],
                content_type=asset["mime"],
                content_length_bytes=int(asset["bytes"]),
                content_sha256=asset["sha256"],
                archive_url=asset["release_asset_url"],
            )
            preview_archive_source_id = self.ensure_source(
                asset["preview_release_asset_url"],
                title=f"Archived web preview: {asset['preview_release_asset_name']}",
                publisher="Chevrolet Color Archive on GitHub",
                source_type="archive_preview",
                officiality="licensed",
                retrieved_on=self.photos["generated_at"],
                content_type=asset["preview_mime"],
                content_length_bytes=int(asset["preview_bytes"]),
                content_sha256=asset["preview_sha256"],
                archive_url=asset["preview_release_asset_url"],
            )
            license_source_id = self.ensure_source(
                asset["license_url"],
                title=f"License terms: {asset['license']}",
                publisher=urlsplit(asset["license_url"]).hostname or "",
                source_type="license_terms",
                officiality="secondary",
                retrieved_on=self.photos["generated_at"],
            )
            self.rows["photo_assets"].append(
                {
                    "photo_id": asset["candidate_id"],
                    "review_status": asset["status"],
                    "source_page_source_id": page_source_id,
                    "source_original_source_id": original_source_id,
                    "archive_source_id": archive_source_id,
                    "preview_archive_source_id": preview_archive_source_id,
                    "source_page_url": canonical_url(asset["source_page_url"]),
                    "source_original_url": canonical_url(asset["source_original_url"]),
                    "archive_url": canonical_url(asset["release_asset_url"]),
                    "preview_archive_url": (
                        canonical_url(asset["preview_release_asset_url"])
                        if asset.get("preview_release_asset_url")
                        else None
                    ),
                    "author": asset["author"],
                    "credit": asset["credit"],
                    "license": asset["license"],
                    "license_url": canonical_url(asset["license_url"]),
                    "attribution": asset["attribution"],
                    "description": asset.get("description"),
                    "source_timestamp": asset.get("source_timestamp"),
                    "sha256": asset["sha256"],
                    "commons_sha1": asset.get("commons_sha1"),
                    "mime": asset["mime"],
                    "width": int(asset["width"]),
                    "height": int(asset["height"]),
                    "byte_length": int(asset["bytes"]),
                    "release_tag": asset["release_tag"],
                    "release_asset_name": asset["release_asset_name"],
                }
            )
            for source_id, claim_type, summary in (
                (
                    page_source_id,
                    "photo_metadata_and_attribution",
                    "Commons file-description metadata",
                ),
                (
                    original_source_id,
                    "photo_original_bytes",
                    "Commons original media bytes",
                ),
                (
                    archive_source_id,
                    "photo_archive_copy",
                    "Pinned GitHub Release archive copy",
                ),
                (
                    preview_archive_source_id,
                    "photo_archive_preview",
                    "Pinned GitHub Release web preview",
                ),
                (license_source_id, "photo_license_terms", asset["license"]),
            ):
                self.add_source_link(
                    source_id,
                    claim_type=claim_type,
                    entity_type="photo_asset",
                    entity_id=asset["candidate_id"],
                    claim_summary=summary,
                    confidence="manifest_recorded",
                    review_state=asset["status"],
                )
            for context in asset["selection_contexts"]:
                model_id = context["model_id"]
                year = context.get("exact_year")
                evidence = context.get("explicit_year_evidence") or context.get(
                    "legacy_note"
                )
                link_id = stable_id(
                    "mph",
                    asset["candidate_id"],
                    model_id,
                    year,
                    context["kind"],
                    context.get("legacy_id"),
                )
                self.rows["model_photo_links"].append(
                    {
                        "model_photo_link_id": link_id,
                        "photo_id": asset["candidate_id"],
                        "model_id": model_id,
                        "model_year": int(year) if year is not None else None,
                        "selection_kind": context["kind"],
                        "identification_status": asset["status"],
                        "evidence": evidence,
                    }
                )
                archive_color_key = context.get("color_id") or context.get(
                    "legacy_color_id"
                )
                if archive_color_key and year is not None:
                    color_identity_id = color_lookup.get((model_id, archive_color_key))
                    self.rows["photo_color_links"].append(
                        {
                            "photo_color_link_id": stable_id(
                                "pcl",
                                asset["candidate_id"],
                                model_id,
                                year,
                                archive_color_key,
                            ),
                            "photo_id": asset["candidate_id"],
                            "model_id": model_id,
                            "model_year": int(year),
                            "archive_color_key": archive_color_key,
                            "color_identity_id": color_identity_id,
                            "visual_review_status": context.get("legacy_prior_status")
                            or "candidate",
                            "factory_paint_match_status": "unverified",
                            "note": context.get("legacy_note"),
                        }
                    )

    def build_document_references(self) -> None:
        files: set[Path] = set()
        for pattern in (
            "docs/source-audit-*.md",
            "docs/specialty-color-source-audit.md",
            "docs/model-catalog-audit.md",
            "docs/platform-era-audit.md",
            "docs/commons-release-photo-archive.md",
            "docs/photo-audit-*.md",
            "data/sources/README.md",
        ):
            files.update(ROOT.glob(pattern))
        for path in sorted(files):
            relative = path.relative_to(ROOT).as_posix()
            for line_number, line in enumerate(
                path.read_text(encoding="utf-8").splitlines(), 1
            ):
                for match in URL_PATTERN.finditer(line):
                    url = canonical_url(match.group(0))
                    source_id = self.ensure_source(url)
                    self.add_source_link(
                        source_id,
                        claim_type="research_document_reference",
                        entity_type="research_document",
                        entity_id=relative,
                        locator=f"line {line_number}",
                        claim_summary=f"Source link cited in {relative}",
                        confidence="documented_reference",
                        review_state="documented",
                    )

    def build_data_file_references(self) -> None:
        def walk(value: Any, pointer: str = "$"):
            if isinstance(value, dict):
                for key, child in value.items():
                    yield from walk(child, f"{pointer}.{key}")
            elif isinstance(value, list):
                for index, child in enumerate(value):
                    yield from walk(child, f"{pointer}[{index}]")
            elif isinstance(value, str):
                for match in URL_PATTERN.finditer(html.unescape(value)):
                    yield pointer, match.group(0)

        paths = [
            *sorted((ROOT / "data" / "catalog").glob("*.json")),
            *sorted((ROOT / "data" / "audits").glob("*.json")),
            *sorted((ROOT / "data" / "photos").glob("*.json")),
            *sorted(
                path
                for path in (ROOT / "data" / "sources").glob("*.json")
                if path.name != SOURCE_REGISTRY_PATH.name
            ),
        ]
        for path in paths:
            relative = path.relative_to(ROOT).as_posix()
            for pointer, raw_url in walk(json_load(path)):
                url = canonical_url(raw_url)
                source_id = self.ensure_source(url)
                self.add_source_link(
                    source_id,
                    claim_type="data_file_reference",
                    entity_type="data_file",
                    entity_id=relative,
                    locator=pointer,
                    claim_summary=f"Source or archive link recorded in {relative}",
                    confidence="manifest_recorded",
                    review_state="documented",
                )

    def finalize_sources(self) -> None:
        counts = Counter(row["source_id"] for row in self.rows["source_links"])
        self.rows["sources"] = []
        for url in sorted(self.sources_by_url):
            row = dict(self.sources_by_url[url])
            row["citation_count"] = counts[row["source_id"]]
            validate_source_classification(row)
            self.rows["sources"].append(row)

    def validate_brochure_release_revisions(self) -> None:
        if not getattr(self, "brochure_release_source_ids_by_asset", None):
            return
        entries = self.brochure_source_release_manifest["entries"]
        if len(self.brochure_release_source_ids_by_asset) != len(entries):
            raise ValueError(
                "not every brochure source Release asset has a normalized source"
            )
        source_by_id = {row["source_id"]: row for row in self.rows["sources"]}
        revisions_by_source_id: dict[str, list[dict[str, Any]]] = {}
        for row in self.rows["source_revisions"]:
            revisions_by_source_id.setdefault(row["source_id"], []).append(row)
        links_by_entity_and_type = {
            (row["entity_id"], row["claim_type"]): row
            for row in self.rows["source_links"]
            if row["entity_type"] == "brochure_release_asset"
        }
        release_tag = self.brochure_source_release_manifest["release_tag"]

        for entry in entries:
            asset_name = entry["asset_name"]
            source_id = self.brochure_release_source_ids_by_asset[asset_name]
            source = source_by_id[source_id]
            matching_revisions = revisions_by_source_id.get(source_id) or []
            if len(matching_revisions) != 1:
                raise ValueError(
                    "brochure source Release asset does not have exactly one immutable "
                    f"revision: {asset_name}"
                )
            revision = matching_revisions[0]
            media_type = release_asset_media_type(asset_name)
            archive_url = canonical_url(entry["archive_url"])
            expected_page_count = entry.get("pdf_page_count")
            if expected_page_count is not None:
                expected_page_count = int(expected_page_count)
            expected_source_values = {
                "canonical_url": archive_url,
                "archive_url": archive_url,
                "content_sha256": entry["sha256"],
                "content_length_bytes": int(entry["bytes"]),
                "content_type": media_type,
            }
            for field, expected in expected_source_values.items():
                if source.get(field) != expected:
                    raise ValueError(
                        "brochure source Release source metadata mismatch for "
                        f"{asset_name}: {field}"
                    )
            expected_revision_values = {
                "artifact_sha256": entry["sha256"],
                "byte_length": int(entry["bytes"]),
                "media_type": media_type,
                "pdf_page_count": expected_page_count,
                "archive_url": archive_url,
                "integrity_status": "release_manifest_hash_recorded",
                "is_current": True,
            }
            for field, expected in expected_revision_values.items():
                if revision.get(field) != expected:
                    raise ValueError(
                        "brochure source Release revision metadata mismatch for "
                        f"{asset_name}: {field}"
                    )
            try:
                source_metadata = json.loads(source["notes"])
            except (TypeError, json.JSONDecodeError) as exc:
                raise ValueError(
                    f"brochure source Release metadata is not structured: {asset_name}"
                ) from exc
            if (
                source_metadata.get("asset_name") != asset_name
                or source_metadata.get("release_tag") != release_tag
                or source_metadata.get("role") != entry["role"]
            ):
                raise ValueError(
                    f"brochure source Release role metadata mismatch: {asset_name}"
                )

            entity_id = f"{release_tag}:{asset_name}"
            expected_relations = {
                "retained_release_asset": archive_url,
                "original_source_url": entry.get("original_source_url"),
                "retrieval_url": entry.get("retrieval_url"),
                "parent_source_url": entry.get("parent_source_url"),
            }
            for claim_type, expected_url in expected_relations.items():
                if not expected_url:
                    continue
                link = links_by_entity_and_type.get((entity_id, claim_type))
                if link is None:
                    raise ValueError(
                        "brochure source Release provenance link is missing for "
                        f"{asset_name}: {claim_type}"
                    )
                linked_source = source_by_id[link["source_id"]]
                if linked_source["canonical_url"] != canonical_url(expected_url):
                    raise ValueError(
                        "brochure source Release provenance link targets the wrong URL "
                        f"for {asset_name}: {claim_type}"
                    )
            if entry.get("source_id"):
                original_link = links_by_entity_and_type[
                    (entity_id, "original_source_url")
                ]
                if original_link["source_id"] != entry["source_id"]:
                    raise ValueError(
                        "brochure source Release upstream source ID was not preserved: "
                        f"{asset_name}"
                    )

    def build_source_revisions_and_claims(self) -> None:
        gm_artifacts = {
            item["source_id"]: item for item in self.gm_artifacts["entries"]
        }
        modern_artifacts = {
            item["source_id"]: item
            for item in self.modern_color_sources["sources"]
            if item.get("local_file_path")
        }
        retained_fleet_guides = {
            source_id
            for source_id, item in modern_artifacts.items()
            if item.get("source_type") == "fleet_guide_pdf"
        }
        if len(retained_fleet_guides) != 19:
            raise ValueError(
                "source revisions require all 19 retained Fleet Guide artifacts"
            )
        missing_qualified_palettes = sorted(
            QUALIFIED_MODERN_PALETTE_SOURCE_IDS - set(modern_artifacts)
        )
        if missing_qualified_palettes:
            raise ValueError(
                "source revisions require all published modern palette artifacts: "
                f"{missing_qualified_palettes}"
            )
        revision_ids: dict[str, str] = {}
        for source in self.rows["sources"]:
            artifact_sha256 = source.get("content_sha256")
            byte_length = source.get("content_length_bytes")
            if not artifact_sha256 or byte_length is None:
                continue
            source_id = source["source_id"]
            source_revision_id = stable_id("rev", source_id, artifact_sha256)
            revision_ids[source_id] = source_revision_id
            gm_artifact = gm_artifacts.get(source_id)
            modern_artifact = modern_artifacts.get(source_id)
            specialty_artifact = self.specialty_artifacts_by_url.get(
                source["canonical_url"]
            )
            release_artifact = getattr(
                self, "brochure_release_entries_by_source_id", {}
            ).get(source_id)
            media_type = source.get("content_type") or (
                "application/pdf"
                if source["canonical_url"].lower().endswith(".pdf")
                else "application/octet-stream"
            )
            self.rows["source_revisions"].append(
                {
                    "source_revision_id": source_revision_id,
                    "source_id": source_id,
                    "artifact_sha256": artifact_sha256,
                    "byte_length": int(byte_length),
                    "media_type": media_type,
                    "retrieved_at": (
                        gm_artifact.get("completed_at")
                        if gm_artifact
                        else modern_artifact.get("retrieved_at")
                        if modern_artifact
                        else specialty_artifact.get("retrieved_at")
                        if specialty_artifact
                        else self.brochure_source_release_manifest.get("captured_at")
                        if release_artifact
                        else source.get("retrieved_on")
                    ),
                    "http_status": source.get("http_status"),
                    "etag": gm_artifact.get("etag") if gm_artifact else None,
                    "last_modified": source.get("last_modified"),
                    "pdf_page_count": (
                        int(gm_artifact["pdf_page_count"])
                        if gm_artifact and gm_artifact.get("pdf_page_count") is not None
                        else int(modern_artifact["page_count"])
                        if modern_artifact
                        else int(specialty_artifact["pdf_page_count"])
                        if specialty_artifact
                        and specialty_artifact.get("pdf_page_count") is not None
                        else int(release_artifact["pdf_page_count"])
                        if release_artifact
                        and release_artifact.get("pdf_page_count") is not None
                        else self.source_pdf_page_counts.get(source_id)
                    ),
                    "artifact_relpath": (
                        modern_artifact.get("local_file_path")
                        if modern_artifact
                        else source.get("archive_relpath")
                    ),
                    "archive_url": source.get("archive_url"),
                    "integrity_status": (
                        "complete_file_rehashed"
                        if gm_artifact or modern_artifact or specialty_artifact
                        else "release_manifest_hash_recorded"
                        if release_artifact
                        else "published_manifest_hash_recorded"
                    ),
                    "is_current": True,
                }
            )

        missing_modern_revisions = sorted(set(modern_artifacts) - set(revision_ids))
        if missing_modern_revisions:
            raise ValueError(
                "retained modern sources lack immutable source revisions: "
                f"{missing_modern_revisions}"
            )
        self.validate_brochure_release_revisions()

        for paint_scheme in self.rows["paint_schemes"]:
            source_id = paint_scheme["evidence_source_id"]
            source_revision_id = revision_ids.get(source_id)
            if source_revision_id is None:
                raise ValueError(
                    f"verified paint scheme lacks an immutable source revision: "
                    f"{paint_scheme['paint_scheme_id']}"
                )
            paint_scheme["evidence_source_revision_id"] = source_revision_id

        for availability in self.rows["color_availability"]:
            source_id = availability["evidence_source_id"]
            source_revision_id = revision_ids.get(source_id)
            if source_revision_id is None:
                raise ValueError(
                    f"verified availability lacks an immutable source revision: "
                    f"{availability['availability_id']}"
                )
            pages = pdf_pages_from_locator(availability["evidence_locator"])
            revision = next(
                row
                for row in self.rows["source_revisions"]
                if row["source_revision_id"] == source_revision_id
            )
            if pages:
                evidence_locator_type = "pdf_page"
            elif str(revision["media_type"]).startswith("image/"):
                evidence_locator_type = "image_region"
            else:
                raise ValueError(
                    f"verified availability has no machine-readable evidence locator: "
                    f"{availability['availability_id']}"
                )
            evidence_claim_id = stable_id(
                "clm",
                availability["availability_id"],
                source_revision_id,
                availability["evidence_locator"],
                availability["source_revision"],
            )
            self.rows["evidence_claims"].append(
                {
                    "evidence_claim_id": evidence_claim_id,
                    "availability_id": availability["availability_id"],
                    "source_id": source_id,
                    "source_revision_id": source_revision_id,
                    "model_id": availability["model_id"],
                    "model_year": int(availability["model_year"]),
                    "color_identity_id": availability["color_identity_id"],
                    "transcribed_color_name": availability["source_color_name"],
                    "transcribed_factory_code": availability["factory_code"],
                    "transcribed_factory_code_status": availability[
                        "factory_code_status"
                    ],
                    "transcribed_touch_up_code": availability.get("touch_up_code"),
                    "transcribed_rpo_code": availability.get("rpo_code"),
                    "transcribed_seo_code": availability.get("seo_code"),
                    "transcribed_seo_code_status": availability.get(
                        "seo_code_status"
                    ),
                    "transcribed_source_seo_code_raw": availability.get(
                        "source_seo_code_raw"
                    ),
                    "transcribed_source_seo_code_cell_state": availability.get(
                        "source_seo_code_cell_state"
                    ),
                    "transcribed_wa_code": availability.get("wa_code"),
                    "transcribed_source_wa_code_raw": availability.get(
                        "source_wa_code_raw"
                    ),
                    "transcribed_source_wa_code_cell_state": availability.get(
                        "source_wa_code_cell_state"
                    ),
                    "transcribed_upfitter_code_1": availability.get(
                        "upfitter_code_1"
                    ),
                    "transcribed_upfitter_code_2": availability.get(
                        "upfitter_code_2"
                    ),
                    "transcribed_upfitter_solid_color_option": availability.get(
                        "upfitter_solid_color_option"
                    ),
                    "transcribed_upfitter_two_tone_color_option": availability.get(
                        "upfitter_two_tone_color_option"
                    ),
                    "minimum_batch_units": availability.get("minimum_batch_units"),
                    "factory_installation_claim": availability.get(
                        "factory_installation_claim"
                    ),
                    "availability_state": availability["availability_state"],
                    "restriction": availability.get("restriction"),
                    "chart_title": availability["evidence_chart"],
                    "source_locator": availability["evidence_locator"],
                    "evidence_locator_type": evidence_locator_type,
                    "pdf_pages": pages,
                    "source_revision_label": availability["source_revision"],
                    "verification_status": (
                        "human_checked_qualified_palette_union"
                        if availability["claim_status"]
                        == "published_qualified_palette_union"
                        else "human_checked_specialty_palette_subset"
                        if availability["claim_status"]
                        == "published_specialty_palette_subset"
                        else "human_checked_qualified_historical_table"
                        if availability["claim_status"]
                        == "published_qualified_historical_table"
                        else "human_transcribed_source_linked"
                    ),
                }
            )

    def build_secondary_paint_leads(self) -> None:
        """Normalize the RockAuto ledger without creating factory-availability rows."""
        ledger = self.rockauto_paint_code_leads
        source = ledger["source"]
        policy = ledger["publication_policy"]
        if source["officiality"] != "secondary":
            raise ValueError("RockAuto paint-code leads must remain secondary")
        if source["claim_type"] != "retailer_touchup_fitment_lead":
            raise ValueError("RockAuto paint-code lead claim type drifted")
        if policy["import_into_color_availability"]:
            raise ValueError("RockAuto leads cannot enter color_availability")
        if policy["import_into_public_model_year_routes"]:
            raise ValueError("RockAuto leads cannot enter public model-year routes")

        source_id = self.ensure_source(
            source["canonical_url"],
            source_id=source["source_id"],
            title="RockAuto Touch-Up Paint catalog",
            publisher=source["publisher"],
            source_type=source["source_type"],
            officiality=source["officiality"],
            retrieved_on=ledger["audit_observed_at"][:10],
            notes=" ".join(source["limitations"]),
        )
        if source_id != source["source_id"]:
            raise ValueError("RockAuto source ID was not preserved exactly")

        configurations = {
            row["catalog_configuration_id"]: row for row in ledger["configurations"]
        }
        products = {row["product_id"]: row for row in ledger["products"]}
        fitments = {row["fitment_id"]: row for row in ledger["fitments"]}

        for row in ledger["configurations"]:
            self.rows["secondary_catalog_configurations"].append(
                {"source_id": source_id, **row}
            )
            self.add_source_link(
                source_id,
                claim_type=source["claim_type"],
                entity_type="secondary_catalog_configuration",
                entity_id=row["catalog_configuration_id"],
                model_id=row["canonical_model_id"],
                model_year=row["canonical_model_year"],
                locator=row["listing_url"],
                revision=row["observed_at"],
                claim_summary=(
                    "Secondary retailer configuration observation only; not "
                    "Chevrolet factory color availability."
                ),
                confidence="secondary_retailer_observation",
                review_state="unverified_secondary_lead",
            )

        self.rows["secondary_paint_products"].extend(
            dict(row) for row in ledger["products"]
        )
        for row in ledger["fitments"]:
            if row["catalog_configuration_id"] not in configurations:
                raise ValueError(
                    f"RockAuto fitment lacks configuration: {row['fitment_id']}"
                )
            if row["product_id"] not in products:
                raise ValueError(f"RockAuto fitment lacks product: {row['fitment_id']}")
            self.rows["secondary_paint_fitments"].append(dict(row))

        for row in ledger["code_candidates"]:
            fitment = fitments.get(row["fitment_id"])
            product = products.get(row["product_id"])
            if fitment is None or product is None:
                raise ValueError(
                    f"RockAuto candidate is orphaned: {row['candidate_id']}"
                )
            if not product["has_explicit_paint_code"]:
                raise ValueError(
                    f"uncoded RockAuto product became a candidate: {row['candidate_id']}"
                )
            if row["verification_status"] != "unverified_secondary_lead":
                raise ValueError(
                    f"RockAuto candidate was promoted: {row['candidate_id']}"
                )
            if row["governing_official_source_id"] is not None:
                raise ValueError(
                    f"RockAuto candidate has unverified official corroboration: "
                    f"{row['candidate_id']}"
                )
            self.rows["color_code_crosswalk_candidates"].append(dict(row))
            self.add_source_link(
                source_id,
                claim_type=source["claim_type"],
                entity_type="color_code_crosswalk_candidate",
                entity_id=row["candidate_id"],
                model_id=row["canonical_model_id"],
                model_year=row["model_year"],
                locator=fitment["info_url"],
                revision=fitment["observed_at"],
                claim_summary=(
                    f"Unverified RockAuto retailer fitment lead for "
                    f"{row['retailer_color_label_raw']} ({row['paint_code_raw']}); "
                    "not Chevrolet factory availability."
                ),
                confidence="unverified_secondary_lead",
                review_state="official_corroboration_required",
            )

    def build_supplemental_color_mentions(self) -> None:
        """Preserve model-year color mentions that do not prove a complete palette."""
        for year_record in self.suburban_2000_2007_audit["years"]:
            supplemental = year_record["supplemental_colors"]
            if not supplemental:
                continue
            if year_record["audit_status"] != "supplemental_only":
                raise ValueError(
                    f"supplemental Suburban colors have an unexpected audit status: "
                    f"{year_record['year']}"
                )
            source = year_record.get("source")
            if not source:
                raise ValueError(
                    f"supplemental Suburban colors have no source: {year_record['year']}"
                )
            source_id = source["source_id"]
            if source_id not in self.source_id_to_url:
                raise ValueError(f"supplemental source is not registered: {source_id}")
            source_revision_id = stable_id("rev", source_id, source["artifact_sha256"])
            model_year = int(year_record["year"])
            model_year_id = f"suburban:{model_year}"
            for mention in supplemental:
                mention_id = stable_id(
                    "sup",
                    model_year_id,
                    mention["name"],
                    mention["evidence_class"],
                    mention["scope"],
                )
                self.rows["supplemental_color_mentions"].append(
                    {
                        "supplemental_mention_id": mention_id,
                        "model_year_id": model_year_id,
                        "model_id": "suburban",
                        "model_year": model_year,
                        "source_id": source_id,
                        "source_revision_id": source_revision_id,
                        "source_color_name": mention.get(
                            "source_literal_name", mention["name"]
                        ),
                        "factory_code": mention.get("factory_code"),
                        "factory_code_status": "not_printed_in_source",
                        "evidence_class": mention["evidence_class"],
                        "scope": mention["scope"],
                        "source_locator": source["page_locator"],
                        "pdf_pages": [int(page) for page in source["pdf_pages"]],
                        "source_revision_label": source["revision"],
                        "publication_status": "research_only_not_complete_palette",
                        "limitations": " ".join(year_record["limitations"]),
                    }
                )
                self.add_source_link(
                    source_id,
                    claim_type=mention["evidence_class"],
                    entity_type="supplemental_color_mention",
                    entity_id=mention_id,
                    model_id="suburban",
                    model_year=model_year,
                    locator=source["page_locator"],
                    revision=source["revision"],
                    claim_summary=(
                        f"Supplemental source-literal color mention for "
                        f"{mention['name']}; not a complete model-year palette."
                    ),
                    confidence="human_transcribed_source_linked",
                    review_state="supplemental_only",
                )

    def build(self) -> None:
        self.build_sources_first()
        self.apply_tracked_artifacts()
        self.apply_modern_artifacts()
        self.apply_crawler_artifacts()
        self.build_catalog_and_colors()
        self.build_paint_schemes()
        self.apply_specialty_artifacts()
        self.build_research_inventory()
        self.build_photos()
        self.apply_brochure_release_artifacts()
        self.build_document_references()
        self.build_data_file_references()
        self.build_secondary_paint_leads()
        self.build_supplemental_color_mentions()
        self.finalize_sources()
        self.build_source_revisions_and_claims()
        validate_normalized_rows(self.rows)


def write_outputs(builder: NormalizedArchiveBuilder) -> dict[str, Any]:
    validate_normalized_rows(builder.rows)
    PARQUET_ROOT.mkdir(parents=True, exist_ok=True)
    generated_at = utc_now()
    table_manifest: list[dict[str, Any]] = []
    for name, rows in builder.rows.items():
        primary_key = PRIMARY_KEYS[name]
        rows.sort(
            key=lambda row: tuple(
                "" if row.get(key) is None else str(row[key]) for key in primary_key
            )
        )
        table = pa.Table.from_pylist(rows, schema=SCHEMAS[name])
        metadata = dict(table.schema.metadata or {})
        metadata.update(
            {
                b"archive": b"Chevrolet Color Archive",
                b"schema_version": str(SCHEMA_VERSION).encode("ascii"),
                b"table": name.encode("utf-8"),
            }
        )
        table = table.replace_schema_metadata(metadata)
        path = PARQUET_ROOT / f"{name}.parquet"
        pq.write_table(
            table,
            path,
            compression="zstd",
            compression_level=9,
            use_dictionary=True,
            write_statistics=True,
            version="2.6",
        )
        table_manifest.append(
            {
                "table": name,
                "path": path.relative_to(ROOT).as_posix(),
                "rows": table.num_rows,
                "columns": table.num_columns,
                "sha256": sha256_file(path),
                "primary_key": primary_key,
                "foreign_keys": FOREIGN_KEYS.get(name, {}),
            }
        )

    coverage = {
        "models": len(builder.rows["models"]),
        "model_years": len(builder.rows["model_years"]),
        "model_year_generation_memberships": len(
            builder.rows["model_year_generation_memberships"]
        ),
        "platform_eras": len(builder.rows["platform_eras"]),
        "color_identities": len(builder.rows["color_identities"]),
        "verified_color_availability_rows": len(builder.rows["color_availability"]),
        "paint_schemes": len(builder.rows["paint_schemes"]),
        "paint_scheme_components": len(builder.rows["paint_scheme_components"]),
        "model_year_research_rows": len(builder.rows["model_year_research"]),
        "model_year_source_candidates": len(
            builder.rows["model_year_source_candidates"]
        ),
        "secondary_catalog_configurations": len(
            builder.rows["secondary_catalog_configurations"]
        ),
        "secondary_paint_products": len(builder.rows["secondary_paint_products"]),
        "supplemental_color_mentions": len(builder.rows["supplemental_color_mentions"]),
        "secondary_paint_fitments": len(builder.rows["secondary_paint_fitments"]),
        "color_code_crosswalk_candidates": len(
            builder.rows["color_code_crosswalk_candidates"]
        ),
        "color_chart_verified_model_years": sum(
            row["research_status"] == "color_chart_verified"
            for row in builder.rows["model_years"]
        ),
        "reviewed_qualified_historical_table_model_years": sum(
            row["research_status"] == "reviewed_qualified_historical_table"
            for row in builder.rows["model_years"]
        ),
        "reviewed_qualified_palette_union_model_years": sum(
            row["research_status"] == "reviewed_qualified_palette_union"
            for row in builder.rows["model_years"]
        ),
        "qualified_palette_union_availability_rows": sum(
            row["claim_status"] == "published_qualified_palette_union"
            for row in builder.rows["color_availability"]
        ),
        "qualified_historical_table_availability_rows": sum(
            row["claim_status"] == "published_qualified_historical_table"
            for row in builder.rows["color_availability"]
        ),
        "reviewed_specialty_palette_subset_model_years": sum(
            row["research_status"] == "reviewed_specialty_palette_subset"
            for row in builder.rows["model_years"]
        ),
        "specialty_palette_subset_model_years": len(
            {
                row["model_year_id"]
                for row in builder.rows["color_availability"]
                if row["claim_status"] == "published_specialty_palette_subset"
            }
        ),
        "specialty_palette_subset_availability_rows": sum(
            row["claim_status"] == "published_specialty_palette_subset"
            for row in builder.rows["color_availability"]
        ),
        "unverified_model_years": sum(
            row["research_status"] == "color_chart_unverified"
            for row in builder.rows["model_years"]
        ),
        "sources": len(builder.rows["sources"]),
        "source_revisions": len(builder.rows["source_revisions"]),
        "evidence_claims": len(builder.rows["evidence_claims"]),
        "source_links": len(builder.rows["source_links"]),
        "photo_assets": len(builder.rows["photo_assets"]),
        "photo_color_links": len(builder.rows["photo_color_links"]),
    }
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at,
        "archive": "Chevrolet Color Archive",
        "normalization_contract": (
            "Missing color rows mean unverified research coverage, not negative availability. "
            "Every published color availability row has one direct evidence_source_id. "
            "Qualified GM Fleet Guide palette unions, qualified historical-table subsets, "
            "and reviewed specialty-paint subsets remain distinct from complete governing "
            "charts. Exact simultaneous model programs "
            "remain separate generation memberships within one model-year. Missing factory codes are null "
            "and carry a controlled source-status value. RPO, SEO, literal SEO-cell state, "
            "normalized WA code, literal WA-cell state, authorized-upfitter order codes, "
            "minimum-batch, and factory-installation fields remain structured and source-linked. "
            "Paint schemes preserve primary and "
            "secondary components separately and never create standalone color availability. "
            "RockAuto retailer observations remain isolated in four secondary-lead tables and "
            "never create color availability or evidence claims."
        ),
        "coverage": coverage,
        "tables": table_manifest,
    }
    manifest_path = PARQUET_ROOT / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    registry = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at,
        "scope": (
            "Canonical source registry for catalog, platform, factory-color, photo, "
            "archive, license, and research-document citations."
        ),
        "source_count": len(builder.rows["sources"]),
        "source_link_count": len(builder.rows["source_links"]),
        "sources": builder.rows["sources"],
    }
    SOURCE_REGISTRY_PATH.write_text(
        json.dumps(registry, indent=2) + "\n", encoding="utf-8"
    )
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build normalized Chevrolet archive Parquet tables"
    )
    parser.add_argument(
        "--crawler-db",
        type=Path,
        help="Optional crawler SQLite database used to add immutable PDF hashes and byte lengths",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    crawler_db = args.crawler_db.resolve() if args.crawler_db else None
    builder = NormalizedArchiveBuilder(crawler_db=crawler_db)
    builder.build()
    manifest = write_outputs(builder)
    print(json.dumps(manifest["coverage"], sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
