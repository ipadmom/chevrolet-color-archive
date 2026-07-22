---
title: Chevrolet Suburban exterior-color cross-check, model years 2015-2024
visibility: public
classification: archive-internal
period: 2015-2024
sources:
  - gm-fleet-guide-us-2015
  - gm-fleet-guide-us-2016-november
  - gm-fleet-guide-us-2017
  - gm-fleet-guide-us-2018
  - gm-fleet-guide-us-2019
  - gm-fleet-guide-us-2020
  - gm-fleet-guide-us-2021-v3
  - gm-fleet-guide-us-2022-v6
  - gm-fleet-guide-us-2023-v3
  - gm-fleet-guide-us-2024-v3
---

# Chevrolet Suburban exterior-color cross-check, 2015-2024

## Result

The retained GM Fleet Guides support exactly **92 regular-Suburban year-color rows**:

| Model year | Regular Suburban colors |
|---:|---:|
| 2015 | 8 |
| 2016 | 10 |
| 2017 | 9 |
| 2018 | 10 |
| 2019 | 9 |
| 2020 | 8 |
| 2021 | 9 |
| 2022 | 10 |
| 2023 | 10 |
| 2024 | 9 |
| **Total** | **92** |

There is no color, factory-code, model-year, page, or per-color restriction disagreement with the ten regular-Suburban tables in `data/sources/modern-chevrolet-color-source-candidates.json`. The cross-check found one omitted source qualification: the 2015 palette heading carries footnote 10, defined on PDF page 138 as “Actual colors may vary. Not all colors available on all models.” The registry now preserves that qualification at table level.

Two additional source-metadata issues do not change the 92-row result:

1. The 2018 source-level `color_table_candidate_pdf_pages` array originally omitted PDF page 65 because the Suburban palette’s image-heavy layout reduced text extraction recall. PDF page 60 remains a valid Traverse color-table candidate; the audited Suburban PDF page 65 is now also enumerated.
2. The 2024 source record’s historical GM path names a `2023MY` Fleet Guide dated `050622`. It now lives in `historical_official_url`, not `direct_official_url`, because it redirects and does not serve the retained 2024 V3 bytes.

## Method and palette classification

Each regular Suburban palette page, and each separate Suburban HD palette page, was rasterized at 2.5x from the retained PDF and visually inspected. Text extraction was used only to preserve literal spelling, codes, markers, and footnote language. SHA-256, bytes, page counts, and PDF metadata dates were independently recomputed from the retained files.

None of these Fleet Guide model pages is a complete governing Order Guide option matrix. The correct type is **qualified Fleet Guide palette union** for every year:

- 2015-2018: qualified Fleet Guide palette union **with source-printed factory codes**. The listed codes are complete for the colors printed on the model page, but the page does not supply a full trim-by-color option matrix.
- 2019-2024: qualified Fleet Guide palette union **without printed factory codes**. No code is inferred.
- 2023-2024 expressly state: “Exterior colors vary by trim level. See Order Guide for details.”

## Source integrity and provenance

`Revision/date` below is the date component of the PDF’s modification timestamp, which matches the registry’s `revision_or_document_date` field. Hashes, byte sizes, and page counts independently match the registry.

### 2015

- Source ID: `gm-fleet-guide-us-2015`
- Registry title/version: `2015 GM Fleet Car & Truck Guide`
- Revision/date: `2014-06-12`
- Retained Release asset: [2015 GM Fleet Car & Truck Guide](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2015-gm-fleet-car-truck-guide-mirror.pdf)
- PDF page count: `142`
- Bytes: `28790965`
- SHA-256: `730619c14a83c809f8a786e020391f89f92040bb502889dc0d10e41206cac41e`
- Retrieval URL: `https://xr793.com/wp-content/uploads/2020/03/2015-GM-Feet-Car-Truck-Guide.pdf`
- Direct official URL: none in registry

### 2016

- Source ID: `gm-fleet-guide-us-2016-november`
- Registry title/version: `2016 GM Fleet Guide, November Update`
- Revision/date: `2015-11-25`
- Retained Release asset: [2016 GM Fleet Guide, November update](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2016-gm-fleet-guide-november-mirror.pdf)
- PDF page count: `148`
- Bytes: `24673080`
- SHA-256: `f53f4f05585edc0bf529ee408d52f18a0bb770a28d1c1d0fb7458f34351ef578`
- Retrieval URL: `https://xr793.com/wp-content/uploads/2020/03/2016-GM-Fleet-Guide-November-Update.pdf`
- Direct official URL: none in registry

