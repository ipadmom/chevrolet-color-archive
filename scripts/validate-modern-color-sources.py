from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = (
    ROOT / "data" / "sources" / "modern-chevrolet-color-source-candidates.json"
)
CATALOG_PATH = ROOT / "data" / "catalog" / "chevrolet-us-nameplates.json"
ORDER_GUIDE_RELEASE_PATH = (
    ROOT / "data" / "sources" / "current-order-guide-source-release-manifest.json"
)
PUBLISHED_FLEET_SOURCE_IDS = {
    "gm-fleet-guide-us-2008-v2",
    "gm-fleet-guide-us-2009-v2",
    "gm-fleet-guide-us-2010",
    "gm-fleet-guide-us-2011",
    "gm-fleet-guide-us-2012",
    "gm-fleet-guide-us-2013",
    "gm-fleet-guide-us-2014",
    "gm-fleet-guide-us-2015",
    "gm-fleet-guide-us-2016-november",
    "gm-fleet-guide-us-2017",
    "gm-fleet-guide-us-2018",
    "gm-fleet-guide-us-2019",
    "gm-fleet-guide-us-2020",
    "gm-fleet-guide-us-2021-v3",
    "gm-fleet-guide-us-2022-v6",
    "gm-fleet-guide-us-2023-v3",
    "gm-fleet-guide-us-2024-v3",
    "gm-fleet-guide-us-2025-r2024-12-11",
    "gm-fleet-guide-us-2026-r2026-04-01",
}
PUBLISHED_ORDER_GUIDE_SOURCE_IDS = {
    "gm-online-order-guide-pdf-22745",
    "gm-online-order-guide-pdf-22775",
    "gm-online-order-guide-pdf-22821",
    "gm-online-order-guide-pdf-22878",
    "gm-online-order-guide-pdf-23208",
}
PUBLISHED_PALETTE_SOURCE_IDS = PUBLISHED_FLEET_SOURCE_IDS | PUBLISHED_ORDER_GUIDE_SOURCE_IDS | {
    "chevrolet-ebrochure-us-2022-tahoe",
    "chevrolet-ebrochure-us-2023-colorado",
    "chevrolet-ebrochure-us-2023-silverado-hd-commercial",
    "chevrolet-ebrochure-us-2023-silverado-4500-6500-hd",
}
EXPECTED_LOCAL_PDF_BYTES = 520_591_010
EXPECTED_LOCAL_PDF_PAGES = 2_599
EXPECTED_PUBLISHED_TABLES = 66
EXPECTED_PUBLISHED_PAGE_REFERENCES = 81
EXPECTED_PUBLISHED_COLOR_ASSERTIONS = 493
ALLOWED_APPLICATION_SOURCE_SETS = {
    ("silverado-hd", 2023): frozenset(
        {
            "chevrolet-ebrochure-us-2023-silverado-hd-commercial",
            "chevrolet-ebrochure-us-2023-silverado-4500-6500-hd",
        }
    ),
    ("blazer-ev", 2025): frozenset(
        {
            "gm-fleet-guide-us-2025-r2024-12-11",
            "gm-online-order-guide-pdf-22878",
        }
    ),
    ("corvette", 2026): frozenset(
        {
            "gm-fleet-guide-us-2026-r2026-04-01",
            "gm-online-order-guide-pdf-23208",
        }
    ),
    ("low-cab-forward", 2025): frozenset(
        {
            "gm-online-order-guide-pdf-22745",
            "gm-online-order-guide-pdf-22775",
            "gm-online-order-guide-pdf-22821",
        }
    ),
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require_unique(values: list[str], label: str) -> None:
    duplicates = sorted(
        value for value, count in Counter(values).items() if count > 1
    )
    if duplicates:
        raise AssertionError(f"{label} is not unique: {duplicates[:5]}")


def normalized_pdf_text(value: str) -> str:
    return " ".join(
        unicodedata.normalize("NFKC", value).replace("\u00ad", "").split()
    ).casefold()


def require_https_url(value: str, label: str) -> None:
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise AssertionError(f"{label} is not a complete HTTPS URL: {value}")


def main() -> int:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    order_guide_release = json.loads(
        ORDER_GUIDE_RELEASE_PATH.read_text(encoding="utf-8")
    )
    model_ids = {model["id"] for model in catalog["models"]}
    sources = data["sources"]
    tables = data["verified_palette_tables"]
    samples = data["verified_order_guide_samples"]

    if data["schema_version"] != 1:
        raise AssertionError("unexpected modern-source schema version")
    if len(sources) != 36:
        raise AssertionError("modern-source inventory no longer contains 36 sources")
    require_unique([source["source_id"] for source in sources], "source_id")
    require_unique([table["table_id"] for table in tables], "table_id")
    require_unique([sample["sample_id"] for sample in samples], "sample_id")

    sources_by_id = {source["source_id"]: source for source in sources}
    release_entries_by_source = {
        entry["source_id"]: entry for entry in order_guide_release["entries"]
    }
    for year in range(2008, 2027):
        matches = [
            source
            for source in sources
            if source["source_type"] == "fleet_guide_pdf"
            and source["source_id"].startswith(f"gm-fleet-guide-us-{year}")
        ]
        if len(matches) != 1:
            raise AssertionError(f"model year {year} does not have exactly one Fleet Guide")

    readers: dict[str, PdfReader] = {}
    local_sources = [source for source in sources if source.get("local_file_path")]
    if len(local_sources) != 23:
        raise AssertionError("modern-source inventory no longer retains 23 complete PDFs")
    if sum(source["bytes"] for source in local_sources) != EXPECTED_LOCAL_PDF_BYTES:
        raise AssertionError("retained modern-source byte total is stale")
    if sum(source["page_count"] for source in local_sources) != EXPECTED_LOCAL_PDF_PAGES:
        raise AssertionError("retained modern-source page total is stale")

    for source in local_sources:
        path = (ROOT / source["local_file_path"]).resolve()
        if not path.is_relative_to(ROOT.resolve()):
            raise AssertionError(f"local source escapes the repository: {source['source_id']}")
        if not path.is_file():
            raise AssertionError(f"retained source is missing: {source['source_id']}")
        if path.stat().st_size != source["bytes"]:
            raise AssertionError(f"retained source byte count is stale: {source['source_id']}")
        if sha256_file(path) != source["sha256"]:
            raise AssertionError(f"retained source hash is stale: {source['source_id']}")
        reader = PdfReader(path)
        if len(reader.pages) != source["page_count"]:
            raise AssertionError(f"retained source page count is stale: {source['source_id']}")
        readers[source["source_id"]] = reader
        for page in source.get("color_table_candidate_pdf_pages", []):
            if page < 1 or page > source["page_count"]:
                raise AssertionError(
                    f"candidate page exceeds source length: {source['source_id']} p. {page}"
                )

    for source_id in PUBLISHED_PALETTE_SOURCE_IDS:
        source = sources_by_id.get(source_id)
        if source is None:
            raise AssertionError(f"published palette source is absent: {source_id}")
        require_https_url(source["retrieval_url"], f"{source_id}.retrieval_url")
        direct_official_url = source.get("direct_official_url")
        if direct_official_url:
            require_https_url(
                direct_official_url, f"{source_id}.direct_official_url"
            )
        historical_official_url = source.get("historical_official_url")
        if historical_official_url:
            require_https_url(
                historical_official_url, f"{source_id}.historical_official_url"
            )
            if historical_official_url == source["retrieval_url"]:
                raise AssertionError(
                    f"historical URL duplicates the byte-verifying retrieval URL: {source_id}"
                )
        if source_id in PUBLISHED_FLEET_SOURCE_IDS:
            authority = source.get("document_authority")
            if authority == "official_manufacturer_live":
                if not direct_official_url or not direct_official_url.startswith(
                    "https://www.gmfleet.com/"
                ):
                    raise AssertionError(
                        f"published live Fleet Guide is not GM-hosted: {source_id}"
                    )
            elif authority == "official_manufacturer_document_archival_mirror":
                if urlsplit(source["retrieval_url"]).hostname != "xr793.com":
                    raise AssertionError(
                        f"published archival Fleet Guide has an unexpected host: {source_id}"
                    )
            else:
                raise AssertionError(
                    f"published Fleet Guide has an unexpected authority: {source_id}"
                )
        if source_id in PUBLISHED_ORDER_GUIDE_SOURCE_IDS:
            release_entry = release_entries_by_source.get(source_id)
            if release_entry is None:
                raise AssertionError(
                    f"published Order Guide source is absent from release manifest: {source_id}"
                )
            for key, release_key in (
                ("sha256", "sha256"),
                ("bytes", "bytes"),
                ("page_count", "pdf_page_count"),
                ("archive_url", "archive_url"),
            ):
                if source.get(key) != release_entry.get(release_key):
                    raise AssertionError(
                        f"published Order Guide release metadata drifted: {source_id}.{key}"
                    )
            if release_entry.get("artifact_status") != "retained_exact_snapshot":
                raise AssertionError(
                    f"published Order Guide artifact is not retained: {source_id}"
                )
            if release_entry.get("review_status") != "cited_pages_visually_reviewed":
                raise AssertionError(
                    f"published Order Guide pages are not visually reviewed: {source_id}"
                )
        elif source_id not in readers:
            raise AssertionError(
                f"published palette source is not retained locally: {source_id}"
            )

    published_tables = [
        table
        for table in tables
        if table["source_id"] in PUBLISHED_PALETTE_SOURCE_IDS
    ]
    if len(published_tables) != EXPECTED_PUBLISHED_TABLES:
        raise AssertionError("published palette table count is stale")

    published_page_references: set[tuple[str, int]] = set()
    published_assertions = 0
    text_cache: dict[tuple[str, int], str] = {}
    applications: list[tuple[str, int, str]] = []

    for table in tables:
        source = sources_by_id.get(table["source_id"])
        if source is None:
            raise AssertionError(f"palette table references an absent source: {table['table_id']}")
        if table["market"] != "United States":
            raise AssertionError(f"palette table has unexpected market: {table['table_id']}")
        if not table["catalog_model_ids"]:
            raise AssertionError(f"palette table has no catalog model: {table['table_id']}")
        unknown_models = sorted(set(table["catalog_model_ids"]) - model_ids)
        if unknown_models:
            raise AssertionError(
                f"palette table has unknown catalog models: {table['table_id']} {unknown_models}"
            )
        if not table["pdf_pages"] or not table["colors"]:
            raise AssertionError(f"palette table is empty: {table['table_id']}")
        if len(table["colors"]) != len(set(table["colors"])):
            raise AssertionError(f"palette table repeats a color: {table['table_id']}")
        factory_codes = table.get("factory_codes") or {}
        touch_up_codes = table.get("touch_up_codes") or {}
        color_restrictions = table.get("color_restrictions") or {}
        unknown_code_colors = sorted(set(factory_codes) - set(table["colors"]))
        unknown_touch_up_colors = sorted(
            set(touch_up_codes) - set(table["colors"])
        )
        unknown_restriction_colors = sorted(
            set(color_restrictions) - set(table["colors"])
        )
        if unknown_code_colors:
            raise AssertionError(
                f"palette factory codes reference absent colors: "
                f"{table['table_id']} {unknown_code_colors}"
            )
        if unknown_touch_up_colors:
            raise AssertionError(
                f"palette touch-up codes reference absent colors: "
                f"{table['table_id']} {unknown_touch_up_colors}"
            )
        if unknown_restriction_colors:
            raise AssertionError(
                f"palette restrictions reference absent colors: "
                f"{table['table_id']} {unknown_restriction_colors}"
            )
        for page in table["pdf_pages"]:
            if page < 1 or page > source["page_count"]:
                raise AssertionError(f"palette page exceeds source length: {table['table_id']}")
        if table["source_id"] not in PUBLISHED_PALETTE_SOURCE_IDS:
            continue
        for model_id in table["catalog_model_ids"]:
            applications.append((model_id, table["model_year"], table["source_id"]))
        if table["ingestion_status"] != "ready_palette_union":
            raise AssertionError(f"published table is not ingestion-ready: {table['table_id']}")
        combined_text = []
        for page in table["pdf_pages"]:
            published_page_references.add((table["source_id"], page))
            cache_key = (table["source_id"], page)
            if cache_key not in text_cache:
                if table["source_id"] in readers:
                    raw_text = (
                        readers[table["source_id"]].pages[page - 1].extract_text()
                        or ""
                    )
                else:
                    release_entry = release_entries_by_source[table["source_id"]]
                    cited_page = next(
                        (
                            item
                            for item in release_entry["cited_pages"]
                            if item["pdf_page"] == page
                        ),
                        None,
                    )
                    if cited_page is None:
                        raise AssertionError(
                            f"published Order Guide page is absent from release review: "
                            f"{table['table_id']} p. {page}"
                        )
                    if (
                        cited_page.get("visual_review_status")
                        != "visually_verified_exact_snapshot"
                    ):
                        raise AssertionError(
                            f"published Order Guide page lacks exact visual review: "
                            f"{table['table_id']} p. {page}"
                        )
                    raw_text = cited_page["visual_review_finding"]
                text_cache[cache_key] = normalized_pdf_text(raw_text)
            combined_text.append(text_cache[cache_key])
        page_text = " ".join(combined_text)
        for color in table["colors"]:
            published_assertions += 1
            if normalized_pdf_text(color) not in page_text:
                raise AssertionError(
                    f"color is absent from cited page text: {table['table_id']} / {color}"
                )
            factory_code = factory_codes.get(color)
            if factory_code and normalized_pdf_text(factory_code) not in page_text:
                raise AssertionError(
                    f"factory code is absent from cited page text: "
                    f"{table['table_id']} / {color} / {factory_code}"
                )
            touch_up_code = touch_up_codes.get(color)
            if touch_up_code and normalized_pdf_text(touch_up_code) not in page_text:
                raise AssertionError(
                    f"touch-up code is absent from cited page review: "
                    f"{table['table_id']} / {color} / {touch_up_code}"
                )

    if len(published_page_references) != EXPECTED_PUBLISHED_PAGE_REFERENCES:
        raise AssertionError("published palette page-reference count is stale")
    if published_assertions != EXPECTED_PUBLISHED_COLOR_ASSERTIONS:
        raise AssertionError("published palette color-assertion count is stale")
    application_sources: dict[tuple[str, int], set[str]] = {}
    for model_id, year, source_id in applications:
        application_sources.setdefault((model_id, year), set()).add(source_id)
    conflicting_applications = sorted(
        f"{model_id}:{year}"
        for (model_id, year), source_ids in application_sources.items()
        if len(source_ids) > 1
        and frozenset(source_ids)
        != ALLOWED_APPLICATION_SOURCE_SETS.get((model_id, year))
    )
    if conflicting_applications:
        raise AssertionError(
            "palette model-year applications overlap source revisions: "
            f"{conflicting_applications[:5]}"
        )
    for application, expected_source_ids in ALLOWED_APPLICATION_SOURCE_SETS.items():
        if frozenset(application_sources.get(application, set())) != expected_source_ids:
            raise AssertionError(
                "audited multi-source palette application drifted: "
                f"{application}"
            )

    for sample in samples:
        if sample["source_id"] not in sources_by_id:
            raise AssertionError(f"order-guide sample references an absent source: {sample['sample_id']}")
        unknown_models = sorted(set(sample["catalog_model_ids"]) - model_ids)
        if unknown_models:
            raise AssertionError(
                f"order-guide sample has unknown catalog models: {sample['sample_id']}"
            )
        require_https_url(sample["api_endpoint"], f"{sample['sample_id']}.api_endpoint")
        if sample["raw_response_archived"]:
            raise AssertionError(
                "the current order-guide sample claims an archive without an immutable artifact"
            )

    print(
        json.dumps(
            {
                "status": "ok",
                "sources": len(sources),
                "retained_pdfs": len(local_sources),
                "retained_pdf_bytes": EXPECTED_LOCAL_PDF_BYTES,
                "retained_pdf_pages": EXPECTED_LOCAL_PDF_PAGES,
                "published_palette_tables": len(published_tables),
                "published_page_references": len(published_page_references),
                "published_color_assertions": published_assertions,
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
