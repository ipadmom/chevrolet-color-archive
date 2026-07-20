# Chevrolet photo candidate pipeline

This crawler finds possible vehicle photographs for human review. It does not
establish factory paint availability, originality, or color accuracy. Those
claims must come from the separate year-and-color source tables.

## What it stores

Each review record is keyed by make, model, year, and color. It can contain
multiple candidates. Every candidate includes:

- the Wikimedia Commons description page and original file URL;
- creator, license, attribution text, dimensions, MIME type, byte size, and
  Commons SHA-1;
- the exact search query, retrieval time, and selected vehicle context;
- an automatic rights status and the raw-response file that supplied it.

The crawler writes each complete API response to `raw/` before normalization.
The review manifest is a compact index over those preserved responses.
Duplicates within one vehicle/color record collapse deterministically by file
SHA-1, then Commons page ID, then URL hash. Query and raw-file provenance are
unioned rather than discarded.

## Discover candidates

Node 22.13 or newer is required. No package installation is needed.

```powershell
node crawler/photos/cli.mjs discover `
  --model Camaro `
  --year 1969 `
  --generation 1967-1969 `
  --color "Hugger Orange" `
  --query "1969 Chevrolet Camaro Hugger Orange" `
  --query "1969 Camaro orange" `
  --limit 20
```

Default local outputs:

- `crawler/photos/output/review-manifest.json`
- `crawler/photos/output/raw/*.json`

Use `--manifest` and `--raw-dir` to put generated working data elsewhere.
Running discovery again merges new candidates and provenance into the same
record without deleting reviewer selections.

## Review one or more choices

Get the record and candidate IDs from the manifest, then mark any number of
photographs as selected:

```powershell
node crawler/photos/cli.mjs review `
  --record-id "chevrolet|camaro|1969|hugger-orange" `
  --candidate "commons-sha1-0123456789abcdef0123" `
  --status selected `
  --note "Correct model year; usable three-quarter view"
```

Statuses are `selected`, `rejected`, and `pending`. Multiple `--candidate`
arguments are supported.

## Download selected rights-clear files

```powershell
node crawler/photos/cli.mjs download `
  --record-id "chevrolet|camaro|1969|hugger-orange" `
  --selected
```

The downloader recalculates rights from license metadata and does not trust a
stored boolean. Automatic downloads are limited to public-domain, CC0, CC BY,
and CC BY-SA candidates hosted on Wikimedia's HTTPS upload domain. Files with
noncommercial, no-derivatives, GFDL-only, unknown, or ambiguous metadata remain
in the review manifest but are not downloaded automatically.

Every downloaded image gets a `.license.json` sidecar containing its source
page, file URL, creator, license, attribution, context, byte count, and SHA-256.
Existing files are never replaced with different bytes.

## Checks

```powershell
node --test crawler/photos/test/*.test.mjs
node --check crawler/photos/cli.mjs
node crawler/photos/cli.mjs --help
```

## Review limits

- Commons metadata can be incomplete or wrong. Open the original description
  page before publishing.
- A search match can show the wrong year, a repaint, a custom finish, or a
  photograph with misleading white balance.
- CC BY and CC BY-SA publication still requires correct attribution. CC BY-SA
  may impose share-alike obligations on adaptations.
- This pipeline discovers and downloads local candidates only. GitHub upload is
  a separate reviewed step.