### 2017

- Source ID: `gm-fleet-guide-us-2017`
- Registry title/version: `2017 GM Fleet Guide`
- Revision/date: `2016-12-22`
- Retained Release asset: [2017 GM Fleet Guide](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2017-gm-fleet-guide-mirror.pdf)
- PDF page count: `152`
- Bytes: `20125688`
- SHA-256: `0d4981b8fc8f20d087b76446c5a80fba9a5a798d6d7925fe41fb9e8c57de9e05`
- Retrieval URL: `https://xr793.com/wp-content/uploads/2020/03/2017-GM-Fleet-Guide.pdf`
- Direct official URL: none in registry

### 2018

- Source ID: `gm-fleet-guide-us-2018`
- Registry title/version: `2018 GM Fleet Guide`
- Revision/date: `2018-01-29`
- Retained Release asset: [2018 GM Fleet Guide](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2018-gm-fleet-guide-mirror.pdf)
- PDF page count: `126`
- Bytes: `10853752`
- SHA-256: `be48bfde2180a4182c9c62191da24fbe2903197eeb961bf443ffb59567e1372b`
- Retrieval URL: `https://xr793.com/wp-content/uploads/2021/03/2018-GM-Fleet-Guide.pdf`
- Direct official URL: none in registry

### 2019

- Source ID: `gm-fleet-guide-us-2019`
- Registry title/version: `2019 GM Fleet Guide`
- Revision/date: `2019-02-07`
- Retained Release asset: [2019 GM Fleet Guide](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2019-gm-fleet-guide-mirror.pdf)
- PDF page count: `130`
- Bytes: `10445916`
- SHA-256: `4d5ae974de5331d48af54248f40abc7600c0c566d5f5d7f9be5a3f394f423d87`
- Retrieval URL: `https://xr793.com/wp-content/uploads/2019/11/2019-GM-Fleet-Guide.pdf`
- Direct official URL: none in registry

### 2020

- Source ID: `gm-fleet-guide-us-2020`
- Registry title/version: `2020 GM Fleet Guide`
- Revision/date: `2019-10-17`
- Retained Release asset: [2020 GM Fleet Guide](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2020-gm-fleet-guide-mirror.pdf)
- PDF page count: `124`
- Bytes: `28938841`
- SHA-256: `975934dbfafef814d92ed452071abca8020e591cbb519f74aa492f64c64442d8`
- Retrieval URL: `https://xr793.com/wp-content/uploads/2019/11/2020-GM-Fleet-Guide.pdf`
- Direct official URL: none in registry

### 2021

- Source ID: `gm-fleet-guide-us-2021-v3`
- Registry title/version: `2021 GM Fleet Guide V3`
- Revision/date: `2020-10-07`
- Retained Release asset: [2021 GM Fleet Guide V3](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2021-gm-fleet-guide-v3-mirror.pdf)
- PDF page count: `110`
- Bytes: `14541647`
- SHA-256: `92aaec592e01b0dbf5aca290a34ea2f96908a7324fcd475446af09df8fa7ee1c`
- Retrieval URL: `https://xr793.com/wp-content/uploads/2020/11/2021-GM-Fleet-Guide-V3.pdf`
- Direct official URL: `https://www.gmfleet.com/content/dam/fleet/na/us/english/index/guides/02-pdfs/2021MY_GMFleetGuide_US_IPDF_FINAL_UPDATED_1006201.pdf`

### 2022

- Source ID: `gm-fleet-guide-us-2022-v6`
- Registry title/version: `2022 GM Fleet Guide V6`
- Revision/date: `2022-02-28`
- Retained Release asset: [2022 GM Fleet Guide V6](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2022-gm-fleet-guide-v6-mirror.pdf)
- PDF page count: `119`
- Bytes: `20549478`
- SHA-256: `265ab13a565ccb5c733ce27af2b03f0ffe3d38bb196fd222650e2fff2043375c`
- Retrieval URL: `https://xr793.com/wp-content/uploads/2022/03/2022-GM-Fleet-Guide-V6.pdf`
- Direct official URL: `https://www.gmfleet.com/content/dam/fleet/na/us/english/index/guides/02-pdfs/03-04-22/2022MY-GM-Fleet-Guide-US-iPDF-Updated-022822.pdf`

