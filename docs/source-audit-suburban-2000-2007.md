---
title: Chevrolet Suburban 2000-2007 official color audit
visibility: public
classification: archive-internal
period: 2000-2007
sources:
  - gm-heritage-2000-chevrolet-suburban
  - gm-heritage-2001-chevrolet-suburban
  - gm-heritage-2002-chevrolet-suburban
  - gm-heritage-2003-chevrolet-suburban
  - gm-heritage-2004-chevrolet-suburban
  - gm-heritage-2005-chevrolet-suburban
  - gm-heritage-2007-chevrolet-suburban
  - chevrolet-brochure-us-2002-suburban-auto-brochures
  - chevrolet-brochure-us-2003-suburban-auto-brochures
  - gm-service-table-2004-tahoe-suburban-color-compatibility
  - sherwin-williams-2004-north-american-color-manual
---

# Chevrolet Suburban 2000-2007 official color audit

## Scope and counting rules

This audit combines retained official GM Heritage Chevrolet Suburban vehicle information kits, official GM sales brochures recovered through an archival mirror, and a GM service color-compatibility table independently corroborated by the Sherwin-Williams 2004 color manual. It does not infer a Suburban color from an adjacent model year or a later color-name/code crosswalk.

- A **complete regular palette row** is a source-literal exterior color in a governing Suburban color table, or in a narrative that explicitly calls itself the complete exterior palette.
- A **supplemental mention** is a source-literal new-color or replacement-color statement in a kit that does not contain a complete Suburban palette. It must not be promoted to a complete model-year palette.
- A **package subset** repeats colors from the regular palette to preserve an explicit trim, package, or equipment restriction. Package rows are not additional unique year-color identities.
- An **SEO row** is a Special Equipment Option solid-paint row. SEO rows remain separate from the regular retail palette.
- A literal `none` in a color-code cell is data, not a missing value.
- Interior lighter/darker two-tone footnotes are not exterior two-tone paint schemes.

## Result summary

| Model year | Complete regular palette | Regular unique names | Supplemental-only names | Package or equipment subset | SEO specialty rows | Exterior two-tone result |
|---|---|---:|---:|---|---:|---|
| 2000 | Yes | 9 | 0 | LT subset: 5; Base/LS list: 9 | 0 | LS custom two-tone is generally available, but the kit supplies no exact combinations |
| 2001 | Yes | 9 | 0 | Z71 subset: 4 | 0 | No exact exterior scheme table found |
| 2002 | Yes, archived official brochure | 8 | 0 | LT/LS palette; Z71 subset: 4; Redfire barred on three-quarter-ton | 0 | No exact exterior scheme table found |
| 2003 | Yes, archived official brochure | 8 | 0 | LT/LS palette; Z71 subset: 4 | 0 | No exact exterior scheme table found |
| 2004 | Yes, mirrored GM service table | 8 | 0 | Eight Tahoe/Suburban model rows, independently corroborated | 0 | No exact exterior scheme table found |
| 2005 | Yes | 8 | 0 | Z71 subset: 5; NYS 4-wheel-steering subset: 4 | 10 | No exterior two-tone table; the only two-tone footnotes describe interiors |
| 2006 | No official retained kit | 0 | 0 | None supportable | 0 | Blank and unverified; do not infer from 2005 or 2007 |
| 2007 | Yes | 9 | 0 | Amber Bronze barred on 3/4-ton; two colors have an interior restriction | 10 | Two unlabeled color-and-trim sheets explicitly say no data; no exterior two-tone scheme is listed |

Totals under these rules:

- 59 complete regular model-year color rows: 9 in 2000, 9 in 2001, 8 each in 2002 through 2005, and 9 in 2007.
- 20 SEO specialty model-year color rows: 10 in 2005 and 10 in 2007.
- No supplemental-only names remain for 2002 through 2004. Their earlier GM-kit change statements now serve as supporting evidence for the complete model-year sources.
- 2006 remains explicitly blank because the retained official artifact ledger and crawler manifest contain no 2006 Suburban kit.

