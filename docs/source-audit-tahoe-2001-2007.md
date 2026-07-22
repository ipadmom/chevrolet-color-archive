---
title: Chevrolet Tahoe exterior-color source audit, 2001-2007
visibility: public
classification: archive-internal
period: 2001-2007
sources:
  - GM Heritage Archive Chevrolet vehicle information kits
  - Original Chevrolet sales brochures and specification sheets
  - Sherwin-Williams GM model-specific color compatibility guides
  - New Jersey Tahoe police vehicle contract specifications
---

# Chevrolet Tahoe exterior-color source audit, 2001-2007

## Result

Every model year from 2001 through 2007 now has a complete reviewed regular Tahoe palette. Each year has its own controlling table. No color is projected from an adjacent year or from the Suburban.

| Model year | Regular colors | Controlling table | Separate specialty rows |
|---:|---:|---|---:|
| 2001 | 9 | Official GM kit, PDF p. 12 | 0 |
| 2002 | 8 | Original Chevrolet sales brochure, PDF pp. 18-19 | 0 |
| 2003 | 8 | Official GM kit, PDF p. 138 | 4 TGK colors |
| 2004 | 8 | Chevrolet U.S. specification sheet, PDF p. 2 | 0 |
| 2005 | 8 | Chevrolet U.S. specification sheet, PDF p. 2 | 5 police/TGK colors |
| 2006 | 8 | Chevrolet U.S. specification sheet, PDF p. 2 | 5 police/TGK colors |
| 2007 | 9 | Official GM kit, PDF p. 11 | 0 |

The machine-readable audit is [`data/audits/tahoe-2001-2007.json`](../data/audits/tahoe-2001-2007.json). Published specialty rows are in [`data/sources/specialty-color-source-candidates.json`](../data/sources/specialty-color-source-candidates.json).

## Exact palettes

- **2001:** Onyx Black; Indigo Blue Metallic; Victory Red; Sunset Gold Metallic; Summit White; Medium Charcoal Gray Metallic; Forest Green Metallic; Light Pewter Metallic; Redfire Metallic.
- **2002:** Onyx Black; Indigo Blue Metallic; Light Pewter Metallic; Forest Green Metallic; Medium Charcoal Gray Metallic; Victory Red; Redfire Metallic; Summit White.
- **2003:** Light Pewter Metallic `11U / WA-382E`; Indigo Blue Metallic `39U / WA-9792`; Black `41U / WA-8555`; Dark Green Metallic `47U / WA-9539`; Summit White `50U / WA-8624`; Sandalwood Metallic `58U / WA-711J`; Dark Gray Metallic `62U / WA-805K`; Redfire Metallic `72U / WA-526F`.
- **2004:** Dark Blue Metallic `25 / WA-722J`; Black `41 / WA-8555`; Dark Green Metallic `47 / WA-9539`; Summit White `50 / WA-8624`; Sandalwood Metallic `58 / WA-711J`; Silver Birch Metallic `59 / WA-926L`; Dark Gray Metallic `62 / WA-805K`; Sport Red Metallic `63 / WA-817K`.
- **2005 and 2006:** Sandstone Metallic `15 / WA-929L`; Dark Blue Metallic `25 / WA-722J`; Bermuda Blue Metallic `26 / WA-214M`; Black `41 / WA-8555`; Summit White `50 / WA-8624`; Silver Birch Metallic `59 / WA-926L`; Dark Gray Metallic `62 / WA-805K`; Sport Red Metallic `63 / WA-817K`.
- **2007:** Greystone Metallic; Dark Blue Metallic; Sport Red Metallic; Bermuda Blue Metallic; Black; Summit White; Gold Mist Metallic; Amber Bronze Metallic; Silver Birch Metallic.

## Controlling and corroborating sources

### 2001

[2001 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2001-Chevrolet-Tahoe.pdf), PDF p. 12, printed p. 10. It prints nine names without codes and limits Z71 to Onyx Black, Summit White, Forest Green Metallic, and Light Pewter Metallic.

### 2002