### 2023

- Source ID: `gm-fleet-guide-us-2023-v3`
- Registry title/version: `2023 GM Fleet Guide V3`
- Revision/date: `2022-12-20`
- Retained Release asset: [2023 GM Fleet Guide V3](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2023-gm-fleet-guide-v3-mirror.pdf)
- PDF page count: `121`
- Bytes: `17883996`
- SHA-256: `697423b1c274d8fe30f9e58fc5dc9ecf365d119f7f1155f54dc4c3fd9d8484ef`
- Retrieval URL: `https://xr793.com/wp-content/uploads/2023/04/2023-GM-Fleet-Guide-v3.pdf`
- Direct official URL: none in registry

### 2024

- Source ID: `gm-fleet-guide-us-2024-v3`
- Registry title/version: `2024 GM Envolve Fleet Guide V3`
- Revision/date: `2023-11-20`
- Retained Release asset: [2024 GM Envolve Fleet Guide V3](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2024-gm-fleet-guide-v3-mirror.pdf)
- PDF page count: `114`
- Bytes: `14780183`
- SHA-256: `7511f74a0edee3c396bbe2a42746f75d0d61871897686505f4899e65835c8851`
- Retrieval URL: `https://xr793.com/wp-content/uploads/2024/01/2024-GM-Fleet-Guide-v3.pdf`
- Registry `direct_official_url`: `https://www.gmfleet.com/content/dam/fleet/na/us/english/index/guides/02-pdfs/2023MY%20GM%20Fleet%20Guide%20US%20iPDF%20050622.pdf`
- Direct-URL status: historical registry URL whose path says 2023MY; the source record says it now redirects and does not serve the retained 2024 V3 bytes

## Year-by-year regular Suburban palettes

### 2015 regular Suburban

- PDF page: `75`
- Printed page: `75`
- Source ID: `gm-fleet-guide-us-2015`
- Model identifiers printed: Suburban 2WD `CC15906`; Suburban 4WD `CK15906`
- Palette type: qualified Fleet Guide palette union with source-printed factory codes
- Total: `8`

| Source-literal color | Factory code printed | Marker | Other literal annotation |
|---|---|---|---|
| Sable Metallic | G7U | none on row | `(new)` |
| Summit White | GAZ | none on row | none |
| White Diamond Tricoat | GBN | none on row | none |
| Tungsten Metallic | GXG | none on row | `(new)` |
| Black | GBA | none on row | none |
| Champagne Silver Metallic | GWT | none on row | none |
| Silver Ice Metallic | GAN | none on row | none |
| Crystal Red Tintcoat | GBE | none on row | none |

Palette-heading marker: `10` on `AVAILABLE EXTERIOR COLORS`. Footnote 10 appears on PDF page 138: “Actual colors may vary. Not all colors available on all models.”

No separate Suburban HD section or palette appears in the 2015 guide.

### 2016 regular Suburban

- PDF page: `78`
- Printed page: `78`
- Source ID: `gm-fleet-guide-us-2016-november`
- Model identifiers printed: Suburban 2WD `CC15906`; Suburban 4WD `CK15906`
- Palette type: qualified Fleet Guide palette union with source-printed factory codes
- Total: `10`

| Source-literal color | Factory code printed | Marker | Restriction or annotation |
|---|---|---|---|
| Slate Grey Metallic | G1C | none | `(new)` |
| Silver Ice Metallic | GAN | none | none |
| Champagne Silver Metallic | GWT | none | none |
| Siren Red Tintcoat | G1E | `a` | `(new)`; additional charge |
| Summit White | GAZ | none | none |
| Brownstone Metallic | GWX | none | none |
| Iridescent Pearl Tricoat | G1W | `b` | `(new)`; additional charge; not available on LS models |
| Black | GBA | none | none |
| Tungsten Metallic | GXG | none | none |
| Sable Metallic | G7U | `a` | additional charge |

Footnotes: `a` = “Additional charge.” `b` = “Additional charge. Not available on LS models.”

Suburban HD is a separate model and palette on PDF/printed page 80; it is excluded from these ten rows.

### 2017 regular Suburban

