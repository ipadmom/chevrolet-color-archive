---
title: GM color-table shard consolidation and validation
visibility: public
classification: archive-internal
sources:
  - data/sources/gm-heritage-chevrolet-artifacts.json
  - crawler/chevy_archive/color_table_batch.py
  - crawler/chevy_archive/color_table_corpus.py
---

# GM color-table shard consolidation and validation

`scripts/consolidate-gm-color-tables.py` is the gate between the ignored full
extraction artifact and the tracked research corpus. Run it only after all four
extractors have completed. The extractor writes each shard summary last, so a
complete set of numbered summaries, JSONL tables, and Parquet tables is the
completion signal.

The consolidator performs these checks before writing output:

1. The partition suffixes use one shard count and contain exactly indexes 0
   through 3. Every shard has three JSONL files, three Parquet files, and one
   run summary.
2. Each Parquet part has the extraction schema and exactly matches its JSONL
   sibling. Summary counts and derived provenance metrics match the rows.
3. `source_documents.source_id` is unique and exactly equals the 691-source
   immutable artifact ledger. URL, title, retrieval, PDF hash, byte length,
   object path, and page count agree with that ledger. Each source also appears
   in its deterministic hash-assigned shard.
4. Candidate-page `(source_id, pdf_page)` and color-candidate `candidate_id`
   keys are unique. Source and page foreign keys exist. Every provenance field
   repeated onto a page or candidate exactly matches its parent row.
5. Every text and render relative path stays inside the extraction root. The
   file exists, remains stable during hashing, and matches its recorded SHA-256
   and byte length.
6. Candidate IDs are recomputed from the same source-artifact, page, row kind,
   code, and source-literal color fields used by the extractor.

Only after those checks pass does the tool globally sort the three tables,
write deterministic Zstandard Parquet files in a temporary directory, create a
deterministic manifest, and atomically replace the generated files under
`data/research/gm-official-color-tables/`.

## Run

From the repository root:

```powershell
python scripts/consolidate-gm-color-tables.py
```

The defaults are intentionally pinned to this crawl:

- input: `tmp/gm-color-tables`
- artifact ledger: `data/sources/gm-heritage-chevrolet-artifacts.json`
- output: `data/research/gm-official-color-tables`
- expected shards: 4
- expected sources: 691

The three IDs in the legacy bounded Camaro manifest are exact aliases for
records already present in the 691-source ledger. The extractor suppresses
those aliases before it writes shard files. If older shard files were generated
from a crawler database containing all 694 source-ID rows, rerun each shard with
`--resume` using the current extractor before consolidation. Existing canonical
checkpoints are reused; the rewritten shard tables contain only the 691
canonical documents.

Use explicit paths and counts only for synthetic tests or a separately audited
future corpus:

```powershell
python scripts/consolidate-gm-color-tables.py `
  --input X:\complete-extraction `
  --output X:\compact-corpus `
  --artifact-ledger X:\artifact-ledger.json `
  --expected-shards 4 `
  --expected-sources 691
```

## Evidence boundary

The tracked Parquet files preserve exact evidence paths, hashes, and byte
lengths, but do not duplicate full OCR/native page text or 300 DPI renders.
Those remain under the ignored extraction root. `manifest.json` records this
boundary and the audited evidence-file totals.

All color rows remain automated research candidates. OCR can lose boldface,
table columns, checkbox semantics, restrictions, body-style scope, and two-tone
relationships. Human review against the retained render and complete official
PDF is mandatory. A missing row is never a finding that a color was
unavailable.
