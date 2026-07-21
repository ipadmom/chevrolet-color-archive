---
title: Chevrolet Tahoe exterior-color source audit, 1995-2000
visibility: public
classification: archive-internal
period: 1995-2000
sources:
  - GM Heritage Archive Chevrolet vehicle information kits, 1995-2000
---

# Chevrolet Tahoe exterior-color source audit, 1995-2000

## Result

The 1995 and 1996 Tahoe palettes are transcribed from Chevrolet's own color-availability charts. Both years have ten verified solid-paint choices. The audit also preserves the printed ZY2 two-tone combinations separately: 28 body-style-specific rows for 1995 and 24 combinations applying to both body styles for 1996.

Model years 1997-2000 remain explicitly incomplete in this bounded pass. Their official kits were located and preserved, but no color is asserted until its complete chart is visually checked. The structured result is [`data/audits/tahoe-1995-2000.json`](../data/audits/tahoe-1995-2000.json).

## Controlling sources

- [1995 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1995-Chevrolet-Tahoe.pdf), General Motors. PDF page 18 is the 2-door ZY1 and ZY2 chart. PDF page 19 is the 4-door ZY2 chart.
- [1996 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1996-Chevrolet-Tahoe.pdf), General Motors. PDF page 29, order-guide page 8, is the 2-door chart. PDF page 38, order-guide page 17, is the 4-door chart. Both pages say “REVISED: 1-29-96.”
- [1997 kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1997-Chevrolet-Tahoe.pdf), [1998 kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1998-Chevrolet-Tahoe.pdf), [1999 kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1999-Chevrolet-Tahoe.pdf), and [2000 kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2000-Chevrolet-Tahoe.pdf), General Motors. These are located primary sources, not yet page-verified in this bounded audit.

## Verification notes

- The PDFs are image scans. Text extraction was not used as evidence. Each cited chart page was rendered and visually inspected.
- Names preserve Chevrolet's printed word order while title case and the separate `finish` field normalize presentation. For example, `RED, BURNT (Met)` becomes name `Red, Burnt` plus finish `metallic`.
- `U` and `L` suffixes are retained exactly. Chevrolet labels them Color Code 1 and Color Code 2 on the ZY2 charts.
- The 1995 4-door chart lists Gray, Gunmetal `91L` only as Color Code 2. It is not added to the standalone ZY1 palette.
- The 1996 2-door and 4-door charts independently print the same ten ZY1 colors and the same 24 ZY2 pairings. Molding and interior-trim restrictions were checked but are outside this exterior-color inventory.
- The 2000 source needs variant-specific treatment because the redesigned Tahoe appears alongside carryover Tahoe Limited and Tahoe Z71 material. No cross-variant palette was inferred.

## Coverage table

| Model year | Status | Verified solid colors | Verified two-tone rows |
|---:|---|---:|---:|
| 1995 | Complete from official charts | 10 | 28 |
| 1996 | Complete from official charts | 10 | 24 |
| 1997 | Official kit located, chart not yet verified | 0 | 0 |
| 1998 | Official kit located, chart not yet verified | 0 | 0 |
| 1999 | Official kit located, chart not yet verified | 0 | 0 |
| 2000 | Official kit located, variant charts not yet verified | 0 | 0 |