## Official artifact identity

All seven retained files were independently rehashed, byte-reconciled, and opened as PDFs in the committed artifact ledger. The local object paths below are relative to `tmp/crawler-state/objects/sha256/`.

| Year | Source ID and official PDF | Artifact SHA-256 | Manifest SHA-256 | Bytes | PDF pages | Object path | Crawl request and completion UTC |
|---|---|---|---|---:|---:|---|---|
| 2000 | `gm-heritage-2000-chevrolet-suburban` [official PDF](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2000-Chevrolet-Suburban.pdf) | `4ecbb2793671cbbfbbc8ad7158e2555714950479aeaffeacaaad66b3a4d4189f` | `8cd071834335ed4ed7e2854133336d3136f3ce76ba58b1006431655c5b3c8393` | 15,391,647 | 124 | `4e/cb/4ecbb2793671cbbfbbc8ad7158e2555714950479aeaffeacaaad66b3a4d4189f.pdf` | 2026-07-21 06:33:35 to 06:33:55 |
| 2001 | `gm-heritage-2001-chevrolet-suburban` [official PDF](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2001-Chevrolet-Suburban.pdf) | `fd24c0732861c15cb7754db8138c94fe6945fe76a4a90ee54400dc98bc98085a` | `a333dfcddf48b03e104df1e415382700eb0c24a68d59469352b8aee96bfa27c7` | 16,572,173 | 136 | `fd/24/fd24c0732861c15cb7754db8138c94fe6945fe76a4a90ee54400dc98bc98085a.pdf` | 2026-07-21 06:34:23 to 06:34:42 |
| 2002 | `gm-heritage-2002-chevrolet-suburban` [official PDF](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2002-Chevrolet-Suburban.pdf) | `f8d41c1578965be6e1f21df95dc83a44cde290b0411e154070319141e61395dc` | `1fdc1d6e43eef54898ed6b91a85a7ec809881b636654f0ac2d33aed9b490fa8c` | 11,556,922 | 116 | `f8/d4/f8d41c1578965be6e1f21df95dc83a44cde290b0411e154070319141e61395dc.pdf` | 2026-07-21 06:35:21 to 06:35:34 |
| 2003 | `gm-heritage-2003-chevrolet-suburban` [official PDF](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2003-Chevrolet-Suburban.pdf) | `ec8bb580f2185fff8919aeb1124adb62d7023991ced343583fa7ec3f229e4a20` | `f59fef914b9f526814010b5d1d9b6d64498ac876928ec5bafca8e52db7341184` | 28,338,734 | 184 | `ec/8b/ec8bb580f2185fff8919aeb1124adb62d7023991ced343583fa7ec3f229e4a20.pdf` | 2026-07-21 06:37:09 to 06:37:39 |
| 2004 | `gm-heritage-2004-chevrolet-suburban` [official PDF](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2004-Chevrolet-Suburban.pdf) | `4830a4b87497e236ca5a35de983ec900fc332f28db4bc7bcb5369649a0a0b0dc` | `1715e8ee6ad725facd2b7f29092db8c009ce4409a784b162c08cc4c9ac1a3039` | 14,977,618 | 146 | `48/30/4830a4b87497e236ca5a35de983ec900fc332f28db4bc7bcb5369649a0a0b0dc.pdf` | 2026-07-21 06:38:16 to 06:38:24 |
| 2005 | `gm-heritage-2005-chevrolet-suburban` [official PDF](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2005-Chevrolet-Suburban.pdf) | `0a4f9aece087719e81c7cd09cbab3fab4da9c61ee2378f5bfbcca775f278276b` | `b71e053b7b96e9c0647188dd5b777905562f327441855bda2c29babce795a02d` | 23,300,793 | 176 | `0a/4f/0a4f9aece087719e81c7cd09cbab3fab4da9c61ee2378f5bfbcca775f278276b.pdf` | 2026-07-21 06:40:17 to 06:40:32 |
| 2007 | `gm-heritage-2007-chevrolet-suburban` [official PDF](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2007-Chevrolet-Suburban.pdf) | `a0adfb3cb12d7ee058b2494b25837dd80ac31d0cd2fdde8818513448dae24efe` | `61fa522961920287dbed1708f502e0ef8d2e1e1886f6ef554ec4886c00d6bd96` | 45,706,014 | 262 | `a0/ad/a0adfb3cb12d7ee058b2494b25837dd80ac31d0cd2fdde8818513448dae24efe.pdf` | 2026-07-21 06:43:12 to 06:43:53 |

