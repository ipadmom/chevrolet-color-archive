---
title: Chevrolet specialty exterior color source audit
visibility: public
classification: archive-internal
period: 1980-2027 source sweep
sources: General Motors Heritage Archive, GM Upfitter, GM Vehicle Order Guide, USDA Forest Service
---

# Chevrolet specialty exterior color source audit

## Result

The archive now publishes 41 reviewed specialty-paint rows across 12 exact
Chevrolet model-year applications. Seven are one-row Woodland Green subsets
supported by visually reviewed General Motors pages:

| Model | Year | GM label | Printed codes | Exact scope |
|---|---:|---|---|---|
| C/K Series | 1980 | Woodland Green | option 46; SEO 9V5 | Pickups and Chassis-Cabs |
| Blazer | 1980 | Woodland Green | option 46; SEO 9V5 | Blazer |
| Suburban | 1980 | Woodland Green | option 46; SEO 9V5 | Suburban |
| Tahoe | 2011 | Woodland Green | WA 9015; SEO 9V5 | 2WD Police Package PPV and 4WD Special Service 5W4 |
| Express | 2011 | Woodland Green | WA 9015; SEO 9V5 | Transport Van 1LS and 2LS |
| Suburban | 2011 | Woodland Green | WA 9015; SEO 9V5 | Commercial Fleet 1FL |
| Silverado HD | 2011 | Woodland Green | WA 9015; SEO 9V5 | 2500HD Crew Cab 4WD Work Truck 1WT |

Fourteen additional rows preserve exact Tahoe specialty palettes without
merging them into the regular palette:

| Model | Year | Rows | Printed-code treatment | Exact scope |
|---|---:|---:|---|---|
| Tahoe | 2003 | 4 | WA-9015, WA-9403, WA-253A, and WA-9417 remain exact; each SEO code remains in the displayed source notation | LS 1SJ and 1SK; LT 1SM; not Z71 1SL |
| Tahoe | 2005 | 5 | WA-5665 and WA-9260 remain exact; the other three paint codes are null because the contract does not print a WA number | Police Vehicle CC15706 |
| Tahoe | 2006 | 5 | WA-9260 remains exact; the other four paint codes are null because the contract does not print a WA number | Police Vehicle CC15706 |

The remaining 20 rows are two distinct Suburban Special Equipment Option
overlays: ten colors for 2005 and ten for 2007. These specialty rows do not
replace or enlarge either year's separately complete regular palette.

All 41 rows are specialty-paint subsets, not complete model-year palettes. Each
uses `claim_status = published_specialty_palette_subset` and retains its source
page, variant scope, restriction, artifact byte length, and SHA-256 digest. Five
model-years remain specialty-only incomplete records: 1980 C/K Series, 1980
Blazer, 2011 Tahoe, 2011 Express, and 2011 Silverado HD. Four Suburban
applications, 1980, 2005, 2007, and 2011, and three Tahoe applications, 2003,
2005, and 2006, coexist with a separately complete or qualified regular
palette. No specialty row is inferred to another model, variant, or year.

Forest Service Green also appears in the all-fields search index, but only as a disabled research lead. Its result reads: “USDA Forest Service, Federal Standard No. 595 color 14260; Chevrolet applicability unresolved.” It has no model, year, or color route because no reviewed primary source established one.

The normalized evidence and rejection ledger is `data/sources/specialty-color-source-candidates.json`.

## Integrity audit

On 2026-07-22, 62 unique retained files were independently rehashed: the 1980
GM truck kit, 30 historic GM Upfitter or USDA files, 24 current Woodland Green
Order Guide snapshots, two comparison files, and two reviewed 2002 bridge
sources, plus the three governing Tahoe documents for 2003, 2005, and 2006.
Every byte length and SHA-256 digest reconciled to the tracked ledger. The
previously promoted pages and the added Tahoe locators were rendered and
visually rechecked; the exact pages are recorded in the Tahoe audit files.

## Forest Service Green

Three official USDA Forest Service documents establish the agency color label and Federal Standard number:

- The Type 6 Fire Engine, Model 643 chassis specification, PDF and printed page 8, section 1.29.1, specifies “No. 14260 of Federal Standard No. 595 (Forest Service Green).” The complete PDF is 138,745 bytes, SHA-256 `7cc0766da925cf3e968828008b1896254e7982d63186c59c9ab2ad3a0f6c3f7e`.
- The Models 428U and 448U body specification, PDF and printed page 52, sections 11.2.1 and 11.3.1, requires the chassis cab and body to use Federal Standard No. 595 color 14260. It says the chassis manufacturer supplies the chassis cab finish. The complete PDF is 796,184 bytes, SHA-256 `6622d0c3ddf3bee6eafdbbdf63e82e4533fe630da4ac6cb5ca2d8ce48e469fd3`.
- The Hotshot Superintendent Vehicle body specification, PDF and printed page 26, section 8.1.1, specifies Federal Standard No. 595 color 14260 for the chassis cab exterior and body. The complete PDF is 410,737 bytes, SHA-256 `12fb9c8f04e0be4b5428df9ada2b3b53dd79123a6323b36a316f9ec28f69dcf2`.

