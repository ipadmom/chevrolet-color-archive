from __future__ import annotations

import json
from pathlib import Path

import pyarrow.parquet as pq


ROOT = Path(__file__).resolve().parents[1]
PARQUET = ROOT / "data" / "parquet"


def read_rows(name: str) -> list[dict]:
    return pq.read_table(PARQUET / f"{name}.parquet").to_pylist()


def test_every_reviewed_current_model_photo_link_is_qualified_and_source_linked() -> None:
    photo_links = read_rows("photo_color_links")
    source_links = read_rows("source_links")
    sources = {row["source_id"]: row for row in read_rows("sources")}
    reviewed = json.loads(
        (ROOT / "data" / "photos" / "current-model-color-photo-links.json")
        .read_text(encoding="utf-8")
    )["links"]
    assert len(reviewed) == 9

    for expected in reviewed:
        matches = [
            row
            for row in photo_links
            if row["photo_id"] == expected["photo_id"]
            and row["model_id"] == expected["model_id"]
            and row["model_year"] == expected["model_year"]
            and row["archive_color_key"] == expected["archive_color_key"]
        ]
        assert len(matches) == 1
        link = matches[0]
        assert link["visual_review_status"] == "reviewed"
        assert link["factory_paint_match_status"] == "unverified"
        assert "factory-paint identity remains unverified" in link["note"]

        linked_sources = [
            row
            for row in source_links
            if row["entity_type"] == "photo_color_link"
            and row["entity_id"] == link["photo_color_link_id"]
        ]
        assert {row["claim_type"] for row in linked_sources} == {
            "photo_color_caption_reference",
            "photo_color_palette_reference",
        }
        assert all(
            row["confidence"] == "qualified_example_only"
            for row in linked_sources
        )
        urls = {
            sources[row["source_id"]]["canonical_url"]
            for row in linked_sources
        }
        assert urls == {
            expected["commons_source_page_url"],
            expected["palette_source_url"],
        }


def test_published_and_rejected_current_model_photo_sources_are_normalized() -> None:
    queue = json.loads(
        (ROOT / "data" / "photos" / "current-model-color-photo-crawl-queue.json")
        .read_text(encoding="utf-8")
    )
    source_links = read_rows("source_links")
    sources = {row["source_id"]: row for row in read_rows("sources")}

    candidate_links = [
        row
        for row in source_links
        if row["entity_type"] == "photo_color_research_candidate"
    ]
    assert queue["queued_candidates"] == []
    assert len(queue["published_candidates"]) == 8
    assert candidate_links == []

    rejected_links = [
        row
        for row in source_links
        if row["entity_type"] == "photo_color_rejected_lead"
    ]
    assert len(rejected_links) == len(queue["rejected_or_unresolved"])
    assert all(
        row["claim_type"] == "photo_color_candidate_rejection"
        and row["confidence"] == "rejected_or_unresolved"
        for row in rejected_links
    )
    rejected_urls = {
        sources[row["source_id"]]["canonical_url"] for row in rejected_links
    }
    assert rejected_urls == {
        item["source_page_url"] for item in queue["rejected_or_unresolved"]
    }