- PDF page: `81`
- Printed page: `81`
- Source ID: `gm-fleet-guide-us-2017`
- Model identifiers printed: Suburban 2WD `CC15906`; Suburban 4WD `CK15906`
- Palette type: qualified Fleet Guide palette union with source-printed factory codes
- Total: `9`

| Source-literal color | Factory code printed | Marker | Restriction or annotation |
|---|---|---|---|
| Blue Velvet Metallic | G1M | `b` | `(new)`; not available on Commercial models |
| Pepperdust Metallic | GMU | `b` | `(new)`; not available on Commercial models |
| Siren Red Tintcoat | G1E | `a` | additional charge |
| Iridescent Pearl Tricoat | G1W | `c` | additional charge; not available on Commercial or LS models |
| Silver Ice Metallic | GAN | none | none |
| Summit White | GAZ | none | none |
| Black | GBA | none | none |
| Champagne Silver Metallic | GWT | none | none |
| Tungsten Metallic | GXG | none | none |

Footnotes: `a` = “Additional charge.” `b` = “Not available on Commercial models.” `c` = “Additional charge. Not Available on Commercial or LS models.”

Suburban HD is a separate Fleet-only model and palette on PDF/printed page 82; it is excluded from these nine rows.

### 2018 regular Suburban

- PDF page: `65`
- Printed page: `60`
- Source ID: `gm-fleet-guide-us-2018`
- Model identifiers printed: Suburban 2WD `CC15906`; Suburban 4WD `CK15906`
- Palette type: qualified Fleet Guide palette union with source-printed factory codes
- Total: `10`

| Source-literal color | Factory code printed | Marker | Restriction or annotation |
|---|---|---|---|
| Havana Metallic | G2X | none | `(new)` |
| Satin Steel Metallic | G9K | none | `(new)` |
| Siren Red Tintcoat | G1E | `a` | additional charge |
| Blue Velvet Metallic | G1M | none | none |
| Iridescent Pearl Tricoat | G1W | `b` | additional charge; not available on Commercial or LS models |
| Silver Ice Metallic | GAN | none | none |
| Summit White | GAZ | none | none |
| Black | GBA | none | none |
| Pepperdust Metallic | GMU | none | none |
| Tungsten Metallic | GXG | none | none |

Footnotes: `a` = “Additional charge.” `b` = “Additional charge. Not available on Commercial or LS models.”

Suburban HD is a separate Fleet-only model and palette on PDF page 66, printed page 61; it is excluded from these ten rows.

### 2019 regular Suburban

- PDF page: `71`
- Printed page: no numeric page printed
- Source ID: `gm-fleet-guide-us-2019`
- Available models printed: Commercial 2WD/4WD `1FL`; LS 2WD/4WD `1LS`; LT 2WD/4WD `1LT`; Premier 2WD/4WD `1LZ`
- Palette type: qualified Fleet Guide palette union; no factory codes printed
- Total: `9`

| Source-literal color | Factory code printed | Marker | Restriction |
|---|---|---|---|
| Black | not printed | none | none printed |
| Blue Velvet Metallic | not printed | none | none printed |
| Iridescent Pearl Tricoat | not printed | `3` | premium paint; additional charge |
| Pepperdust Metallic | not printed | none | none printed |
| Satin Steel Metallic | not printed | none | none printed |
| Shadow Gray Metallic | not printed | none | none printed |
| Silver Ice Metallic | not printed | none | none printed |
| Siren Red Tintcoat | not printed | `3` | premium paint; additional charge |
| Summit White | not printed | none | none printed |

Footnote 3: “Premium paint; additional charge.”

Suburban HD is a separate Fleet-only model and palette on PDF page 72; it is excluded from these nine rows.

### 2020 regular Suburban

- PDF page: `69`
- Printed page: no numeric page printed
- Source ID: `gm-fleet-guide-us-2020`
- Available models printed: Commercial 2WD/4WD `1FL`; LS 2WD/4WD `1LS`; LT 2WD/4WD `1LT`; Premier 2WD/4WD `1LZ`
- Palette type: qualified Fleet Guide palette union; no factory codes printed
- Total: `8`

