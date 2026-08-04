from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
RELEASE_TAG = "brochure-source-archive-v1"
RELEASE_BASE = (
    "https://github.com/ipadmom/chevrolet-color-archive/releases/download/"
    f"{RELEASE_TAG}/"
)
MANIFEST_PATH = ROOT / "data" / "sources" / "brochure-source-release-manifest.json"
ARTIFACT_LEDGER_PATH = (
    ROOT / "data" / "sources" / "gm-heritage-chevrolet-artifacts.json"
)
STAGING_ROOT = ROOT / "tmp" / "release-staging" / RELEASE_TAG
AUDIT_CONTRACTS = (
    (
        ROOT / "data" / "audits" / "corvette-official-palettes-1963-1972.json",
        "controlling_exact_palette_vehicle_information_kit",
    ),
    (
        ROOT
        / "data"
        / "audits"
        / "monte-carlo-official-palettes-1970-1979.json",
        "controlling_exact_palette_vehicle_information_kit",
    ),
    (
        ROOT / "data" / "audits" / "p-series-official-palettes-1969-1978.json",
        "supporting_reviewed_partial_vehicle_information_kit",
    ),
)


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def asset_name(source_id: str) -> str:
    match = re.fullmatch(r"gm-heritage-(\d{4})-chevrolet-(.+)", source_id)
    if not match:
        raise ValueError(f"unsupported official source ID: {source_id}")
    year, model = match.groups()
    return f"{year}-chevrolet-{model}-vehicle-information-kit-gm.pdf"


