#!/usr/bin/env python3
"""Fetch a reviewed current nameplate source batch and verify every artifact."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import time
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ALLOWED_HOSTS = {
    "gm.com",
    "www.gm.com",
    "www.auto-brochures.com",
    "xr793.com",
    "www.xr793.com",
    "directechs.blob.core.windows.net",
    "industrial.sherwin-williams.com",
    "www.nj.gov",
}
USER_AGENT = "ChevroletColorArchiveResearchBot/0.1 (+https://github.com/ipadmom)"


def digest(path: Path) -> tuple[int, str]:
    hasher = hashlib.sha256()
    size = 0
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            size += len(chunk)
            hasher.update(chunk)
    return size, hasher.hexdigest()


def validate_url(value: str) -> None:
    parsed = urlparse(value)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError(f"source URL is outside the official allowlist: {value}")


def fetch(url: str, target: Path, expected_bytes: int, expected_hash: str) -> None:
    validate_url(url)
    part = target.with_name(f".{target.name}.part")
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=180) as response, part.open("wb") as output:
        validate_url(response.geturl())
        hasher = hashlib.sha256()
        size = 0
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > expected_bytes:
                raise ValueError(f"download exceeded expected size for {target.name}")
            hasher.update(chunk)
            output.write(chunk)
        output.flush()
        os.fsync(output.fileno())
    if size != expected_bytes or hasher.hexdigest() != expected_hash:
        raise ValueError(f"download failed integrity for {target.name}")
    os.replace(part, target)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    plan = json.loads(args.plan.read_text(encoding="utf-8"))
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    by_source = {
        entry["source_id"]: entry
        for entry in manifest["entries"]
        if entry.get("source_id")
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)

    total_bytes = 0
    reused = 0
    downloaded = 0
    for index, asset in enumerate(plan["source_assets"], start=1):
        target = args.output_dir / asset["asset_name"]
        if target.exists():
            size, sha = digest(target)
            if size == asset["bytes"] and sha == asset["sha256"]:
                reused += 1
                total_bytes += size
                print(
                    f"verified {index}/{len(plan['source_assets'])} {target.name}",
                    flush=True,
                )
                continue
            invalid = target.with_name(f".{target.name}.invalid-{int(time.time())}")
            os.replace(target, invalid)

        source = by_source.get(asset["source_id"])
        if not source or not source.get("original_source_url"):
            raise ValueError(f"missing original source URL: {asset['source_id']}")
        last_error: Exception | None = None
        for attempt in range(1, 5):
            try:
                fetch(
                    source["original_source_url"],
                    target,
                    asset["bytes"],
                    asset["sha256"],
                )
                last_error = None
                break
            except Exception as error:  # noqa: BLE001
                last_error = error
                if attempt < 4:
                    time.sleep(min(2**attempt, 20))
        if last_error:
            raise last_error
        size, sha = digest(target)
        if size != asset["bytes"] or sha != asset["sha256"]:
            raise ValueError(f"staged artifact failed integrity: {target.name}")
        downloaded += 1
        total_bytes += size
        print(
            f"downloaded {index}/{len(plan['source_assets'])} {target.name}",
            flush=True,
        )

    checksum = plan["checksum_asset"]
    checksum_path = args.output_dir / checksum["asset_name"]
    checksum_size, checksum_hash = digest(checksum_path)
    if checksum_size != checksum["bytes"] or checksum_hash != checksum["sha256"]:
        raise ValueError("checksum snapshot failed integrity")

    print(
        json.dumps(
            {
                "status": "ok",
                "verified_source_assets": len(plan["source_assets"]),
                "reused": reused,
                "downloaded": downloaded,
                "verified_source_bytes": total_bytes,
                "checksum_asset": checksum["asset_name"],
            }
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
