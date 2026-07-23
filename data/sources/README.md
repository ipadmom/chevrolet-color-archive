---
title: GM Heritage Chevrolet Vehicle Information Kit source inventory
visibility: public
classification: archive-internal
period: 1913-2007
sources:
  - https://www.gm.com/heritage/archive/vehicle-information-kits
---

# GM Heritage Chevrolet Vehicle Information Kit source inventory

This directory records the official GM Heritage Archive Vehicle Information
Kit index as a source-discovery layer. It does not claim that a listed kit
contains a paint chart, and it does not infer model-year color availability.

`source-registry.json` is the broader canonical URL ledger. It joins through
`../parquet/source_links.parquet` to every catalog, platform, color, photo,
license, archive, and research-document claim. Each published color listing
also carries its direct source ID and exact chart locator in
`../parquet/color_availability.parquet`.

`gm-heritage-chevrolet-artifacts.json` records the complete-file SHA-256, byte
length, retrieval metadata, and content-addressed crawler path for all 691
official PDFs. The artifact snapshot totals 5,133,028,799 bytes and 59,193
pages. The export rehashes every object, reconciles every byte count, and opens
every PDF. It is the reproducible provenance input used to enrich
`sources.parquet`; the ignored PDF
object store is a working research cache, not the published source ledger.

## Snapshot method

- Index: `https://www.gm.com/heritage/archive/vehicle-information-kits`
- Retrieved: 2026-07-20
- Included: every index anchor whose resolved URL is under GM's official
  `/vehicle-information-kits/chevrolet/` PDF directory
- Entries: 691 unique titles and 691 unique PDF URLs
- Indexed model labels: 57 exact labels, without consolidating naming variants
- Represented years: 91, from 1913 through 2007
- Link audit: all 691 endpoints returned HTTP 200 and `application/pdf` to a
  HEAD request on 2026-07-20
- Index response SHA-256:
  `2eebc4368d88afdffa309159baccaf1f60adcf11641201e110f406f6da3392a4`
- Index response `Last-Modified`: `Fri, 17 Jul 2026 04:52:43 GMT`

The manifest preserves GM's index title verbatim. `model_label` is only the
title text after its leading year or years. One official title, `2003 And 2004
Chevrolet SSR`, represents two years and therefore has `year: 2003` plus
`years: [2003, 2004]`.

## Pinned brochure and source Release

`brochure-source-release-manifest.json` records all 140 assets staged for the
pinned `brochure-source-archive-v1` Release. The flat-filename checksum
manifest covers all 139 other assets. The Release contains 116 PDFs totaling
1,408,805,873 bytes and 8,635 pages. Of those, 111 are retained source assets,
including 107 retained source PDFs totaling 1,353,608,630 bytes. Validation
identifies 30 governing audit assets, 30 app-fed audit citations, 108
application Release URLs, 61 modern palette tables, 483 modern color
assertions, 529 published specialty records, four published ordinary
qualified-history records, and 10 verified nonpublished, nonrouting specialty
snapshots. The retained modern set includes all 19 audited
GM Fleet Guides for model years 2008 through 2026.

The retained set closes the audited Tahoe 1995–2007 sources, the Suburban
governing sources, and the comparison record for the reviewed 1963 Suburban
source gap. Comparison records never create color availability on their own;
each published row still cites its governing model and year source.

## Known source boundaries

The official index has no Chevrolet-directory entry for 1917 or 1943-1945.
Its Chevrolet entries stop at 2007. Those are index gaps, not proof that
Chevrolet produced no vehicle, color, brochure, bulletin, or other source in
those years.

The index is a discovery source, not an assertion that it names every
Chevrolet model or every surviving GM document. GM can revise the index. The
retrieval date, response hash, and response headers make this snapshot
auditable.

The discovery manifest records links and endpoint metadata; it does not embed
PDF bytes. The completed crawler pass preserved every PDF in full in the
ignored content-addressed object store, and the tracked artifact ledger records
each file hash and byte count. Any public mirror must publish those exact bytes
or record a new, separately hashed revision.

The older `crawler/manifests/gm-heritage-camaro-1967-1969.jsonl` file is a
bounded crawler example, not a supplemental source inventory. Its three URLs
are already among the 691 index records, under different canonical source IDs,
and resolve to the same three PDF hashes. Corpus tooling treats those IDs as
audited aliases and never double-counts them.

`rockauto-paint-code-leads.json` is a separate, bounded secondary-source ledger
for retailer touch-up-product fitments. It is not part of the official GM
inventory and cannot create factory color availability. Its exact retrieval
scope and non-promotion rules are documented in
`../../docs/rockauto-paint-code-leads.md`.

## Rebuild and validate

From the repository root:

```powershell
node scripts/update-gm-heritage-manifest.mjs --retrieved-on 2026-07-20 --verify-endpoints
node scripts/validate-gm-heritage-manifest.mjs
```

The first command fetches only the official GM index and official GM PDF
endpoints. The second command is offline. It checks required fields,
deterministic sort order, unique titles and URLs, official URL shape, summary
counts, and recorded endpoint-audit values.
