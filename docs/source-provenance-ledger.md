---
title: Chevrolet Color Archive source provenance ledger
visibility: public
classification: archive-internal
period: 1913-2026 model-year catalog
sources:
  - https://www.gm.com/heritage/archive/vehicle-information-kits
  - https://commons.wikimedia.org/w/api.php
---

# Source provenance ledger

The archive records sources at two levels. `data/sources/source-registry.json`
and `data/parquet/sources.parquet` contain one row per canonical URL.
`data/parquet/source_links.parquet` contains one row per claim that cites that
source. The separation prevents a source title or URL from being copied into
hundreds of color records while retaining a complete, queryable citation trail.

The public availability set contains 2,000 rows: 973 direct source
transcriptions, 454 qualified official palette-union rows across 56
model-years, 569 specialty subset rows across 57 application model-years, and
four ordinary qualified-historical table rows. Specialty evidence is the
strongest research status for 42 model-years; the other 15 also have a
separately complete or qualified regular palette. Six model-years have a
reviewed-qualified-historical research status. The four published 1981
Woodland Green rows are ordinary chart evidence, not specialty paint. Complete
Suburban evidence added 114 exact-year rows for 1969, 1972-1976, and 2002-2004.
Exact Tahoe program and regular-palette evidence adds 59 rows for 2000 and
2002-2006 without flattening simultaneous programs or specialty subsets.
The membership ledger preserves 509 `specialty_overlay` rows and one separate
`qualified_historical_overlay` row; neither is folded into a primary era band.

## What each color citation preserves

Every published color availability row records:

- Chevrolet model and exact model year;
- normalized color identity and verbatim chart label;
- nullable factory code plus the controlled `factory_code_status` qualifier;
- listed or restricted state and the restriction text;
- source ID and direct canonical URL;
- chart or table title;
- typed exact locator, either a PDF page or retained image region, plus the
  printed page when available;
- source revision or publication date;
- claim review status.

Paint schemes use a parallel, non-flattening contract. Each exact model-year
combination records its package, body style, standard stripe, optional D85
stripe, interior, wheel-flare, restriction, and source-annotation metadata,
plus the exact source locator, printed page when available, source revision
label, archived artifact identity, and immutable source revision ID.
`paint_scheme_components.parquet` then records exactly one primary and one
secondary component. Component rows explicitly set
`standalone_availability_asserted = false`; they do not create color
availability claims.

Factory-code fields in schema version 11 retain the version 4 null semantics.
Schema version 11 also requires `application_type` on every availability row and
an `other_availability_state_count` research aggregate so program-specific
states remain explicit without breaking row-count reconciliation. Schema
version 7 added `evidence_locator_type`. PDF claims use `pdf_page` and
retain nonempty parsed PDF pages. A retained brochure photograph uses
`image_region` and may legitimately have no parsed PDF page. A code printed by
the governing source is stored with `printed_in_source`. When a reviewed source
does not supply a code, the value is null and the status is either
`not_printed_in_source` or `not_stated_in_source`. The matching evidence claim
copies both fields. Values such as “Not printed,” “not stated,” “unknown,” and
“N/A” are rejected from the code columns themselves.

Schema version 11 also preserves RPO and SEO evidence as structured data.
`rpo_code`, `seo_code`, `seo_code_status`, `source_seo_code_raw`, and
`source_seo_code_cell_state` distinguish a printed code, an empty source cell,
and a literal `TBD` cell. `minimum_batch_units` records an exact source-stated
batch threshold. Nullable `factory_installation_claim` records only an express
source conclusion. `evidence_claims.parquet` repeats the transcribed RPO, SEO,
literal-cell, batch, and factory-installation values so each remains bound to
the immutable source revision. Schema version 11 adds normalized `wa_code`,
literal `source_wa_code_raw`, `source_wa_code_cell_state`, and four Kerr
upfitter fields for Code 1, Code 2, AAS solid-color, and AAT two-tone order
semantics. A literal `NONE`, an em dash, and an absent SEO column remain
different source states and never become invented SEO codes.

Official PDFs are content-addressed during crawling. The source row gains the
complete-file SHA-256, byte length, origin response metadata, and local archive
object path only after a complete PDF passes signature, declared-length, and
end-marker checks. The artifact-ledger export then rehashes all 5.1 GB, opens
all 691 PDFs, and reconciles every byte count. Partial downloads never receive
an archive hash.

The consolidated extraction corpus covers all 691 source documents. It retains
2,774 candidate pages and 11,733 automated color-row candidates for human
review. These records are research leads, not published availability claims.

## Included source classes

The ledger currently covers:

- all 691 links in the 2026-07-20 official GM Heritage Chevrolet kit index;
- all 19 complete GM-authored Fleet Guides for model years 2008 through
  2026, including direct GM-hosted 2025 and 2026 revisions with retained
  complete-file hashes;
- four complete Chevrolet eBrochures supporting the published 2022 Tahoe and
  2023 Colorado and Silverado HD palettes, each bound to its exact live
  Chevrolet retrieval URL, local path, SHA-256, byte length, retrieval time,
  and PDF page count;
