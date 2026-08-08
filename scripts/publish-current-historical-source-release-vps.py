#!/usr/bin/env python3
"""Publish a verified source batch to the pinned GitHub Release."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import time


REPOSITORY = "ipadmom/chevrolet-color-archive"
RELEASE_TAG = "brochure-source-archive-v1"


def run_gh(arguments: list[str], environment: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["gh", *arguments],
        env=environment,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )


def release_assets(environment: dict[str, str]) -> dict[str, dict]:
    result = run_gh(
        ["api", f"repos/{REPOSITORY}/releases/tags/{RELEASE_TAG}"],
        environment,
    )
    if result.returncode:
        raise RuntimeError("GitHub Release inventory request failed")
    release = json.loads(result.stdout)
    return {asset["name"]: asset for asset in release["assets"]}


def verify_asset(asset: dict | None, expected: dict) -> bool:
    if not asset or asset["size"] != expected["bytes"]:
        return False
    digest = asset.get("digest")
    return digest == f"sha256:{expected['sha256']}"


def upload_asset(
    asset: dict,
    staging_root: Path,
    environment: dict[str, str],
    ordinal: str,
) -> None:
    live = release_assets(environment).get(asset["asset_name"])
    if live:
        if not verify_asset(live, asset):
            raise ValueError(f"conflicting live asset: {asset['asset_name']}")
        print(f"verified {ordinal} {asset['asset_name']}", flush=True)
        return

    source_path = staging_root / asset["asset_name"]
    for attempt in range(1, 4):
        result = run_gh(
            [
                "release",
                "upload",
                RELEASE_TAG,
                str(source_path),
                "--repo",
                REPOSITORY,
            ],
            environment,
        )
        live = release_assets(environment).get(asset["asset_name"])
        if verify_asset(live, asset):
            print(f"uploaded {ordinal} {asset['asset_name']}", flush=True)
            return
        if result.returncode == 0:
            raise ValueError(f"uploaded asset failed live digest check: {asset['asset_name']}")
        if live:
            raise ValueError(f"conflicting live asset after upload failure: {asset['asset_name']}")
        if attempt < 3:
            time.sleep(min(2**attempt, 10))
    raise RuntimeError(f"GitHub upload failed after retries: {asset['asset_name']}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--staging-root", type=Path, required=True)
    parser.add_argument("--token-file", type=Path, required=True)
    args = parser.parse_args()

    plan = json.loads(args.plan.read_text(encoding="utf-8"))
    environment = os.environ.copy()
    environment["GH_TOKEN"] = args.token_file.read_text(encoding="utf-8").strip()
    identity = run_gh(["api", "user", "--jq", ".login"], environment)
    if identity.returncode or identity.stdout.strip() != "ipadmom":
        raise RuntimeError("GitHub identity is not ipadmom")

    source_assets = plan["source_assets"]
    for index, asset in enumerate(source_assets, start=1):
        upload_asset(
            asset,
            args.staging_root,
            environment,
            f"{index}/{len(source_assets)}",
        )

    live_assets = release_assets(environment)
    for asset in source_assets:
        if not verify_asset(live_assets.get(asset["asset_name"]), asset):
            raise ValueError(f"source batch failed final live audit: {asset['asset_name']}")

    checksum = plan["checksum_asset"]
    upload_asset(checksum, args.staging_root, environment, "checksum")
    live_assets = release_assets(environment)
    if len(live_assets) != plan["final_manifest_entry_count"]:
        raise ValueError(
            "unexpected final Release asset count: "
            f"{len(live_assets)} != {plan['final_manifest_entry_count']}"
        )
    if not verify_asset(live_assets.get(checksum["asset_name"]), checksum):
        raise ValueError("checksum asset failed final live audit")

    print(
        json.dumps(
            {
                "status": "ok",
                "github_identity": "ipadmom",
                "verified_source_assets": len(source_assets),
                "verified_release_assets": len(live_assets),
                "checksum_asset": checksum["asset_name"],
            }
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