### Retained archival sources added for 2002-2004

| Year | Source and original retrieval location | Archived release copy | SHA-256 | Bytes | Pages or dimensions |
|---|---|---|---|---:|---|
| 2002 | General Motors, [2002 Chevrolet Suburban Sales Brochure](https://www.auto-brochures.com/makes/Chevrolet/Suburban/Chevrolet_US%20Suburban_2002.pdf), carried by Auto-Brochures.com | [retained PDF](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2002-chevrolet-suburban-brochure-auto-brochures.pdf) | `9d0774ee1ff03ed840436c035cb788eac038291d191d67c246db9788ae33dc00` | 3,440,353 | 19 pages |
| 2003 | General Motors, [2003 Chevrolet Suburban Sales Brochure](https://www.auto-brochures.com/makes/Chevrolet/Suburban/Chevrolet_US%20Suburban_2003.pdf), carried by Auto-Brochures.com | [retained PDF](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2003-chevrolet-suburban-brochure-auto-brochures.pdf) | `67569652d048c8aaf091a3534dbd1809d9d6c0efcbc0784f2cf54c6cceb6aab7` | 1,784,718 | 21 pages |
| 2004 | General Motors service-manual [Tahoe/Suburban color compatibility table](https://workshop-manuals.com/chevrolet/suburban_1/2_ton_2wd/v8-5.3l_vin_t/body_and_frame/paint_striping_and_decals/paint/system_information/application_and_id/color_compatibility_guide_%28paint_codes%29/page_13495/), carried by Workshop-Manuals.com | [retained PNG](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2004-chevrolet-suburban-service-color-table.png) | `84efa6eb1898c2420ac9bba9e75a144991c830e08dbb1784acc4a3a580284b3a` | 22,017 | 918 by 1,188 pixels |
| 2004 | Sherwin-Williams Automotive Finishes, [2004 North American Color Manual](https://industrial.sherwin-williams.com/content/dam/pcg/sherwin-williams/automotive/emeai/nl/nl-nl/pdfs/swaf-2004_sw_domestic_colorboo.pdf) | [retained PDF](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2004-sherwin-williams-north-american-color-manual.pdf) | `8b94ebfd068e23cdc162d69a597d4c35d5bb5fc97b731d36048219373ea821c6` | 1,428,651 | 132 pages |

No reuse license is stated by General Motors or the archival carriers for the retained 2002 through 2004 artifacts. They are archived as research evidence with publisher and carrier provenance preserved. The retained GM vehicle information kits for 2000-2005 and 2007 are also pinned in the [`brochure-source-archive-v1` Release](https://github.com/ipadmom/chevrolet-color-archive/releases/tag/brochure-source-archive-v1); 2006 has no retained governing kit.

## 2000

Source locator: PDF page 17, printed page 8, `Exterior Paint` / `Paint Colors`. The table of contents independently points to printed page 8. The governing section supplies names but no paint or WA codes.

### Base and LS paint colors

| Source order | Exterior color | Source-literal code | Scope |
|---:|---|---|---|
| 1 | Onyx Black | not supplied | Base and LS |
| 2 | Indigo Blue Metallic | not supplied | Base and LS |
| 3 | Medium Charcoal Gray Metallic | not supplied | Base and LS |
| 4 | Light Pewter Metallic | not supplied | Base and LS |
| 5 | Sunset Gold Metallic | not supplied | Base and LS |
| 6 | Dark Copper Metallic | not supplied | Base and LS |
| 7 | Dark Carmine Red Metallic | not supplied | Base and LS |
| 8 | Victory Red | not supplied | Base and LS |
| 9 | Summit White | not supplied | Base and LS |

The section states that custom two-tone paint is available on LS models in various combinations. It does not identify any exact upper/lower combination, color code, or scheme code. Preserve that as generic LS availability only.

### LT paint-color subset

| Source order | Exterior color | Source-literal code | Scope |
|---:|---|---|---|
| 1 | Onyx Black | not supplied | LT |
| 2 | Medium Charcoal Gray Metallic | not supplied | LT |
| 3 | Light Pewter Metallic | not supplied | LT |
| 4 | Sunset Gold Metallic | not supplied | LT |
| 5 | Dark Copper Metallic | not supplied | LT |

PDF pages 26-27, printed pages 17-18, are feature-availability tables. Their exterior subsection covers lamps, carriers, mirrors, wiring, and wheels, not paint availability. PDF pages 45-51 contain a generic RPO list but no numeric exterior-paint RPO rows. No code should be invented from those sections.

## 2001

Source locator: PDF page 13, printed page 5, `Vehicle Overview` / `Color and Trim` / `Exterior Colors`. The table of contents independently points to printed page 5. The governing section supplies names but no paint or WA codes.

| Source order | Exterior color | Source-literal code | General palette | Z71 restriction |
|---:|---|---|---|---|
| 1 | Onyx Black | not supplied | Yes | Yes |
| 2 | Indigo Blue Metallic | not supplied | Yes | No |
| 3 | Victory Red | not supplied | Yes | No |
| 4 | Sunset Gold Metallic | not supplied | Yes | No |
| 5 | Summit White | not supplied | Yes | Yes |
| 6 | Medium Charcoal Gray Metallic | not supplied | Yes | No |
| 7 | Forest Green Metallic | not supplied | Yes | Yes, note shortens the name to `Forest Green` |
| 8 | Light Pewter Metallic | not supplied | Yes | Yes, note shortens the name to `Light Pewter` |
| 9 | Redfire Metallic | not supplied | Yes | No |

The source restricts Z71 to Onyx Black, Summit White, Forest Green, and Light Pewter. PDF pages 49-56 contain a generic RPO list rather than paint-code rows. No complete exterior scheme or two-tone table was found.

## 2002

The governing source is the official General Motors sales brochure recovered through Auto-Brochures.com and retained in the GitHub Release. PDF pages 16-17 contain `Exterior Colors` and the LT / LS / Z71 color-availability tables. The brochure was lithographed in the United States in September 2001. It supplies names and exact package applicability but no factory or WA codes.

| Source order | Source-literal exterior color | Factory code | LT/LS | Z71 | Additional restriction |
|---:|---|---|---|---|---|
| 1 | Onyx Black | not printed | Yes | Yes | None stated |
| 2 | Indigo Blue Metallic | not printed | Yes | No | None stated |
| 3 | Light Pewter Metallic | not printed | Yes | Yes | None stated |
| 4 | Forest Green Metallic | not printed | Yes | Yes | None stated |
| 5 | Medium Charcoal Gray Metallic | not printed | Yes | No | None stated |
| 6 | Victory Red | not printed | Yes | No | None stated |
| 7 | Redfire Metallic | not printed | Yes | No | Not available on three-quarter-ton models |
| 8 | Summit White | not printed | Yes | Yes | None stated |

The official GM Heritage kit at PDF pages 9-10 independently identifies Redfire Metallic as a model-year change and LT body-color treatment. Its generic RPO list remains nongoverning. Secondary retailer code aliases are retained as research leads only and are not inserted into these source-transcribed rows.

## 2003

The governing source is the official General Motors sales brochure recovered through Auto-Brochures.com and retained in the GitHub Release. PDF page 17 contains the LT / LS / Z71 color-availability table; PDF page 19 contains `Exterior Colors`. The brochure supplies names and exact package applicability but no factory or WA codes.

| Source order | Source-literal exterior color | Factory code | LT/LS | Z71 |
|---:|---|---|---|---|
| 1 | Black | not printed | Yes | Yes |
| 2 | Indigo Blue Metallic | not printed | Yes | No |
| 3 | Light Pewter Metallic | not printed | Yes | Yes |
| 4 | Dark Green Metallic | not printed | Yes | Yes |
| 5 | Dark Gray Metallic | not printed | Yes | No |
| 6 | Redfire Metallic | not printed | Yes | No |
| 7 | Sandalwood Metallic | not printed | Yes | No |
| 8 | Summit White | not printed | Yes | Yes |

The brochure's literal name is `Dark Gray Metallic`. The official GM Heritage kit at PDF page 11 calls the new choice `Dark Spiral Gray Metallic` and independently confirms Sandalwood Metallic. Both literals are preserved in provenance, but the governing brochure name controls the availability row. The generic RPO list at PDF pages 37-41 is not used as a complete palette.

## 2004

The governing evidence is an eight-row General Motors service color-compatibility table explicitly labeled `Tahoe / Suburban`. It is retained from a third-party workshop-manual mirror. Each row is independently corroborated by the Tahoe/Suburban entries in the Sherwin-Williams 2004 North American Color Manual, PDF pages 98, 99, 101, 107, 113, 116, 120, and 125.

| Source order | Source-literal exterior color | GM color code | Touch-up code |
|---:|---|---:|---|
| 1 | Sandalwood Metallic | 58 | WA-711J |
| 2 | Dark Ming Blue Metallic | 25 | WA-722J |
| 3 | Dark Spiral Gray Metallic | 62 | WA-805K |
| 4 | Sport Red Metallic | 63 | WA-817K |
| 5 | Black | 41 | WA-8555 |
| 6 | Olympic White | 50 | WA-8624 |
| 7 | Silver Birch Metallic | 59 | WA-926L |
| 8 | Medium Green Metallic | 47 | WA-9539 |

The official GM Heritage kit at PDF page 13 supplies supporting replacement statements: Dark Blue Metallic replaces Indigo Blue, Silver Birch replaces Pewter Metallic, and Sport Red Metallic replaces Redfire. Its shortened marketing names do not overwrite the service table's exact technical names. [Edmunds' 2004 Suburban color page](https://www.edmunds.com/chevrolet/suburban/2004/pictures/colors/) is retained only as a secondary marketing-name comparison.

The complete table is published with an explicit carrier qualification because the GM service table was recovered through Workshop-Manuals.com. Its content is not treated as a live GM webpage.

## 2005

The opening narrative at PDF pages 11 and 14 identifies Sandstone Metallic and Bermuda Blue Metallic as new. The governing evidence is the later factory color-and-trim supplement at PDF pages 167-169, printed pages 35-37, published August 4, 2004.

### Regular solid paint ZY1 for LS and LT

Source locator: PDF page 167, printed page 35, `COLOR AND TRIM - SOLID PAINT ZY1 FOR LS AND LT`.

| Source order | Exterior solid paint | Color code | Touch-up paint number | Tan/Neutral | Gray/Dark Charcoal | LS wheel flares | LT wheel flares, bodyside molding, front bumper pad | LT door handles, outside mirrors | NYS 4-wheel steering |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | NEW! Sandstone Metallic | 15U | WA-929L | A | -- | Sandstone | Sandstone | Sandstone | Only-color subset |
| 2 | Dark Blue Metallic | 25U | WA-722J | A | A | Matte Black | Matte Black | Dark Blue | No |
| 3 | NEW! Bermuda Blue Metallic | 26U | WA-214M | A | A | Bermuda Blue | Bermuda Blue | Bermuda Blue | No |
| 4 | Black | 41U | WA-8555 | A | A | Matte Black | Matte Black | Black | No |
| 5 | Summit White | 50U | WA-8624 | A | A | Summit White | Summit White | Summit White | Only-color subset |
| 6 | Silver Birch Metallic | 59U | WA-926L | A | A | Silver Birch | Silver Birch | Silver Birch | Only-color subset |
| 7 | Dark Gray Metallic | 62U | WA-805K | A | A | Matte Black | Matte Black | Dark Gray | No |
| 8 | Sport Red Metallic | 63U | WA-817K | A | A | Sport Red | Sport Red | Sport Red | Only-color subset |

Restrictions and notes:

- Sandstone Metallic is unavailable with the Gray/Dark Charcoal interior.
- The only colors marked as available with `(NYS) 4-wheel steering` are Sandstone Metallic, Summit White, Silver Birch Metallic, and Sport Red Metallic.
- On LS models, bodyside molding, the front bumper pad, and door handles are Matte Black.
- The sheet's two-tone footnote describes a lighter/darker interior effect. It is not an exterior two-tone scheme.

### Solid paint ZY1 for Z71

Source locator: PDF page 168, printed page 36, `COLOR AND TRIM - SOLID PAINT ZY1 FOR Z71`.

| Source order | Exterior solid paint | Color code | Touch-up paint number | Tan/Neutral | Gray/Dark Charcoal | Wheel flares and front bumper pad | Door handles and outside mirrors |
|---:|---|---|---|---|---|---|---|
| 1 | NEW! Bermuda Blue Metallic | 26U | WA-214M | A | A | Bermuda Blue | Bermuda Blue |
| 2 | Black | 41U | WA-8555 | A | A | Matte Black | Black |
| 3 | Summit White | 50U | WA-8624 | A | A | Summit White | Summit White |
| 4 | Silver Birch Metallic | 59U | WA-926L | A | A | Silver Birch | Silver Birch |
| 5 | Sport Red Metallic | 63U | WA-817K | A | A | Sport Red | Sport Red |

These five rows are a package subset of the eight-color regular palette, not five additional year-color identities. The lighter/darker two-tone footnote again describes the interior only.

### SEO solid paint

Source locator: PDF page 169, printed page 37, `COLOR AND TRIM - SEO SOLID PAINT`.

| Source order | Exterior solid paint | Source-literal color code | Touch-up paint number | Tan/Neutral | Gray/Dark Charcoal |
|---:|---|---|---|---|---|
| 1 | NEW! Blue | none | WA-5665 | A | A |
| 2 | Blue | none | WA-7901 | A | A |
| 3 | Green | none | WA-7941 | A | A |
| 4 | Green, Woodland | 9V5 | WA-9015 | A | A |
| 5 | Victory Red | none | WA-9260 | A | A |
| 6 | Doeskin Tan | 9V9 | WA-9403 | A | A |
| 7 | Yellow | none | WA-9414 | A | A |
| 8 | Tangier Orange | 9W4 | WA-9417 | A | A |
| 9 | Wheatland Yellow | 9W3 | WA-253A | A | A |
| 10 | NEW! Dark Toreador Red | none | WA-334D | A | A |

All wheel flares, bodyside moldings, front bumper pads, OSRV mirror backs, and door handles are Black for these SEO paints. Six rows have the literal color code `none`; all ten have WA touch-up paint numbers. The sheet does not use the literal name `Forest Service Green`.

## 2006

No entry matching 2006 and Suburban exists in either:

- `data/sources/gm-heritage-chevrolet-artifacts.json`
- `crawler/manifests/gm-heritage-chevrolet-all.jsonl`

There is therefore no retained official 2006 Suburban artifact to govern a palette in this audit. The correct result is an explicit blank/unverified year. Do not carry forward the 2005 palette, carry backward the 2007 palette, or substitute Tahoe data.

## 2007

PDF page 13, printed product-information page 3, explicitly says Suburban is offered in nine exterior colors and names the same nine colors later tabulated in the order guide. The narrative spells the first name `Greystone Metallic`; the governing coded table spells it `Graystone Metallic`. Preserve both literals and use the governing table spelling for the coded row. The governing table is the appended order-guide sheet at PDF page 177, printed page 31, published July 28, 2006.

### Solid paint ZY1 for LS, LT, and LTZ

Source locator: PDF page 177, printed page 31, `COLOR AND TRIM - ZY1 FOR LS, LT AND LTZ`.

| Source order | Exterior solid paint | Color code | Touch-up paint number | Ebony | Light Cashmere/Ebony | Light Titanium/Dark Titanium | Restriction |
|---:|---|---|---|---|---|---|---|
| 1 | NEW! Graystone Metallic | 16U | WA-213M | A | A | A | None stated |
| 2 | Dark Blue Metallic | 25U | WA-722J | A | A | A | None stated |
| 3 | Bermuda Blue Metallic | 26U | WA-214M | A | A | A | Available at extra charge |
| 4 | Black | 41U | WA-8555 | A | A | A | None stated |
| 5 | Summit White | 50U | WA-8624 | A | A | A | None stated |
| 6 | NEW! Gold Mist Metallic | 51U | WA-316N | A | A | -- | Not available with Light Titanium/Dark Titanium |
| 7 | NEW! Amber Bronze Metallic | 53U | WA-317N | A | A | -- | Not available on 3/4-ton models; not available with Light Titanium/Dark Titanium |
| 8 | Silver Birch Metallic | 59U | WA-926L | A | A | A | None stated |
| 9 | Sport Red Metallic | 63U | WA-817K | A | A | A | None stated |

The sheet's lighter/darker two-tone footnote describes the interior only. The product narrative says the Z71 Off Road appearance package returned for 2007, but the Suburban order-guide color section supplies no separate Z71 color subset. Do not infer one.

PDF page 178, printed page 32, is an otherwise unlabeled `COLOR AND TRIM -` sheet that says there is no data available for Suburban. PDF page 180, printed page 34, repeats the same explicit no-data result. Because the category suffix is absent, this audit does not guess what missing color-and-trim category either blank sheet represented.

### SEO solid paint

Source locator: PDF page 179, printed page 33, `COLOR AND TRIM - SEO SOLID PAINT`.

| Source order | Exterior solid paint | Source-literal color code | Touch-up paint number | Ebony | Light Cashmere/Ebony | Light Titanium/Dark Titanium |
|---:|---|---|---|---|---|---|
| 1 | Blue | none | WA-5665 | A | A | A |
| 2 | Green | none | WA-7941 | A | A | A |
| 3 | Woodland Green | 9V5 | WA-9015 | A | A | A |
| 4 | Victory Red | none | WA-9260 | A | A | A |
| 5 | Doeskin Tan | 9V9 | WA-9403 | A | A | A |
| 6 | Yellow | none | WA-9414 | A | A | A |
| 7 | Tangier Orange | 9W4 | WA-9417 | A | A | A |
| 8 | Indigo Blue | none | WA-9792 | A | A | A |
| 9 | Wheatland Yellow | 9W3 | WA-253A | A | A | A |
| 10 | Dark Toreador Red | none | WA-334D | A | A | A |

When special paint is specified, the sheet requires all exterior non-metal body parts to be gloss black, including the front and rear bumpers, mirrors, front fascia, door handles, body side moldings, D-Pillars, and rear lift gate applique assemblies. Six rows have the literal color code `none`; all ten have WA touch-up paint numbers. The sheet does not use the literal name `Forest Service Green`.

## Document dates and PDF metadata

Printed publication dates govern the appended order-guide sheets where present. PDF creation and modification dates describe the digitized file, not the model-year availability date.

| Year | Printed color-sheet publication date | PDF format | Creator/producer | PDF creation date | PDF modification date |
|---|---|---|---|---|---|
| 2000 | None printed in governing color section | PDF 1.3 | DigiPath / DigiPath | `D:20050921015615` | `D:20050921015620-05'00'` |
| 2001 | None printed in governing color section | PDF 1.3 | DigiPath / DigiPath | `D:20050920194434` | `D:20050920194439-05'00'` |
| 2002 | Sales brochure lithographed September 2001 | Retained sales brochure PDF plus GM Heritage kit | Brochure metadata preserved in the retained release artifact | See retained artifact | See retained artifact |
| 2003 | No separate chart revision printed | Retained sales brochure PDF plus GM Heritage kit | Brochure metadata preserved in the retained release artifact | See retained artifact | See retained artifact |
| 2004 | Service table identifies the 2004 model year | Retained service-table PNG, Sherwin-Williams manual, and GM Heritage kit | Source metadata preserved in retained artifacts | See retained artifacts | See retained artifacts |
| 2005 | August 4, 2004 | PDF 1.3 | DigiPath / DigiPath | `D:20050909110007` | `D:20050909110026-05'00'` |
| 2007 | July 28, 2006 | PDF 1.5 | DigiPath / DigiPath | `D:20061103115326Z` | `D:20070124105619-05'00'` |

## Integration rules for normalized data

1. Load 2000 through 2005 and 2007 regular rows as complete model-year palettes, preserving each source's retrieval-host qualification.
2. Store the 2002 and 2003 brochure names without codes because the brochures print none. Store the 2004 service color code and WA touch-up code in separate normalized fields.
3. Preserve 2006 as an explicit missing-source status rather than generating zero-availability assertions for individual colors.
4. Preserve Z71 and NYS subsets in a package-availability relation keyed back to the regular year-color row.
5. Preserve SEO rows in a specialty-paint relation. Do not merge a literal `none` color code into null.
6. Store both the marketing color code and WA touch-up number where the source supplies both.
7. Keep source-literal names as transcribed. Cross-source aliases such as `Dark Gray Metallic` and `Dark Spiral Gray Metallic`, `Green, Woodland` and `Woodland Green`, or `Silver Birch` and `Silver Birch Metallic`, may be linked in a separate alias table but must not be silently rewritten.
8. Do not create exterior two-tone combinations from interior two-tone footnotes.

## Visual verification record

The GM Heritage PDFs have no reliable text layer. Every contact sheet was visually reviewed, and governing pages were rendered at 4x resolution for transcription. The retained 2002 and 2003 brochures were text-extracted and page-checked. The 2004 service table image was visually inspected, then every model row was checked against the Sherwin-Williams compatibility pages.

- 2000 contact sheets: PDF pages 1-40, 41-80, 81-120, and 121-124. Governing/detail renders: 17-18, 26-27, and 45-51.
- 2001 contact sheets: PDF pages 1-40, 41-80, 81-120, and 121-136. Governing/detail renders: 13-17 and 49-56.
- 2002 official brochure: PDF pages 16-17. Supporting GM Heritage contact sheets: PDF pages 1-40, 41-80, and 81-116; detail renders 9-15 and 35-41.
- 2003 official brochure: PDF pages 17 and 19. Supporting GM Heritage contact sheets: PDF pages 1-40, 41-80, 81-120, 121-160, and 161-184; detail renders 9-16 and 37-41.
- 2004 service table: retained 918 by 1,188 pixel PNG. Sherwin-Williams corroboration: PDF pages 98, 99, 101, 107, 113, 116, 120, and 125. Supporting GM Heritage contact sheets: PDF pages 1-40, 41-80, 81-120, and 121-146; detail renders 9-20.
- 2005 contact sheets: PDF pages 1-40, 41-80, 81-120, 121-160, and 161-176. Governing/detail renders: 9-22 and 161-176, including the late color supplement at 167-169.
- 2007 contact sheets: PDF pages 1-40, 41-80, 81-120, 121-160, 161-200, 201-240, and 241-262. Governing/detail renders: 9-25 and 176-186, including the appended order-guide color sheets at 177-180.

Tahoe data was not used to fill any Suburban year. No adjacent-year inference was used.
