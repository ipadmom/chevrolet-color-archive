---
title: Chevrolet Tahoe exterior-color source audit, all U.S. model years
visibility: public
classification: archive-internal
period: 1995-2026
sources: GM Heritage Archive and Chevrolet sales literature
---

# Chevrolet Tahoe exterior-color source audit, 1995–2026

This is an evidence-first rolling audit. Every U.S. Tahoe model year from 1995
through 2026 is navigable in the public archive. A year remains visibly
unverified until its complete factory exterior palette is checked against
primary Chevrolet or GM material. Colors are never inferred from the preceding
or following year, from the Suburban, or from a shared platform.

The machine-readable source work is split into bounded files so it can be
reviewed without silently rewriting older evidence:

- [`data/audits/tahoe-1995-2000.json`](../data/audits/tahoe-1995-2000.json)
- [`data/audits/tahoe-2001-2007.json`](../data/audits/tahoe-2001-2007.json)
- [`data/catalog/chevrolet-us-nameplates.json`](../data/catalog/chevrolet-us-nameplates.json), which supplies the full 1995–2026 model-year range

## Coverage

| Model year | Coverage | Verified solid listings | Controlling evidence or gap |
|---:|---|---:|---|
| 1995 | Verified complete | 10 | Official GM kit, PDF pp. 18–19 |
| 1996 | Verified complete | 10 | Official GM kit, PDF pp. 29 and 38, revised January 29, 1996 |
| 1997–2000 | Unverified | 0 | Official kits located; complete chart transcription unfinished |
| 2001 | Verified complete | 9 | Official GM kit, PDF p. 12, printed p. 10 |
| 2002–2007 | Unverified | 0 | Official kits located; complete chart transcription unfinished |
| 2008–2026 | Unverified | 0 | Complete primary-source palettes and restrictions not yet captured |

Verified coverage is **3 of 32 model years**, with **29 solid-color
listings**. The 1995 and 1996 audits also preserve 52 two-tone rows as a
separate evidence class. The remaining 29 model years are present in the UI but
publish no color availability claim.

## Primary evidence used

1. [GM Heritage Archive vehicle information kits](https://www.gm.com/heritage/archive/vehicle-information-kits). The official index lists Tahoe kits for 1995 through 2007.
2. [1995 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1995-Chevrolet-Tahoe.pdf).
3. [1996 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1996-Chevrolet-Tahoe.pdf).
4. [2001 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2001-Chevrolet-Tahoe.pdf).

## Known boundaries

- Model year 2000 requires separate treatment for the redesigned Tahoe and the
  carryover Tahoe Limited/Z71 variants.
- A trim-specific retail color list is not a complete model-year palette.
- Announcements identifying one or two new colors do not establish every
  continuing color.
- Secondary paint sellers and vehicle-specification sites remain retrieval
  leads only. They do not authorize a complete year matrix.

## Next retrieval targets

1. Finish the official GM kit charts for 1997–2000 and 2002–2007, including
   body-style, two-tone, Z71, and Limited restrictions.
2. Retrieve official dealer or GM fleet order guides for 2008–2026.
3. Capture every restriction at claim level: trim, package, body style,
   fleet-only status, extra-cost status, and interim or late availability.
4. Archive each relied-on PDF in full with a SHA-256 manifest if the project
   elects to preserve source bytes locally.
