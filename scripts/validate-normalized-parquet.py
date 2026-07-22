from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import pyarrow.parquet as pq
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PARQUET_ROOT = ROOT / "data" / "parquet"
ROCKAUTO_LEADS_PATH = ROOT / "data" / "sources" / "rockauto-paint-code-leads.json"
SPECIALTY_LEDGER_PATH = (
    ROOT / "data" / "sources" / "specialty-color-source-candidates.json"
)
SUBURBAN_2000_2007_AUDIT_PATH = ROOT / "data" / "audits" / "suburban-2000-2007.json"
URL_PATTERN = re.compile(r"https?://[^\s<>\"`]+")
PLACEHOLDER_SOURCE_HOSTS = {
    "example.com",
    "example.net",
    "example.org",
    "example.invalid",
}
FACTORY_CODE_STATUS_VALUES = {
    "explicit_none_in_source",
    "printed_in_source",
    "not_printed_in_source",
    "not_stated_in_source",
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
FACTORY_CODE_REJECTED_PLACEHOLDERS = {
    "missing",
    "n/a",
    "na",
    "none",
    "not available",
    "tbd",
    "unknown",
    "unavailable",
}
UNRESOLVED_FOREST_GREEN_LABEL_PATTERN = re.compile(
    r"\b(?:u\.?s\.?\s+)?forest service green\b|\bforestry green\b",
    re.IGNORECASE,
)
UNRESOLVED_FOREST_GREEN_IDENTIFIER_PATTERN = re.compile(r"(?<!\d)(?:14260|5032)(?!\d)")


def canonical_url(value: str) -> str:
    value = html.unescape(value).strip().rstrip(".,;:\\")
    while value.endswith(")") and value.count("(") < value.count(")"):
        value = value[:-1]
    parsed = urlsplit(value)
    return urlunsplit(
        (
            "https" if parsed.scheme == "http" else parsed.scheme,
            parsed.netloc.lower(),
            parsed.path,
            parsed.query,
            "",
        )
    )


def urls_in_json(value: Any):
    if isinstance(value, dict):
        for child in value.values():
            yield from urls_in_json(child)
    elif isinstance(value, list):
        for child in value:
            yield from urls_in_json(child)
    elif isinstance(value, str):
        for match in URL_PATTERN.finditer(html.unescape(value)):
            yield canonical_url(match.group(0))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def contains_unresolved_forest_green_identity(*values: Any) -> bool:
    return any(
        isinstance(value, str)
        and (
            UNRESOLVED_FOREST_GREEN_LABEL_PATTERN.search(value)
            or UNRESOLVED_FOREST_GREEN_IDENTIFIER_PATTERN.search(value)
        )
        for value in values
    )


def read_rows(table_name: str) -> list[dict]:
    return pq.read_table(PARQUET_ROOT / f"{table_name}.parquet").to_pylist()


def require_unique(rows: list[dict], key: str, table_name: str) -> set:
    values = [row[key] for row in rows]
    if any(value is None or value == "" for value in values):
        raise AssertionError(f"{table_name}.{key} contains a null or empty primary key")
    if len(values) != len(set(values)):
        duplicates = [value for value, count in Counter(values).items() if count > 1]
        raise AssertionError(f"{table_name}.{key} is not unique: {duplicates[:5]}")
    return set(values)


def require_fk(
    rows: list[dict],
    field: str,
    target: set,
    table_name: str,
    *,
    nullable: bool = False,
) -> None:
    missing = sorted(
        {
            row[field]
            for row in rows
            if row[field] is not None and row[field] not in target
        }
    )
    if missing:
        raise AssertionError(
            f"{table_name}.{field} has missing foreign keys: {missing[:5]}"
        )
    if not nullable and any(row[field] is None for row in rows):
        raise AssertionError(f"{table_name}.{field} unexpectedly contains null")


def require_factory_code_contract(
    rows: list[dict], table_name: str, code_field: str, status_field: str
) -> None:
    for row in rows:
        code = row[code_field]
        status = row[status_field]
        if status not in FACTORY_CODE_STATUS_VALUES:
            raise AssertionError(
                f"{table_name}.{status_field} contains unsupported value: {status!r}"
            )
        if code is None:
            if status == "printed_in_source":
                raise AssertionError(
                    f"{table_name}.{code_field} is null but claims a printed code"
                )
            continue
        normalized = re.sub(r"\s+", " ", str(code).strip().casefold())
        if (
            not str(code).strip()
            or normalized in FACTORY_CODE_REJECTED_PLACEHOLDERS
            or "not stated" in normalized
            or "not printed" in normalized
        ):
            raise AssertionError(
                f"{table_name}.{code_field} contains placeholder prose: {code!r}"
            )
        if status != "printed_in_source":
            raise AssertionError(
                f"{table_name}.{code_field} has a code but status is {status!r}"
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate normalized Chevrolet archive Parquet tables"
    )
    parser.add_argument(
        "--secondary-leads-only",
        action="store_true",
        help="Stop after schema, key, and exact-ledger checks for secondary leads",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest = json.loads((PARQUET_ROOT / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("schema_version") != 9:
        raise AssertionError("normalized Parquet manifest must use schema version 9")
    tables = {item["table"]: item for item in manifest["tables"]}
    required_paint_tables = {"paint_schemes", "paint_scheme_components"}
    if not required_paint_tables <= set(tables):
        raise AssertionError(
            f"normalized Parquet manifest omits paint-scheme tables: "
            f"{sorted(required_paint_tables - set(tables))}"
        )
    required_secondary_tables = {
        "secondary_catalog_configurations",
        "secondary_paint_products",
        "secondary_paint_fitments",
        "color_code_crosswalk_candidates",
    }
    if not required_secondary_tables <= set(tables):
        raise AssertionError(
            f"normalized Parquet manifest omits secondary-lead tables: "
            f"{sorted(required_secondary_tables - set(tables))}"
        )
    if "supplemental_color_mentions" not in tables:
        raise AssertionError(
            "normalized Parquet manifest omits supplemental color mentions"
        )
    if "model_year_generation_memberships" not in tables:
        raise AssertionError(
            "normalized Parquet manifest omits model-year generation memberships"
        )
    rows = {name: read_rows(name) for name in tables}

    for table_name, (code_field, status_field) in FACTORY_CODE_COLUMNS.items():
        table_schema = pq.read_schema(PARQUET_ROOT / f"{table_name}.parquet")
        if not table_schema.field(code_field).nullable:
            raise AssertionError(f"{table_name}.{code_field} must be nullable")
        if table_schema.field(status_field).nullable:
            raise AssertionError(f"{table_name}.{status_field} must be required")
        require_factory_code_contract(
            rows[table_name], table_name, code_field, status_field
        )

    for name, item in tables.items():
        path = ROOT / item["path"]
        if len(rows[name]) != item["rows"]:
            raise AssertionError(f"{name} row count does not match manifest")
        if sha256_file(path) != item["sha256"]:
            raise AssertionError(f"{name} SHA-256 does not match manifest")

    model_ids = require_unique(rows["models"], "model_id", "models")
    generation_ids = require_unique(rows["generations"], "generation_id", "generations")
    model_year_ids = require_unique(rows["model_years"], "model_year_id", "model_years")
    require_unique(
        rows["model_year_generation_memberships"],
        "model_year_generation_membership_id",
        "model_year_generation_memberships",
    )
    platform_era_ids = require_unique(
        rows["platform_eras"], "platform_era_id", "platform_eras"
    )
    color_identity_ids = require_unique(
        rows["color_identities"], "color_identity_id", "color_identities"
    )
    availability_ids = require_unique(
        rows["color_availability"], "availability_id", "color_availability"
    )
    paint_scheme_ids = require_unique(
        rows["paint_schemes"], "paint_scheme_id", "paint_schemes"
    )
    require_unique(
        rows["paint_scheme_components"],
        "paint_scheme_component_id",
        "paint_scheme_components",
    )
    research_model_year_ids = require_unique(
        rows["model_year_research"], "model_year_id", "model_year_research"
    )
    source_candidate_ids = require_unique(
        rows["model_year_source_candidates"],
        "source_candidate_link_id",
        "model_year_source_candidates",
    )
    secondary_configuration_ids = require_unique(
        rows["secondary_catalog_configurations"],
        "catalog_configuration_id",
        "secondary_catalog_configurations",
    )
    secondary_product_ids = require_unique(
        rows["secondary_paint_products"],
        "product_id",
        "secondary_paint_products",
    )
    secondary_fitment_ids = require_unique(
        rows["secondary_paint_fitments"],
        "fitment_id",
        "secondary_paint_fitments",
    )
    crosswalk_candidate_ids = require_unique(
        rows["color_code_crosswalk_candidates"],
        "candidate_id",
        "color_code_crosswalk_candidates",
    )
    supplemental_mention_ids = require_unique(
        rows["supplemental_color_mentions"],
        "supplemental_mention_id",
        "supplemental_color_mentions",
    )
    source_ids = require_unique(rows["sources"], "source_id", "sources")
    source_revision_ids = require_unique(
        rows["source_revisions"], "source_revision_id", "source_revisions"
    )
    require_unique(rows["evidence_claims"], "evidence_claim_id", "evidence_claims")
    require_unique(rows["source_links"], "source_link_id", "source_links")
    photo_ids = require_unique(rows["photo_assets"], "photo_id", "photo_assets")
    require_unique(
        rows["model_photo_links"], "model_photo_link_id", "model_photo_links"
    )
    require_unique(
        rows["photo_color_links"], "photo_color_link_id", "photo_color_links"
    )

    require_fk(rows["generations"], "model_id", model_ids, "generations")
    require_fk(rows["model_years"], "model_id", model_ids, "model_years")
    require_fk(rows["model_years"], "generation_id", generation_ids, "model_years")
    require_fk(
        rows["model_year_generation_memberships"],
        "model_year_id",
        model_year_ids,
        "model_year_generation_memberships",
    )
    require_fk(
        rows["model_year_generation_memberships"],
        "model_id",
        model_ids,
        "model_year_generation_memberships",
    )
    require_fk(
        rows["model_year_generation_memberships"],
        "generation_id",
        generation_ids,
        "model_year_generation_memberships",
    )
    require_fk(
        rows["model_years"],
        "platform_era_id",
        platform_era_ids,
        "model_years",
        nullable=True,
    )
    require_fk(rows["platform_eras"], "model_id", model_ids, "platform_eras")
    require_fk(rows["color_identities"], "model_id", model_ids, "color_identities")
    require_fk(
        rows["color_identities"], "generation_id", generation_ids, "color_identities"
    )
    require_fk(
        rows["color_availability"],
        "model_year_id",
        model_year_ids,
        "color_availability",
    )
    require_fk(
        rows["color_availability"],
        "color_identity_id",
        color_identity_ids,
        "color_availability",
    )
    require_fk(
        rows["color_availability"],
        "evidence_source_id",
        source_ids,
        "color_availability",
    )
    require_fk(
        rows["paint_schemes"],
        "model_year_id",
        model_year_ids,
        "paint_schemes",
    )
    require_fk(rows["paint_schemes"], "model_id", model_ids, "paint_schemes")
    require_fk(
        rows["paint_schemes"],
        "evidence_source_id",
        source_ids,
        "paint_schemes",
    )
    require_fk(
        rows["paint_schemes"],
        "evidence_source_revision_id",
        source_revision_ids,
        "paint_schemes",
    )
    require_fk(
        rows["paint_scheme_components"],
        "paint_scheme_id",
        paint_scheme_ids,
        "paint_scheme_components",
    )
    require_fk(
        rows["model_year_research"],
        "model_year_id",
        model_year_ids,
        "model_year_research",
    )
    require_fk(
        rows["model_year_research"],
        "current_app_source_id",
        source_ids,
        "model_year_research",
        nullable=True,
    )
    require_fk(
        rows["model_year_source_candidates"],
        "model_year_id",
        model_year_ids,
        "model_year_source_candidates",
    )
    require_fk(
        rows["secondary_catalog_configurations"],
        "source_id",
        source_ids,
        "secondary_catalog_configurations",
    )
    require_fk(
        rows["secondary_catalog_configurations"],
        "canonical_model_id",
        model_ids,
        "secondary_catalog_configurations",
    )
    require_fk(
        rows["secondary_paint_fitments"],
        "catalog_configuration_id",
        secondary_configuration_ids,
        "secondary_paint_fitments",
    )
    require_fk(
        rows["secondary_paint_fitments"],
        "product_id",
        secondary_product_ids,
        "secondary_paint_fitments",
    )
    require_fk(
        rows["color_code_crosswalk_candidates"],
        "fitment_id",
        secondary_fitment_ids,
        "color_code_crosswalk_candidates",
    )
    require_fk(
        rows["color_code_crosswalk_candidates"],
        "product_id",
        secondary_product_ids,
        "color_code_crosswalk_candidates",
    )
    require_fk(
        rows["color_code_crosswalk_candidates"],
        "canonical_model_id",
        model_ids,
        "color_code_crosswalk_candidates",
    )
    require_fk(
        rows["color_code_crosswalk_candidates"],
        "governing_official_source_id",
        source_ids,
        "color_code_crosswalk_candidates",
        nullable=True,
    )
    require_fk(
        rows["supplemental_color_mentions"],
        "model_year_id",
        model_year_ids,
        "supplemental_color_mentions",
    )
    require_fk(
        rows["supplemental_color_mentions"],
        "model_id",
        model_ids,
        "supplemental_color_mentions",
    )
    require_fk(
        rows["supplemental_color_mentions"],
        "source_id",
        source_ids,
        "supplemental_color_mentions",
    )
    require_fk(
        rows["supplemental_color_mentions"],
        "source_revision_id",
        source_revision_ids,
        "supplemental_color_mentions",
    )
    require_fk(
        rows["model_year_source_candidates"],
        "model_id",
        model_ids,
        "model_year_source_candidates",
    )
    require_fk(
        rows["model_year_source_candidates"],
        "source_id",
        source_ids,
        "model_year_source_candidates",
    )
    require_fk(rows["source_links"], "source_id", source_ids, "source_links")
    require_fk(rows["source_revisions"], "source_id", source_ids, "source_revisions")
    require_fk(
        rows["evidence_claims"],
        "availability_id",
        availability_ids,
        "evidence_claims",
    )
    require_fk(rows["evidence_claims"], "source_id", source_ids, "evidence_claims")
    require_fk(
        rows["evidence_claims"],
        "source_revision_id",
        source_revision_ids,
        "evidence_claims",
    )
    require_fk(rows["evidence_claims"], "model_id", model_ids, "evidence_claims")
    require_fk(
        rows["evidence_claims"],
        "color_identity_id",
        color_identity_ids,
        "evidence_claims",
    )
    require_fk(
        rows["photo_assets"], "source_page_source_id", source_ids, "photo_assets"
    )
    require_fk(
        rows["photo_assets"], "source_original_source_id", source_ids, "photo_assets"
    )
    require_fk(rows["photo_assets"], "archive_source_id", source_ids, "photo_assets")
    require_fk(
        rows["photo_assets"], "preview_archive_source_id", source_ids, "photo_assets"
    )
    require_fk(rows["model_photo_links"], "photo_id", photo_ids, "model_photo_links")
    require_fk(rows["model_photo_links"], "model_id", model_ids, "model_photo_links")
    require_fk(rows["photo_color_links"], "photo_id", photo_ids, "photo_color_links")
    require_fk(rows["photo_color_links"], "model_id", model_ids, "photo_color_links")
    require_fk(
        rows["photo_color_links"],
        "color_identity_id",
        color_identity_ids,
        "photo_color_links",
        nullable=True,
    )

    model_year_lookup = {row["model_year_id"]: row for row in rows["model_years"]}
    membership_pairs = [
        (row["model_year_id"], row["generation_id"])
        for row in rows["model_year_generation_memberships"]
    ]
    if len(membership_pairs) != len(set(membership_pairs)):
        raise AssertionError("model-year generation memberships repeat a pair")
    memberships_by_model_year: dict[str, list[dict]] = {}
    for membership in rows["model_year_generation_memberships"]:
        memberships_by_model_year.setdefault(membership["model_year_id"], []).append(
            membership
        )
        model_year = model_year_lookup[membership["model_year_id"]]
        if (
            membership["model_id"] != model_year["model_id"]
            or membership["model_year"] != model_year["model_year"]
        ):
            raise AssertionError(
                "model-year generation membership has inconsistent denormalized keys: "
                f"{membership['model_year_generation_membership_id']}"
            )
    if set(memberships_by_model_year) != model_year_ids:
        raise AssertionError("generation memberships do not cover every model-year")
    for model_year_id, memberships in memberships_by_model_year.items():
        primary = [row for row in memberships if row["membership_role"] == "primary"]
        if len(primary) != 1:
            raise AssertionError(
                f"model-year does not have exactly one primary generation: {model_year_id}"
            )
        if (
            primary[0]["generation_id"]
            != model_year_lookup[model_year_id]["generation_id"]
        ):
            raise AssertionError(
                f"model-year primary generation disagrees with membership: {model_year_id}"
            )
    availability_counts_by_membership = Counter(
        (row["model_year_id"], row["generation_id"])
        for row in rows["color_availability"]
    )
    if set(availability_counts_by_membership) - set(membership_pairs):
        raise AssertionError(
            "availability references an unregistered generation membership"
        )
    for membership in rows["model_year_generation_memberships"]:
        count = availability_counts_by_membership[
            (membership["model_year_id"], membership["generation_id"])
        ]
        if membership["published_availability_count"] != count:
            raise AssertionError(
                "generation membership availability count is stale: "
                f"{membership['model_year_generation_membership_id']}"
            )
        if membership["has_published_availability"] != (count > 0):
            raise AssertionError(
                "generation membership availability flag is stale: "
                f"{membership['model_year_generation_membership_id']}"
            )
    overlay_memberships = [
        row
        for row in rows["model_year_generation_memberships"]
        if row["membership_role"] != "primary"
    ]
    specialty_memberships = [
        row
        for row in overlay_memberships
        if row["membership_role"] == "specialty_overlay"
    ]
    expected_specialty_overlay_model_years = {
        "blazer-ev:2026",
        "blazer:1979",
        "blazer:1980",
        "bolt-euv:2023",
        "caprice-ppv:2011",
        "caprice-ppv:2012",
        "caprice-ppv:2013",
        "caprice-ppv:2014",
        "caprice-ppv:2015",
        "caprice-ppv:2016",
        "caprice-ppv:2017",
        "ck-series:1979",
        "ck-series:1980",
        "ck-series:1993",
        "g-series-van:1979",
        "g-series-van:1980",
        "impala-limited:2014",
        "impala:2011",
        "impala:2012",
        "impala:2013",
        "s10:1993",
        "silverado:2026",
        "sportvan:1979",
        "sportvan:1980",
        "suburban:1979",
        "suburban:1980",
        "suburban:2005",
        "suburban:2007",
        "suburban:2011",
        "tahoe:2003",
        "tahoe:2005",
        "tahoe:2006",
    }
    if (
        len(specialty_memberships) != 278
        or {row["model_year_id"] for row in specialty_memberships}
        != expected_specialty_overlay_model_years
        or any(
            row["membership_role"] != "specialty_overlay"
            or row["evidence_class"] != "specialty_palette_subset"
            for row in specialty_memberships
        )
    ):
        raise AssertionError(
            "generation overlays do not match the explicit specialty subsets"
        )
    program_memberships = [
        row
        for row in overlay_memberships
        if row["membership_role"] == "program_partition"
    ]
    if (
        len(program_memberships) != 3
        or {row["model_year_id"] for row in program_memberships} != {"tahoe:2000"}
        or any(
            not row["generation_id"].startswith("tahoe:tahoe-2000-")
            for row in program_memberships
        )
    ):
        raise AssertionError("2000 Tahoe program partitions are not preserved")
    suburban_2011 = model_year_lookup["suburban:2011"]
    if suburban_2011["generation_id"] != "suburban:gm-fleet-guide-qualified-2011":
        raise AssertionError(
            "Suburban 2011 specialty subset incorrectly became primary"
        )
    color_identity_generation = {
        row["color_identity_id"]: row["generation_id"]
        for row in rows["color_identities"]
    }
    if any(
        color_identity_generation[row["color_identity_id"]] != row["generation_id"]
        for row in rows["color_availability"]
    ):
        raise AssertionError("availability and color identity generation keys disagree")

    rockauto = json.loads(ROCKAUTO_LEADS_PATH.read_text(encoding="utf-8"))
    rockauto_source_id = rockauto["source"]["source_id"]
    rockauto_source = next(
        (row for row in rows["sources"] if row["source_id"] == rockauto_source_id),
        None,
    )
    if rockauto_source is None:
        raise AssertionError(
            "RockAuto secondary source is missing from sources.parquet"
        )
    if (
        rockauto_source["officiality"] != "secondary"
        or rockauto_source["source_type"] != "retailer_catalog_fitment"
    ):
        raise AssertionError("RockAuto source provenance was promoted or relabeled")

    normalized_rockauto_tables = {
        "secondary_catalog_configurations": (
            "catalog_configuration_id",
            [
                {"source_id": rockauto_source_id, **row}
                for row in rockauto["configurations"]
            ],
        ),
        "secondary_paint_products": ("product_id", rockauto["products"]),
        "secondary_paint_fitments": ("fitment_id", rockauto["fitments"]),
        "color_code_crosswalk_candidates": (
            "candidate_id",
            rockauto["code_candidates"],
        ),
    }
    for table_name, (key, expected_rows) in normalized_rockauto_tables.items():
        expected_by_id = {row[key]: row for row in expected_rows}
        actual_by_id = {row[key]: row for row in rows[table_name]}
        if actual_by_id != expected_by_id:
            raise AssertionError(
                f"{table_name} does not exactly mirror the RockAuto ledger"
            )

    coded_fitment_ids = {
        row["fitment_id"]
        for row in rows["secondary_paint_fitments"]
        if row["candidate_status"] == "retailer_touchup_fitment_lead"
    }
    candidate_fitment_ids = {
        row["fitment_id"] for row in rows["color_code_crosswalk_candidates"]
    }
    if coded_fitment_ids != candidate_fitment_ids:
        raise AssertionError("coded RockAuto fitments and crosswalk candidates drifted")
    if any(
        row["verification_status"] != "unverified_secondary_lead"
        or row["governing_official_source_id"] is not None
        for row in rows["color_code_crosswalk_candidates"]
    ):
        raise AssertionError("RockAuto crosswalk candidates were improperly promoted")
    if any(
        row["evidence_source_id"] == rockauto_source_id
        for row in rows["color_availability"]
    ) or any(row["source_id"] == rockauto_source_id for row in rows["evidence_claims"]):
        raise AssertionError(
            "RockAuto secondary leads contaminated primary availability"
        )

    suburban_audit = json.loads(
        SUBURBAN_2000_2007_AUDIT_PATH.read_text(encoding="utf-8")
    )
    expected_supplemental = {
        (int(year_record["year"]), mention["name"]): (year_record, mention)
        for year_record in suburban_audit["years"]
        for mention in year_record["supplemental_colors"]
    }
    actual_supplemental = {
        (int(row["model_year"]), row["source_color_name"]): row
        for row in rows["supplemental_color_mentions"]
    }
    if set(actual_supplemental) != set(expected_supplemental):
        raise AssertionError(
            "supplemental color mentions drifted from the audit ledger"
        )
    for key, row in actual_supplemental.items():
        year_record, mention = expected_supplemental[key]
        source = year_record["source"]
        if (
            row["model_id"] != "suburban"
            or row["model_year_id"] != f"suburban:{key[0]}"
            or row["source_id"] != source["source_id"]
            or row["factory_code"] is not None
            or row["factory_code_status"] != "not_printed_in_source"
            or row["evidence_class"] != mention["evidence_class"]
            or row["scope"] != mention["scope"]
            or row["source_locator"] != source["page_locator"]
            or row["pdf_pages"] != source["pdf_pages"]
            or row["publication_status"] != "research_only_not_complete_palette"
        ):
            raise AssertionError(f"supplemental color mention changed: {key}")
    supplemental_links = {
        row["entity_id"]
        for row in rows["source_links"]
        if row["entity_type"] == "supplemental_color_mention"
    }
    if supplemental_links != supplemental_mention_ids:
        raise AssertionError("supplemental color mentions lack exact source links")
    if args.secondary_leads_only:
        print(
            json.dumps(
                {
                    "status": "ok",
                    "secondary_catalog_configurations": len(
                        secondary_configuration_ids
                    ),
                    "secondary_paint_products": len(secondary_product_ids),
                    "secondary_paint_fitments": len(secondary_fitment_ids),
                    "color_code_crosswalk_candidates": len(crosswalk_candidate_ids),
                },
                sort_keys=True,
            )
        )
        return 0

    if len(rows["paint_schemes"]) != 1369:
        raise AssertionError(
            "paint_schemes must contain 184 Tahoe and 1,185 Suburban rows"
        )
    paint_scheme_counts = Counter(row["model_id"] for row in rows["paint_schemes"])
    if paint_scheme_counts != Counter({"tahoe": 184, "suburban": 1185}):
        raise AssertionError(
            f"paint-scheme model counts drifted: {paint_scheme_counts}"
        )
    if len(rows["paint_scheme_components"]) != 2738:
        raise AssertionError("paint_scheme_components must contain two rows per scheme")
    components_by_scheme: dict[str, list[dict]] = {}
    for component in rows["paint_scheme_components"]:
        components_by_scheme.setdefault(component["paint_scheme_id"], []).append(
            component
        )
        if component["standalone_availability_asserted"]:
            raise AssertionError(
                "paint-scheme components must not assert standalone availability"
            )
    for paint_scheme_id, components in components_by_scheme.items():
        roles = {(row["component_order"], row["component_role"]) for row in components}
        if roles != {(1, "primary"), (2, "secondary")}:
            raise AssertionError(
                f"paint scheme does not retain primary/secondary roles: {paint_scheme_id}"
            )
    if any(not row["pdf_pages"] for row in rows["paint_schemes"]):
        raise AssertionError("paint scheme lacks a machine-readable PDF page locator")
    gunmetal_components = [
        component
        for scheme in rows["paint_schemes"]
        if scheme["model_id"] == "tahoe" and scheme["model_year"] == 1995
        for component in components_by_scheme[scheme["paint_scheme_id"]]
        if component["component_role"] == "secondary"
        and component["source_color_name"] == "Gray, Gunmetal"
        and component["factory_code"] == "91L"
    ]
    if len(gunmetal_components) != 7:
        raise AssertionError("1995 Tahoe Gray, Gunmetal scheme evidence is incomplete")
    if any(
        row["model_id"] == "tahoe"
        and row["model_year"] == 1995
        and (
            row["factory_code"] == "91L" or row["source_color_name"] == "Gray, Gunmetal"
        )
        for row in rows["color_availability"]
    ):
        raise AssertionError(
            "scheme-only 1995 Tahoe Gray, Gunmetal was flattened into color availability"
        )
    independent_brochure_sources = {
        1989: "gm-brochure-1989-chevrolet-suburban-xr793",
        1993: "gm-brochure-1993-chevrolet-blazer-suburban-poshmark-image-14",
    }
    for model_year, brochure_source_id in independent_brochure_sources.items():
        availability = [
            row
            for row in rows["color_availability"]
            if row["model_id"] == "suburban" and row["model_year"] == model_year
        ]
        if len(availability) != 10 or {
            row["evidence_source_id"] for row in availability
        } != {brochure_source_id}:
            raise AssertionError(
                f"{model_year} Suburban availability is not isolated to its independent "
                "ten-row brochure palette"
            )
        scheme_source_ids = {
            row["evidence_source_id"]
            for row in rows["paint_schemes"]
            if row["model_id"] == "suburban" and row["model_year"] == model_year
        }
        if brochure_source_id in scheme_source_ids:
            raise AssertionError(
                f"{model_year} Suburban schemes were incorrectly rebound to the brochure"
            )

    urls = [row["canonical_url"] for row in rows["sources"]]
    if len(urls) != len(set(urls)):
        raise AssertionError("sources.canonical_url is not unique")
    for url in urls:
        parsed = urlsplit(url)
        if parsed.scheme != "https" or not parsed.netloc:
            raise AssertionError(f"source is not a complete HTTPS link: {url}")
        host = (parsed.hostname or "").lower().rstrip(".")
        if any(
            host == placeholder or host.endswith(f".{placeholder}")
            for placeholder in PLACEHOLDER_SOURCE_HOSTS
        ):
            raise AssertionError(f"source uses a placeholder host: {url}")
    allowed_officiality = {"official", "secondary", "licensed", "unknown"}
    invalid_officiality = sorted(
        {
            row["officiality"]
            for row in rows["sources"]
            if row["officiality"] not in allowed_officiality
        }
    )
    if invalid_officiality:
        raise AssertionError(
            f"sources.officiality contains unsupported values: {invalid_officiality}"
        )
    allowed_document_authority = {None, "official_manufacturer_document"}
    invalid_document_authority = sorted(
        {
            row["document_authority"]
            for row in rows["sources"]
            if row["document_authority"] not in allowed_document_authority
        }
    )
    if invalid_document_authority:
        raise AssertionError(
            "sources.document_authority contains unsupported values: "
            f"{invalid_document_authority}"
        )
    allowed_retrieval_host_type = {None, "official_live", "archival_mirror"}
    invalid_retrieval_host_type = sorted(
        {
            row["retrieval_host_type"]
            for row in rows["sources"]
            if row["retrieval_host_type"] not in allowed_retrieval_host_type
        }
    )
    if invalid_retrieval_host_type:
        raise AssertionError(
            "sources.retrieval_host_type contains unsupported values: "
            f"{invalid_retrieval_host_type}"
        )

    link_counts = Counter(row["source_id"] for row in rows["source_links"])
    for source in rows["sources"]:
        if source["citation_count"] != link_counts[source["source_id"]]:
            raise AssertionError(
                f"source citation count is stale: {source['source_id']}"
            )
        if source["citation_count"] < 1:
            raise AssertionError(
                f"source has no claim or provenance link: {source['source_id']}"
            )

    required_urls: set[str] = set()
    for directory in ("catalog", "audits", "photos", "sources"):
        for path in (ROOT / "data" / directory).glob("*.json"):
            if path.name == "source-registry.json":
                continue
            required_urls.update(
                urls_in_json(json.loads(path.read_text(encoding="utf-8-sig")))
            )
    for pattern in (
        "docs/source-audit-*.md",
        "docs/specialty-color-source-audit.md",
        "docs/model-catalog-audit.md",
        "docs/platform-era-audit.md",
        "docs/commons-release-photo-archive.md",
        "docs/photo-audit-*.md",
        "data/sources/README.md",
    ):
        for path in ROOT.glob(pattern):
            for match in URL_PATTERN.finditer(path.read_text(encoding="utf-8")):
                required_urls.add(canonical_url(match.group(0)))
    missing_urls = sorted(required_urls - set(urls))
    if missing_urls:
        raise AssertionError(
            f"source registry omits URLs from canonical inputs: {missing_urls[:5]}"
        )

    registry = json.loads(
        (ROOT / "data" / "sources" / "source-registry.json").read_text(encoding="utf-8")
    )
    if registry["source_count"] != len(rows["sources"]):
        raise AssertionError("JSON source registry count is stale")
    if registry["source_link_count"] != len(rows["source_links"]):
        raise AssertionError("JSON source-link count is stale")
    registry_rows = {
        (
            row["source_id"],
            row["canonical_url"],
            row["officiality"],
            row["document_authority"],
            row["retrieval_host_type"],
            row["citation_count"],
        )
        for row in registry["sources"]
    }
    parquet_rows = {
        (
            row["source_id"],
            row["canonical_url"],
            row["officiality"],
            row["document_authority"],
            row["retrieval_host_type"],
            row["citation_count"],
        )
        for row in rows["sources"]
    }
    if registry_rows != parquet_rows:
        raise AssertionError("JSON source registry and sources.parquet disagree")

    artifact_ledger = json.loads(
        (ROOT / "data" / "sources" / "gm-heritage-chevrolet-artifacts.json").read_text(
            encoding="utf-8"
        )
    )
    artifact_entries = artifact_ledger["entries"]
    if artifact_ledger["source_count"] != 691 or len(artifact_entries) != 691:
        raise AssertionError("official GM artifact ledger is incomplete")
    if len({row["source_id"] for row in artifact_entries}) != 691:
        raise AssertionError("official GM artifact ledger repeats a source ID")
    if len({row["artifact_sha256"] for row in artifact_entries}) != 691:
        raise AssertionError("official GM artifact ledger does not identify 691 files")
    file_audit = artifact_ledger["file_audit"]
    if not all(
        file_audit[key]
        for key in (
            "all_objects_rehashed",
            "all_byte_lengths_reconciled",
            "all_pdfs_opened",
        )
    ):
        raise AssertionError("official GM artifact ledger lacks a complete file audit")
    if file_audit["total_pdf_pages"] != sum(
        int(row["pdf_page_count"]) for row in artifact_entries
    ):
        raise AssertionError("official GM artifact page count does not reconcile")
    source_lookup = {row["source_id"]: row for row in rows["sources"]}

    modern_ledger = json.loads(
        (
            ROOT / "data" / "sources" / "modern-chevrolet-color-source-candidates.json"
        ).read_text(encoding="utf-8")
    )
    retained_modern_sources = [
        item for item in modern_ledger["sources"] if item.get("local_file_path")
    ]
    fleet_guides = [
        item
        for item in retained_modern_sources
        if item.get("source_type") == "fleet_guide_pdf"
    ]
    if len(fleet_guides) != 19:
        raise AssertionError("modern source ledger no longer retains 19 Fleet Guides")
    qualified_palette_source_ids = {
        "chevrolet-ebrochure-us-2022-tahoe",
        "chevrolet-ebrochure-us-2023-colorado",
        "chevrolet-ebrochure-us-2023-silverado-hd-commercial",
        "chevrolet-ebrochure-us-2023-silverado-4500-6500-hd",
    }
    retained_modern_source_ids = {item["source_id"] for item in retained_modern_sources}
    if len(retained_modern_sources) != 23:
        raise AssertionError("modern source ledger no longer retains 23 complete PDFs")
    if not qualified_palette_source_ids <= retained_modern_source_ids:
        raise AssertionError("published modern palettes lack retained source PDFs")
    current_revisions_by_source: dict[str, list[dict]] = {}
    for revision in rows["source_revisions"]:
        if revision["is_current"]:
            current_revisions_by_source.setdefault(revision["source_id"], []).append(
                revision
            )
    modern_links: dict[tuple[str, str], list[dict]] = {}
    for link in rows["source_links"]:
        if link["entity_type"] == "modern_color_source":
            modern_links.setdefault((link["entity_id"], link["claim_type"]), []).append(
                link
            )
    for item in retained_modern_sources:
        source_id = item["source_id"]
        source = source_lookup.get(source_id)
        if source is None:
            raise AssertionError(f"retained modern source is absent: {source_id}")
        if source["canonical_url"] != canonical_url(item["retrieval_url"]):
            raise AssertionError(
                f"modern source metadata is not bound to its retrieval URL: {source_id}"
            )
        expected_host_type = (
            "archival_mirror"
            if item["document_authority"]
            == "official_manufacturer_document_archival_mirror"
            else "official_live"
        )
        if source["officiality"] != "official":
            raise AssertionError(f"modern source officiality is unstable: {source_id}")
        if source["document_authority"] != "official_manufacturer_document":
            raise AssertionError(
                f"modern source document authority is absent: {source_id}"
            )
        if source["retrieval_host_type"] != expected_host_type:
            raise AssertionError(
                f"modern source retrieval host type is stale: {source_id}"
            )
        if source["http_status"] != item.get("http_status"):
            raise AssertionError(
                f"modern source HTTP status was synthesized: {source_id}"
            )
        if source["content_sha256"] != item["sha256"]:
            raise AssertionError(f"modern source hash is stale: {source_id}")
        if source["content_length_bytes"] != item["bytes"]:
            raise AssertionError(f"modern source byte count is stale: {source_id}")
        if source["archive_relpath"] != item["local_file_path"]:
            raise AssertionError(f"modern source local path is stale: {source_id}")

        revisions = current_revisions_by_source.get(source_id, [])
        if len(revisions) != 1:
            raise AssertionError(
                f"modern source does not have exactly one current revision: {source_id}"
            )
        revision = revisions[0]
        if revision["artifact_sha256"] != item["sha256"]:
            raise AssertionError(f"modern source revision hash is stale: {source_id}")
        if revision["byte_length"] != item["bytes"]:
            raise AssertionError(
                f"modern source revision byte count is stale: {source_id}"
            )
        if revision["pdf_page_count"] != item["page_count"]:
            raise AssertionError(
                f"modern source revision page count is stale: {source_id}"
            )
        if revision["artifact_relpath"] != item["local_file_path"]:
            raise AssertionError(
                f"modern source revision local path is stale: {source_id}"
            )
        if revision["http_status"] != item.get("http_status"):
            raise AssertionError(
                f"modern source revision HTTP status was synthesized: {source_id}"
            )
        if revision["integrity_status"] != "complete_file_rehashed":
            raise AssertionError(
                f"modern source revision lost rehash status: {source_id}"
            )

        retained_path = (ROOT / item["local_file_path"]).resolve()
        if (
            not retained_path.is_relative_to(ROOT.resolve())
            or not retained_path.is_file()
        ):
            raise AssertionError(
                f"retained modern source is missing or unsafe: {source_id}"
            )
        if retained_path.stat().st_size != item["bytes"]:
            raise AssertionError(
                f"retained modern source byte count changed: {source_id}"
            )
        if sha256_file(retained_path) != item["sha256"]:
            raise AssertionError(f"retained modern source hash changed: {source_id}")
        if len(PdfReader(retained_path, strict=False).pages) != item["page_count"]:
            raise AssertionError(
                f"retained modern source page count changed: {source_id}"
            )

        expected_provenance_urls = {"source_retrieval_url": item["retrieval_url"]}
        if item.get("landing_url"):
            expected_provenance_urls["source_landing_url"] = item["landing_url"]
        if item.get("direct_official_url"):
            expected_provenance_urls["direct_official_url"] = item[
                "direct_official_url"
            ]
        for claim_type, expected_url in expected_provenance_urls.items():
            links = modern_links.get((source_id, claim_type), [])
            if len(links) != 1:
                raise AssertionError(
                    f"modern source lacks distinct {claim_type} provenance: {source_id}"
                )
            linked_source = source_lookup[links[0]["source_id"]]
            if linked_source["canonical_url"] != canonical_url(expected_url):
                raise AssertionError(
                    f"modern source {claim_type} points to the wrong URL: {source_id}"
                )

    for artifact in artifact_entries:
        source = source_lookup.get(artifact["source_id"])
        if source is None:
            raise AssertionError(f"artifact source is absent: {artifact['source_id']}")
        if source["content_sha256"] != artifact["artifact_sha256"]:
            raise AssertionError(f"artifact hash is stale: {artifact['source_id']}")
        if source["content_length_bytes"] != artifact["byte_length"]:
            raise AssertionError(
                f"artifact byte count is stale: {artifact['source_id']}"
            )

    availability_links = {
        row["entity_id"]
        for row in rows["source_links"]
        if row["claim_type"] == "color_availability_evidence"
    }
    if availability_links != availability_ids:
        raise AssertionError("not every availability row has exactly one evidence link")
    claimed_availability_ids = [
        row["availability_id"] for row in rows["evidence_claims"]
    ]
    if len(claimed_availability_ids) != len(set(claimed_availability_ids)):
        raise AssertionError("an availability row has multiple current evidence claims")
    if set(claimed_availability_ids) != availability_ids:
        raise AssertionError(
            "not every availability row has an immutable evidence claim"
        )
    revision_lookup = {
        row["source_revision_id"]: row for row in rows["source_revisions"]
    }
    for claim in rows["evidence_claims"]:
        revision = revision_lookup[claim["source_revision_id"]]
        if revision["source_id"] != claim["source_id"]:
            raise AssertionError(
                f"claim source and revision disagree: {claim['evidence_claim_id']}"
            )
        locator_type = claim["evidence_locator_type"]
        if locator_type == "pdf_page":
            if not claim["pdf_pages"]:
                raise AssertionError(
                    f"PDF claim has no exact page: {claim['evidence_claim_id']}"
                )
            if revision["pdf_page_count"] is None:
                raise AssertionError(
                    f"PDF claim source has no page count: {claim['evidence_claim_id']}"
                )
            if max(claim["pdf_pages"]) > revision["pdf_page_count"]:
                raise AssertionError(
                    f"claim page exceeds source length: {claim['evidence_claim_id']}"
                )
        elif locator_type == "image_region":
            if claim["pdf_pages"]:
                raise AssertionError(
                    f"image claim incorrectly has PDF pages: {claim['evidence_claim_id']}"
                )
            if not str(revision["media_type"]).startswith("image/"):
                raise AssertionError(
                    f"image claim is not bound to image media: {claim['evidence_claim_id']}"
                )
            if revision["pdf_page_count"] is not None:
                raise AssertionError(
                    f"image claim incorrectly has a PDF page count: {claim['evidence_claim_id']}"
                )
        else:
            raise AssertionError(
                f"unsupported evidence locator type: {claim['evidence_claim_id']} "
                f"({locator_type})"
            )

    verified_counts = Counter(
        row["model_year_id"] for row in rows["color_availability"]
    )
    claim_statuses_by_model_year: dict[str, set[str]] = {}
    for availability in rows["color_availability"]:
        claim_statuses_by_model_year.setdefault(
            availability["model_year_id"], set()
        ).add(availability["claim_status"])
    research_audit_state_by_model_year = {
        row["model_year_id"]: row["audit_state"] for row in rows["model_year_research"]
    }
    for model_year in rows["model_years"]:
        if (
            model_year["verified_color_count"]
            != verified_counts[model_year["model_year_id"]]
        ):
            raise AssertionError(
                f"verified-color count is stale: {model_year['model_year_id']}"
            )
        claim_statuses = claim_statuses_by_model_year.get(
            model_year["model_year_id"], set()
        )
        audit_state = research_audit_state_by_model_year[model_year["model_year_id"]]
        if audit_state == "reviewed_qualified_historical_table":
            expected_status = "reviewed_qualified_historical_table"
        elif "published_qualified_palette_union" in claim_statuses:
            expected_status = "reviewed_qualified_palette_union"
        elif claim_statuses == {"published_specialty_palette_subset"}:
            expected_status = "reviewed_specialty_palette_subset"
        elif model_year["verified_color_count"] > 0:
            expected_status = "color_chart_verified"
        elif audit_state == "source_reviewed_no_color_chart_found":
            expected_status = "official_kit_reviewed_no_color_table_found"
        else:
            expected_status = "color_chart_unverified"
        if model_year["research_status"] != expected_status:
            raise AssertionError(
                f"research status conflicts with colors: {model_year['model_year_id']}"
            )

    if research_model_year_ids != model_year_ids:
        raise AssertionError(
            "model-year research ledger does not cover the full catalog"
        )
    audit_counts = Counter(row["audit_state"] for row in rows["model_year_research"])
    allowed_audit_states = {
        "verified_complete",
        "reviewed_qualified_historical_table",
        "reviewed_qualified_palette_union",
        "reviewed_specialty_palette_subset",
        "source_reviewed_no_color_chart_found",
        "source_located_chart_unreviewed",
        "unreviewed",
    }
    if set(audit_counts) - allowed_audit_states:
        raise AssertionError(f"unknown research audit states: {audit_counts}")
    research_by_model_year = {
        row["model_year_id"]: row for row in rows["model_year_research"]
    }
    for model_year in rows["model_years"]:
        research = research_by_model_year[model_year["model_year_id"]]
        if model_year["research_status"] == "reviewed_qualified_historical_table":
            if research["audit_state"] != "reviewed_qualified_historical_table":
                raise AssertionError(
                    f"qualified historical status is stale: {model_year['model_year_id']}"
                )
            if (
                not research["color_chart_reviewed"]
                or research["completely_reviewed_color_chart"]
            ):
                raise AssertionError(
                    f"qualified historical review flags are invalid: {model_year['model_year_id']}"
                )
        if model_year["research_status"] == "reviewed_qualified_palette_union":
            if research["audit_state"] != "reviewed_qualified_palette_union":
                raise AssertionError(
                    f"qualified palette status is stale: {model_year['model_year_id']}"
                )
            if (
                not research["color_chart_reviewed"]
                or research["completely_reviewed_color_chart"]
            ):
                raise AssertionError(
                    f"qualified palette review flags are invalid: {model_year['model_year_id']}"
                )
        if model_year["research_status"] == "reviewed_specialty_palette_subset":
            if research["audit_state"] != "reviewed_specialty_palette_subset":
                raise AssertionError(
                    f"specialty subset status is stale: {model_year['model_year_id']}"
                )
            if (
                not research["color_chart_reviewed"]
                or research["completely_reviewed_color_chart"]
            ):
                raise AssertionError(
                    f"specialty subset review flags are invalid: {model_year['model_year_id']}"
                )
    for research in rows["model_year_research"]:
        if (
            research["exact_listing_count"]
            != verified_counts[research["model_year_id"]]
        ):
            raise AssertionError(
                f"research ledger listing count is stale: {research['model_year_id']}"
            )
        if (
            research["listed_count"]
            + research["restricted_count"]
            + research["other_availability_state_count"]
            != research["exact_listing_count"]
        ):
            raise AssertionError(
                f"research ledger state counts do not reconcile: {research['model_year_id']}"
            )

    specialty_rows = [
        row
        for row in rows["color_availability"]
        if row["claim_status"] == "published_specialty_palette_subset"
    ]
    expected_specialty_model_years = {
        "blazer-ev:2026",
        "blazer:1979",
        "blazer:1980",
        "bolt-euv:2023",
        "caprice-ppv:2011",
        "caprice-ppv:2012",
        "caprice-ppv:2013",
        "caprice-ppv:2014",
        "caprice-ppv:2015",
        "caprice-ppv:2016",
        "caprice-ppv:2017",
        "ck-series:1979",
        "ck-series:1980",
        "ck-series:1993",
        "express:2011",
        "g-series-van:1979",
        "g-series-van:1980",
        "impala-limited:2014",
        "impala:2011",
        "impala:2012",
        "impala:2013",
        "s10:1993",
        "silverado:2026",
        "silverado-hd:2011",
        "sportvan:1979",
        "sportvan:1980",
        "suburban:1979",
        "suburban:1980",
        "suburban:2005",
        "suburban:2007",
        "suburban:2011",
        "tahoe:2003",
        "tahoe:2005",
        "tahoe:2006",
        "tahoe:2011",
    }
    if (
        len(specialty_rows) != 321
        or {row["model_year_id"] for row in specialty_rows}
        != expected_specialty_model_years
    ):
        raise AssertionError(
            "published specialty subset coverage is not the reviewed set"
        )
    expected_application_type_counts = Counter(
        {
            "manufacturer_listed": 1_427,
            "authorized_upfitter_post_build": 120,
            "special_equipment_option_paint": 46,
            "specialty_program_unspecified": 41,
            "manufacturer_special_equipment_option": 28,
            "standard_program_palette": 82,
            "factory_installed_special_equipment_option": 4,
        }
    )
    application_type_counts = Counter(
        row["application_type"] for row in rows["color_availability"]
    )
    if application_type_counts != expected_application_type_counts or any(
        not row["application_type"].strip() for row in rows["color_availability"]
    ):
        raise AssertionError("availability application types are incomplete or stale")
    expected_specialty_state_counts = Counter(
        {
            "available": 107,
            "available_through_authorized_upfitter": 120,
            "available_with_minimum_batch": 7,
            "available_with_possible_extended_lead": 4,
            "closed_after_2026-02-02": 42,
            "restricted": 41,
        }
    )
    if Counter(row["availability_state"] for row in specialty_rows) != (
        expected_specialty_state_counts
    ):
        raise AssertionError("specialty availability states are incomplete or stale")

    kerr_rows = [
        row
        for row in specialty_rows
        if row["application_type"] == "authorized_upfitter_post_build"
    ]
    if (
        len(kerr_rows) != 120
        or {row["model_year_id"] for row in kerr_rows}
        != {"impala:2011", "impala:2012", "impala:2013", "impala-limited:2014"}
        or {row["availability_state"] for row in kerr_rows}
        != {"available_through_authorized_upfitter"}
        or any(not row["restriction"] for row in kerr_rows)
    ):
        raise AssertionError("Impala Kerr authorized-upfitter palettes are incomplete")

    silverado_2026 = [
        row for row in specialty_rows if row["model_year_id"] == "silverado:2026"
    ]
    if (
        len(silverado_2026) != 50
        or Counter(row["evidence_source_id"] for row in silverado_2026)
        != Counter(
            {
                "gm-2026-silverado-9c1-041426": 25,
                "gm-2026-silverado-5w4-041426": 25,
            }
        )
        or Counter(row["availability_state"] for row in silverado_2026)
        != Counter({"available": 8, "closed_after_2026-02-02": 42})
    ):
        raise AssertionError("2026 Silverado 9C1 and 5W4 palettes are incomplete")

    blazer_ev_rows = [row for row in specialty_rows if row["model_id"] == "blazer-ev"]
    if (
        len(blazer_ev_rows) != 4
        or {row["model_year"] for row in blazer_ev_rows} != {2026}
        or {row["availability_state"] for row in blazer_ev_rows}
        != {"available_with_possible_extended_lead"}
    ):
        raise AssertionError(
            "Blazer EV negative-year boundary or 2026 SEO palette drifted"
        )

    bolt_euv_rows = [
        row for row in specialty_rows if row["model_year_id"] == "bolt-euv:2023"
    ]
    if len(bolt_euv_rows) != 7 or {
        row["application_type"] for row in bolt_euv_rows
    } != {"standard_program_palette"}:
        raise AssertionError("2023 Bolt EUV 5W4 palette is incomplete")

    caprice_rows = [row for row in specialty_rows if row["model_id"] == "caprice-ppv"]
    expected_caprice_year_counts = Counter(
        {2011: 14, 2012: 16, 2013: 14, 2014: 7, 2015: 6, 2016: 6, 2017: 4}
    )
    if (
        len(caprice_rows) != 67
        or Counter(row["model_year"] for row in caprice_rows)
        != expected_caprice_year_counts
        or Counter(row["availability_state"] for row in caprice_rows)
        != Counter({"available": 60, "available_with_minimum_batch": 7})
        or {row["application_type"] for row in caprice_rows}
        != {"standard_program_palette"}
        or {row["factory_code"] for row in caprice_rows} != {None}
        or {row["factory_code_status"] for row in caprice_rows}
        != {"not_printed_in_source"}
        or any(not row["restriction"] for row in caprice_rows)
    ):
        raise AssertionError("2011-2017 Caprice PPV program palettes are incomplete")

    caprice_generation_rows = [
        row for row in rows["generations"] if row["model_id"] == "caprice-ppv"
    ]
    expected_caprice_program_ids = {
        f"gm-{year}-caprice-{program}-standard-palette"
        for year, programs in {
            2011: ("9c1-ppv", "9c3-detective"),
            2012: ("9c1-ppv", "9c3-detective"),
            2013: ("9c1-ppv", "9c3-detective"),
            2014: ("9c1-ppv",),
            2015: ("9c1-ppv",),
            2016: ("9c1-ppv",),
            2017: ("9c1-ppv",),
        }.items()
        for program in programs
    }
    if {
        row["program_id"] for row in caprice_generation_rows if row["program_id"]
    } != expected_caprice_program_ids or any(
        not row["program_label"] for row in caprice_generation_rows if row["program_id"]
    ):
        raise AssertionError("Caprice PPV program identities are not normalized")
    ck_1993_rows = [
        row for row in specialty_rows if row["model_year_id"] == "ck-series:1993"
    ]
    if (
        Counter((row["source_color_name"], row["factory_code"]) for row in ck_1993_rows)
        != Counter(
            {
                ("Tangier Orange", "WE9417"): 1,
                ("Wheatland Yellow", "WE9418"): 1,
                ("Woodland Green", "WE9015"): 1,
                ("Doeskin Tan", "WE9403"): 1,
            }
        )
        or {row["evidence_source_id"] for row in ck_1993_rows}
        != {"gm-heritage-1993-chevrolet-truck"}
        or {row["application_type"] for row in ck_1993_rows}
        != {"manufacturer_special_equipment_option"}
        or {row["availability_state"] for row in ck_1993_rows} != {"available"}
        or {row["factory_code_status"] for row in ck_1993_rows} != {"printed_in_source"}
        or any(
            "does not state that the paint was installed at the assembly plant"
            not in row["restriction"]
            for row in ck_1993_rows
        )
    ):
        raise AssertionError("1993 C/K Pickup specialty paints are incomplete")
    woodland_rows = [
        row
        for row in specialty_rows
        if row["source_color_name"] in {"Woodland Green", "Green, Woodland"}
    ]
    if (
        len(woodland_rows) != 16
        or Counter(row["availability_state"] for row in woodland_rows)
        != Counter({"restricted": 12, "closed_after_2026-02-02": 2, "available": 2})
        or Counter(row["application_type"] for row in woodland_rows)
        != Counter(
            {
                "specialty_program_unspecified": 12,
                "special_equipment_option_paint": 2,
                "factory_installed_special_equipment_option": 1,
                "manufacturer_special_equipment_option": 1,
            }
        )
        or any(not row["restriction"] for row in woodland_rows)
    ):
        raise AssertionError("Woodland Green rows lost their exact program scope")
    seo_rows = [
        row
        for row in specialty_rows
        if row["model_id"] == "suburban" and row["model_year"] in {2005, 2007}
    ]
    expected_seo = Counter(
        (
            int(year_record["year"]),
            color["name"],
            None
            if color["factory_code_status"] == "explicit none"
            else color["factory_code"],
            (
                "explicit_none_in_source"
                if color["factory_code_status"] == "explicit none"
                else "printed_in_source"
            ),
            color["touch_up_code"],
        )
        for year_record in suburban_audit["years"]
        for color in year_record["specialty_colors"]
    )
    actual_seo = Counter(
        (
            row["model_year"],
            row["source_color_name"],
            row["factory_code"],
            row["factory_code_status"],
            row["touch_up_code"],
        )
        for row in seo_rows
    )
    if actual_seo != expected_seo:
        raise AssertionError("Suburban SEO rows drifted from the exact audit ledger")
    if any(
        row["availability_state"] != "restricted" or not row["restriction"]
        for row in seo_rows
    ):
        raise AssertionError("Suburban SEO rows lost their restricted scope")
    claim_by_availability = {
        row["availability_id"]: row for row in rows["evidence_claims"]
    }
    source_by_id = {row["source_id"]: row for row in rows["sources"]}
    specialty_ledger = json.loads(SPECIALTY_LEDGER_PATH.read_text(encoding="utf-8"))
    unresolved_identities = {
        row["identity_id"]: row
        for row in specialty_ledger["identity_ledger"]
        if "unresolved" in row["status"]
    }
    expected_unresolved_identity_ids = {
        "usfs-forest-service-green-fs595-14260",
        "usfs-forest-service-green-5032",
    }
    if set(unresolved_identities) != expected_unresolved_identity_ids:
        raise AssertionError("Forest Service Green unresolved identities drifted")
    unresolved_source_urls = {
        canonical_url(source["url"])
        for source in specialty_ledger["usda_primary_sources"]
    }

    for availability in rows["color_availability"]:
        if contains_unresolved_forest_green_identity(
            availability["source_color_name"],
            availability["factory_code"],
            availability["touch_up_code"],
        ):
            raise AssertionError(
                "an unresolved Forest Service Green identity or identifier became availability"
            )
        claim = claim_by_availability[availability["availability_id"]]
        if contains_unresolved_forest_green_identity(
            claim["transcribed_color_name"],
            claim["transcribed_factory_code"],
            claim["transcribed_touch_up_code"],
        ):
            raise AssertionError(
                "an unresolved Forest Service Green identity entered an evidence claim"
            )
        source = source_by_id[claim["source_id"]]
        if canonical_url(source["canonical_url"]) in unresolved_source_urls:
            raise AssertionError(
                "a USDA Forest Service research source was promoted to Chevrolet availability evidence"
            )

    for record in specialty_ledger["app_publication_records"]:
        if record.get("identity_id") in expected_unresolved_identity_ids or (
            contains_unresolved_forest_green_identity(
                record.get("label"),
                record.get("source_label_raw"),
                record.get("paint_code"),
                record.get("rpo_code"),
                record.get("seo_code"),
                record.get("code_display"),
                record.get("touch_up_paint_number"),
            )
        ):
            raise AssertionError(
                "the specialty publication ledger contains an unresolved Forest Service Green identity"
            )
        if canonical_url(record["source"]["url"]) in unresolved_source_urls:
            raise AssertionError(
                "the specialty publication ledger routes a USDA research source as Chevrolet availability"
            )

    if any(
        claim_by_availability[row["availability_id"]]["verification_status"]
        != "human_checked_specialty_palette_subset"
        for row in specialty_rows
    ):
        raise AssertionError("specialty subset evidence claims lost their review class")
    candidate_links = {
        row["entity_id"]
        for row in rows["source_links"]
        if row["claim_type"] == "model_year_source_candidate"
    }
    if candidate_links != source_candidate_ids:
        raise AssertionError(
            "not every model-year source candidate has a provenance link"
        )
    expected_ranks = {"dedicated": 1, "related_line": 2, "generic_full_line": 3}
    for candidate in rows["model_year_source_candidates"]:
        if candidate["candidate_rank"] != expected_ranks[candidate["relation"]]:
            raise AssertionError(
                f"source-candidate rank is invalid: {candidate['source_candidate_link_id']}"
            )

    if any(
        row["factory_paint_match_status"] != "unverified"
        for row in rows["photo_color_links"]
    ):
        raise AssertionError(
            "a photo was promoted to factory-paint evidence without review"
        )
    for photo in rows["photo_assets"]:
        expected_prefix = (
            "https://github.com/ipadmom/chevrolet-color-archive/releases/download/"
            f"{photo['release_tag']}/"
        )
        if not photo["archive_url"].startswith(expected_prefix):
            raise AssertionError(
                f"photo is not archived in the pinned GitHub Release: {photo['photo_id']}"
            )

    coverage = manifest["coverage"]
    expected = {
        "models": len(rows["models"]),
        "model_years": len(rows["model_years"]),
        "model_year_generation_memberships": len(
            rows["model_year_generation_memberships"]
        ),
        "platform_eras": len(rows["platform_eras"]),
        "color_identities": len(rows["color_identities"]),
        "verified_color_availability_rows": len(rows["color_availability"]),
        "model_year_research_rows": len(rows["model_year_research"]),
        "model_year_source_candidates": len(rows["model_year_source_candidates"]),
        "secondary_catalog_configurations": len(
            rows["secondary_catalog_configurations"]
        ),
        "secondary_paint_products": len(rows["secondary_paint_products"]),
        "secondary_paint_fitments": len(rows["secondary_paint_fitments"]),
        "color_code_crosswalk_candidates": len(rows["color_code_crosswalk_candidates"]),
        "supplemental_color_mentions": len(rows["supplemental_color_mentions"]),
        "sources": len(rows["sources"]),
        "source_revisions": len(rows["source_revisions"]),
        "evidence_claims": len(rows["evidence_claims"]),
        "source_links": len(rows["source_links"]),
        "photo_assets": len(rows["photo_assets"]),
        "photo_color_links": len(rows["photo_color_links"]),
        "reviewed_specialty_palette_subset_model_years": len(
            {
                row["model_year_id"]
                for row in rows["model_years"]
                if row["research_status"] == "reviewed_specialty_palette_subset"
            }
        ),
        "specialty_palette_subset_model_years": len(expected_specialty_model_years),
        "specialty_palette_subset_availability_rows": len(specialty_rows),
    }
    for key, value in expected.items():
        if coverage[key] != value:
            raise AssertionError(f"manifest coverage is stale: {key}")

    parquet_readme = (PARQUET_ROOT / "README.md").read_text(encoding="utf-8")
    for table_name, item in tables.items():
        row_pattern = re.compile(
            rf"\| `{re.escape(table_name)}\.parquet` \|[^\n]*\| ([\d,]+) \|"
        )
        match = row_pattern.search(parquet_readme)
        if match is None:
            raise AssertionError(
                f"normalized database README omits {table_name}.parquet"
            )
        documented_rows = int(match.group(1).replace(",", ""))
        if documented_rows != item["rows"]:
            raise AssertionError(
                f"normalized database README row count is stale: {table_name}"
            )

    print(
        json.dumps(
            {
                "status": "ok",
                "tables": len(tables),
                "models": len(model_ids),
                "model_years": len(model_year_ids),
                "availability_rows": len(availability_ids),
                "secondary_catalog_configurations": len(secondary_configuration_ids),
                "secondary_paint_products": len(secondary_product_ids),
                "secondary_paint_fitments": len(secondary_fitment_ids),
                "color_code_crosswalk_candidates": len(crosswalk_candidate_ids),
                "sources": len(source_ids),
                "source_links": len(rows["source_links"]),
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
