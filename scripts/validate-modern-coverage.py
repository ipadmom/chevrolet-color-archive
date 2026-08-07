from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "catalog" / "chevrolet-us-nameplates.json"
SOURCE_PATH = (
    ROOT / "data" / "sources" / "modern-chevrolet-color-source-candidates.json"
)
AUDIT_PATH = ROOT / "data" / "audits" / "modern-fleet-palettes-2008-2026.json"
RELEASE_PATH = (
    ROOT
    / "data"
    / "sources"
    / "modern-supplemental-source-release-manifest.json"
)

SUPPLEMENTAL_TABLE_IDS = {
    "chevrolet-brochure-us-2016-cruze:2016:cruze",
    "chevrolet-brochure-us-2017-bolt-ev:2017:bolt-ev",
    "gm-order-guide-us-2019-blazer:2019:blazer",
    "chevrolet-brochure-us-2011-volt:2011:volt",
    "gm-upfitter-us-2016-low-cab-forward:2016:low-cab-forward",
    "new-jersey-contract-us-2008-malibu-classic:2008:malibu-classic-2008",
    "standox-color-index-us-2008-isuzu-npr-nqr:2008:tiltmaster-w-series",
    "work-truck-online-us-2009-isuzu-n-series:2009:tiltmaster-w-series",
    "autoweb-us-2015-captiva-sport:2015:captiva-sport",
    "chevrolet-brochure-us-2023-traverse-carryover-2024-limited:2024:traverse-limited",
}

BAD_COLOR_PATTERNS = (
    re.compile(r"^colors?$", re.I),
    re.compile(r"^link$", re.I),
    re.compile(r"\bmetallic\s+metallic\b", re.I),
    re.compile(r"^up split", re.I),
    re.compile(r"^a safe at all", re.I),
)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def catalog_keys(catalog: dict, first: int = 2008, last: int = 2026) -> set[tuple[str, int]]:
    return {
        (model["id"], year)
        for model in catalog["models"]
        for model_range in model["model_year_ranges"]
        for year in range(
            max(first, int(model_range["start"])),
            min(last, int(model_range["end"])) + 1,
        )
    }


