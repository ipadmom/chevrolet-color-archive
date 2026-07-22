from __future__ import annotations

import argparse
import copy
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INVENTORY = ROOT / "data" / "audits" / "color-research-gap-inventory.json"
DEFAULT_DOCUMENT = ROOT / "docs" / "color-research-gap-inventory.md"
SUBURBAN_EARLY_AUDIT = ROOT / "data" / "audits" / "suburban-1969-1976.json"

AUDIT_STATES = (
    "verified_complete",
    "reviewed_qualified_historical_table",
    "reviewed_qualified_palette_union",
    "reviewed_specialty_palette_subset",
    "source_reviewed_no_color_chart_found",
    "source_located_chart_unreviewed",
    "unreviewed",
)

SOURCE_AVAILABILITY_STATES = (
    "dedicated_official_kit",
    "related_line_official_kit",
    "generic_full_line_official_kit",
    "catalog_official_evidence_only",
    "catalog_nonofficial_evidence_only",
    "none_identified",
)

SOURCE_OFFICIALITY_VALUES = frozenset(
    {"official", "secondary", "licensed", "unknown"}
)
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

STATUS_DEFINITIONS = {
    "verified_complete": (
        "A complete model-year color chart or reconciled official table has been "
        "reviewed and its listings published."
    ),
    "reviewed_qualified_historical_table": (
        "A source-linked historical table was reviewed, but source qualifications "
        "prevent a complete governing-chart claim."
    ),
    "reviewed_qualified_palette_union": (
        "An official palette was visually reviewed and published as a union across "
        "the cited model or trim pages; option codes and trim restrictions remain "
        "subject to the governing order guide."
    ),
    "reviewed_specialty_palette_subset": (
        "An exact specialty-paint table or row was visually reviewed and published "
        "for the cited model variant; it does not establish the complete model-year "
        "exterior-color palette."
    ),
    "source_reviewed_no_color_chart_found": (
        "A located primary source was reviewed and no governing exterior-color "
        "chart was found; this does not prove no colors existed."
    ),
    "source_located_chart_unreviewed": (
        "A dedicated primary source is located, but its color chart has not been "
        "completely transcribed and checked."
    ),
    "unreviewed": (
        "No complete color-chart audit or qualified reviewed palette is represented "
        "in tracked research data."
    ),
}

SOURCE_AVAILABILITY_DEFINITIONS = {
    "dedicated_official_kit": (
        "An official GM kit label directly maps to the catalog model and year."
    ),
    "related_line_official_kit": (
        "An official GM kit covers a parent line likely to include the subordinate "
        "catalog identity; contents still require inspection."
    ),
    "generic_full_line_official_kit": (
        "An official year-level Chevrolet kit exists, but model applicability is not "
        "established from the index label."
    ),
    "catalog_official_evidence_only": (
        "The catalog range cites first-party evidence, but no matching record exists "
        "in the 691-record GM Heritage kit inventory. A separately reviewed app "
        "source, if present, remains recorded in current_app_source."
    ),
    "catalog_nonofficial_evidence_only": (
        "The catalog range has only government or secondary evidence in this local "
        "inventory."
    ),
    "none_identified": (
        "No matching kit record or range evidence was identified in the inspected files."
    ),
}

