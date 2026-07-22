---
title: Chevrolet specialty exterior color source audit
visibility: public
classification: archive-internal
period: 1979-2026 source sweep
sources: General Motors Heritage Archive, GM Upfitter, GM Vehicle Order Guide, USDA Forest Service
---

# Chevrolet specialty exterior color source audit

## Result

The source ledger now publishes 281 directly reviewed specialty, police, and
special-service color records. Records that apply to more than one catalog
model expand to 301 exact model-year applications. The normalized Parquet
archive is rebuilt separately; this source tranche does not claim a new
Parquet row total.

| Reviewed tranche | Ledger records | Exact model applications | Publication boundary |
|---|---:|---:|---|
| 1979 Chevrolet truck SEO paints | 3 | 12 | Exact named truck and van classes only |
| 1980 Chevrolet truck SEO paints | 4 | 15 | Exact named truck and van classes only |
| 1993 S-10 factory-installed SEO paints | 4 | 4 | S-10 Pickup only |
| 1993 C/K Pickup SEO paints | 4 | 4 | C/K Pickup only; no assembly-plant installation claim |
| 2003, 2005, and 2006 Tahoe specialty paints | 14 | 14 | Cited Tahoe trim or police scope only |
| 2011 Woodland Green | 4 | 4 | Tahoe, Express, Suburban, and Silverado HD scopes printed by GM |
| 2011-2014 Impala Kerr authorized-upfitter program | 120 | 120 | 2011-2013 Impala 9C1/9C3 and 2014 Impala Limited 9C1/9C3 |
| 2011-2017 Caprice PPV program palettes | 67 | 67 | Exact 9C1 palette for 2011-2017 and exact 9C3 palette for 2011-2013 |
| 2023 Bolt EUV 5W4 SSV palette | 7 | 7 | Bolt EUV 5W4 SSV only |
| 2026 Blazer EV 9C1/9C3/5W4 SEO paint | 4 | 4 | Police and Special Service guide only |
| 2026 Silverado 9C1 PPV and 5W4 SSV | 50 | 50 | 25 separately sourced rows per program |
| **Total** | **281** | **301** | No adjacent-model or adjacent-year inference |

Each published ledger record uses `publication_status =
published_specialty_subset`. It retains the exact model scope, program,
availability state, source page, restrictions, artifact byte length, SHA-256
digest, official URL, and archived GitHub Release copy. These rows do not turn
an otherwise incomplete model year into a complete regular palette.

Ten additional records are deliberately nonrouting snapshot evidence. Four
2024 Blazer EV colors were marked unavailable. In the reviewed 2025 Blazer EV
snapshot, Victory Red was planned for Q1 2025 and three other colors were
marked unavailable. Two current Silverado Woodland Green Order Guide rows are
retained for source comparison. None creates a model-year color route.

Forest Service Green appears only as a disabled research lead. The search
result states: “USDA Forest Service, Federal Standard No. 595 color 14260;
Chevrolet applicability unresolved.” It has no Chevrolet model, year, or color
route because no reviewed primary source establishes a Chevrolet application.

The exhaustive machine-readable evidence, identity, publication, rejection,
artifact, and archive-link ledger is
`data/sources/specialty-color-source-candidates.json`.

## Integrity audit

On July 22, 2026, the ledger reconciled 74 unique retained artifacts. The most
recent Caprice updater independently rehashed these seven source files:

- the 2011 Chevrolet Municipal Vehicles Technical Manual;
- the 2012 Chevrolet Municipal Vehicles Specifications Manual;
- the 2013 Chevrolet Municipal Vehicles Guide;
- the 2014 Chevrolet Police Vehicles Technical Guide; and
- the 2015, 2016, and 2017 Caprice 9C1 specification guides.

Every recorded byte length and SHA-256 digest reconciled. Every promoted PDF
page was rendered and visually reviewed. The ledger records all 74 unique
retained artifacts and their source URLs. Every source used by the 281
published records also carries its exact GitHub Release URL.

## Governing Chevrolet sources