Other official USDA specifications print `5032 FOREST SERVICE GREEN`:

- Type 3 Fire Engine, Model 346, PDF and printed page 10, section 1.32.2.28.
- Type 3 Fire Engine, Model 326, PDF and printed page 10, section 1.31.2.28.
- Ten Person Crew Carrier, PDF and printed page 9, section 1.30.2.26.

No reviewed primary source states that identifier 5032 is identical to Federal Standard color 14260. The archive therefore retains both identifiers without merging them.

None of these USDA documents identifies Chevrolet as the chassis manufacturer, prints a Chevrolet model year, or supplies a Chevrolet paint or option code. They prove an agency finish specification, not Chevrolet factory availability.

## Woodland Green

### 1980 General Motors evidence

The official [1980 Chevrolet Truck Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1980-Chevrolet-Truck.pdf), PDF page 51 and printed “Color & Trim - Page 2,” is dated January 14, 1980.

The reviewed page contains three independent exact identifiers:

- The Special Paints paragraph says Woodland Green, SEO 9V5, may be ordered only on Pickups, Chassis-Cabs, Blazer, and Suburban models. The paragraph says SEO paint colors were solid only.
- The Permanent Fleet Colors table lists Woodland Green, option 46, SEO 9V5.
- The 10-90 Series refinish table lists Woodland Green, option 46, DuPont `B8046LH`, Rinshed-Mason `A-11505D`, and Ditzler `3255`.

The complete PDF is 4,390,128 bytes, SHA-256 `b44e4e8af7bba172885d003d5f88d2dab55bcefb5a15d0ce124b9a181ed89008`. The reviewed page image is 224,762 bytes, SHA-256 `733320bba867a0bbf0b95a0cc0920cea7cefa975b781b2f9dc00835e43c54186`.

### 2011 General Motors evidence