def main() -> int:
    manifest = load_json(MANIFEST_PATH)
    artifact_ledger = load_json(ARTIFACT_LEDGER_PATH)
    artifacts_by_source_id = {
        entry["source_id"]: entry for entry in artifact_ledger["entries"]
    }
    existing_by_name = {entry["asset_name"]: entry for entry in manifest["entries"]}
    existing_by_source_id = {
        entry["source_id"]: entry
        for entry in manifest["entries"]
        if entry.get("source_id")
    }
    new_entries = []
    audited_files = []
    STAGING_ROOT.mkdir(parents=True, exist_ok=True)

    for audit_path, default_role in AUDIT_CONTRACTS:
        audit = load_json(audit_path)
        for source in audit["sources"]:
            source_id = source["source_id"]
            artifact = artifacts_by_source_id.get(source_id)
            if not artifact:
                raise ValueError(f"artifact ledger has no {source_id}")
            expected = {
                "artifact_sha256": source["artifact_sha256"],
                "byte_length": source["artifact_bytes"],
                "pdf_page_count": source["pdf_page_count"],
                "canonical_url": source["url"],
            }
            for key, value in expected.items():
                if artifact.get(key) != value:
                    raise ValueError(
                        f"artifact contract drift for {source_id}: {key}"
                    )
            name = asset_name(source_id)
            if name in existing_by_name or source_id in existing_by_source_id:
                raise ValueError(f"Release manifest already contains {source_id}")
            object_path = (
                ROOT
                / "tmp"
                / "crawler-state"
                / "objects"
                / "sha256"
                / artifact["crawler_object_relpath"]
            )
            if not object_path.is_file():
                raise ValueError(f"retained object is missing: {source_id}")
            if object_path.stat().st_size != source["artifact_bytes"]:
                raise ValueError(f"retained byte count drifted: {source_id}")
            if sha256_file(object_path) != source["artifact_sha256"]:
                raise ValueError(f"retained SHA-256 drifted: {source_id}")
            if len(PdfReader(object_path).pages) != source["pdf_page_count"]:
                raise ValueError(f"retained PDF page count drifted: {source_id}")
            staged_path = STAGING_ROOT / name
            shutil.copyfile(object_path, staged_path)
            if (
                staged_path.stat().st_size != source["artifact_bytes"]
                or sha256_file(staged_path) != source["artifact_sha256"]
            ):
                raise ValueError(f"staged artifact drifted: {source_id}")
            role = (
                "controlling_exact_palette_vehicle_information_kit"
                if source_id == "gm-heritage-1978-chevrolet-motorhome"
                else default_role
            )
            archive_url = f"{RELEASE_BASE}{name}"
            entry = {
                "asset_name": name,
                "archive_url": archive_url,
                "sha256": source["artifact_sha256"],
                "bytes": source["artifact_bytes"],
                "role": role,
                "source_id": source_id,
                "original_source_url": source["url"],
                "pdf_page_count": source["pdf_page_count"],
            }
            new_entries.append(entry)
            source["archive_url"] = archive_url
            source["limitations"] = [
                limitation
                for limitation in source.get("limitations", [])
                if not re.search(
                    r"archive_url|GitHub Release|copied to a GitHub release",
                    limitation,
                    re.I,
                )
            ]
        audit["unresolved"] = [
            issue
            for issue in audit.get("unresolved", [])
            if not (
                isinstance(issue, str)
                and re.search(
                    r"archive_url|GitHub Release|copied to a GitHub release",
                    issue,
                    re.I,
                )
            )
        ]
        audited_files.append((audit_path, audit))

    if len(new_entries) != 31:
        raise ValueError(f"expected 31 new PDFs, got {len(new_entries)}")
    if len({entry["asset_name"].casefold() for entry in new_entries}) != 31:
        raise ValueError("new Release asset names are not unique")
    if len({entry["sha256"] for entry in new_entries}) != 31:
        raise ValueError("new Release artifacts are not byte-distinct")

    pre_snapshot_entries = sorted(
        [*manifest["entries"], *new_entries], key=lambda entry: entry["asset_name"]
    )
    covered_count = len(pre_snapshot_entries)
    checksum_name = f"source-sha256-manifest-{covered_count}-reviewed.txt"
    if checksum_name in existing_by_name:
        raise ValueError(f"checksum snapshot already exists: {checksum_name}")
    checksum_text = "".join(
        f"{entry['sha256']}  {entry['asset_name']}\n"
        for entry in pre_snapshot_entries
    )
    checksum_path = STAGING_ROOT / checksum_name
    checksum_path.write_text(checksum_text, encoding="utf-8", newline="")
    checksum_entry = {
        "asset_name": checksum_name,
        "archive_url": f"{RELEASE_BASE}{checksum_name}",
        "sha256": sha256_file(checksum_path),
        "bytes": checksum_path.stat().st_size,
        "role": "checksum_manifest_snapshot",
        "source_id": None,
        "original_source_url": None,
    }
    manifest["entries"] = sorted(
        [*pre_snapshot_entries, checksum_entry],
        key=lambda entry: entry["asset_name"],
    )
    manifest["captured_at"] = "2026-08-04"
    scope_sentence = (
        " It also retains 31 exact official GM vehicle information kits used by "
        "the 1963-1972 Corvette, 1970-1979 Monte Carlo, and 1969-1978 "
        "P-Series and Step-Van audits, including reviewed partial evidence that "
        "was not promoted to a complete palette."
    )
    if "31 exact official GM vehicle information kits" not in manifest["scope"]:
        manifest["scope"] += scope_sentence

    if len(manifest["entries"]) != 174:
        raise ValueError(
            f"expected 174 manifest entries, got {len(manifest['entries'])}"
        )
    pdf_entries = [
        entry for entry in manifest["entries"] if entry["asset_name"].endswith(".pdf")
    ]
    if (
        len(pdf_entries) != 148
        or sum(entry["bytes"] for entry in pdf_entries) != 1_565_404_205
        or sum(entry["pdf_page_count"] for entry in pdf_entries) != 11_600
    ):
        raise ValueError("expanded PDF closure does not match the audited totals")

    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline=""
    )
    for audit_path, audit in audited_files:
        audit_path.write_text(
            json.dumps(audit, indent=2) + "\n", encoding="utf-8", newline=""
        )
    print(
        json.dumps(
            {
                "new_pdf_assets": len(new_entries),
                "new_pdf_bytes": sum(entry["bytes"] for entry in new_entries),
                "new_pdf_pages": sum(
                    entry["pdf_page_count"] for entry in new_entries
                ),
                "checksum_asset": checksum_name,
                "checksum_sha256": checksum_entry["sha256"],
                "manifest_entries": len(manifest["entries"]),
                "pdf_assets": len(pdf_entries),
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
