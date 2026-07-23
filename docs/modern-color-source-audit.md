---
title: Modern Chevrolet exterior-color source audit
visibility: public
classification: archive-internal
period: 2008-2026
sources:
  - data/sources/modern-chevrolet-color-source-candidates.json
  - GM Fleet guides, model years 2008-2026
  - GM Online Order Guide
  - Chevrolet eBrochures, media fact sheets, and newsroom pages
---

# Modern Chevrolet exterior-color source audit

## Result

The source search located a complete GM-authored Fleet Guide for every model year from 2008 through 2026. All 19 guides were downloaded in full, parsed through their complete page counts, hashed, and registered in `data/sources/modern-chevrolet-color-source-candidates.json`. Four Chevrolet eBrochures used by published 2022 and 2023 palettes are also retained and hashed. No model year in the requested range lacks a full guide.

The registry currently contains:

- 31 provenance records.
- 23 complete retained PDFs, 19 Fleet Guides plus four Chevrolet eBrochures, totaling 520,591,010 bytes.
- 61 page-verified model and model-year palette tables.
- One timestamped GM Online Order Guide sample with order and touch-up codes.
- Exact candidate page lists for the 17 older guides whose non-Suburban tables remain to be normalized.

This closes source discovery for 2008-2026. It does not mean that every table in the older guides has already been transcribed. The remaining work is controlled extraction from documents already in hand, not another open-ended web search.

## Authority ladder

1. **Live GM Fleet Guide PDFs.** The 2025 and 2026 guides are still served directly by `gmfleet.com`. They are the strongest complete printed sources found.
2. **GM Online Order Guide.** The public application exposes current Chevrolet Car, Truck, and Electric catalogs and returns color names, three-character order codes, WA touch-up codes, and trim data. On July 21, 2026, its public catalog exposed model years 2025-2027. It did not expose 2008-2024.
3. **Archived GM-authored Fleet Guide PDFs.** The 2008-2024 documents are complete GM publications recovered from the XR793 brochure archive. Their original GM endpoints are unavailable or unstable. Each local file has a recorded SHA-256 hash and byte length so future ingestion can bind facts to an exact document.
4. **Live Chevrolet consumer and media material.** Official eBrochures provide useful per-trim palettes. Chevrolet Media fact sheets and newsroom pages generally document only colors newly added for a year, so they corroborate changes but cannot establish a complete palette by themselves.

## Full-guide coverage

| Model year | Source ID | Pages | Revision or PDF date | Authority | Table status |
|---:|---|---:|---|---|---|
| 2008 | `gm-fleet-guide-us-2008-v2` | 121 | 2007-09-28 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2009 | `gm-fleet-guide-us-2009-v2` | 139 | 2008-11-04 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2010 | `gm-fleet-guide-us-2010` | 116 | 2009-06-22 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2011 | `gm-fleet-guide-us-2011` | 102 | 2010-05-17 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2012 | `gm-fleet-guide-us-2012` | 114 | 2011-06-17 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2013 | `gm-fleet-guide-us-2013` | 111 | 2012-05-14 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2014 | `gm-fleet-guide-us-2014` | 134 | 2013-09-09 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2015 | `gm-fleet-guide-us-2015` | 142 | 2014-06-12 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2016 | `gm-fleet-guide-us-2016-november` | 148 | 2015-11-25 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2017 | `gm-fleet-guide-us-2017` | 152 | 2016-12-22 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2018 | `gm-fleet-guide-us-2018` | 126 | 2018-01-29 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2019 | `gm-fleet-guide-us-2019` | 130 | 2019-02-07 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2020 | `gm-fleet-guide-us-2020` | 124 | 2019-10-17 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2021 | `gm-fleet-guide-us-2021-v3` | 110 | 2020-10-07 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed |
| 2022 | `gm-fleet-guide-us-2022-v6` | 119 | 2022-02-28 | GM document, archival mirror | Complete PDF; Suburban Fleet Guide and Tahoe brochure palettes verified; other candidate pages indexed |
| 2023 | `gm-fleet-guide-us-2023-v3` | 121 | 2022-12-20 | GM document, archival mirror | Complete PDF; Suburban Fleet Guide and three brochure palettes verified; other candidate pages indexed |
| 2024 | `gm-fleet-guide-us-2024-v3` | 114 | 2023-11-20 | GM document, archival mirror | Complete PDF; Suburban palette verified; other candidate pages indexed; official delta sources registered |
| 2025 | `gm-fleet-guide-us-2025-r2024-12-11` | 179 | 2024-12-11 | Live official GM PDF | 19 model palette tables verified |
| 2026 | `gm-fleet-guide-us-2026-r2026-04-01` | 184 | 2026-04-01 | Live official GM PDF | 21 model palette tables verified, including 2026 LCF pages in the prior guide |

