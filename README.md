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

Bel Air, Corvette, and Colorado appear as research queues. They do not publish
availability rows until the cited chart for a year has been completely
reviewed.

## Evidence rules

- “Listed” means the color appears in the cited chart.
- “Restricted” preserves a chart restriction such as special-order or
  assembly-plant language.
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
docs/                    Data contracts and VPS runbooks
```

The official-source inventory currently preserves 691 GM Chevrolet-directory
PDF records across 57 exact index labels and 91 represented years,
1913–2007. Inventory membership does not prove that a PDF contains a paint
chart.

## Upload and publication flow

1. A user chooses a model, year, and color record.
2. A JPEG, PNG, GIF, or WebP upload is stored in R2 and indexed in D1.
3. The user can select one or more staged candidates.
4. The selection enters a review queue.
5. The VPS pipeline retains rights metadata and can publish reviewed assets to
   GitHub. The GitHub credential never reaches the browser.

Uploads do not require an account. They are staged, not automatically
published.

## Development

Requires Node.js 22.13 or later.

```powershell
npm install
npm run dev
npm run lint
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
[docs/photo-candidate-pipeline.md](docs/photo-candidate-pipeline.md).

## Known source boundaries

The GM Heritage index snapshot has no Chevrolet-directory entry for 1917 or
1943–1945 and stops at 2007. These are index gaps, not claims about production,
colors, brochures, or surviving documentation. Modern years require additional
official order-guide sources.
