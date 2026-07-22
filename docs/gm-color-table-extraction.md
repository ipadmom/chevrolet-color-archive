---
title: Official GM color-table extraction
visibility: public
classification: archive-internal
sources:
  - crawler/manifests/gm-heritage-chevrolet-all.jsonl
  - crawler/chevy_archive/color_table_batch.py
---

# Official GM color-table extraction

The 691-record GM Heritage manifest is an official-source discovery corpus. It
does not imply that every kit contains an exterior-color chart. The color-table
stage reads only complete, hash-verified PDFs already admitted by the crawler.
It does not fetch independently, change public archive data, or assert negative
availability.

The crawler state may also contain three legacy first-generation Camaro source
IDs from `gm-heritage-camaro-1967-1969.jsonl`. Those rows resolve to the same
three URLs, titles, scopes, complete-file hashes, byte lengths, object paths,
and final URLs already present in the 691-entry index manifest. The extractor
suppresses an alias only after every one of those fields matches its named
canonical record. A mismatch is a hard error. The complete extraction therefore
contains 691 unique official source documents, not 694 source-ID rows.

## Full resumable run

The extraction host needs Tesseract with English language data, PyMuPDF, and
PyArrow. Verify them before a large run:

```bash
tesseract --version
tesseract --list-langs | grep '^eng$'
python -c 'import fitz, pyarrow; print(fitz.version[0], pyarrow.__version__)'
```

First finish the official crawler fetch into a state directory. Run the
crawler's full-hash audit, verify free disk against the crawler runbook, then
run:

```bash
python scripts/extract-gm-color-tables.py \
  --state-root /var/lib/chevy-colors/state \
  --output /var/lib/chevy-colors/exports/gm-color-tables
```

The extractor is resumable at page level. It preserves complete native or OCR
text for every page considered under `derived/page-text/`. Image-only pages are
OCRed at discovery resolution. Pages scoring as possible exterior-color tables
are rendered at 300 DPI, OCRed again with table-oriented segmentation, and
retained under `renders/`. Cached text is reused only when the artifact hash,
page number, OCR engine, and DPI match.

For a large corpus, use stable source-ID shards in one shared output directory.
Each worker writes distinct `part-N-of-M` JSONL, Parquet, and summary files;
content-addressed page text and source-specific render paths do not collide:

```bash
seq 0 7 | xargs -P 8 -I SHARD \
  python scripts/extract-gm-color-tables.py \
    --state-root /var/lib/chevy-colors/state \
    --output /var/lib/chevy-colors/exports/gm-color-tables \
    --shard-count 8 --shard-index SHARD \
    --resume
```

Each completed source receives an atomic, configuration-addressed checkpoint
under `derived/source-checkpoints/`. `--resume` validates the source artifact
identity and every referenced text and render digest before reusing a
checkpoint. A killed shard can restart without losing completed sources or
silently accepting partial output.

The Parquet part files are a directly readable dataset. Keep worker count within
the host's CPU, RAM, and temporary-disk budget. Do not run this corpus on a host
that fails the crawler runbook's 20-percent-free disk preflight.

For a bounded validation or a known locator, repeat `--page`:

```bash
python scripts/extract-gm-color-tables.py \
  --state-root ./tmp/gm-color-extraction/state \
  --output ./tmp/gm-color-extraction/output \
  --page gm-heritage-1977-chevrolet-suburban:6 \
  --page gm-heritage-1977-chevrolet-suburban:7 \
  --page gm-heritage-2001-chevrolet-tahoe:12
```

`--page` is a research accelerator, not a completeness claim. Omit it for the
full scan.

## Normalized outputs

Each table is written as JSONL and Parquet:

- `source_documents` records source identity, direct and final URLs, title,
  model/year scope, PDF metadata, retrieval time, complete-file SHA-256 and
  bytes, object path, and page count.
- `candidate_pages` records the one-based PDF page, detected printed-page
  locator, document revision/date text, complete page-text hash and path,
  extraction method and engine, page score, restrictions, and retained render
  hash, bytes, dimensions, and path.
- `color_candidates` is the flattened review queue. Every row repeats its
  source ID, direct URL, title, model/year, revision/date, PDF and printed-page
  locator, retrieval time, source hash and bytes, extraction method, confidence,
  full-text reference, and rendered-page reference. Paint names, codes,
  two-tone counterparts, and restriction context remain source-literal.

The repeated provenance fields make each candidate independently traceable and
safe to concatenate into a larger Parquet corpus. `candidate_id` is stable for
the source artifact, page, row type, paint code, and literal name.

## Visual review boundary

Every page that produces candidate rows has a retained PNG. Automated rows stay
`unreviewed_candidate`, even when a page is high confidence. A visual-review
JSONL may be supplied with `--visual-review-jsonl` to record that a page layout
was inspected:

```json
{"source_id":"gm-heritage-1977-chevrolet-suburban","pdf_page":6,"status":"layout_inspected","reviewed_at":"2026-07-20T00:00:00Z","reviewer":"reviewer name","notes":"Primary colors are boldface; secondary rows must not be promoted as solid colors."}
```

`layout_inspected` does not verify individual rows. Promotion still requires a
human to compare every name, code, restriction, model/body/package scope,
revision, and printed-page locator against the retained page image. An empty
candidate set means only “not yet extracted.”

## Parser limits

The GM kits contain scans, prose lists, boldface primary/secondary tables,
application grids, two-tone combinations, stripes, and revised dealer-order
guides. OCR does not reliably preserve boldface, column boundaries, or checkbox
meaning. The extractor therefore favors recall and provenance over automatic
publication. Low-confidence or code-null rows are useful review leads, not
factory-availability findings.