The official [2011 Chevrolet Municipal Vehicles Technical Manual](https://www.gmupfitter.com/wp-content/uploads/2021/07/2011_Chevrolet-Police-Technical-Manual.pdf) prints Woodland Green in SEO Paint Available tables. The complete PDF is 8,346,299 bytes, SHA-256 `6c0eef224d9c67c4a841bbaf1fb68383bc74cc5a0ecc3c0d1a412683b6474534`.

The visually reviewed pages are:

- PDF page 84, Tahoe 2WD Police Package PPV, printed page 5.
- PDF page 92, Tahoe 4WD Special Service 5W4, printed page 13.
- PDF page 136, Express Transport Van 1LS and 2LS, printed page 5.
- PDF page 151, Suburban Commercial Fleet 1FL, printed page 6.
- PDF page 169, Silverado 2500HD Crew Cab 4WD Work Truck 1WT, printed page 6.

Each relevant row prints WA number 9015, color description Woodland Green, and SEO code 9V5. The app preserves the model-specific flat-black component rules and the printed rule that orders below five vehicles are delayed until the five-unit batch minimum is received. The Tahoe record also preserves the separate Kerr Industries dealer direct option and the printed statement that the Kerr program had no minimum order.

The 1980 and 2011 sources repeat the label Woodland Green and SEO 9V5. That repetition does not prove that 1980 option 46 and later WA-9015 are the same paint formula. The archive publishes each exact source identity and does not assert formula continuity.

## Current GM Order Guide snapshots

Complete generated GM Order Guide PDFs were retained for 24 Woodland Green tables across model years 2025 and 2026. The candidate set covers Colorado, Express Cargo, Express Cutaway, Express Passenger, Suburban, Tahoe retail and fleet, Tahoe police and special service, Silverado 1500, Silverado 2500HD, Silverado 3500HD, and Silverado 4500HD through 6500HD.

Every captured row uses Woodland Green, or the Express table spelling Green, Woodland, with RPO or SEO 9V5 and touch-up paint number WA-9015. Most sources print a five-order minimum. Express sources also specify flat-black extraneous body components. Silverado light- and heavy-duty sources can state that extended lead time may be required.

The 2025 and 2026 Silverado 1500 Retail and Fleet pages were visually reviewed:

- 2025, vehicle ID 22917, PDF page 221, published May 22, 2026. Complete snapshot: 1,152,797 bytes, SHA-256 `dc01ef087bf74e10512c458ee74092547c4ee9f4a35b6de79f31d2aadbddd71c`.
- 2026, vehicle ID 23168, PDF page 236, published June 26, 2026. Complete snapshot: 1,258,227 bytes, SHA-256 `6b332a252eb691a5d080e216ffb69b4aa33bbf421ded402f4076818c146ef7fa`.

These two exact rows are retained as verified but not published. The app now
supports separate, overlapping source-backed specialty generations, so a future
publication can preserve the exact Order Guide URL and page without replacing
the qualified 2025 or 2026 Silverado palette. Specialty rows remain separate
from governing palettes and are never merged into them. The candidate ledger
retains these rows until they are deliberately added to the published set.

The other 22 snapshots have complete PDF bytes, retrieval timestamps, SHA-256 digests, and exact candidate pages. They remain `exact_snapshot_page_located` pending direct visual review. The source ledger does not promote them solely from API text extraction.

## Historic continuity candidate sweep

The source ledger retains 23 complete official GM Upfitter documents covering 2012 through 2026. Candidate pages were rendered for Tahoe, Express, Suburban, Silverado, and Silverado HD fleet or special-service variants. Each source has its official URL, exact byte length, SHA-256 digest, and candidate page list.

Only the 2011 pages were promoted in this pass because those pages were directly inspected. The later sources remain a bounded visual-review queue. No year-to-year continuity is inferred from their presence.

## Similar names kept separate

| Name | What the primary source proves | Treatment |
|---|---|---|
| Forest Service Green | USDA agency color, FS 595 No. 14260; separate USDA documents use identifier 5032 | Searchable research lead, no Chevrolet application |
| Woodland Green | GM specialty or SEO color; 1980 option 46 and SEO 9V5; later WA-9015 and SEO 9V5 | Published only for exact reviewed Chevrolet applications |
| Forest Green Metallic | Regular 2001 Tahoe color and 2002 Tahoe Z71 color; reviewed pages print no code | Separate Tahoe color, never merged with specialty greens |
| Forest Green | Separate historic Chevrolet label already supported elsewhere in the archive | Never treated as Forest Service Green |
| Green WA-7927 | Generic SEO green in later GM tables | Separate code and identity |
| Forestry Green | No exact official GM, GM Upfitter, or USDA label found | Rejected as an unverified alias |

## Rejected and unresolved leads

- A Wikimedia Commons caption identifies a photographed 2002 Silverado K2500HD as Forest Service Green. A photograph and uploader caption do not prove factory paint, original finish, GM code, or orderability. It was rejected as factory-color evidence.
- Complete official 2002 Silverado and Silverado HD kits were downloaded and reviewed as possible primary bridges. No page located in this pass connected Forest Service Green to a Chevrolet model, year, or code. Their full byte lengths and hashes are preserved in the source ledger.
- Searches for the exact phrase Forestry Green across the official GM, GM Upfitter, and USDA source sets found no official paint label. Secondary marketplace usage was not imported.
- No primary source equated USDA identifier 5032 with FS 595 No. 14260.
- No primary source equated historical Woodland Green option 46 with modern Woodland Green WA-9015.

## Search and publication safeguards

- Forest Service Green is indexed from `search_leads`, not from a fabricated model-year color row.
- Research-only results have no model ID or year and render as disabled results. They cannot route the user to an unrelated Chevrolet record.
- Published specialty rows must carry exact model scope, year, label, code, restriction, source URL, page, full artifact bytes, and SHA-256 digest.
- A specialty row does not convert a subset into a complete palette. The generation and availability text state the source scope.
- `reviewed_specialty_palette_subset` is separate from `verified_complete` and
  `reviewed_qualified_palette_union` in the gap inventory and Parquet exports.
- Dynamic Order Guide discovery responses are not cited as permanent evidence. The ledger cites the complete generated PDF snapshot with retrieval time, bytes, and digest.

## Remaining gaps

- Establish a primary Chevrolet source that ties Forest Service Green, FS 595 No. 14260, or USDA identifier 5032 to an exact Chevrolet model year and GM code.
- Visually review the bounded 2012-2026 GM Upfitter page queue and the 22 remaining current Order Guide snapshot pages.
- Review and, where warranted, publish current Order Guide rows through separate specialty generations without merging them into governing palettes.
- Human-review the consolidated OCR corpus: 2,774 candidate pages and 11,733 automated color-row candidates across 691 source documents. Automated extraction is complete; no candidate is promoted without page-level review.
