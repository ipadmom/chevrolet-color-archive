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

## Known source boundaries

The official index has no Chevrolet-directory entry for 1917 or 1943-1945.
Its Chevrolet entries stop at 2007. Those are index gaps, not proof that
Chevrolet produced no vehicle, color, brochure, bulletin, or other source in
those years.

The index is a discovery source, not an assertion that it names every
Chevrolet model or every surviving GM document. GM can revise the index. The
retrieval date, response hash, and response headers make this snapshot
auditable.

The manifest records links and endpoint metadata. It does not mirror the PDF
bytes. Any later source-preservation job must save each selected PDF in full
and record a file hash.

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