| Source-literal color | Factory code printed | Marker | Restriction |
|---|---|---|---|
| Black | not printed | none | none printed |
| Blue Velvet Metallic | not printed | none | none printed |
| Iridescent Pearl Tricoat | not printed | `3` | premium paint; additional charge |
| Satin Steel Metallic | not printed | none | none printed |
| Shadow Gray Metallic | not printed | none | none printed |
| Silver Ice Metallic | not printed | none | none printed |
| Siren Red Tintcoat | not printed | `3` | premium paint; additional charge |
| Summit White | not printed | none | none printed |

Footnote 3: “Premium paint; additional charge.” No separate Suburban HD section or palette appears in the 2020 guide.

### 2021 regular Suburban

- PDF page: `58`
- Printed page: no numeric page printed
- Source ID: `gm-fleet-guide-us-2021-v3`
- Available models printed: Commercial 2WD/4WD `1FL`; LS 2WD/4WD `1LS`; LT 2WD/4WD `1LT`; RST 2WD/4WD `1SP`; Z71 4WD `2Z7`; Premier 2WD/4WD `1LZ`; High Country 2WD/4WD `3LZ`
- Palette type: qualified Fleet Guide palette union; no factory codes printed
- Total: `9`

| Source-literal color | Factory code printed | Marker | Restriction |
|---|---|---|---|
| Black | not printed | none | none printed |
| Cherry Red Tintcoat | not printed | `3` | premium paint; additional cost |
| Empire Beige Metallic | not printed | none | none printed |
| Graywood Metallic | not printed | none | none printed |
| Iridescent Pearl Tricoat | not printed | `3` | premium paint; additional cost |
| Midnight Blue Metallic | not printed | none | none printed |
| Satin Steel Metallic | not printed | none | none printed |
| Shadow Gray Metallic | not printed | none | none printed |
| Summit White | not printed | none | none printed |

Footnote 3: “Premium paint; additional cost.” No separate Suburban HD section or palette appears in the 2021 guide.

### 2022 regular Suburban

- PDF page: `51`
- Printed page: no numeric page printed
- Source ID: `gm-fleet-guide-us-2022-v6`
- Available models printed: Commercial 2WD/4WD `1FL`; LS 2WD/4WD `1LS`; LT 2WD/4WD `1LT`; RST 2WD/4WD `1SP`; Z71 4WD `2Z7`; Premier 2WD/4WD `1LZ`; High Country 2WD/4WD `3LZ`
- Palette type: qualified Fleet Guide palette union; no factory codes printed
- Total: `10`

| Source-literal color | Factory code printed | Marker | Restriction |
|---|---|---|---|
| Auburn Metallic | not printed | none | none printed |
| Black | not printed | none | none printed |
| Cherry Red Tintcoat | not printed | `3` | premium paint; additional cost |
| Dark Ash Metallic | not printed | none | none printed |
| Empire Beige Metallic | not printed | none | none printed |
| Evergreen Gray Metallic | not printed | none | none printed |
| Iridescent Pearl Tricoat | not printed | `3` | premium paint; additional cost |
| Midnight Blue Metallic | not printed | none | none printed |
| Satin Steel Metallic | not printed | none | none printed |
| Summit White | not printed | none | none printed |

Footnote 3: “Premium paint; additional cost.” No separate Suburban HD section or palette appears in the 2022 guide.

### 2023 regular Suburban

- PDF page: `51`
- Printed page: no numeric page printed
- Source ID: `gm-fleet-guide-us-2023-v3`
- Available models printed: Commercial 2WD/4WD `1FL`; LS 2WD/4WD `1LS`; LT 2WD/4WD `1LT`; RST 2WD/4WD `1SP`; Z71 4WD `2Z7`; Premier 2WD/4WD `1LZ`; High Country 2WD/4WD `3LZ`
- Palette type: qualified Fleet Guide palette union; no factory codes printed
- Total: `10`

| Source-literal color | Factory code printed | Marker | Restriction |
|---|---|---|---|
| Auburn Metallic | not printed | none | trim applicability not specified on page |
| Black | not printed | none | trim applicability not specified on page |
| Dark Ash Metallic | not printed | none | trim applicability not specified on page |
| Empire Beige Metallic | not printed | none | trim applicability not specified on page |
| Iridescent Pearl Tricoat | not printed | `3` | premium paint; additional cost; trim applicability not specified on page |
| Midnight Blue Metallic | not printed | none | trim applicability not specified on page |
| Radiant Red Tintcoat | not printed | `3` | premium paint; additional cost; trim applicability not specified on page |
| Silver Sage Metallic | not printed | none | trim applicability not specified on page |
| Sterling Gray Metallic | not printed | none | trim applicability not specified on page |
| Summit White | not printed | none | trim applicability not specified on page |

