#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

CRAWLER_ROOT = Path(__file__).resolve().parent
if str(CRAWLER_ROOT) not in sys.path:
    sys.path.insert(0, str(CRAWLER_ROOT))

from chevy_archive.config import CrawlerConfig
from chevy_archive.db import Database
from chevy_archive.pipeline import (
    enqueue_manifest,
    reconcile_current_documents,
    run_one_job,
)
from chevy_archive.reporting import audit_state, export_candidates


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Resumable official-source crawler for the Chevrolet Color Archive"
    )
    parser.add_argument(
        "--config",
        required=True,
        help="Path to a JSON configuration file",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init", help="Create state directories and initialize SQLite")
    subparsers.add_parser(
        "reconcile",
        help="Schedule missing derived work for every current source artifact",
    )

    enqueue = subparsers.add_parser("enqueue", help="Validate and enqueue a JSONL manifest")
    enqueue.add_argument("--manifest", required=True)

    work = subparsers.add_parser("work", help="Lease and process queued jobs")
    work.add_argument(
        "--max-jobs",
        type=int,
        default=1,
        help="Maximum jobs to attempt; 0 means continue until the queue is idle",
    )
    work.add_argument(
        "--kinds",
        help="Optional comma-separated job kinds",
    )
    work.add_argument("--owner", help="Stable worker name for lease diagnostics")

    status = subparsers.add_parser("status", help="Show queue and corpus counts")
    status.add_argument("--json", action="store_true", dest="as_json")

    export = subparsers.add_parser(
        "export", help="Write normalized, unreviewed candidates as JSONL"
    )
    export.add_argument("--output", required=True)

    audit = subparsers.add_parser("audit", help="Check stored objects and queue health")
    audit.add_argument(
        "--full-hash",
        action="store_true",
        help="Recompute SHA-256 for every immutable source object",
    )
    audit.add_argument("--output", help="Optional JSON report path")

    retry = subparsers.add_parser("retry", help="Requeue one failed or dead job")
    retry.add_argument("--job-id", type=int, required=True)
    return parser


def _print_status(stats: dict) -> None:
    print(f"sources: {stats['sources']}")
    print(f"artifacts: {stats['artifacts']}")
    print(f"pdf_documents: {stats['pdf_documents']}")
    print(f"candidates: {stats['candidates']}")
    print("jobs:")
    for state in ("queued", "leased", "failed", "dead", "done"):
        print(f"  {state}: {stats['jobs'].get(state, 0)}")
    print("page_text:")
    for status in ("usable", "weak", "empty", "unreadable"):
        print(f"  {status}: {stats['page_text'].get(status, 0)}")


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    config = CrawlerConfig.from_file(args.config)
    config.ensure_directories()
    db = Database(config.db_path)
    try:
        db.initialize()
        if args.command == "init":
            print(json.dumps({"initialized": True, "db": str(config.db_path)}))
            return 0
        if args.command == "enqueue":
            result = enqueue_manifest(db, config, args.manifest)
            print(json.dumps(result, sort_keys=True))
            return 0
        if args.command == "reconcile":
            count = reconcile_current_documents(db, config)
            print(json.dumps({"current_artifacts_reconciled": count}, sort_keys=True))
            return 0
        if args.command == "work":
            if args.max_jobs < 0:
                raise ValueError("--max-jobs must be zero or greater")
            kinds = (
                [item.strip() for item in args.kinds.split(",") if item.strip()]
                if args.kinds
                else None
            )
            attempted = 0
            while args.max_jobs == 0 or attempted < args.max_jobs:
                job = run_one_job(db, config, owner=args.owner, kinds=kinds)
                if job is None:
                    break
                attempted += 1
                print(
                    json.dumps(
                        {
                            "job_id": job.job_id,
                            "kind": job.kind,
                            "attempt": job.attempts,
                        },
                        sort_keys=True,
                    )
                )
            print(json.dumps({"attempted": attempted, "idle": True}, sort_keys=True))
            return 0
        if args.command == "status":
            stats = db.stats()
            if args.as_json:
                print(json.dumps(stats, indent=2, sort_keys=True))
            else:
                _print_status(stats)
            return 0
        if args.command == "export":
            count = export_candidates(db, args.output)
            print(json.dumps({"records": count, "output": str(Path(args.output).resolve())}))
            return 0
        if args.command == "audit":
            report = audit_state(db, config, full_hash=args.full_hash)
            rendered = json.dumps(report, indent=2, sort_keys=True)
            if args.output:
                output_path = Path(args.output)
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_text(rendered + "\n", encoding="utf-8")
            print(rendered)
            return 0 if report["ok"] else 2
        if args.command == "retry":
            db.requeue_job(args.job_id)
            print(json.dumps({"requeued_job_id": args.job_id}))
            return 0
        raise AssertionError(f"unhandled command: {args.command}")
    finally:
        db.close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, ValueError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(2)
