---
title: GM official color-table research corpus
visibility: public
classification: archive-internal
sources:
  - data/sources/gm-heritage-chevrolet-artifacts.json
  - crawler/manifests/gm-heritage-chevrolet-all.jsonl
  - tmp/gm-color-tables
---

# GM official color-table research corpus

This directory holds the compact, deterministic review corpus produced only
after every numbered extraction shard passes consolidation. It is not a table
of verified Chevrolet color availability.

Generated files:

- `source_documents.parquet` contains all 691 official GM source-document
  identities and immutable PDF provenance.
- `candidate_pages.parquet` contains possible color-chart pages, exact retained
  text/render paths, hashes, byte lengths, extraction details, and review state.
- `color_candidates.parquet` contains source-literal automated row candidates
  for human review.
- `manifest.json` records the schemas, primary and foreign keys, input-shard
  hashes, output hashes, evidence-file audit totals, corpus fingerprint, and
  interpretation caveats.

The ignored `tmp/gm-color-tables` extraction artifact is load-bearing evidence.
It retains complete native/OCR page text and 300 DPI page renders. Those files
are intentionally not copied into Git. Resolve every `text_relpath` and
`render_relpath` against that exact extraction root. Preserve that root as a
unit with the tracked corpus and its manifest.

Do not promote any candidate without visually comparing the retained page
render and official PDF. Missing candidates do not prove unavailability.

After all four `run-summary.part-N-of-00004.json` files and their JSONL and
Parquet siblings exist, run from the repository root:

```powershell
python scripts/consolidate-gm-color-tables.py
```

The command refuses incomplete numbering, mixed shard counts, source-ledger
drift, JSONL/Parquet disagreement, broken primary or foreign keys, repeated
provenance drift, unsafe evidence paths, and missing or hash-mismatched text or
render evidence. It validates everything before replacing generated files in
this directory.