AUDIT_NOTE_BY_STATE = {
    "reviewed_qualified_historical_table": (
        "Source-linked historical table was reviewed, but its own qualifications "
        "prevent a complete governing-chart claim."
    ),
    "reviewed_qualified_palette_union": (
        "Official GM Fleet Guide palette union visually checked against the cited "
        "pages. Exterior colors vary by trim; the Online Order Guide remains "
        "controlling for option codes and restrictions."
    ),
    "reviewed_specialty_palette_subset": (
        "Exact General Motors specialty-paint evidence was visually checked for the "
        "cited model variant. The published restricted listing is a subset, not a "
        "complete model-year exterior-color palette."
    ),
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def reviewed_no_chart_sources(
    root: Path = ROOT,
) -> dict[tuple[str, int], dict[str, Any]]:
    audit = load_json(root / SUBURBAN_EARLY_AUDIT.relative_to(ROOT))
    result: dict[tuple[str, int], dict[str, Any]] = {}
    for item in audit["explicit_no_chart_years"]:
        key = ("suburban", int(item["year"]))
        if key in result:
            raise ValueError(f"duplicate explicit no-chart audit: {key}")
        result[key] = {
            "source_id": item["source_id"],
            "url": item["url"],
            "finding": item["finding"],
            "audit_path": SUBURBAN_EARLY_AUDIT.relative_to(ROOT).as_posix(),
        }
    return result


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


def modern_source_classification(source: dict[str, Any]) -> tuple[str, str, str]:
    raw_authority = source.get("document_authority")
    classification = MODERN_SOURCE_CLASSIFICATIONS.get(str(raw_authority))
    if classification is None:
        raise ValueError(
            f"modern source has an unsupported authority classification: "
            f"{source.get('source_id')} ({raw_authority})"
        )
    officiality, document_authority, retrieval_host_type = classification
    retrieval_url = source.get("retrieval_url")
    if not retrieval_url:
        raise ValueError(
            f"modern source has no retrieval URL: {source.get('source_id')}"
        )
    retrieval_is_official = is_official_manufacturer_url(retrieval_url)
    if retrieval_host_type == "official_live" and not retrieval_is_official:
        raise ValueError(
            f"modern source classified as live official but retrieved elsewhere: "
            f"{source.get('source_id')}"
        )
    if retrieval_host_type == "archival_mirror" and retrieval_is_official:
        raise ValueError(
            f"modern source classified as an archival mirror but retrieved from an "
            f"official host: {source.get('source_id')}"
        )
    if officiality not in SOURCE_OFFICIALITY_VALUES:
        raise ValueError(
            f"modern source has unsupported normalized officiality: "
            f"{source.get('source_id')} ({officiality})"
        )
    return officiality, document_authority, retrieval_host_type


def modern_fleet_source_records(root: Path = ROOT) -> dict[int, list[dict[str, Any]]]:
    data = load_json(
        root
        / "data"
        / "sources"
        / "modern-chevrolet-color-source-candidates.json"
    )
    by_year: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for source in data["sources"]:
        if source.get("source_type") != "fleet_guide_pdf":
            continue
        match = re.match(r"gm-fleet-guide-us-(\d{4})", source["source_id"])
        if not match:
            raise ValueError(
                f"Fleet Guide source ID has no primary model year: {source['source_id']}"
            )
        model_year = int(match.group(1))
        pdf_url = source.get("retrieval_url")
        if not pdf_url:
            raise ValueError(f"Fleet Guide has no retrieval URL: {source['source_id']}")
        officiality, document_authority, retrieval_host_type = (
            modern_source_classification(source)
        )
        by_year[model_year].append(
            {
                "relation": "generic_full_line",
                "title": source["title"],
                "model_label": "Chevrolet full line",
                "years": [model_year],
                "pdf_url": pdf_url,
                "retrieval_url": pdf_url,
                "direct_official_url": source.get("direct_official_url"),
                "historical_official_url": source.get("historical_official_url"),
                "landing_url": source.get("landing_url"),
                "http_status": source.get("http_status"),
                "content_type": source["content_type"],
                "content_length_bytes": int(source["bytes"]),
                "crawler_source_id": source["source_id"],
                "source_type": source["source_type"],
                "publisher": source["publisher"],
                "officiality": officiality,
                "document_authority": document_authority,
                "retrieval_host_type": retrieval_host_type,
                "artifact_sha256": source["sha256"],
                "pdf_page_count": int(source["page_count"]),
                "artifact_relpath": source.get("local_file_path"),
                "revision": source["revision_or_document_date"],
            }
        )
    expected_years = set(range(2008, 2027))
    if set(by_year) != expected_years:
        raise ValueError(
            "modern Fleet Guide inventory does not cover every year 2008-2026"
        )
    return dict(by_year)


def load_archive_snapshot(root: Path = ROOT) -> dict[str, Any]:
    cli = root / "node_modules" / "tsx" / "dist" / "cli.mjs"
    exporter = root / "scripts" / "export-archive-snapshot.ts"
    if not cli.is_file():
        raise RuntimeError("tsx is not installed; run npm install before refreshing")
    result = subprocess.run(
        ["node", str(cli), str(exporter)],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(result.stdout)


def is_official_catalog_url(url: str) -> bool:
    host = (urlsplit(url).hostname or "").lower()
    return (
        host == "gm.com"
        or host.endswith(".gm.com")
        or host == "chevrolet.com"
        or host.endswith(".chevrolet.com")
        or host == "gmupfitter.com"
        or host.endswith(".gmupfitter.com")
        or host == "gmfleet.com"
        or host.endswith(".gmfleet.com")
    )


def platform_band_id(model_id: str, era: dict[str, Any]) -> str:
    label_slug = re.sub(r"[^a-z0-9]+", "", era["label"].lower())
    return f"{model_id}:{era['start']}-{era['end']}:{label_slug}"


def year_ranges(years: Iterable[int]) -> list[str]:
    ordered = sorted(set(years))
    if not ordered:
        return []
    result: list[str] = []
    start = previous = ordered[0]
    for year in ordered[1:]:
        if year == previous + 1:
            previous = year
            continue
        result.append(str(start) if start == previous else f"{start}-{previous}")
        start = previous = year
    result.append(str(start) if start == previous else f"{start}-{previous}")
    return result


def current_generation_index(
    snapshot: dict[str, Any],
) -> tuple[
    dict[str, dict[str, Any]],
    dict[tuple[str, int], list[dict[str, Any]]],
]:
    models: dict[str, dict[str, Any]] = {}
    years: dict[tuple[str, int], list[dict[str, Any]]] = {}
    for model in snapshot["models"]:
        model_id = model["id"]
        if model_id in models:
            raise ValueError(f"resolved app snapshot repeats model: {model_id}")
        models[model_id] = model
        for generation in model["generations"]:
            generation_years = {int(year) for year in generation["years"]}
            for raw_year in generation["sources"]:
                if int(raw_year) not in generation_years:
                    raise ValueError(
                        f"source year is outside generation: {model_id} {raw_year}"
                    )
            for color in generation["colors"]:
                for raw_year in color["availability"]:
                    year = int(raw_year)
                    if year not in generation_years:
                        raise ValueError(
                            f"availability year is outside generation: "
                            f"{model_id} {generation['id']} {year}"
                        )
                    if str(year) not in generation["sources"]:
                        raise ValueError(
                            f"published availability has no source: "
                            f"{model_id} {generation['id']} {year}"
                        )
            for year in generation_years:
                key = (model_id, year)
                years.setdefault(key, []).append(generation)
    for key, generations in years.items():
        if len(generations) == 1:
            continue
        model_id, year = key
        is_exact_program_partition = (
            model_id == "tahoe"
            and year == 2000
            and all(
                generation["id"].startswith("tahoe-2000-")
                for generation in generations
            )
        )
        evidence_classes = {
            (generation["sources"].get(str(year)) or {}).get("evidenceClass")
            for generation in generations
        }
        if (
            "specialty_palette_subset" not in evidence_classes
            and not is_exact_program_partition
        ):
            raise ValueError(f"resolved app snapshot overlaps model-year: {key}")
    return models, years


def structural_generation_for_year(
    generations: list[dict[str, Any]], year: int
) -> dict[str, Any]:
    return min(
        generations,
        key=lambda generation: (
            (generation["sources"].get(str(year)) or {}).get("evidenceClass")
            == "specialty_palette_subset",
        ),
    )


def source_generation_for_year(
    generations: list[dict[str, Any]], year: int
) -> dict[str, Any]:
    def priority(generation: dict[str, Any]) -> int:
        source = generation["sources"].get(str(year))
        if source is None:
            return 2
        if source.get("evidenceClass") == "specialty_palette_subset":
            return 1
        return 0

    return min(generations, key=priority)


def source_availability(record: dict[str, Any]) -> str:
    relations = {item.get("relation") for item in record["official_source_records"]}
    if "dedicated" in relations:
        return "dedicated_official_kit"
    if "related_line" in relations:
        return "related_line_official_kit"
    if "generic_full_line" in relations:
        return "generic_full_line_official_kit"
    if record["catalog_official_evidence_urls"]:
        return "catalog_official_evidence_only"
    if record["catalog_nonofficial_evidence_urls"]:
        return "catalog_nonofficial_evidence_only"
    return "none_identified"


def resolved_audit_state(
    prior_state: str,
    source: dict[str, Any] | None,
    listings: list[dict[str, Any]],
) -> str:
    evidence_class = source.get("evidenceClass") if source else None
    qualified_states = {
        "qualified_palette_union": "reviewed_qualified_palette_union",
        "specialty_palette_subset": "reviewed_specialty_palette_subset",
    }
    if evidence_class in qualified_states:
        if not listings:
            raise ValueError(
                f"{evidence_class} source has no published listings"
            )
        return qualified_states[evidence_class]
    if source and listings:
        if prior_state == "reviewed_qualified_historical_table":
            return prior_state
        return "verified_complete"
    if source and not listings:
        if prior_state == "source_reviewed_no_color_chart_found":
            return prior_state
        raise ValueError("resolved app source has no published listing rows")
    if listings and not source:
        raise ValueError("published listings have no resolved app source")
    if prior_state in {
        "source_reviewed_no_color_chart_found",
        "source_located_chart_unreviewed",
    }:
        return prior_state
    return "unreviewed"


def model_year_listings(generation: dict[str, Any], year: int) -> list[dict[str, Any]]:
    listings: list[dict[str, Any]] = []
    raw_year = str(year)
    source = generation["sources"].get(raw_year) or {}
    evidence_class = source.get("evidenceClass") or "source_transcription"
    for color in generation["colors"]:
        availability = color["availability"].get(raw_year)
        if not availability:
            continue
        listings.append(
            {
                "color_id": color["id"],
                "color_name": color["name"],
                "display_label": availability["label"],
                "paint_code": availability["code"],
                "availability_state": availability["state"],
                "restriction": availability.get("restriction"),
                "evidence_class": evidence_class,
            }
        )
    return listings


def count_bucket(records: list[dict[str, Any]]) -> dict[str, int]:
    states = Counter(record["audit_state"] for record in records)
    source_states = Counter(record["likely_source_availability"] for record in records)
    result = {
        "model_year_count": len(records),
        "completely_reviewed_count": states["verified_complete"],
        "reviewed_qualified_count": (
            states["reviewed_qualified_historical_table"]
            + states["reviewed_qualified_palette_union"]
            + states["reviewed_specialty_palette_subset"]
        ),
        "reviewed_qualified_historical_table_count": states[
            "reviewed_qualified_historical_table"
        ],
        "reviewed_qualified_palette_union_count": states[
            "reviewed_qualified_palette_union"
        ],
        "reviewed_specialty_palette_subset_count": states[
            "reviewed_specialty_palette_subset"
        ],
        "reviewed_no_chart_count": states[
            "source_reviewed_no_color_chart_found"
        ],
        "source_located_chart_unreviewed_count": states[
            "source_located_chart_unreviewed"
        ],
        "wholly_unreviewed_count": states["unreviewed"],
        "listing_count": sum(record["exact_listing_count"] for record in records),
    }
    for state in SOURCE_AVAILABILITY_STATES:
        result[f"{state}_count"] = source_states[state]
    return result


def build_model_years(
    *,
    base: dict[str, Any],
    catalog: dict[str, Any],
    platform_catalog: dict[str, list[dict[str, Any]]],
    snapshot: dict[str, Any],
    modern_source_records_by_year: dict[int, list[dict[str, Any]]] | None = None,
    reviewed_no_chart_by_model_year: dict[
        tuple[str, int], dict[str, Any]
    ] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[tuple[str, int], dict[str, Any]]]:
    prior = {item["model_year_key"]: item for item in base["model_years"]}
    if len(prior) != len(base["model_years"]):
        raise ValueError("base inventory repeats a model-year key")
    app_models, app_years = current_generation_index(snapshot)
    catalog_ids = {model["id"] for model in catalog["models"]}
    if set(app_models) != catalog_ids:
        missing = sorted(catalog_ids - set(app_models))
        extra = sorted(set(app_models) - catalog_ids)
        raise ValueError(f"app/catalog model mismatch; missing={missing}, extra={extra}")

    records: list[dict[str, Any]] = []
    expected_years: set[tuple[str, int]] = set()
    for model in catalog["models"]:
        model_id = model["id"]
        seen_model_years: set[int] = set()
        for model_range in model["model_year_ranges"]:
            start = int(model_range["start"])
            end = int(model_range["end"])
            if start > end:
                raise ValueError(f"reversed catalog range: {model_id} {start}-{end}")
            for year in range(start, end + 1):
                if year in seen_model_years:
                    raise ValueError(f"overlapping catalog ranges: {model_id} {year}")
                seen_model_years.add(year)
                expected_years.add((model_id, year))
                generations = app_years.get((model_id, year))
                if generations is None:
                    raise ValueError(f"catalog model-year is absent from app: {model_id} {year}")
                structural_generation = structural_generation_for_year(
                    generations, year
                )
                source_generation = source_generation_for_year(
                    generations, year
                )
                key = f"{model_id}:{year}"
                old = prior.get(key, {})
                official_records = copy.deepcopy(old.get("official_source_records") or [])
                modern_records = (modern_source_records_by_year or {}).get(year, [])
                modern_source_ids = {
                    modern_record["crawler_source_id"]
                    for modern_record in modern_records
                }
                official_records = [
                    record
                    for record in official_records
                    if record.get("crawler_source_id") not in modern_source_ids
                ]
                official_records.extend(copy.deepcopy(modern_records))
                official_records.sort(
                    key=lambda item: (
                        item.get("relation", ""),
                        item.get("crawler_source_id", ""),
                    )
                )
                catalog_urls = list(dict.fromkeys(model_range.get("evidence_urls") or []))
                official_urls = [url for url in catalog_urls if is_official_catalog_url(url)]
                nonofficial_urls = [
                    url for url in catalog_urls if not is_official_catalog_url(url)
                ]
                matching_platform = [
                    era
                    for era in platform_catalog.get(model_id, [])
                    if int(era["start"]) <= year <= int(era["end"])
                ]
                if len(matching_platform) > 1:
                    raise ValueError(f"overlapping platform bands: {model_id} {year}")
                platform = matching_platform[0] if matching_platform else None
                source = copy.deepcopy(
                    source_generation["sources"].get(str(year))
                )
                listings = [
                    listing
                    for generation in generations
                    for listing in model_year_listings(generation, year)
                ]
                reviewed_no_chart = (reviewed_no_chart_by_model_year or {}).get(
                    (model_id, year)
                )
                prior_state = old.get("audit_state", "unreviewed")
                if reviewed_no_chart:
                    prior_state = "source_reviewed_no_color_chart_found"
                audit_state = resolved_audit_state(
                    prior_state, source, listings
                )
                if audit_state in AUDIT_NOTE_BY_STATE:
                    audit_note = AUDIT_NOTE_BY_STATE[audit_state]
                elif reviewed_no_chart:
                    audit_note = reviewed_no_chart["finding"]
                elif audit_state == "verified_complete":
                    audit_note = None
                else:
                    audit_note = old.get("audit_note")

                record = {
                    "model_year_key": key,
                    "model_id": model_id,
                    "model_name": model["name"],
                    "vehicle_class": model["vehicle_class"],
                    "model_year": year,
                    "model_range_key": f"{model_id}:{start}-{end}",
                    "catalog_range_confidence": model_range["confidence"],
                    "generation_id": structural_generation["id"],
                    "generation_label": structural_generation["label"],
                    "platform_band_id": (
                        platform_band_id(model_id, platform) if platform else None
                    ),
                    "platform_band_label": platform["label"] if platform else None,
                    "platform_aliases": list(platform.get("aliases") or [])
                    if platform
                    else [],
                    "color_chart_reviewed": audit_state
                    in {
                        "verified_complete",
                        "reviewed_qualified_historical_table",
                        "reviewed_qualified_palette_union",
                        "reviewed_specialty_palette_subset",
                        "source_reviewed_no_color_chart_found",
                    },
                    "completely_reviewed_color_chart": audit_state
                    == "verified_complete",
                    "audit_state": audit_state,
                    "audit_note": audit_note,
                    "reviewed_no_chart_source": copy.deepcopy(reviewed_no_chart),
                    "exact_listing_count": len(listings),
                    "listed_count": sum(
                        item["availability_state"] == "listed" for item in listings
                    ),
                    "restricted_count": sum(
                        item["availability_state"] == "restricted" for item in listings
                    ),
                    "current_app_source": source,
                    "likely_source_availability": "none_identified",
                    "official_source_record_count": len(official_records),
                    "official_source_records": official_records,
                    "crawler_source_record_count": len(
                        old.get("crawler_source_ids") or []
                    ),
                    "crawler_source_ids": list(old.get("crawler_source_ids") or []),
                    "crawler_color_candidate_count": int(
                        old.get("crawler_color_candidate_count") or 0
                    ),
                    "crawler_candidate_state": old.get("crawler_candidate_state")
                    or "no_color_candidate_export_present_in_repository",
                    "catalog_official_evidence_urls": official_urls,
                    "catalog_nonofficial_evidence_urls": nonofficial_urls,
                    "listings": listings,
                }
                record["likely_source_availability"] = source_availability(record)
                records.append(record)

    if set(app_years) != expected_years:
        extra = sorted(set(app_years) - expected_years)
        missing = sorted(expected_years - set(app_years))
        raise ValueError(f"app/catalog model-year mismatch; missing={missing}, extra={extra}")
    return records, app_models, app_years


def build_by_model(
    catalog: dict[str, Any], records: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[record["model_id"]].append(record)
    result: list[dict[str, Any]] = []
    for model in catalog["models"]:
        model_records = grouped[model["id"]]
        row: dict[str, Any] = {
            "model_id": model["id"],
            "model_name": model["name"],
            "model_year_ranges": [
                {"start": int(item["start"]), "end": int(item["end"])}
                for item in model["model_year_ranges"]
            ],
            **count_bucket(model_records),
        }
        row["unreviewed_dedicated_years"] = year_ranges(
            item["model_year"]
            for item in model_records
            if item["likely_source_availability"] == "dedicated_official_kit"
            and item["audit_state"]
            in {"source_located_chart_unreviewed", "unreviewed"}
        )
        result.append(row)
    return result


def build_by_decade(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[(record["model_year"] // 10) * 10].append(record)
    return [
        {"decade": decade, "label": f"{decade}s", **count_bucket(grouped[decade])}
        for decade in sorted(grouped)
    ]


def build_by_source(records: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[record["likely_source_availability"]].append(record)
    return {state: count_bucket(grouped[state]) for state in SOURCE_AVAILABILITY_STATES}


def build_extraction_batches(
    catalog: dict[str, Any], records: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    model_order = {model["id"]: index for index, model in enumerate(catalog["models"])}
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        if (
            record["likely_source_availability"] == "dedicated_official_kit"
            and record["audit_state"]
            in {"source_located_chart_unreviewed", "unreviewed"}
        ):
            grouped[record["model_id"]].append(record)
    rows: list[dict[str, Any]] = []
    for model_id, model_records in grouped.items():
        dedicated_sources: dict[str, dict[str, Any]] = {}
        for record in model_records:
            for source in record["official_source_records"]:
                if source.get("relation") == "dedicated":
                    dedicated_sources[source["pdf_url"]] = source
        rows.append(
            {
                "model_id": model_id,
                "model_name": model_records[0]["model_name"],
                "target_model_year_count": len(model_records),
                "target_year_ranges": year_ranges(
                    item["model_year"] for item in model_records
                ),
                "unique_official_pdf_count": len(dedicated_sources),
                "total_official_pdf_bytes": sum(
                    int(item.get("content_length_bytes") or 0)
                    for item in dedicated_sources.values()
                ),
                "already_transcribed_listing_count": sum(
                    item["exact_listing_count"] for item in model_records
                ),
                "reason": (
                    "Every target year already has a dedicated, HTTP-verified GM PDF "
                    "and crawler manifest record."
                ),
            }
        )
    rows.sort(
        key=lambda item: (
            -item["target_model_year_count"],
            model_order[item["model_id"]],
        )
    )
    return rows


def source_inventory_counts(root: Path = ROOT) -> dict[str, int]:
    gm = load_json(root / "data" / "sources" / "gm-heritage-chevrolet-kits.json")
    gm_urls = {item["pdf_url"] for item in gm["entries"]}
    manifest_path = root / "crawler" / "manifests" / "gm-heritage-chevrolet-all.jsonl"
    manifest = [
        json.loads(line)
        for line in manifest_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    crawler_urls = {item["canonical_url"] for item in manifest}
    return {
        "gm_source_inventory_record_count": len(gm["entries"]),
        "gm_source_unique_url_count": len(gm_urls),
        "crawler_source_manifest_record_count": len(manifest),
        "crawler_source_manifest_unique_url_count": len(crawler_urls),
    }


def ocr_corpus_coverage(root: Path = ROOT) -> dict[str, int]:
    path = root / "data" / "research" / "gm-official-color-tables" / "manifest.json"
    manifest = load_json(path)
    coverage = manifest.get("coverage") or {}
    required = (
        "source_documents",
        "candidate_pages",
        "color_candidates",
        "visually_reviewed_candidate_pages",
    )
    result: dict[str, int] = {}
    for field in required:
        value = coverage.get(field)
        if not isinstance(value, int) or value < 0:
            raise ValueError(f"OCR corpus manifest has invalid {field}: {value!r}")
        result[field] = value
    if not re.fullmatch(r"[0-9a-f]{64}", str(manifest.get("corpus_fingerprint") or "")):
        raise ValueError("OCR corpus manifest lacks a valid corpus fingerprint")
    return result


def generated_on(
    base: dict[str, Any], catalog: dict[str, Any], records: list[dict[str, Any]]
) -> str:
    dates = [base.get("generated_on", ""), catalog.get("retrieved_on", "")]
    for record in records:
        source = record.get("current_app_source") or {}
        dates.append(str(source.get("retrievedAt") or "")[:10])
    valid = [value for value in dates if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value)]
    if not valid:
        raise ValueError("no deterministic generation date is present in source data")
    return max(valid)


def update_schema_recommendation(
    base: dict[str, Any], summary: dict[str, Any], root: Path = ROOT
) -> dict[str, Any]:
    del summary
    manifest = load_json(root / "data" / "parquet" / "manifest.json")
    return {
        "schema_version": manifest["schema_version"],
        "canonical_manifest": "data/parquet/manifest.json",
        "key_rules": copy.deepcopy(
            base["parquet_schema_recommendation"]["key_rules"]
        ),
        "tables": [
            {
                "name": Path(table["path"]).name,
                "primary_key": table["primary_key"],
                "foreign_keys": table["foreign_keys"],
                "tracked_manifest_rows": table["rows"],
            }
            for table in manifest["tables"]
        ],
        "audit_state_enum": [*AUDIT_STATES, "rejected", "superseded"],
    }


def build_inventory(
    *,
    root: Path = ROOT,
    base_inventory_path: Path = DEFAULT_INVENTORY,
) -> dict[str, Any]:
    base = load_json(base_inventory_path)
    catalog = load_json(root / "data" / "catalog" / "chevrolet-us-nameplates.json")
    platform_catalog = load_json(
        root / "data" / "catalog" / "chevrolet-platform-eras.json"
    )
    snapshot = load_archive_snapshot(root)
    modern_sources = modern_fleet_source_records(root)
    no_chart_sources = reviewed_no_chart_sources(root)
    records, app_models, app_years = build_model_years(
        base=base,
        catalog=catalog,
        platform_catalog=platform_catalog,
        snapshot=snapshot,
        modern_source_records_by_year=modern_sources,
        reviewed_no_chart_by_model_year=no_chart_sources,
    )
    bucket = count_bucket(records)
    source_counts = source_inventory_counts(root)
    ocr_coverage = ocr_corpus_coverage(root)
    app_generation_count = sum(
        len(model["generations"]) for model in snapshot["models"]
    )
    color_identity_count = sum(
        len(generation["colors"])
        for model in snapshot["models"]
        for generation in model["generations"]
    )
    app_source_count = sum(record["current_app_source"] is not None for record in records)
    app_source_url_count = len(
        {
            record["current_app_source"]["url"]
            for record in records
            if record["current_app_source"] is not None
        }
    )
    candidate_link_count = sum(
        record["official_source_record_count"] for record in records
    )
    all_listings = [listing for record in records for listing in record["listings"]]
    palette_listing_count = sum(
        listing["evidence_class"] == "qualified_palette_union"
        for listing in all_listings
    )
    specialty_listing_count = sum(
        listing["evidence_class"] == "specialty_palette_subset"
        for listing in all_listings
    )
    source_transcription_listing_count = len(all_listings) - (
        palette_listing_count + specialty_listing_count
    )
    specialty_application_year_count = sum(
        any(
            (generation["sources"].get(str(year)) or {}).get("evidenceClass")
            == "specialty_palette_subset"
            for generation in generations
        )
        for (_, year), generations in app_years.items()
    )
    summary: dict[str, Any] = {
        **bucket,
        "reviewed_model_year_count": (
            bucket["completely_reviewed_count"]
            + bucket["reviewed_qualified_count"]
            + bucket["reviewed_no_chart_count"]
        ),
        "reviewed_qualified_palette_union_listing_count": palette_listing_count,
        "reviewed_specialty_palette_subset_listing_count": specialty_listing_count,
        "reviewed_specialty_palette_subset_application_year_count": (
            specialty_application_year_count
        ),
        "source_transcription_listing_count": source_transcription_listing_count,
        "model_count": len(catalog["models"]),
        "catalog_range_count": sum(
            len(model["model_year_ranges"]) for model in catalog["models"]
        ),
        "platform_band_count": sum(len(items) for items in platform_catalog.values()),
        "app_generation_count": app_generation_count,
        "current_color_identity_row_count": color_identity_count,
        "current_listing_application_row_count": bucket["listing_count"],
        "app_year_source_record_count": app_source_count,
        "app_unique_source_url_count": app_source_url_count,
        "official_source_candidate_link_count": candidate_link_count,
        **source_counts,
        "crawler_source_document_count": ocr_coverage["source_documents"],
        "crawler_candidate_page_count": ocr_coverage["candidate_pages"],
        "crawler_color_candidate_export_record_count": ocr_coverage[
            "color_candidates"
        ],
        "crawler_visually_reviewed_candidate_page_count": ocr_coverage[
            "visually_reviewed_candidate_pages"
        ],
    }

    expected_catalog_years = sum(
        int(item["end"]) - int(item["start"]) + 1
        for model in catalog["models"]
        for item in model["model_year_ranges"]
    )
    snapshot_listing_count = sum(
        len(model_year_listings(generation, int(year)))
        for model in snapshot["models"]
        for generation in model["generations"]
        for year in generation["years"]
    )
    resolved_snapshot_sources = [
        source_generation_for_year(generations, year)["sources"].get(str(year))
        for (_, year), generations in app_years.items()
    ]
    resolved_snapshot_sources = [
        source for source in resolved_snapshot_sources if source is not None
    ]
    snapshot_source_count = len(resolved_snapshot_sources)
    snapshot_palette_count = sum(
        source.get("evidenceClass") == "qualified_palette_union"
        for source in resolved_snapshot_sources
    )
    snapshot_specialty_count = sum(
        source.get("evidenceClass") == "specialty_palette_subset"
        for source in resolved_snapshot_sources
    )
    reconciliation = {
        "catalog_models": {
            "expected": len(catalog["models"]),
            "actual": len(app_models),
            "pass": len(catalog["models"]) == len(app_models),
        },
        "catalog_model_years": {
            "expected": expected_catalog_years,
            "actual": len(records),
            "pass": expected_catalog_years == len(records),
        },
        "source_linked_reviewed_years": {
            "expected": snapshot_source_count,
            "actual": app_source_count,
            "pass": snapshot_source_count == app_source_count,
        },
        "reviewed_qualified_palette_union_years": {
            "expected": snapshot_palette_count,
            "actual": bucket["reviewed_qualified_palette_union_count"],
            "pass": snapshot_palette_count
            == bucket["reviewed_qualified_palette_union_count"],
        },
        "reviewed_specialty_palette_subset_years": {
            "expected": snapshot_specialty_count,
            "actual": bucket["reviewed_specialty_palette_subset_count"],
            "pass": snapshot_specialty_count
            == bucket["reviewed_specialty_palette_subset_count"],
        },
        "specialty_palette_subset_application_years": {
            "expected": specialty_application_year_count,
            "actual": len(
                {
                    record["model_year_key"]
                    for record in records
                    if any(
                        listing["evidence_class"] == "specialty_palette_subset"
                        for listing in record["listings"]
                    )
                }
            ),
            "pass": specialty_application_year_count
            == len(
                {
                    record["model_year_key"]
                    for record in records
                    if any(
                        listing["evidence_class"] == "specialty_palette_subset"
                        for listing in record["listings"]
                    )
                }
            ),
        },
        "current_color_listing_applications": {
            "expected": snapshot_listing_count,
            "actual": bucket["listing_count"],
            "pass": snapshot_listing_count == bucket["listing_count"],
        },
        "model_year_listing_sum": {
            "expected": bucket["listing_count"],
            "actual": sum(record["exact_listing_count"] for record in records),
            "pass": bucket["listing_count"]
            == sum(record["exact_listing_count"] for record in records),
        },
        "audit_state_partition": {
            "expected": len(records),
            "actual": sum(Counter(record["audit_state"] for record in records).values()),
            "pass": len(records)
            == sum(Counter(record["audit_state"] for record in records).values()),
        },
        "gm_source_inventory_vs_crawler_manifest": {
            "expected": source_counts["gm_source_inventory_record_count"],
            "actual": source_counts["crawler_source_manifest_record_count"],
            "pass": source_counts["gm_source_inventory_record_count"]
            == source_counts["crawler_source_manifest_record_count"],
        },
        "gm_source_urls_vs_crawler_urls": {
            "expected": source_counts["gm_source_unique_url_count"],
            "actual": source_counts["crawler_source_manifest_unique_url_count"],
            "pass": source_counts["gm_source_unique_url_count"]
            == source_counts["crawler_source_manifest_unique_url_count"],
        },
        "gm_source_inventory_vs_ocr_corpus": {
            "expected": source_counts["gm_source_inventory_record_count"],
            "actual": ocr_coverage["source_documents"],
            "pass": source_counts["gm_source_inventory_record_count"]
            == ocr_coverage["source_documents"],
        },
    }
    if not all(item["pass"] for item in reconciliation.values()):
        raise ValueError(f"inventory reconciliation failed: {reconciliation}")

    result = {
        "schema_version": 2,
        "generated_on": generated_on(base, catalog, records),
        "scope": (
            "Every model-year expanded from data/catalog/chevrolet-us-nameplates.json, "
            "reconciled to the resolved app snapshot, retained model-year source-candidate "
            "ledger, platform eras, official GM kit inventory, and crawler manifest."
        ),
        "status_definitions": STATUS_DEFINITIONS,
        "source_availability_definitions": SOURCE_AVAILABILITY_DEFINITIONS,
        "caveats": [
            "The 691-record GM Heritage index is a discovery inventory. Presence does not prove that a PDF contains a color chart.",
            "Generic full-line and related-line matches are retrieval leads, not model-level color evidence.",
            "Official Fleet Guide rows are qualified palette unions. They do not establish paint codes, per-trim restrictions, or governing order-guide completeness.",
            "Specialty-paint rows are reviewed model-variant subsets. They remain incomplete for the governing model-year palette even when their exact restricted availability is published.",
            "Catalog evidence URLs establish model-year presence, not exterior-color availability.",
            "Missing color rows always mean research is incomplete; they never mean a color or vehicle was unavailable.",
            "The consolidated OCR corpus is a research queue. Its automated candidates remain unreviewed until compared visually with the retained source page.",
        ],
        "summary": summary,
        "reconciliation": reconciliation,
        "by_decade": build_by_decade(records),
        "by_likely_source_availability": build_by_source(records),
        "by_model": build_by_model(catalog, records),
        "highest_yield_next_extraction_batches": build_extraction_batches(
            catalog, records
        ),
        "parquet_schema_recommendation": {},
        "model_years": records,
    }
    result["parquet_schema_recommendation"] = update_schema_recommendation(
        base, summary, root
    )
    return result


def md_escape(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def render_document(inventory: dict[str, Any]) -> str:
    summary = inventory["summary"]
    percentage = (
        100 * summary["completely_reviewed_count"] / summary["model_year_count"]
    )
    lines = [
        "---",
        "title: Chevrolet color research gap inventory",
        "visibility: public",
        "classification: archive-internal",
        "period: 1913-2026 model-year catalog",
        "sources:",
        "  - ../data/audits/color-research-gap-inventory.json",
        "  - ../data/sources/modern-chevrolet-color-source-candidates.json",
        "  - ../data/research/gm-official-color-tables/manifest.json",
        "  - https://www.gm.com/heritage/archive/vehicle-information-kits",
        "---",
        "",
        "# Chevrolet color research gap inventory",
        "",
        (
            "Generated from the tracked catalog, resolved application data, platform "
            "bands, detailed source-candidate ledger, GM Heritage kit inventory, and "
            f"crawler source manifest on {inventory['generated_on']}. The JSON companion "
            f"contains all {summary['model_year_count']:,} model-year records, direct "
            "published-source citations, and every matched discovery-source URL."
        ),
        "",
        "## Bottom line",
        "",
        f"- Catalog: {summary['model_count']:,} models, {summary['model_year_count']:,} model-years, {summary['catalog_range_count']:,} discontinuous model ranges.",
        f"- Complete governing color charts: {summary['completely_reviewed_count']:,} model-years ({percentage:.2f}%).",
        f"- Reviewed, qualified historical tables: {summary['reviewed_qualified_historical_table_count']:,} model-years.",
        f"- Reviewed, qualified official palette unions: {summary['reviewed_qualified_palette_union_count']:,} model-years and {summary['reviewed_qualified_palette_union_listing_count']:,} listing rows.",
        f"- Reviewed specialty-paint subsets: {summary['reviewed_specialty_palette_subset_count']:,} specialty-only model-years, {summary['reviewed_specialty_palette_subset_application_year_count']:,} model-year applications, and {summary['reviewed_specialty_palette_subset_listing_count']:,} restricted listing rows. Overlays do not make an otherwise incomplete year complete.",
        f"- Official source reviewed with no color chart found: {summary['reviewed_no_chart_count']:,} model-year.",
        f"- Located dedicated sources awaiting chart transcription: {summary['source_located_chart_unreviewed_count']:,} model-years.",
        f"- Wholly unreviewed: {summary['wholly_unreviewed_count']:,} model-years.",
        f"- Published color applications: {summary['listing_count']:,} rows, reconciled exactly to the resolved application data.",
        f"- App source-linked listing years: {summary['app_year_source_record_count']:,}, using {summary['app_unique_source_url_count']:,} unique direct source URLs.",
        f"- Official GM Heritage discovery inventory: {summary['gm_source_inventory_record_count']:,} records and {summary['gm_source_unique_url_count']:,} unique URLs; the crawler manifest reconciles exactly.",
        f"- Consolidated official-PDF OCR queue: {summary['crawler_source_document_count']:,} source documents, {summary['crawler_candidate_page_count']:,} candidate pages, and {summary['crawler_color_candidate_export_record_count']:,} automated color candidates; {summary['crawler_visually_reviewed_candidate_page_count']:,} candidate pages have been visually promoted through this queue.",
        "",
        "A missing row is never negative availability evidence. It means only that the governing source has not yet been completely reviewed and published.",
        "",
        "## Audit-state definitions",
        "",
    ]
    for state in AUDIT_STATES:
        lines.append(f"- **{state}**: {inventory['status_definitions'][state]}")

    lines.extend(
        [
            "",
            "## By decade",
            "",
            "| Decade | MY | Complete | Historical qualified | Palette union | Specialty subset | No chart | Located/unreviewed | Unreviewed | Listings | Dedicated kit | Related kit | Generic kit | Official evidence only | Nonofficial only | None |",
            "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
        ]
    )
    for row in inventory["by_decade"]:
        lines.append(
            "| "
            + " | ".join(
                md_escape(value)
                for value in (
                    row["label"],
                    row["model_year_count"],
                    row["completely_reviewed_count"],
                    row["reviewed_qualified_historical_table_count"],
                    row["reviewed_qualified_palette_union_count"],
                    row["reviewed_specialty_palette_subset_count"],
                    row["reviewed_no_chart_count"],
                    row["source_located_chart_unreviewed_count"],
                    row["wholly_unreviewed_count"],
                    row["listing_count"],
                    row["dedicated_official_kit_count"],
                    row["related_line_official_kit_count"],
                    row["generic_full_line_official_kit_count"],
                    row["catalog_official_evidence_only_count"],
                    row["catalog_nonofficial_evidence_only_count"],
                    row["none_identified_count"],
                )
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## By likely source availability",
            "",
            "| Availability | Model-years | Complete | Historical qualified | Palette union | Specialty subset | No chart | Located/unreviewed | Unreviewed | Listings |",
            "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
        ]
    )
    for state in SOURCE_AVAILABILITY_STATES:
        row = inventory["by_likely_source_availability"][state]
        lines.append(
            f"| {state} | {row['model_year_count']} | {row['completely_reviewed_count']} | "
            f"{row['reviewed_qualified_historical_table_count']} | "
            f"{row['reviewed_qualified_palette_union_count']} | "
            f"{row['reviewed_specialty_palette_subset_count']} | "
            f"{row['reviewed_no_chart_count']} | "
            f"{row['source_located_chart_unreviewed_count']} | "
            f"{row['wholly_unreviewed_count']} | {row['listing_count']} |"
        )
    lines.extend(
        [
            "",
            "These source categories are mutually exclusive and describe the strongest discovery route recorded for each model-year. A dedicated kit remains only a retrieval lead until its chart is visually reviewed. Current app citations are separately preserved in each model-year’s `current_app_source` object.",
            "",
            "## Highest-yield next extraction batches",
            "",
            "| Rank | Model ID | Model | Target MY | Ranges | Official PDFs | PDF bytes |",
            "| ---: | --- | --- | ---: | --- | ---: | ---: |",
        ]
    )
    for rank, row in enumerate(
        inventory["highest_yield_next_extraction_batches"], start=1
    ):
        lines.append(
            f"| {rank} | {row['model_id']} | {md_escape(row['model_name'])} | "
            f"{row['target_model_year_count']} | "
            f"{', '.join(row['target_year_ranges']) or '-'} | "
            f"{row['unique_official_pdf_count']} | {row['total_official_pdf_bytes']} |"
        )
    lines.extend(
        [
            "",
            "Recommended order: fill the remaining Tahoe regular-palette gaps for 2008-2021 and 2023-2024; then extend Corvette and Camaro continuity; then process the longest dedicated runs. Parent-line and generic kits require model-applicability review before any color row is promoted. Post-2007 model-years require official order guides, fleet guides, brochures, or paint bulletins outside the 691-record Heritage inventory.",
            "",
            "## By model",
            "",
            "Source columns are mutually exclusive per model-year. `Unreviewed dedicated ranges` includes both untouched and source-located dedicated years, but excludes reviewed no-chart years.",
            "",
            "| Model ID | Model | MY | Complete | Historical qualified | Palette union | Specialty subset | No chart | Located | Unreviewed | Listings | Dedicated | Related | Generic | Official only | Nonofficial only | None | Unreviewed dedicated ranges |",
            "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
        ]
    )
    for row in inventory["by_model"]:
        lines.append(
            "| "
            + " | ".join(
                md_escape(value)
                for value in (
                    row["model_id"],
                    row["model_name"],
                    row["model_year_count"],
                    row["completely_reviewed_count"],
                    row["reviewed_qualified_historical_table_count"],
                    row["reviewed_qualified_palette_union_count"],
                    row["reviewed_specialty_palette_subset_count"],
                    row["reviewed_no_chart_count"],
                    row["source_located_chart_unreviewed_count"],
                    row["wholly_unreviewed_count"],
                    row["listing_count"],
                    row["dedicated_official_kit_count"],
                    row["related_line_official_kit_count"],
                    row["generic_full_line_official_kit_count"],
                    row["catalog_official_evidence_only_count"],
                    row["catalog_nonofficial_evidence_only_count"],
                    row["none_identified_count"],
                    ", ".join(row["unreviewed_dedicated_years"]) or "-",
                )
            )
            + " |"
        )

    schema = inventory["parquet_schema_recommendation"]
    lines.extend(
        [
            "",
            "## Normalized-data recommendations",
            "",
            "The inventory retains the following normalization rules:",
            "",
        ]
    )
    for rule in schema["key_rules"]:
        lines.append(f"- {rule}")
    lines.extend(
        [
            "",
            "The live schema is versioned by the canonical tracked Parquet manifest. These row counts are the manifest snapshot used by this audit:",
            "",
            "| Table | Tracked rows | Primary key |",
            "| --- | ---: | --- |",
        ]
    )
    for table in schema["tables"]:
        expected = table["tracked_manifest_rows"]
        lines.append(
            f"| {table['name']} | {expected} | {', '.join(table['primary_key'])} |"
        )
    lines.extend(
        [
            "",
            "Audit-state enum: `" + "`, `".join(schema["audit_state_enum"]) + "`.",
            "",
            "## Reconciliation",
            "",
            "| Check | Expected | Actual | Pass |",
            "| --- | ---: | ---: | --- |",
        ]
    )
    for name, check in inventory["reconciliation"].items():
        lines.append(
            f"| {name} | {check['expected']} | {check['actual']} | "
            f"{'yes' if check['pass'] else 'NO'} |"
        )
    lines.extend(
        [
            "",
            "## Method",
            "",
            "The refresh expands every catalog range, then requires at least one resolved app generation for every model-year. It permits a specialty-paint subset to overlay a governing generation for the same year and preserves the four exact 2000 Tahoe program partitions, combines their color applications, and keeps a governing source as the model-year's primary source. It overlays the generation, direct source, color applications, evidence class, and audit state while retaining the existing official-kit and crawler candidate objects. Qualified palette unions and standalone specialty-paint subsets receive separate incomplete states before aggregate counts are computed. Newly catalogued years receive deterministic catalog and platform metadata even when no source candidate exists. Aggregates and schema row recommendations are then rebuilt exclusively from the reconciled model-year rows.",
            "",
            "The script refuses overlapping catalog ranges, overlapping app generations unless at least one is an explicit specialty-paint subset or every row is one of the exact 2000 Tahoe program partitions, published listings without a direct source, qualified palettes without listings, duplicate model-year keys, and any reconciliation failure.",
            "",
        ]
    )
    return "\n".join(lines)


def serialize_inventory(inventory: dict[str, Any]) -> str:
    return json.dumps(inventory, ensure_ascii=False, indent=2) + "\n"


def write_or_check(path: Path, content: str, check: bool) -> bool:
    if check:
        if not path.is_file() or path.read_text(encoding="utf-8-sig") != content:
            print(f"stale generated file: {path.relative_to(ROOT)}", file=sys.stderr)
            return False
        return True
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Reconcile the detailed color research gap ledger with the resolved app "
            "snapshot and regenerate its Markdown report."
        )
    )
    parser.add_argument("--inventory", type=Path, default=DEFAULT_INVENTORY)
    parser.add_argument("--document", type=Path, default=DEFAULT_DOCUMENT)
    parser.add_argument(
        "--base-inventory",
        type=Path,
        default=DEFAULT_INVENTORY,
        help="Detailed prior ledger to overlay; defaults to the tracked inventory.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit nonzero instead of writing when either generated file is stale.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    inventory = build_inventory(base_inventory_path=args.base_inventory)
    json_content = serialize_inventory(inventory)
    document_content = render_document(inventory)
    ok = write_or_check(args.inventory, json_content, args.check)
    ok = write_or_check(args.document, document_content, args.check) and ok
    if not ok:
        return 1
    summary = inventory["summary"]
    print(
        json.dumps(
            {
                "model_years": summary["model_year_count"],
                "complete": summary["completely_reviewed_count"],
                "qualified_historical": summary[
                    "reviewed_qualified_historical_table_count"
                ],
                "qualified_palette_union": summary[
                    "reviewed_qualified_palette_union_count"
                ],
                "qualified_palette_rows": summary[
                    "reviewed_qualified_palette_union_listing_count"
                ],
                "specialty_subsets": summary[
                    "reviewed_specialty_palette_subset_count"
                ],
                "specialty_subset_rows": summary[
                    "reviewed_specialty_palette_subset_listing_count"
                ],
                "listings": summary["listing_count"],
                "status": "current" if args.check else "written",
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