The exact URLs, candidate page lists, local paths, SHA-256 hashes, byte lengths, and limitations are in the JSON registry. That file is the ingestion source; this audit is the readable explanation.

## Verified palette-table coverage

| Model year | Verified tables | Color-name assertions | Coverage now represented |
|---:|---:|---:|---|
| 2008-2021 | 14 | 126 | One Suburban Fleet Guide palette per year |
| 2022 | 2 | 20 | Suburban Fleet Guide palette and Tahoe per-trim eBrochure union |
| 2023 | 4 | 39 | Suburban Fleet Guide palette plus Colorado and two Silverado HD brochure tables |
| 2024 | 1 | 9 | Suburban Fleet Guide palette |
| 2025 | 23 | 152 | Main Chevrolet car, EV, SUV, truck, van, and BrightDrop Fleet Guide palettes, plus four retained Order Guide completion tables |
| 2026 | 22 | 147 | Main Chevrolet EV, SUV, truck, van, BrightDrop, and Low Cab Forward Fleet Guide palettes, plus the retained Corvette completion table |

The tables contain 493 source color-name assertions. After overlapping body
series are reconciled without discarding their citations, they publish 462
qualified palette-union rows across 57 model-year records.

All 66 verified tables are now represented in the application. The four earlier
brochure tables add three distinct model-year records and 33 unique app rows:
ten for the 2022 Tahoe, eight for the 2023 Colorado, and 15 across the two
separately cited 2023 Silverado HD body-series sources. The corrected
controlling locators are Tahoe PDF pp. 8, 10, 12, 14, 16, and 18; Silverado
2500/3500 HD PDF p. 10; and Silverado 4500/5500/6500 HD PDF p. 7. Colorado
remains PDF pp. 13, 15, 17, 19, and 21. Printed extra-cost and trim or body
restrictions are retained at the color claim.

Five retained and visually reviewed Online Order Guide tables add eight unique
application rows. They publish 2025 Blazer EV Habanero Orange, 2026 Corvette
Blade Silver Matte, and the 2025 Low Cab Forward six-color union across three
body-family guides. The LCF tables preserve Isuzu manufacturer codes without
inventing WA identities or merging Woodland Green `46U` into GM Woodland Green
`9V5 / WA-9015`.

The 2025 and 2026 rows retain source spelling. One example is the 2025 Colorado guide's `Sterling Grey Metallic`; normalization to `Sterling Gray Metallic` must occur through an alias, not by overwriting the source text.

Police and Special Service vehicle pages are present in both recent guides. They were not folded into the 61-table retail and commercial set because their Special Equipment Option palettes need separate body and equipment modeling. Their source pages remain available for the next extraction pass.

## Online Order Guide finding

The current order-guide application uses a public short-lived login flow and an application API at `eog-api.musea2.azure.ext.gm.com`. The relevant calls are recorded in the source registry:

- `api/sso/PublicLogin/`
- `api/Vehicles/ByBrand/{brand_id}/1/en-us`
- `api/PullDown/GetColorAndTrim/{vehicle_id}/en-us`

The Chevrolet brand identifiers observed were:

- Chevrolet Car: `3188c7ab-0fc9-41e9-9b07-12499ce42d87`
- Chevrolet Truck: `77450ee3-dba7-431a-ad58-098f1ebd9f35`
- Chevrolet Electric: `d6ecd3ac-84a9-41ac-a58e-0363710b23f4`

The 2026 Tahoe record, vehicle ID `23232`, returned the following timestamped sample:

