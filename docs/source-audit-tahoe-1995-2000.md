---
title: Chevrolet Tahoe exterior-color source audit, 1995-2000
visibility: public
classification: archive-internal
period: 1995-2000
sources:
  - GM Heritage Archive Chevrolet vehicle information kits, 1995-2000
  - Original 2000 Chevrolet Tahoe Z71 brochure and order-guide scans carried by GMT400.com
---

# Chevrolet Tahoe exterior-color source audit, 1995-2000

## Result

The 1995-1999 Tahoe palettes are complete transcriptions of Chevrolet color-availability charts. The standalone-paint counts are 10, 10, 9, 9, and 10. The audit also preserves 184 printed ZY2 rows as a separate evidence class.

Model year 2000 is now complete at the program level. It must not be flattened into one Tahoe palette because Chevrolet simultaneously sold redesigned GMT800 and carryover GMT400 programs:

| 2000 program | Base / era | Exact colors | Evidence class |
|---|---|---:|---|
| Redesigned Base and LS | GMT800 family / GMT820 Tahoe | 9 | Direct official GM kit |
| Redesigned LT | GMT800 family / GMT820 Tahoe | 5 | Direct official GM kit |
| Carryover Limited | GMT400 family / GMT420 Tahoe | 1 | Direct official GM kit |
| Carryover Z71 | GMT400 family / GMT420 Tahoe | 4 | Exact original Chevrolet brochure scan, carrier-qualified |

The structured result is [`data/audits/tahoe-1995-2000.json`](../data/audits/tahoe-1995-2000.json).

## Controlling sources

- [1995 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1995-Chevrolet-Tahoe.pdf), PDF pp. 18-19.
- [1996 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1996-Chevrolet-Tahoe.pdf), PDF pp. 29 and 38. Both chart pages say “REVISED: 1-29-96.”
- [1997 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1997-Chevrolet-Tahoe.pdf), PDF pp. 17-18 and 26. The controlling charts are revised December 16, 1996.
- [1998 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1998-Chevrolet-Tahoe.pdf), PDF pp. 44-46 and 54-55.
- [1999 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1999-Chevrolet-Tahoe.pdf), PDF pp. 17-19 and 26-27.
- [2000 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2000-Chevrolet-Tahoe.pdf), PDF pp. 12-13 and 18. Retained artifact: 15,232,489 bytes, 124 pages, SHA-256 `e52e59031146ac0b1574f1ac41cfa7ac76599568987598bd6913baf516497dbc`.
- [2000 Chevrolet Tahoe Z71 brochure color scan](https://www.gmt400.com/attachments/2000-z71-tahoe-brochure-colors-jpg.372777/), source ID `chevrolet-sales-brochure-2000-tahoe-z71-colors-scan`, carried in the [GMT400.com source thread](https://www.gmt400.com/threads/gmt400-tahoe-z71.67412/). Retained scan: 46,014 bytes, SHA-256 `bc150ee6d2c813fdca40d85e092ef1da03b87c102619bae0f48594a9fb4e4c4b`.
- Supporting original Chevrolet order-guide scans: [page 1](https://www.gmt400.com/attachments/truck-order-guide-z71-page-1-jpg.372780/), [page 2](https://www.gmt400.com/attachments/truck-order-guide-z71-page-2-jpg.372781/), and [page 3](https://www.gmt400.com/attachments/truck-order-guide-z71-page-3-jpg.372782/). Their source IDs and complete-file hashes are recorded in the JSON audit.

## Exact 2000 program palettes

The redesigned Base/LS list is Onyx Black, Indigo Blue Metallic, Medium Charcoal Gray Metallic, Light Pewter Metallic, Sunset Gold Metallic, Dark Copper Metallic, Dark Carmine Red Metallic, Victory Red, and Summit White.

The redesigned LT list is Onyx Black, Medium Charcoal Gray Metallic, Light Pewter Metallic, Sunset Gold Metallic, and Dark Copper Metallic.

The carryover Limited is Onyx Black only.

The carryover Z71 brochure scan lists Light Pewter Metallic, Indigo Blue Metallic, Emerald Green Metallic, and Victory Red. The official GM kit independently says the carryover Z71 had four colors but does not name them. The carrier qualification remains visible in the application and provenance record.

## Code and normalization boundary

None of the controlling 2000 program pages prints paint or RPO codes. Canonical row codes therefore remain `Not printed`. A secondary crosswalk retains the following research leads without promoting them: Onyx Black `41U / WA8555`, Indigo Blue Metallic `39U / WA9792`, Medium Charcoal Gray Metallic `14U / WA391E`, Light Pewter Metallic `11U / WA382E`, Sunset Gold Metallic `60U / WA398E`, Dark Copper Metallic `69U / WA381E`, Dark Carmine Red Metallic `51U / WA334D`, Victory Red `74U / WA9260`, Summit White `50U / WA8624`, and Emerald Green Metallic `43U / WA177B`.

The redesigned LS source mentions Custom Two-Tone paint but does not enumerate combinations. Those combinations remain unresolved.

## Verification notes

- Each cited GM kit chart was rendered and visually inspected. OCR was used only to locate pages.
- Chevrolet's printed `U` and `L` suffixes remain exact in the 1995-1999 data.
- The controlling 1997 charts are the December 16 revisions. The older August 19 chart at PDF p. 28 is excluded.
- Source anomalies and body-style restrictions remain literal in the JSON instead of being silently normalized.
- The 2000 program rows deliberately repeat colors when a color belonged to more than one program. These are scoped applications, not duplicate all-year claims.

## Coverage table

| Model year | Status | Solid or program-scoped listings | Two-tone rows |
|---:|---|---:|---:|
| 1995 | Complete official chart | 10 | 29 |
| 1996 | Complete official chart | 10 | 24 |
| 1997 | Complete official chart | 9 | 35 |
| 1998 | Complete official chart | 9 | 52 |
| 1999 | Complete official chart | 10 | 44 |
| 2000 | Four exact program palettes | 19 | Unenumerated for redesigned LS |