def main() -> int:
    catalog = read_json(CATALOG_PATH)
    source_data = read_json(SOURCE_PATH)
    audit = read_json(AUDIT_PATH)
    release = read_json(RELEASE_PATH)

    sources = source_data["sources"]
    tables = source_data["verified_palette_tables"]
    records = audit["records"]
    source_by_id = {source["source_id"]: source for source in sources}
    table_by_id = {table["table_id"]: table for table in tables}

    if source_data["summary"]["source_count"] != len(sources):
        raise AssertionError("modern source summary count is stale")
    if source_data["summary"]["verified_palette_table_count"] != len(tables):
        raise AssertionError("modern palette table summary count is stale")
    for values, label in (
        ([source["source_id"] for source in sources], "source IDs"),
        ([table["table_id"] for table in tables], "table IDs"),
        ([record["record_id"] for record in records], "audit record IDs"),
    ):
        duplicates = sorted(value for value, count in Counter(values).items() if count > 1)
        if duplicates:
            raise AssertionError(f"duplicate {label}: {duplicates[:5]}")

    if set(table_by_id) & SUPPLEMENTAL_TABLE_IDS != SUPPLEMENTAL_TABLE_IDS:
        missing = sorted(SUPPLEMENTAL_TABLE_IDS - set(table_by_id))
        raise AssertionError(f"supplemental tables are missing: {missing}")

    modern_keys = catalog_keys(catalog)
    if len(modern_keys) != 364:
        raise AssertionError(f"modern catalog key count changed: {len(modern_keys)}")
    audit_keys = {
        (record["model_id"], int(record["model_year"]))
        for record in records
        if record["colors"]
    }
    manual_keys = {
        (model_id, int(table["model_year"]))
        for table in tables
        for model_id in table["catalog_model_ids"]
    }
    if audit_keys - modern_keys:
        raise AssertionError(f"audit contains unrelated model-years: {sorted(audit_keys - modern_keys)[:5]}")
    if manual_keys - catalog_keys(catalog, 1913, 2026):
        raise AssertionError("a manual table contains a model-year absent from the catalog")
    uncovered = sorted(modern_keys - (audit_keys | manual_keys))
    if uncovered:
        raise AssertionError(f"modern model-years remain uncovered: {uncovered[:10]}")

    audit_2008_2024 = catalog_keys(catalog, 2008, 2024)
    declared_remaining = {
        (item["model_id"], int(item["model_year"]))
        for item in audit["remaining_catalog_model_years"]
    }
    actual_remaining = audit_2008_2024 - audit_keys
    if declared_remaining != actual_remaining:
        raise AssertionError("Fleet Guide audit remaining-key report is stale")
    if actual_remaining - manual_keys:
        raise AssertionError(
            f"Fleet Guide gaps lack supplemental tables: {sorted(actual_remaining - manual_keys)}"
        )
    if audit["empty_records"]:
        raise AssertionError(f"Fleet Guide audit retains empty records: {audit['empty_records']}")

    reviewed_colors: list[tuple[str, str]] = []
    for record in records:
        for color in record["colors"]:
            reviewed_colors.append((record["record_id"], color["name"]))
            for code in color["factory_codes"]:
                if not re.fullmatch(r"[A-Z0-9]{2,4}", code):
                    raise AssertionError(f"invalid generated factory code: {record['record_id']} {code}")
    for table_id in SUPPLEMENTAL_TABLE_IDS:
        table = table_by_id[table_id]
        if not table["colors"] or table["ingestion_status"] != "ready_palette_union":
            raise AssertionError(f"supplemental table is not publishable: {table_id}")
        if table["source_id"] not in source_by_id:
            raise AssertionError(f"supplemental table source is missing: {table_id}")
        for color in table["colors"]:
            reviewed_colors.append((table_id, color))
        for code in (table.get("factory_codes") or {}).values():
            if not re.fullmatch(r"[A-Z0-9]{2,4}", code):
                raise AssertionError(f"invalid supplemental factory code: {table_id} {code}")
        for code in (table.get("touch_up_codes") or {}).values():
            if not re.fullmatch(r"WA-\d{3,4}[A-Z]?", code):
                raise AssertionError(f"invalid supplemental touch-up code: {table_id} {code}")

    for record_id, color in reviewed_colors:
        if not color.strip() or any(pattern.search(color) for pattern in BAD_COLOR_PATTERNS):
            raise AssertionError(f"contaminated color assertion: {record_id} {color!r}")

    release_entries = {entry["source_id"]: entry for entry in release["entries"]}
    if (
        len(release_entries) != release["verified_source_asset_count"]
        or len(release_entries) != 12
    ):
        raise AssertionError("supplemental release source count is stale")
    if sum(int(entry["bytes"]) for entry in release_entries.values()) != int(
        release["verified_source_asset_bytes"]
    ):
        raise AssertionError("supplemental release byte total is stale")
    for source_id, entry in release_entries.items():
        source = source_by_id.get(source_id)
        if source is None:
            raise AssertionError(f"supplemental release source is absent: {source_id}")
        for source_key, release_key in (
            ("archive_asset_name", "asset_name"),
            ("archive_url", "archive_url"),
            ("bytes", "bytes"),
            ("sha256", "sha256"),
        ):
            if source.get(source_key) != entry.get(release_key):
                raise AssertionError(f"release metadata mismatch: {source_id}.{source_key}")
    rejected_names = {item["asset_name"] for item in release["rejected_release_assets"]}
    cited_asset_names = {
        table.get("archive_asset_name") for table in tables if table.get("archive_asset_name")
    }
    if rejected_names & cited_asset_names:
        raise AssertionError("an access-challenge artifact is cited as evidence")

    print(
        json.dumps(
            {
                "status": "ok",
                "modern_model_years": len(modern_keys),
                "modern_model_years_covered": len(modern_keys & (audit_keys | manual_keys)),
                "fleet_audit_records": len(records),
                "fleet_audit_color_assertions": sum(len(record["colors"]) for record in records),
                "supplemental_tables": len(SUPPLEMENTAL_TABLE_IDS),
                "supplemental_release_assets": len(release_entries),
                "uncovered_modern_model_years": len(uncovered),
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