| Color | Order code | Touch-up code |
|---|---|---|
| Polar White Tricoat | G4J | WA-241L |
| Dark Ash Metallic | G6M | WA-618G |
| Summit White | GAZ | WA-8624 |
| Black | GBA | WA-8555 |
| Cypress Gray | GBD | WA-229K |
| Radiant Red Tintcoat | GNT | WA-170H |
| Sterling Gray Metallic | GXD | WA-130H |
| Lakeshore Blue Metallic | GXP | WA-136H |
| SEO Victory Red | 5T4 | WA-9260 |
| Woodland Green | 9V5 | WA-9015 |
| Wheatland Yellow | 9W3 | WA-253A |

This sample proves that a Fleet Guide palette is not always exhaustive. The printed 2026 Tahoe palette contains eight colors. The API also returned three Special Equipment Option fleet colors: SEO Victory Red, Woodland Green, and Wheatland Yellow. Current-year ingestion should therefore merge the printed guide with the order-guide response and retain the applicability metadata, rather than treating either source as interchangeable.

## Year-label anomalies

- The December 2024 Fleet Guide contains pages 125-127 explicitly labeled `2026 MODEL YEAR` for Low Cab Forward vehicles. Those palettes belong to 2026, even though the containing publication is titled 2025 GM Fleet Guide.
- The April 2026 Fleet Guide contains Low Cab Forward pages 139-141 explicitly labeled model year 2027. Those pages must not be assigned to 2026.
- A Wayback replay of the old 2024 GM Fleet Guide URL returned a malformed one-megabyte partial object. It is excluded from the source registry. The complete 114-page GM-authored mirror is the registered 2024 source.

## Data limits that must survive ingestion

- A palette row is a model-year union unless the source explicitly establishes trim or body applicability. Do not silently expand it to every trim.
- Fleet Guide color panels usually provide names, not order codes or WA codes. Codes must be joined from the Online Order Guide or another code-bearing source.
- Special Equipment Option and police colors can be absent from a printed retail palette.
- The same marketed name can map to different codes across years, and the same code can be marketed under different names. Identity must be keyed by the source code and year context, with names handled as sourced labels and aliases.
- Chevrolet consumer brochure endpoints were intermittently rate-limited during this audit. The four brochures used by published Tahoe, Colorado, and Silverado HD palettes were subsequently fetched in full from their recorded Chevrolet URLs, rehashed, and registered. The Trailblazer brochure remains a partial candidate and is not represented as a verified complete table.
- All 23 complete retained PDFs are pinned in the immutable [`brochure-source-archive-v1` Release](https://github.com/ipadmom/chevrolet-color-archive/releases/tag/brochure-source-archive-v1). The source ledger preserves each upstream retrieval URL separately from its Release URL, hash, byte length, and page count.

## Ingestion contract

Every color-availability fact created from this research should preserve at least:

- `source_id`
- source URL, retrieval URL, and retained Release URL
- market
- model year
- normalized model ID and source model label
- exact PDF page or API endpoint
- source revision or observation timestamp
- source color name
- order and touch-up codes when present
- applicability scope, table limitations, and per-color `color_restrictions`
- local artifact hash and byte length when a PDF was archived

The JSON is intentionally shaped so its `sources`, `verified_palette_tables`, and `verified_order_guide_samples` collections can be flattened into provenance, palette, and code-observation tables without losing the source linkage.

## Reproducible validation

Run `npm run sources:validate-modern` from the repository root. The validator:

- rehashes all 23 retained complete PDFs and reconciles 520,591,010 bytes;
- opens all 2,599 PDF pages and checks recorded page counts;
- verifies one GM-authored Fleet Guide for every model year from 2008 through
  2026;
- confirms that every published catalog model ID exists;
- checks all 66 published palette tables against 81 exact PDF page references;
  and
- finds every one of the 493 published color-name assertions in the cited page
  text.

Those immutable-artifact checks cover the 57 Fleet Guide tables and four
Chevrolet eBrochure tables retained locally, plus five exact generated Order
Guide PDFs retained in
[`current-order-guide-source-archive-v1`](https://github.com/ipadmom/chevrolet-color-archive/releases/tag/current-order-guide-source-archive-v1).
The validator joins each Order Guide source and table to the tracked Release
manifest, exact artifact digest, byte count, page count, archive URL, and cited
visual-review finding. Application tests separately enforce the 462 unique
qualified app rows, per-color restrictions, and multi-source joins.

The validator also keeps the mutable Online Order Guide observation distinct
from immutable PDF evidence. Its current API response remains a timestamped
sample until the exact response bytes are archived.