The following primary documents govern the newly expanded tranche. Each link
goes to the complete official file, followed by the retained Release copy.

- 1979: [GM Heritage Archive vehicle information kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1979-Chevrolet-Blazer.pdf), PDF page 14; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/1979-chevrolet-blazer-vehicle-information-kit-gm.pdf).
- 1980: [GM Heritage Archive Chevrolet Truck kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1980-Chevrolet-Truck.pdf), PDF page 51; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/1980-chevrolet-truck-vehicle-information-kit-gm.pdf).
- 1993: [GM Heritage Archive S-10 technical guide](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1993-Chevrolet-S-10.pdf), PDF page 12; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/1993-chevrolet-s-10-vehicle-information-kit-gm.pdf).
- 1993 C/K Pickup: [GM Heritage Archive light-duty truck technical guide](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1993-Chevrolet-Truck.pdf), PDF page 12, printed page 18; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/1993-chevrolet-truck-vehicle-information-kit-gm.pdf).
- 2003 Tahoe: [GM Heritage Archive Tahoe kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2003-Chevrolet-Tahoe.pdf), PDF pages 139-140; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2003-chevrolet-tahoe-vehicle-information-kit-gm.pdf).
- 2005 Tahoe: [New Jersey contract with Chevrolet order-guide pages](https://www.nj.gov/treasury/purchase/noa/attachments/a2097-section1.pdf), PDF pages 17-18; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2005-new-jersey-tahoe-police-contract.pdf).
- 2006 Tahoe: [New Jersey contract with Chevrolet order-guide pages](https://www.nj.gov/treasury/purchase/noa/attachments/a2097-1a.pdf), PDF pages 17-18; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2006-new-jersey-tahoe-police-contract.pdf).
- 2011: [Chevrolet Municipal Vehicles Technical Manual](https://www.gmupfitter.com/wp-content/uploads/2021/07/2011_Chevrolet-Police-Technical-Manual.pdf), Kerr pages 52-57 and Woodland Green pages 84, 92, 136, 151, and 169; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2011-chevrolet-municipal-vehicles-technical-manual-gm.pdf).
- 2012: [Chevrolet Municipal Vehicles Technical Manual](https://www.gmupfitter.com/wp-content/uploads/2021/05/2012-Police-Specifications-Manual-9-29-11.pdf), PDF pages 54-59; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2012-chevrolet-municipal-vehicles-specifications-manual-gm.pdf).
- 2013: [Chevrolet Municipal Vehicles Technical Manual](https://www.gmupfitter.com/wp-content/uploads/2021/07/2013-Municipal-Guide.pdf), PDF pages 55-57; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2013-chevrolet-municipal-vehicles-guide-gm.pdf).
- 2014: [Chevrolet Police Vehicles Technical Guide](https://www.gmupfitter.com/wp-content/uploads/2021/06/2014_Police_Technical_Guide_FINAL.pdf), PDF pages 50-52; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2014-chevrolet-police-vehicles-technical-guide-gm.pdf).
- 2015 Caprice PPV: [9C1 Specification Guide](https://www.gmupfitter.com/wp-content/uploads/2021/07/2015_caprice_specification_guide_4_10.pdf), PDF page 8; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2015-chevrolet-caprice-ppv-9c1-specification-guide-gm.pdf).
- 2016 Caprice PPV: [9C1 Specification Guide](https://www.gmupfitter.com/wp-content/uploads/2021/05/2016-Caprice-Specification-Guide.pdf), PDF page 8; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2016-chevrolet-caprice-ppv-9c1-specification-guide-gm.pdf).
- 2017 Caprice PPV: [9C1 Specification Guide](https://www.gmupfitter.com/wp-content/uploads/2021/05/Caprice-9C1-Specification-Guide-2017.pdf), update and palette at PDF pages 5 and 10; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2017-chevrolet-caprice-ppv-9c1-specification-guide-gm.pdf).
- 2023 Bolt EUV: [5W4 SSV Specification Guide](https://www.gmupfitter.com/wp-content/uploads/2022/12/2023-BOLT-EUV-SSV-1.pdf), PDF page 11; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2023-chevrolet-bolt-euv-ssv-specification-guide-gm.pdf).
- 2024 Blazer EV snapshot: [9C1/9C3 guide](https://www.gmupfitter.com/wp-content/uploads/2023/12/2024-BLAZER-EV-9C1-Municipal-Specification-Guide-V112525.pdf), PDF page 13; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2024-chevrolet-blazer-ev-9c1-specification-guide-gm.pdf).
- 2025 Blazer EV snapshot: [9C1/9C3/5W4 guide](https://www.gmupfitter.com/wp-content/uploads/2024/12/2025-BLAZER-EV-9C1-Municipal-Specification-Guide-V042825.pdf), PDF page 15; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2025-chevrolet-blazer-ev-9c1-specification-guide-gm.pdf).
- 2026 Blazer EV: [9C1/9C3/5W4 guide](https://www.gmupfitter.com/wp-content/uploads/2025/12/2026-BLAZER-EV-9C1-9C3-5W4-Specification-Guide-V041026.pdf), PDF page 15; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2026-chevrolet-blazer-ev-9c1-9c3-5w4-specification-guide-gm.pdf).
- 2026 Silverado PPV: [9C1 Specification Guide](https://www.gmupfitter.com/wp-content/uploads/2026/04/2026-Silverado-9C1-Specification-Guide-041426.pdf), PDF pages 3 and 11; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2026-chevrolet-silverado-9c1-specification-guide-gm.pdf).
- 2026 Silverado SSV: [5W4 Specification Guide](https://www.gmupfitter.com/wp-content/uploads/2026/04/2026-Silverado-SSV-Specification-Guide-041426.pdf), PDF pages 3 and 11; [archived copy](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2026-chevrolet-silverado-5w4-ssv-specification-guide-gm.pdf).

## Historic factory and fleet colors

The 1979 page publishes Tangier Orange SEO 9V2 and Wheatland Yellow SEO 9V4
for Pickup, Chassis-Cab, Blazer, Suburban, Chevy Van, Sportvan, Hi-Cube Van,
and Cutaway Van. Crimson Red SEO 9V8 is limited to Sportvan, Chevy Van,
Hi-Cube Van, and Cutaway Van.

The 1980 page publishes Woodland Green option 46 and SEO 9V5 for Pickups,
Chassis-Cabs, Blazer, and Suburban. Tangier Orange 9V2 and Wheatland Yellow 9V4
cover the eight named truck and van classes. The prose calls van-only SEO 9V8
“Crimson Red,” while the adjacent table calls it “CARDINAL RED.” The archive
preserves that conflict. Options 88 and 87 appear only in the 50-90 Series
refinish table, so they are not projected onto the named light-duty models.

The 1993 S-10 page publishes four assembly-plant-installed, zero-lead-day solid
paint options: Tangier Orange WE9417/9W4, Wheatland Yellow WE9418/9W3,
Woodland Green WE7156/9V5, and Doeskin Tan WE8265/9V9. The guide makes each
subject to the 1993 SEO Catalog. The archive preserves the printed WE codes and
does not rewrite them as later WA identities.

The separate 1993 C/K Pickup page publishes four zero-lead-day solid Special
Equipment Options: Tangier Orange WE9417/9W4, Wheatland Yellow WE9418/9W3,
Woodland Green WE9015/9V5, and Doeskin Tan WE9403/9V9. That page does not say
the paint was installed at the assembly plant. The archive therefore classifies
the rows as manufacturer special equipment options, limits them to C/K Pickup,
and does not project them onto Tahoe, Suburban, S-10, or another model.

## Kerr Industries Impala program

The 2011-2014 manuals publish the same 30-row Kerr Industries program for the
Impala 9C1 and 9C3, called Impala Limited in 2014. General Motors required a
White 50U or Black 41U base car. The finished cars went to Kerr after they were
built. Kerr, not GM’s factory-paint warranty, handled special-paint claims.
These are therefore `authorized_upfitter_post_build` records, not factory paint
claims.

The 30 source-literal WA# values and paired order codes are:

| WA# | Color | Code 1 | Code 2 |
|---|---|---|---|
| 121A | Adriatic Blue | BEA | BFE |
| 311B | Olive | BEB | BFF |
| 5120 | Blue | BEQ | BFU |
| 5236 | Neutral | BEC | BFG |
| 5322 | Driftwood | BER | BFV |
| 5665 | Blue | BED | BFH |
| 5749 | Gold | BES | BFW |
| 5845 | Beige | BEE | BFI |
| 7153 | Blue | BET | BFX |
| 7159 | Blue | BEF | BFJ |
| 7262 | Brown | BEU | BFY |
| 7801 | Brown | BEG | BFK |
| 7840 | Silver | BEV | BFZ |
| 7868 | Blue | BEH | BFL |
| 7888 | Blue | BEW | BGA |
| 7889 | Blue | BEP | BFT |
| 7964 | Green | BEI | BFM |
| 7999 | Blue | BEX | BGB |
| 8380 | Blue | BEJ | BFN |
| 8381 | Gray | BEY | BGC |
| 8401 | Yellow | BEK | BFO |
| 8412 | Green | BEZ | BGD |
| 8431 | Rose Metallic | BEL | BFP |
| 8554 | White | BFA | BGE |
| 8555 | Black (41U) | BEM | BFQ |
| 8624 | Summit White (50U) | BG8 | BGK |
| 8743 | Blue Black | BFB | BGF |
| 9021 | Silver | BEN | BFR |
| 9382 | Blue | BFC | BGG |
| 9403 | Tan | BEO | BFS |

The source table heading is `WA#`, but the cells do not print a `WA-` prefix.
The archive therefore retains values such as `121A`, not inferred `WA-121A`.
Code 1 and Code 2 are Kerr order codes, not Chevrolet SEO codes. AAS is the
solid-color option and AAT is the two-tone option. The seven two-tone schemes
are W001/1PA, W002/1PB, W003/1PC, W006/1PF, W008/1PH, W009/1PI, and W012/1PL.

## Caprice PPV 9C1 and 9C3 palettes

The model-specific GM Upfitter guides publish 67 exact standard-program rows:
14 for 2011, 16 for 2012, 14 for 2013, seven for 2014, six each for 2015 and
2016, and four for 2017. The 9C1 palette is present for all seven years. The
9C3 Detective palette is present for 2011-2013 and the 2014 guide expressly
deletes option 9C3. Every row retains the printed three-character RPO in
`rpo_code` and `code_display`. None invents a factory paint, WA, refinish,
touch-up, or SEO code.

Hugo Blue RPO GYW is available for 2012-2016 only. Seven exact program-year
rows use `availability_state = available_with_minimum_batch`. The 2012-2015
guides call it extra cost; the 2016 guide says additional charge. All require a
20-unit production batch and additional lead time. The source label is retained
separately from the normalized timeline label, including the printed `Meatllic`
typo in the 2013 and 2014 guides. The 2015 and 2016 page art spells `Metallic`
correctly even though the embedded PDF text layer does not.

The ledger records the program lifecycle without creating false availability:

- GST Mirage Gold is deleted for 2013 and omitted from both final 2013 tables.
- GGG Alto Grey Metallic and the 9C3 Detective package are deleted for 2014.
- GZ7 Mystic Green is new for 2014.
- GYW Hugo Blue and GZ7 Mystic Green are discontinued for 2017 and omitted
  from the four-color final palette.

Six structured conflict assertions apply one rule: a revised model-specific
guide controls over the annual Fleet Guide summary. This resolves the 2011
Switchblade Silver and Karma aliases, the Fleet Guide's 2012 omission of Hugo
Blue, the Fleet Guide's 2013 carryover of deleted GST, the 2014 `Prussian
Steel` label for RPO GZ7, the 2015 carryover of deleted GGG, and the 2017
carryover of discontinued GZ7. All Fleet Guide literals remain documented, but
none becomes a second color or a false year.

The application groups the full run under the sourced `GM Zeta, Holden WM/WN
Caprice PPV era` band. Within that band, 9C1 and 9C3 remain separate exact
program timelines.

## Modern PPV and SSV programs

The 2023 Bolt EUV 5W4 SSV guide publishes seven standard program colors:
Silver Flare Metallic GSJ/WA-251F, Mosaic Black Metallic GB8/WA-384A, Ice Blue
Metallic G7X/WA-621G, Bright Blue Metallic GLT/WA-327E, Radiant Red Tintcoat
GNT/WA-170H, Gray Ghost Metallic GRC/WA-247F, and Summit White GAZ/WA-8624.
Bright Blue and Radiant Red carry an additional charge.

The 2024 Blazer EV guide marks Victory Red, MSP Blue Goose, Dark Blue Metallic,
and Silver Ice Metallic “Not available at this time.” The 2025 guide says
Victory Red was planned for Q1 2025 and marks the other three unavailable. The
2026 guide makes all four available, with possible extended lead time: Victory
Red 5T4/WA-9260, MSP Blue Goose 9V2/WA-5665, Dark Blue Metallic 9V7/WA-722J,
and Silver Ice Metallic 9W5/WA-636R.

The two 2026 Silverado guides publish separate 9C1 PPV and 5W4 SSV programs.
Each program has four available standard colors, Red Hot G7C/WA-130X, Summit
White GAZ/WA-8624, Sterling Gray Metallic GNO/WA-130H, and Black GBA/WA-8555,
plus 21 SEO colors that the April 14, 2026 guides say were no longer orderable
as of February 2, 2026. The SEO rows retain the five-order minimum and possible
extended lead time. The full code set is preserved in the ledger, including
Doeskin Tan WA-9403, Tangier Orange 9W4/WA-9417, Wheatland Yellow 9W3/WA-253A,
Woodland Green 9V5/WA-9015, Silver Ice Metallic 5IS/WA-363R, and the remaining
source-literal generic fleet colors.

The 9C1 source’s page 11 heading incorrectly says “5W4 SSV.” Program identity
comes from the 9C1 guide cover, index, and update page. Both update pages spell
Wheatland “Whealtland,” while both color tables print “Wheatland.” Both source
anomalies remain explicit in the records.

## Current GM Order Guide snapshots

The ledger retains 24 complete generated Order Guide PDFs for 2025 and 2026
Woodland Green tables. They cover Colorado, Express Cargo, Express Cutaway,
Express Passenger, Suburban, Tahoe retail and fleet, Tahoe police and special
service, Silverado 1500, Silverado 2500HD, Silverado 3500HD, and Silverado
4500HD through 6500HD.

The 2025 Silverado 1500 snapshot, vehicle ID 22917, PDF page 221, and the 2026
snapshot, vehicle ID 23168, PDF page 236, were visually reviewed. They remain
verified comparison rows rather than duplicate routes. The newly reviewed 2026
9C1 and 5W4 specification guides independently govern the published PPV and SSV
program rows. The remaining 22 Order Guide snapshots have complete bytes,
retrieval timestamps, SHA-256 digests, and exact candidate pages, but remain
`exact_snapshot_page_located` pending direct visual review.

## Forest Service Green

Six official USDA sources establish the agency color name or identifier:

- [Type 6 Fire Engine, Model 643 chassis specification](https://www.fs.usda.gov/sites/default/files/media_wysiwyg/508_chassisspecification_m643_engine.pdf), page 8, says “No. 14260 of Federal Standard No. 595 (Forest Service Green).”
- [Models 428U and 448U body specification](https://www.fs.usda.gov/sites/default/files/2019-09/508_bodyspecification_model428u_model_448u_engine.pdf), page 52, requires the chassis cab and body to use No. 14260 and says the chassis manufacturer supplies the chassis finish.
- [Hotshot Superintendent Vehicle body specification](https://www.fs.usda.gov/sites/default/files/media_wysiwyg/508_bodyspecification_suptvehicle.pdf), page 26, specifies No. 14260 for the chassis cab exterior and body.
- [Type 3 Fire Engine, Model 346 chassis specification](https://www.fs.usda.gov/sites/default/files/2019-09/508_chassisspecification_m346_engine.pdf), page 10, prints `5032 FOREST SERVICE GREEN`.
- [Type 3 Fire Engine, Model 326 chassis specification](https://www.fs.usda.gov/sites/default/files/media_wysiwyg/508_chassisspecification_m326_engine.pdf), page 10, prints `5032 FOREST SERVICE GREEN`.
- [Ten Person Crew Carrier chassis specification](https://www.fs.usda.gov/sites/default/files/media_wysiwyg/508_chassisspecification_crewcarrier.pdf), page 9, prints `5032 FOREST SERVICE GREEN`.

No reviewed USDA source identifies Chevrolet as the chassis manufacturer,
prints a Chevrolet model year, or supplies a Chevrolet paint or option code.
No primary source equates identifier 5032 with Federal Standard 14260. The
archive retains both identities without merging them and publishes neither as
a Chevrolet application.

## Similar names kept separate

| Name | What the primary source proves | Treatment |
|---|---|---|
| Forest Service Green | USDA agency color, FS 595 No. 14260; separate USDA documents use identifier 5032 | Searchable research lead, no Chevrolet route |
| Woodland Green | GM specialty or SEO color; 1980 option 46/9V5, 1993 S-10 WE7156/9V5, 1993 C/K Pickup WE9015/9V5, and later WA-9015/9V5 | Published only for exact reviewed Chevrolet applications; code continuity is not inferred |
| Forest Green Metallic | Regular 2001 Tahoe color and 2002 Tahoe Z71 color; reviewed pages print no code | Separate Tahoe color |
| Forest Green | Separate historic Chevrolet label supported elsewhere in the archive | Never treated as Forest Service Green |
| Green WA-7927 | Generic SEO green in the 2026 Silverado tables | Separate code and identity |
| Forestry Green | No exact official GM, GM Upfitter, or USDA label found | Rejected as an unverified alias |

## Rejected and unresolved leads

- A Wikimedia Commons caption identifies a photographed 2002 Silverado K2500HD as Forest Service Green. A photograph and uploader caption do not prove factory paint, original finish, a GM code, or orderability.
- Complete official 2002 Silverado and Silverado HD kits were reviewed as possible primary bridges. Neither connects Forest Service Green to a Chevrolet model, year, or code. Their bytes and hashes remain in the ledger.
- No primary source equates historical Woodland Green option 46, S-10 WE7156, C/K Pickup WE9015, and modern Woodland Green WA-9015 as one paint formula.
- Five no-RPO rows on the 2003 Tahoe SEO chart remain research-only because the adjacent TGK ordering table expressly identifies only four orderable specialty colors.

## Publication safeguards

- Research-only results have no model ID or year and cannot route to an unrelated Chevrolet record.
- Published specialty rows require exact model scope, year, program, label, code treatment, restriction, source locator, complete artifact bytes, and SHA-256 digest.
- Program palettes and specialty subsets stay separate from regular governing palettes.
- `reviewed_specialty_palette_subset` remains distinct from `verified_complete` and `reviewed_qualified_palette_union` in the gap inventory and Parquet exports.
- Dynamic Order Guide discovery responses are not permanent evidence. The ledger cites the complete generated PDF snapshot with retrieval time, bytes, and digest.

## Remaining gaps

- Establish a primary Chevrolet source tying Forest Service Green, FS 595 No. 14260, or USDA identifier 5032 to an exact Chevrolet model year and GM code.
- Visually review the remaining 2015-2026 GM Upfitter candidate pages. The 2012-2014 Impala Kerr and 2015-2017 Caprice PPV pages are complete and no longer part of this queue.
- Visually review the 22 remaining current Order Guide snapshot pages and publish only exact, nonduplicate program scopes.
- Human-review the consolidated OCR corpus: 2,774 candidate pages and 11,733 automated color-row candidates across 691 source documents. Automated extraction is complete; no candidate is promoted without page-level review.
