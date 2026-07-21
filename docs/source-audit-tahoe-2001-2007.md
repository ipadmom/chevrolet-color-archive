---
title: Chevrolet Tahoe exterior-color source audit, 2001-2007
visibility: public
classification: archive-internal
period: 2001-2007
sources: General Motors Heritage Center vehicle information kits
---

# Chevrolet Tahoe exterior-color source audit, 2001-2007

## Result

This bounded pass verified model year 2001 directly from the official General Motors Tahoe vehicle information kit. The official 2002-2007 kits are preserved locally, but their exterior-color pages were not transcribed before the pass ended. Those six years remain explicitly incomplete. Empty arrays in the JSON are research-queue markers, not assertions that no colors were offered.

The machine-readable audit is `data/audits/tahoe-2001-2007.json`.

## 2001 verified inventory

Source: [2001 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2001-Chevrolet-Tahoe.pdf), General Motors, PDF page 12, printed page 10, “Vehicle Overview,” “Color and Trim,” “Exterior Colors.”

| Exterior color | Code | Finish as printed |
|---|---:|---|
| Onyx Black | Not printed | Not stated |
| Indigo Blue Metallic | Not printed | Metallic |
| Victory Red | Not printed | Not stated |
| Sunset Gold Metallic | Not printed | Metallic |
| Summit White | Not printed | Not stated |
| Medium Charcoal Gray Metallic | Not printed | Metallic |
| Forest Green Metallic | Not printed | Metallic |
| Light Pewter Metallic | Not printed | Metallic |
| Redfire Metallic | Not printed | Metallic |

The same page states that Z71 colors were limited to Onyx Black, Summit White, Forest Green Metallic, and Light Pewter Metallic.

The source page does not print paint or RPO codes. This audit leaves those fields null. It does not backfill codes from paint vendors or other secondary databases.

No two-tone combination list appears on the verified 2001 Color and Trim page. The JSON records an empty list plus a qualified status, not a claim that no two-tone treatment existed anywhere in the model-year program.

## Incomplete years

| Model year | Official primary source | Status |
|---:|---|---|
| 2002 | [GM vehicle information kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2002-Chevrolet-Tahoe.pdf) | Kit preserved; color chart not yet transcribed |
| 2003 | [GM vehicle information kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2003-Chevrolet-Tahoe.pdf) | Kit preserved; color chart not yet transcribed |
| 2004 | [GM vehicle information kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2004-Chevrolet-Tahoe.pdf) | Kit preserved; color chart not yet transcribed |
| 2005 | [GM vehicle information kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2005-Chevrolet-Tahoe.pdf) | Kit preserved; color chart not yet transcribed |
| 2006 | [GM vehicle information kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2006-Chevrolet-Tahoe.pdf) | Kit preserved; color chart not yet transcribed |
| 2007 | [GM vehicle information kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2007-Chevrolet-Tahoe.pdf) | Kit preserved; color chart not yet transcribed |

## Verification method

The 2001 kit is an image-only scan. Poppler rendered the PDF pages to PNG. The table of contents identifies “Color and Trim” on printed page 10, which corresponds to PDF page 12. The rendered page was then visually inspected and transcribed. Text extraction was not used as evidence because the source PDF contains no usable text layer.