Footnote 3: “Premium paint; additional cost.” Page note: “Exterior colors vary by trim level. See Order Guide for details.” No separate Suburban HD section or palette appears in the 2023 guide.

### 2024 regular Suburban

- PDF page: `54`
- Printed page: no numeric page printed
- Source ID: `gm-fleet-guide-us-2024-v3`
- Available models printed: Commercial 2WD/4WD `1FL`; LS 2WD/4WD `1LS`; LT 2WD/4WD `1LT`; RST 2WD/4WD `1SP`; Z71 4WD `2Z7`; Premier 2WD/4WD `1LZ`; High Country 2WD/4WD `3LZ`
- Palette type: qualified Fleet Guide palette union; no factory codes printed
- Total: `9`

| Source-literal color | Factory code printed | Marker | Restriction |
|---|---|---|---|
| Black | not printed | none | trim applicability not specified on page |
| Dark Ash Metallic | not printed | none | trim applicability not specified on page |
| Empire Beige Metallic | not printed | none | trim applicability not specified on page |
| Iridescent Pearl Tricoat | not printed | `3` | premium paint; additional cost; trim applicability not specified on page |
| Midnight Blue Metallic | not printed | none | trim applicability not specified on page |
| Radiant Red Tintcoat | not printed | `3` | premium paint; additional cost; trim applicability not specified on page |
| Silver Sage Metallic | not printed | none | trim applicability not specified on page |
| Sterling Gray Metallic | not printed | none | trim applicability not specified on page |
| Summit White | not printed | none | trim applicability not specified on page |

Footnote 3: “Premium paint; additional cost.” Page note: “Exterior colors vary by trim level. See Order Guide for details.” No separate Suburban HD section or palette appears in the 2024 guide.

## Separate Suburban HD palettes, excluded from the 92-row result

| Model year | HD page | Printed page | HD model identification | HD palette, complete as printed | HD total |
|---:|---:|---:|---|---|---:|
| 2016 | 80 | 80 | Suburban 4WD `CK35906` | Slate Grey Metallic `G1C`; Siren Red Tintcoat `G1E` (`a`, additional charge); Sable Metallic `G7U` (`a`, additional charge); Silver Ice Metallic `GAN`; Summit White `GAZ`; Black `GBA`; Champagne Silver Metallic `GWT`; Brownstone Metallic `GWX`; Tungsten Metallic `GXG` | 9 |
| 2017 | 82 | 82 | Fleet-only Suburban 4WD `CK35906` | Silver Ice Metallic `GAN`; Summit White `GAZ`; Black `GBA`; Champagne Silver Metallic `GWT`; Tungsten Metallic `GXG` | 5 |
| 2018 | 66 | 61 | Fleet-only Suburban AWD `CK35906` | Satin Steel Metallic `G9K`; Siren Red Tintcoat `G1E` (`a`, not available at Start of Production; additional charge); Blue Velvet Metallic `G1M`; Silver Ice Metallic `GAN`; Summit White `GAZ`; Black `GBA`; Pepperdust Metallic `GMU`; Tungsten Metallic `GXG` | 8 |
| 2019 | 72 | none | Fleet-only LS AWD `1LS`; LT AWD `1LT` | Black; Blue Velvet Metallic; Pepperdust Metallic; Satin Steel Metallic; Shadow Gray Metallic; Silver Ice Metallic; Siren Red Tintcoat (`5`, premium paint; additional charge); Summit White | 8 |

There is no separate Suburban HD palette in the 2015 or 2020-2024 guides. No HD color above is included in the regular-Suburban count of 92.

## Publication disposition

- Regular Suburban row count: **92, confirmed**.
- Current regular-Suburban color sets, printed codes, PDF page locators, and per-color restrictions: **confirmed**.
- Codes for 2019-2024: **not printed and must not be inferred**.
- Source-qualification fix completed: the registry preserves the 2015 heading footnote 10 language.
- Source-metadata fixes completed: the 2024 URL is historical and non-byte-verifying, and the 2018 source-level candidate list includes audited PDF page 65 while retaining the valid Traverse candidate on PDF page 60.