- [2002 Chevrolet Tahoe Sales Brochure](https://www.motorologist.com/wp-content/uploads/2002-Chevrolet-Tahoe-brochure.pdf), source ID `chevrolet-sales-brochure-2002-tahoe`, PDF pp. 18-19, copyright 2001 General Motors, September 2001. The retained complete brochure is 2,777,275 bytes, 20 pages, SHA-256 `97ca38b885817e64e831d640b4167df2edf93838d29d407610df38efb797e522`.
- [Historical carrier reference](https://autocatalogarchive.com/wp-content/uploads/2016/05/Chevrolet-Tahoe-2002.pdf), source ID `chevrolet-sales-brochure-2002-tahoe-independent-copy`. Retrieval returned HTTP 403 on July 22, 2026. No retained artifact or byte-level corroboration is claimed for this reference.
- [2002 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2002-Chevrolet-Tahoe.pdf), PDF p. 9, independently corroborates the four-color Z71 subset. Retained artifact: 10,720,527 bytes, 102 pages, SHA-256 `eeedace0f77151da0ea4138c4464258daed8a180e8eeb4ee3dadddfa85b5560b`.

The brochure prints no paint or RPO codes. Canonical codes remain `Not printed`. Secondary lookup pages from [GM Parts Giant](https://www.gmpartsgiant.com/parts-list/2002-chevrolet-tahoe-4wd/front_end_sheet_metal_heater/paint_touch_up.html) and [AutomotiveTouchup](https://www.automotivetouchup.com/touch-up-paint/chevrolet/2002/tahoe/) are retained only in `secondary_code_crosswalk`. They do not populate application row codes.

### 2003

- [2003 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2003-Chevrolet-Tahoe.pdf), source ID `gm-heritage-2003-chevrolet-tahoe`, PDF pp. 138-140. Retained artifact: 49,190,468 bytes, 182 pages, SHA-256 `1c54cd80361a4fb83942475f771ad15b90fdedc44d1da0a04b48a84d74206284`.
- [2003 Chevrolet Tahoe Sales Brochure](https://www.auto-brochures.com/makes/Chevrolet/Tahoe/Chevrolet_US%20Tahoe_2003.pdf), source ID `chevrolet-sales-brochure-2003-tahoe`, PDF p. 16, copyright 2002 General Motors, September 2002. Retained artifact: 1,928,530 bytes, 17 pages, SHA-256 `0d60ddd639614f5da8b85dcf3b438a5cd9d15c106cfa323d11467f82fe41b613`.

The later kit chart visibly marks Redfire Metallic with superscript 3, which would make five Z71 colors, while footnote 3 says it identifies the only Z71 colors. The contemporaneous brochure expressly lists only Black, Light Pewter Metallic, Dark Green Metallic, and Summit White. The archive follows the contemporaneous brochure for retail Z71 applicability and records the later superscript as a source conflict.

PDF p. 139 prints nine SEO solid-color rows. PDF p. 140 expressly makes only four orderable through TGK: Woodland Green `9V5 / WA-9015`, Doeskin Tan `9V9 / WA-9403`, Wheatland Yellow `9W3 / WA-253A`, and Tangier Orange `9W4 / WA-9417`. The five remaining no-RPO chart rows are preserved as `seo_chart_listed_not_proven_orderable` and are not published in the application.

### 2004

- [2004 Chevrolet Tahoe Specification Sheet](https://xr793.com/wp-content/uploads/2023/07/2004-Chevrolet-Tahoe-Spec-Sheet.pdf), source ID `chevrolet-spec-sheet-us-2004-tahoe`, PDF p. 2, publication code `04CHETAHSPE01`, dated September 10, 2003. Retained artifact: 252,651 bytes, 2 pages, SHA-256 `68b41b618bae2a61c93ee80d1f4655a68f3b177e380611ef8243babc6177b514`.
- [2004 GM Color Compatibility Guide](https://industrial.sherwin-williams.com/content/dam/pcg/sherwin-williams/automotive/emeai/nl/nl-nl/pdfs/swaf-2004_gm_ccg.pdf), source ID `sherwin-williams-gm-2004-color-compatibility-guide`, Tahoe rows on PDF pp. 7-9, 15, 20, 22, 26, and 30. Retained artifact: 93,732 bytes, 35 pages, SHA-256 `3bd3709b52baae003adf94126fc63e49c64c7b9b46d817b4035910932b73bdd5`.

The specification sheet controls Chevrolet display names and Z71 applicability. The compatibility guide corroborates RPO and WA numbers. Refinish labels such as Dark Ming Blue, Medium Green, Olympic White, and Dark Spiral Gray remain aliases only.

### 2005

- [2005 Chevrolet Tahoe Specification Sheet](https://xr793.com/wp-content/uploads/2023/07/2005-Chevrolet-Tahoe-Spec-Sheet.pdf), source ID `chevrolet-spec-sheet-us-2005-tahoe`, PDF p. 2, publication code `05CHETAHSPE01`, dated September 29, 2004. Retained artifact: 630,983 bytes, 2 pages, SHA-256 `a7d04612d375b57aca0185e205461aff7cd3eeac96901f1c84152d2a632cc4aa`.
- [2005 GM Color Compatibility Guide](https://industrial.sherwin-williams.com/content/dam/pcg/sherwin-williams/automotive/emeai/nl/nl-nl/pdfs/swaf-2005_gm_ccg.pdf), source ID `sherwin-williams-gm-2005-color-compatibility-guide`, Tahoe rows on PDF pp. 1, 9, 11, 16, 22, 24, 30, and 33. Retained artifact: 108,739 bytes, 43 pages, SHA-256 `bf617161ec0875b9dce9c9bc2be087541a5b95cf848fde59177255af7273afaa`.
- [2005 Chevrolet Tahoe and Suburban Canadian Sales Brochure](https://www.xr793.com/wp-content/uploads/2020/05/2005-Chevrolet-Tahoe-Suburban-CN.pdf), source ID `chevrolet-sales-brochure-canada-2005-tahoe-suburban`. Retained artifact: 2,430,499 bytes, 28 pages, SHA-256 `96e11797686f4c36e095d285c2a1608a0f7109769ea3a8f951ad756d20a7c966`.
- [New Jersey Tahoe Police Vehicle contract](https://www.nj.gov/treasury/purchase/noa/attachments/a2097-section1.pdf), source ID `new-jersey-tahoe-police-contract-2005`, PDF pp. 17-18. Retained artifact: 342,819 bytes, 30 pages, SHA-256 `74f219fe7c2ccc7141e0a15098c421a02e2aad198421344effeb4f2c19897cfa`.

The regular Z71 subset is Sport Red, Bermuda Blue, Silver Birch, Black, and Summit White. Bermuda Blue is extra cost. The police contract separately publishes Blue `9V2 / WA-5665`, Doeskin Tan `9V9`, Woodland Green `9V5`, Wheatland Yellow `9W3`, and Victory Red `WA-9260`, all under TGK for CC15706. Tangier Orange is not asserted for 2005.

### 2006

- [2006 Chevrolet Tahoe Specification Sheet](https://xr793.com/wp-content/uploads/2023/07/2006-Chevrolet-Tahoe-Spec-Sheet.pdf), source ID `chevrolet-spec-sheet-us-2006-tahoe`, PDF p. 2, publication code `06CHETAHSPE01`, dated September 20, 2005. Retained artifact: 1,171,822 bytes, 2 pages, SHA-256 `e805cef5d6e04f465c84df5cbad85997cde1d5797692cb02113cba25f6ee358f`.
- [2006 GM Color Compatibility Guide](https://industrial.sherwin-williams.com/content/dam/pcg/sherwin-williams/automotive/emeai/de/de-de/pdfs/marketing-uploads/swaf-2006_gm_ccg.pdf), source ID `sherwin-williams-gm-2006-color-compatibility-guide`, Tahoe rows on PDF pp. 3, 12, 14, 17, 22, 25, 30, and 33. Retained artifact: 148,670 bytes, 40 pages, SHA-256 `e97ee68bca34867244a933db1bd6df11cf0e18781671207348db08bfb8cca31b`.
- [2006 Chevrolet Tahoe and Suburban Canadian Sales Brochure](https://xr793.com/wp-content/uploads/2017/07/2006-Chevrolet-Tahoe-CN.pdf), source ID `chevrolet-sales-brochure-canada-2006-tahoe-suburban`. Retained artifact: 4,129,100 bytes, 28 pages, SHA-256 `6bb01616aa0ab6150ccdee2a8a4515d65e7dccc9bb26430c37ba0b74093562b3`.
- [New Jersey Tahoe Police Vehicle contract](https://www.nj.gov/treasury/purchase/noa/attachments/a2097-1a.pdf), source ID `new-jersey-tahoe-police-contract-2006`, PDF pp. 17-18. Retained artifact: 265,662 bytes, 30 pages, SHA-256 `9a6ce020fbd6ecdba97094ebc15c748118d7d1d95b5888f358f8d6436dbf0e7f`.

Dark Gray, Dark Blue, and Sandstone are unavailable on Z71. Bermuda Blue is extra cost. The police contract separately publishes Tangier Orange `9W4`, Doeskin Tan `9V9`, Woodland Green `9V5`, Wheatland Yellow `9W3`, and Victory Red `WA-9260`, all under TGK for CC15706.

### 2007

[2007 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2007-Chevrolet-Tahoe.pdf), PDF p. 11, printed p. 3. It expressly says Tahoe had nine exterior colors and names all nine, but prints no codes.

## Specialty identity rule

Woodland Green is never equated to Forest Service Green, Forestry Green, or Forest Green Metallic. The Forest Service specification color remains a separately documented research lead until a primary source establishes an exact Chevrolet model-year application.
