---
title: Chevrolet Color Archive
visibility: public
classification: archive-internal
period: 1913-present
sources:
  - https://www.gm.com/heritage/archive/vehicle-information-kits
---

# Chevrolet Color Archive

A source-linked research archive for Chevrolet factory paint colors. The
interface follows a model → year → timeline workflow and keeps documentary
evidence separate from interpretive swatches and photographs.

## Live archive

- Primary application:
  [chevrolet-color-archive.amytato.chatgpt.site](https://chevrolet-color-archive.amytato.chatgpt.site)
- Public source:
  [github.com/ipadmom/chevrolet-color-archive](https://github.com/ipadmom/chevrolet-color-archive)
- GitHub Pages entry point: published from `docs/` after the Pages deployment
  check completes.

## Published coverage

The first complete matrix covers first-generation Camaro:

| Year | Official chart listings | Source |
|---|---:|---|
| 1967 | 15 | GM Heritage Vehicle Information Kit, PDF p. 16 |
| 1968 | 15 | GM Heritage Vehicle Information Kit, PDF p. 34 |
| 1969 | 18 | GM Heritage Vehicle Information Kit, PDF p. 51 |

The 48 chart listings normalize to 45 timeline rows because Rally
Green/Rallye Green, LeMans Blue/Le Mans Blue, and Butternut Yellow span two
charts. Exact year-specific names and codes remain visible.

Bel Air and Colorado remain research queues. They do not publish availability
rows until the cited chart for a year has been completely reviewed.

The early Corvette audit publishes three reviewed historical tables:

| Year | Table listings | Source status |
|---|---:|---|
| 1954 | 4 | GM Heritage kit table; quantities described as estimates |
| 1955 | 5 | GM Heritage kit table; usage described as incomplete and partly uncertain |
| 1956 | 6 | GM Heritage kit table; quantities reconcile to Chevrolet production records |

The nine 1954-1955 listings are marked restricted. The six 1956 listings are
listed because the source ties them to Chevrolet records and reconciles their
quantities to total production. The dedicated 1953 kit was reviewed page by
page but contains no exterior-color table, so that year remains unverified
rather than unavailable.

## Evidence rules

- “Listed” means the color appears in the cited chart.
- “Restricted” preserves a chart restriction or source qualification, such as
  special-order, assembly-plant, estimate, or incomplete-record language.
- “Not listed in cited chart” is used only after the complete cited chart was
  reviewed.
- “Unverified” is used when source review is incomplete.
- A photograph is a visual identification aid, never evidence that a factory
  color was available.
- Automated crawler output is always an `unreviewed_candidate`. A person must
  promote it.
- Each chart column reflects one dated source revision. Later bulletins or
  market-specific material can change the record.

## Repository map

```text
app/                    Public archive UI and upload/review API
db/                     D1 schema for staged photos and review selections
drizzle/                Generated database migrations
data/sources/            Official GM source-discovery manifest
crawler/                 Resumable PDF/OCR evidence pipeline
crawler/photos/          Rights-aware Wikimedia candidate pipeline
crawler/publish/         Authenticated reviewed-photo publisher
docs/                    Data contracts and VPS runbooks
```

The official-source inventory currently preserves 691 GM Chevrolet-directory
PDF records across 57 exact index labels and 91 represented years,
1913–2007. Inventory membership does not prove that a PDF contains a paint
chart.

## Upload and publication flow

1. A user chooses a verified model, year, and color record.
2. A JPEG, PNG, GIF, or WebP upload is validated, stored in R2, and indexed in
   D1.
3. The browser receives an opaque one-use receipt, valid for 24 hours, and
   renders its preview from local bytes. Unconsumed receipts survive navigation
   and same-tab reloads in `sessionStorage`; staged bytes are never placed
   there. Staged R2 objects are not public.
4. The user can queue one or more receipts for review.
5. The authenticated VPS publisher claims a lease, verifies source provenance
   and the stored SHA-256, applies bounded Sharp/libvips decode and re-encode,
   strips private image metadata, and publishes an approved content-addressed
   asset to the exact `ipadmom/chevrolet-color-archive` `main` branch.
6. Only after the GitHub push is confirmed does the publisher acknowledge the
   selection with the exact sanitized digest and GitHub asset path. Anonymous
   photo views use that GitHub asset, never the original R2 upload.

Uploads do not require an account. They are staged, not automatically
published. Queue access and staged-byte downloads require the publisher token;
only `published` candidates appear publicly. A consumed or expired receipt
cannot be reused; uploading the same bytes issues a fresh receipt without
duplicating the canonical stored candidate. If the exact bytes are already
published, the API returns that public photo without creating a dead receipt or
duplicate queue item. The original R2 upload remains publisher-only. The GitHub
credential never reaches the browser or a Git child-process environment.

Published-photo checkboxes are local comparison choices, not new publication
requests. The anonymous review endpoint accepts staged one-use receipts only.

## Development

Requires Node.js 22.13 or later.

```powershell
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run sources:validate
```

After editing `db/schema.ts`:

```powershell
npm run db:generate
```

The local vinext runtime reads logical D1 and R2 bindings from
`.openai/hosting.json`. Production resources are supplied by the hosting
control plane.

Crawler setup and guarantees are in [crawler/README.md](crawler/README.md).
The VPS procedure is in
[docs/crawler-vps-runbook.md](docs/crawler-vps-runbook.md). Photo candidate
rights handling is in
[docs/photo-candidate-pipeline.md](docs/photo-candidate-pipeline.md). Reviewed
publication is documented in
[docs/reviewed-photo-publication.md](docs/reviewed-photo-publication.md).
The 1953-1955 Corvette evidence review is in
[docs/source-audit-early-corvette.md](docs/source-audit-early-corvette.md).

The VPS crawler runbook refuses large runs below 40 GB free or 20 percent free
disk. Do not start this archive crawler on a host carrying an active court-data
capture workload.

## Known source boundaries

The GM Heritage index snapshot has no Chevrolet-directory entry for 1917 or
1943–1945 and stops at 2007. These are index gaps, not claims about production,
colors, brochures, or surviving documentation. Modern years require additional
official order-guide sources.
