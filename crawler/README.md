---
title: Chevrolet Color Archive crawler
visibility: public
classification: archive-internal
sources: crawler/manifests
---

# Chevrolet Color Archive crawler

This directory contains the official-source research pipeline. It is deliberately
separate from the public site and from any publication data. Its output is an
evidence queue, not a set of automatically verified availability claims.

## Guarantees

- Every network request originates in a reviewed JSONL manifest.
- Only allowlisted hosts and HTTPS are accepted by default.
- Per-host request slots enforce a configurable minimum interval across workers.
- Downloads stream to a spool file until the response ends.
- A declared byte length must match before a PDF can be promoted.
- Partial downloads resume only with a saved ETag or Last-Modified validator.
- A PDF signature, an end marker, a minimum size, and a maximum size are checked.
- Complete PDF bytes are stored by SHA-256 and never overwritten.
- Identical bytes from different source records share one stored object.
- Fetch history, redirects, safe response metadata, and source-to-object links
  remain in SQLite.
- PDF inspection, native text extraction, OCR, and parsing are separate leased
  jobs. Expired leases can be reclaimed.
- Full page text is preserved as a derived artifact with its own SHA-256.
- Automated color rows are exported as unreviewed candidates. The parser never
  changes a candidate to `verified`.
- Missing extraction is not evidence that a color was unavailable.

## Layout

```text
crawler/
  chevy_archive/       Python implementation
  manifests/           reviewed source queues, including the full GM inventory
  tests/               small, offline fixtures and unit tests
  cli.py               command line entry point
  config.example.json  non-secret example
```

Runtime state is outside the repository:

```text
crawler-state/
  queue.sqlite3
  objects/sha256/       immutable complete PDFs
  spool/                incomplete downloads retained for resume
  derived/text/         complete page text
  tmp/                  disposable renderer files
```

## Quick start

From the repository root:

```bash
python crawler/cli.py --config crawler/config.example.json init
python crawler/cli.py --config crawler/config.example.json enqueue \
  --manifest crawler/manifests/gm-heritage-camaro-1967-1969.jsonl
python crawler/cli.py --config crawler/config.example.json status
python crawler/cli.py --config crawler/config.example.json work --max-jobs 25
python crawler/cli.py --config crawler/config.example.json reconcile
python crawler/cli.py --config crawler/config.example.json audit --full-hash
python crawler/cli.py --config crawler/config.example.json export \
  --output /path/outside/repo/color-candidates.jsonl
```

The repository also ships a deterministic queue for every official Chevrolet PDF
in the GM Heritage inventory. Rebuild it after refreshing the official source
snapshot, then enqueue it on the VPS:

```bash
npm run crawler:manifest
python crawler/cli.py --config crawler/config.json enqueue \
  --manifest crawler/manifests/gm-heritage-chevrolet-all.jsonl
```

The full queue currently contains 691 official PDFs covering every Chevrolet
entry exposed by GM Heritage from 1913 through 2007. It is a discovery queue,
not proof that every PDF contains a paint chart. Later model years require
separate official brochure and order-guide manifests.

`gm-heritage-camaro-1967-1969.jsonl` is the original bounded crawler example.
Its three URLs and PDF hashes are already present in the complete 691-entry
manifest under canonical index-derived source IDs. If both manifests exist in
one crawler database, the color-table extractor verifies those exact
URL/hash/metadata matches and suppresses the three legacy aliases before
sharding. They are not three additional documents.

`work --max-jobs 0` continues until no eligible job remains. Multiple workers
may use the same SQLite database, but the deployment runbook recommends starting
with one native-text worker and one OCR worker. SQLite leases prevent two workers
from claiming the same job.

Run the offline tests:

```bash
python -m unittest discover -s crawler/tests -v
```

## Queue stages

1. `fetch_source` downloads and validates all source bytes.
2. `inspect_pdf` records the exact PDF page count.
3. `extract_page` preserves native text for one PDF page.
4. `ocr_page` renders and OCRs only a weak or empty native-text page.
5. `parse_page` emits color candidates with a PDF page and text-line locator.

Jobs are unique by a deterministic `dedupe_key`. A job may be `queued`,
`leased`, `failed`, `dead`, or `done`. Failures use exponential delay. A dead
job requires an explicit retry:

```bash
python crawler/cli.py --config crawler/config.json retry --job-id 123
```

Run `reconcile` after restoring state or changing extraction code. It schedules
only missing work for current artifacts. When parser behavior changes,
`PARSER_VERSION` must also change; that version is part of each parse-job key
and exported candidate.

See [the data contract](../docs/crawler-data-contract.md) and
[the VPS runbook](../docs/crawler-vps-runbook.md).
