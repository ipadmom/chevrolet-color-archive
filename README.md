---
title: Chevrolet Color Archive
visibility: public
classification: archive-internal
period: 1913-2007 source inventory
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
- GitHub Pages entry point:
  [ipadmom.github.io/chevrolet-color-archive](https://ipadmom.github.io/chevrolet-color-archive/)

## Published coverage

The public matrices currently contain 340 source-linked chart listings,
normalized into 231 timeline rows.

First-generation Camaro:

| Year | Official chart listings | Source |
|---|---:|---|
| 1967 | 15 | GM Heritage Vehicle Information Kit, PDF p. 16 |
| 1968 | 15 | GM Heritage Vehicle Information Kit, PDF p. 34 |
| 1969 | 18 | GM Heritage Vehicle Information Kit, PDF p. 51 |

The 48 chart listings normalize to 45 timeline rows because Rally
Green/Rallye Green, LeMans Blue/Le Mans Blue, and Butternut Yellow span two
charts. Exact year-specific names and codes remain visible.

Second-generation Camaro:

| Year | Official chart listings | Source |
|---|---:|---|
| 1970 | 15 | GM Heritage Vehicle Information Kit, PDF p. 17 |
| 1971 | 15 | GM Heritage Vehicle Information Kit, PDF p. 48 |
| 1972 | 15 | GM Heritage Vehicle Information Kit, PDF pp. 25–26 |
| 1973 | 16 | GM Heritage Vehicle Information Kit, PDF pp. 30–31 |
| 1974 | 16 | GM Heritage Vehicle Information Kit, PDF pp. 49–50 |
| 1975 | 16 | GM Heritage Vehicle Information Kit, PDF pp. 22–23 |
| 1976 | 14 | Dealer Order Guide, PDF p. 72 |
| 1977 | 14 | Dealer Order Guide, PDF p. 6 |
| 1978 | 13 | Camaro and Z28 guides, PDF pp. 30 and 34 |
| 1979 | 14 | Dealer Order Guide, PDF p. 62 |
| 1980 | 14 | Dealer Order Guide, PDF p. 110 |
| 1981 | 13 | Dealer Order Guide, PDF p. 44 |

These 175 chart listings normalize into 103 timeline rows. Both complete 1972
charts omit black, so the archive does not infer it. The only restriction in
the later block is 1978 `Yellow, Orange`, code 34, which is Z28-only. Carryover,
ZP2, Rally Sport, stripe, and paint-scheme annotations remain source
qualifications rather than extra solid-color rows.

First-generation Chevelle:

| Year | Solid-color listings | Source status |
|---|---:|---|
| 1964 | 14 | Dedicated Chevelle chart; Goldwood Yellow withheld |
| 1965 | 15 | March 1 chart; 3 Malibu S.S.-only colors restricted |
| 1966 | 15 | Revised dedicated Chevelle chart |
| 1967 | 15 | Dedicated Chevelle series charts |

The 59 solid-color listings normalize to 48 exact-name timeline rows. The
audited two-tone combinations remain a separate evidence class because they
require upper/lower order and body-series restrictions. The 1964 Goldwood
Yellow row has no compatible interior mark and remains unverified rather than
being published as available.

Bel Air and Colorado remain research queues. They do not publish availability
rows until the cited chart for a year has been completely reviewed.

C1 Corvette:

| Year | Table listings | Source status |
|---|---:|---|
| 1954 | 4 | GM Heritage kit table; quantities described as estimates |
| 1955 | 5 | GM Heritage kit table; usage described as incomplete and partly uncertain |
| 1956 | 6 | GM Heritage kit table; quantities reconcile to Chevrolet production records |
| 1957 | 6 | Dated Chevrolet color-combination chart |
| 1958 | 8 | Dated Chevrolet color-combination chart |
| 1959 | 7 | Qualified historical table; export colors partly unknown |
| 1960 | 8 | Revised Chevrolet color-combination chart |
| 1961 | 7 | Revised Chevrolet color-combination chart |
| 1962 | 7 | Dated Chevrolet color-combination chart |

The 1954, 1955, and 1959 listings are marked restricted. The other 42 Corvette
listings are listed because direct Chevrolet charts or reconciled Chevrolet
production records support them. The dedicated 1953 kit was reviewed page by
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
The infrastructure is live, but photo population is still incomplete: the
repository currently has one reference-only candidate and no reviewed static
gallery photos.

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
The 1953-1962 Corvette evidence review is in
[docs/source-audit-early-corvette.md](docs/source-audit-early-corvette.md).
The 1970–1975 Camaro evidence review is in
[docs/source-audit-camaro-1970-1975.md](docs/source-audit-camaro-1970-1975.md).
The 1976–1981 Camaro evidence review is in
[docs/source-audit-camaro-1976-1981.md](docs/source-audit-camaro-1976-1981.md).
The 1964–1967 Chevelle evidence review is in
[docs/source-audit-chevelle-1964-1967.md](docs/source-audit-chevelle-1964-1967.md).

The VPS crawler runbook refuses large runs below 40 GB free or 20 percent free
disk. Do not start this archive crawler on a host carrying an active court-data
capture workload.

## Known source boundaries

The GM Heritage index snapshot has no Chevrolet-directory entry for 1917 or
1943–1945 and stops at 2007. These are index gaps, not claims about production,
colors, brochures, or surviving documentation. Modern years require additional
official order-guide sources.