- all 140 assets in the pinned `brochure-source-archive-v1` Release. The set
  includes 116 PDFs totaling 1,408,805,873 bytes and 8,635 pages. Of those, 111
  are retained source assets, including 107 retained source PDFs totaling
  1,353,608,630 bytes. Other retained formats include the complete 16-image
  1993 carrier set, one listing HTML file, the 2004 service-table image, and the
  flat-filename checksum
  manifest covering all 139 other assets. The validated application surface
  uses 30 governing audit assets, 30 app-fed audit citations, and 108
  application Release URLs. It includes 529 published specialty records, four
  published ordinary qualified-history records, and 10 verified nonpublished,
  nonrouting specialty snapshots;
- complete retained 2002 and 2003 sales-brochure palettes and the complete 2004
  GM service-table palette, with the earlier GM-kit change statements linked
  as supporting evidence rather than duplicate supplemental rows;
- the bounded RockAuto secondary ledger: 20 audited catalog configurations,
  28 touch-up products, 111 fitment observations, and 96 unverified code
  candidates, all isolated from primary factory-availability evidence;
- every direct official chart cited by a published color matrix;
- every model-year catalog evidence URL;
- every platform and generation evidence URL;
- every URL cited in the model, platform, color, and photo audit documents;
- every Wikimedia Commons file page and original-media URL;
- every photo license URL;
- every pinned GitHub Release archive URL.

The normalized ledger currently contains 2,718 canonical source rows, 1,856
immutable source revisions, and 27,631 source-to-claim links.

The crawler database also retains three legacy Camaro aliases created by the
original bounded example manifest. Each alias has the same canonical URL and
complete-file hash as its corresponding 1967, 1968, or 1969 record in the
691-link index snapshot. They are preserved operationally but excluded from the
artifact count and extraction corpus so the ledger continues to count unique
source documents rather than enqueue history.

All 691 official GM PDFs were then downloaded in full. The tracked artifact
ledger at `data/sources/gm-heritage-chevrolet-artifacts.json` records 691
distinct SHA-256 identities totaling 5,133,028,799 bytes and 59,193 PDF pages,
with requested and
final URLs, retrieval times, safe response headers, declared and received byte
counts, and content-addressed crawler object paths. The complete 5.1 GB corpus
remains in ignored research storage. The 111 retained source assets, including
107 retained source PDFs totaling 1,353,608,630 bytes, are independently copied
to the pinned public Release. They close the current Tahoe and Suburban audits,
preserve the 1963 comparison record, and retain the published modern and
specialty sources.
The artifact ledger makes those copies and future archive batches auditable
without treating the working cache
as a public host.

Each link states its role. Discovery links remain
`endpoint_verified_not_fully_screened`; they are not silently promoted into
color evidence. Research-document references state the exact repository file
and line. Photo records preserve attribution and licensing, but remain separate
from factory paint evidence.

## Gaps and conflicts

`model_years.parquet` is the coverage ledger. A year is one of:

- `color_chart_verified`, with one or more published source-backed colors;
- `reviewed_qualified_historical_table`, with a reviewed source-linked table
  whose qualifications prevent a complete governing-chart claim;
- `reviewed_qualified_palette_union`, with a visually checked official Fleet
  Guide color union that remains explicitly incomplete as to paint codes,
  trim restrictions, and the controlling Online Order Guide;
- `reviewed_specialty_palette_subset`, with exact visually checked GM
  specialty-paint evidence for a named model variant while the governing
  model-year palette remains incomplete;
- `official_kit_reviewed_no_color_table_found`, which records a completed
  source review without converting silence into negative availability;
- `color_chart_unverified`, which remains in the research queue.

The earlier 2002-2004 Suburban change statements no longer stand alone. Exact
model-year sources now govern all three palettes, while the statements remain
linked as supporting provenance. `supplemental_color_mentions.parquet` is empty
in the current build.

Revised charts, package limits, special-order rules, fleet colors, and source
conflicts are preserved in the restriction and revision fields. Specialty
colors such as Forest Service Green must be added when the controlling fleet,
special-order, or regular-production source establishes the applicable model,
year, code, and restriction. They must not be inferred from photographs or
adjacent years.

## Validation

`scripts/validate-normalized-parquet.py` checks primary keys, foreign keys,
manifest hashes, schema version 11 locator typing, application classification,
availability-state reconciliation, and model-year generation memberships,
complete HTTPS source URLs,
citation counts, per-year listing counts, one evidence link for every color
availability row, qualified-palette and specialty-subset review flags, the
empty post-promotion supplemental table, the bounded RockAuto 20/28/111/96
counts, the published README row counts, 140 brochure Release assets, all 139
non-manifest assets covered by the flat-filename checksum manifest, 30
governing audit assets, 30 app-fed audit citations, 108 application Release
URLs, 529 published specialty records, four published ordinary
qualified-history records, 10 verified nonpublished, nonrouting specialty
snapshots, pinned photo archive URLs, 1,369 exact paint schemes,
2,738 ordered primary and secondary components, immutable scheme evidence
revisions, the no-flattening sentinel, the nullable
factory-code contract and controlled statuses, a complete flat-filename
Release checksum manifest, and the rule that tentative
photo-color links do not claim a verified factory paint match.
