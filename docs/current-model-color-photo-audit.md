---
title: Chevrolet current-model color and photo coverage audit
visibility: public
classification: archive-internal
period: 1935-2026 current-nameplate model years
sources:
  - https://www.gmfleetorderguide.com/
  - https://commons.wikimedia.org/w/api.php
---

# Current-model color and photo coverage audit

Audited August 7, 2026.

This is the focused coverage ledger for the 18 nameplates marked `current` in
[`chevrolet-us-nameplates.json`](../data/catalog/chevrolet-us-nameplates.json).
The archive currently ends with model year 2026. The underlying year-level
records, status definitions, exact source links, page locators, and publication
qualifications are in
[`color-research-gap-inventory.json`](../data/audits/color-research-gap-inventory.json).
The independent 2025–2026 live-source comparison is retained separately in
[`current-model-order-guide-reconciliation.json`](../data/audits/current-model-order-guide-reconciliation.json).

## What the status labels mean

- **Complete** means a complete model-year chart or reconciled official table
  was reviewed and published.
- **Qualified palette** means an official palette was reviewed, but the record
  does not claim complete trim, paint-code, or order-guide coverage.
- **Specialty subset** means a PPV, SSV, SEO, fleet, or other exact restricted
  program was reviewed. It does not establish the regular model-year palette.
- **Unreviewed** means the archive does not yet publish a complete or qualified
  color result for that model-year. It never means no colors were available.
- **Photo candidates** are reusable Wikimedia Commons files already copied to
  the `ipadmom` GitHub Releases archive. They are not paint evidence and remain
  separate from reviewed color-photo links.

## Current coverage

| Model | Catalog years | Complete | Qualified palette | Specialty subset | Unreviewed or no-chart years | Archived Commons candidates |
|---|---:|---|---|---|---|---:|
| Corvette | 73 | 1956–1958, 1960–1980, 1982, 1984–1985, 1987–1988, 1990–1995, 1997–1998, 2001, 2005 | 1954–1955, 1959, 1981, 1986, 1989, 1996, 1999–2000, 2003–2004, 2006, 2008–2026 | Scoped top, two tone, stripe, anniversary, special edition, revision conflict, and late change programs remain separate | 1953 no chart; 2002 and 2007 unreviewed | 10 |
| Suburban | 89 | 1969, 1972–2005, 2007 | 2008–2026 | None | 1963, 1970–1971 no chart; 1935–1942, 1946–1962, 1964–1968, 2006 unreviewed | 3 |
| Blazer | 45 | 1983–1986, 1991–1992, 1994 | 1987–1990, 1993; 2019–2026 | 1979–1980 plus 68 separately scoped 1983–1994 variant programs | 1969–1978, 1981–1982, 1995–2005 | 2 |
| Tahoe | 32 | 1995–2007 | 2008–2026 | None | None | 5 |
| Express | 31 | 1996–1999, 2004–2007 | 2000, 2008–2026 | Passenger, Cargo, Cutaway, YF2, YF7, mobility, SEO, and TGK tables remain separate | 2001–2003 | 2 |
| Silverado | 28 | None | 2008–2026 | None | 1999–2007 | 2 |
| Silverado HD | 26 | 2003, 2005 | 2008–2026 | Separate SEO tables for 2003 and 2005 | 2001–2002, 2004, 2006–2007 | 2 |
| TrailBlazer | 14 | None | 2008–2009, 2021–2026 | None | 2002–2007 | 2 |
| Colorado | 21 | None | 2008–2012, 2015–2026 | None | 2004–2007 | 5 |
| Equinox | 22 | None | 2008–2026 | None | 2005–2007 | 2 |
| Traverse | 18 | None | 2009–2026 | None | None | 3 |
| Trax | 11 | None | 2015–2022, 2024–2026 | None | None | 6 |
| Low Cab Forward | 11 | None | 2016–2026 | None | None | 1 |
| Blazer EV | 3 | None | 2024–2026 | See separate 2024–2026 9C1/9C3/5W4 evidence | None | 2 |
| Equinox EV | 3 | None | 2024–2026 | None | None | 2 |
| Silverado EV | 3 | None | 2024–2026 | None | None | 2 |
| BrightDrop 400 | 2 | None | 2025–2026 | None | None | 1 |
| BrightDrop 600 | 2 | None | 2025–2026 | None | None | 2 |

Totals:

- 434 catalog model years.
- 105 model years with complete reviewed charts.
- 226 model years with qualified regular palettes and 11 with qualified
  historical or exact program tables.
- 2 model years represented only by a reviewed specialty subset.
- 4 model years whose inspected source had no governing color chart.
- 86 unreviewed model years, all before 2008.
- 5,811 published availability rows.
- 54 archived Commons originals and 54 archived previews for current
  nameplates.
- 9 current model photo to color links visually reviewed as qualified examples;
  factory paint remains unverified.

## Live Order Guide reconciliation

An independent pass checked the stored 2025 and 2026 unions against the
[GM Online Order Guide](https://www.gmfleetorderguide.com/) on July 22, 2026.
The audit used the exact public `GetColorAndTrim/{vehicle_id}/en-us` result for
each vehicle entry and the complete generated PDF where a page review was
required.

None of the current qualified unions can yet be promoted to complete. A name
union does not capture every RPO, WA identity, trim restriction, extra-cost
state, late availability, build-out date, or SEO program. The exact
reconciliation results are:

| Model | 2025 Order Guide ID | 2026 Order Guide ID | Result |
|---|---|---|---|
| Blazer | `22934` | `23265` | Stored names match. LT, Premier, RS, code, and cost restrictions remain to be normalized. |
| Blazer EV | `22878` | `23136` | The retained 2025 page now publishes Habanero Orange `GAG / WA-221K`, SS only. 2026 Galaxy Gray is no longer orderable. |
| BrightDrop 400 | `23075` | `23108` | Oyster White `GRO / WA-673G` is the only body color. The door-color rule remains to be normalized. |
| BrightDrop 600 | `23075` | `23108` | Same shared BrightDrop order-guide record and door-color qualification. |
| Colorado | `23079` | `23215` | Identity union matches. The 2025 Fleet Guide prints “Sterling Grey Metallic”; the Order Guide prints “Sterling Gray Metallic,” `GXD / WA-130H`. Preserve both source literals. |
| Corvette | `22973` | `23208` | The retained 2026 page now publishes Blade Silver Matte `GRF / WA-730S`, limited to the Quail Silver Limited Edition and unavailable with `D30`. |
| Equinox | `22850` | `23091` | Identity union matches. The 2026 Fleet Guide prints “Polar White”; the Order Guide prints “Polar White Tricoat,” `G4J / WA-241L`. |
| Equinox EV | `23098` | `23159` | Names match. 2026 Galaxy Gray is no longer orderable; premium-paint restrictions remain to be normalized. |
| Express | `23014`, `23015`, `23016` | `23276`, `23277`, `23278` | Four regular names match. Woodland Green `9V5 / WA-9015` is published for Cargo, Cutaway, and Passenger with the five-order minimum and flat-Black body-component rule. Seventeen other SEO identities per year remain outside the normalized regular layer. |
| Low Cab Forward | `22745`, `22775`, `22821` | `22954`, `22975`, `23023` | Three retained 2025 body-family tables now publish the six-color union: Arc White `16U`, Cardinal Red `74U`, Dark Blue `47U`, Ebony Black `41U`, Wheatland Yellow `86U`, and Woodland Green `46U`. The five nonwhite diesel colors are extra cost. Isuzu Woodland Green `46U` has no printed WA number and is not GM Woodland Green `9V5 / WA-9015`. |
| Silverado 1500 | `22917` | `23168` | Nine regular names match. Woodland Green `9V5 / WA-9015` is published for the exact retail/fleet scope; the other 20 SEO colors per year remain separate from the regular layer and from PPV/SSV. |
| Silverado EV | `22982` | `23290` | Names match. Several 2026 colors are late, built out, extra cost, or trim limited. |
| Silverado HD | `22903`, `22904`, `22905`, `23022` | `23195`, `23196`, `23197`, `23260` | Regular body-series unions match. Woodland Green `9V5 / WA-9015` is published for all four exact configurations in both years. Forty-seven other distinct SEO identities per year remain unnormalized. |
| Suburban | `23035` | `23233` | Eight regular names match. Woodland Green `9V5 / WA-9015` is published from both exact SEO pages. Victory Red and Wheatland Yellow remain outside this tranche. |
| Tahoe | `22944`; police/SSV `22974` | `23232`; police/SSV `23213` | Eight regular names match. Retail/fleet Woodland Green and all six colors on each combined Police Package and Special Service SEO page are published. The source does not split PPV from SSV. |
| TrailBlazer | `22849` | `23094` | Names match. Trim, roof-option, premium-cost, and build-out restrictions remain to be normalized. |
| Traverse | `23025` | `23144` | Names match. 2026 Stardust Metallic is built out; premium-paint states remain to be normalized. |
| Trax | `22839` | `23139` | Names match. Trim, premium-cost, and build-out restrictions remain to be normalized. |

The Order Guide is a mutable application, not a permanent evidence file.
Publication requires retaining the exact JSON response or generated PDF with a
retrieval time and digest, then reviewing the cited page before the normalized
record is promoted.

The three exact identity omissions found in the July 22 reconciliation are now
closed from retained, hashed, and visually reviewed generated PDFs. They remain
qualified palette rows because the rest of each governing model-year chart has
not yet been normalized at the same option-state depth.

## Current specialty evidence

The exact PPV, SSV, SEO, municipal, and upfitter programs are documented in
[`specialty-color-source-audit.md`](specialty-color-source-audit.md). Important
current-nameplate boundaries include:

- Tahoe PPV and SSV programs for 2011-2020 remain exact historical programs.
  The current 2025 and 2026 source is separately published only as a combined
  Police Package and Special Service entry and does not split PPV from SSV.
- The 2026 Blazer EV guide publishes four 9C1/9C3/5W4 specialty colors. That
  table is not a complete regular Blazer EV palette.
- The 2026 Silverado 9C1 PPV and 5W4 SSV guides each publish four standard
  colors and 21 SEO colors that closed to ordering after February 2, 2026.
- The current Tahoe police/SSV Order Guide entries each expose six SEO solid
  paints for 2025 and 2026: Victory Red
  `5T4 / WA-9260`, MSP Blue `9V2 / WA-5665`, Woodland Green
  `9V5 / WA-9015`, Dark Blue Metallic `9V7 / WA-722J`, Wheatland Yellow
  `9W3 / WA-253A`, and Silver Ice Metallic `9W5 / WA-636R`. The retained
  generated PDFs place the combined program table on page 29. Both pages are
  visually reviewed and all twelve year-specific rows are published. Separate
  PPV-versus-SSV applicability is not inferred.
- Thirty-one retained 2025–2026 GM Order Guide snapshots now form the current
  source release. Twenty-six locate Woodland Green `9V5 / WA-9015` or related
  specialty pages for current trucks, vans, SUVs, police, and SSV
  configurations. The exact 2025 and 2026 Silverado 1500 Retail and Fleet
  pages have been visually reviewed and now publish one scoped specialty row
  per year, including the five-order minimum and extended-lead-time warning.
  Twenty-four additional Tahoe, Suburban, Express, Silverado HD, Colorado, and
  Blazer EV source entries are also visually reviewed and publish 69 exact
  rows. No retained current Order Guide source entry remains pending visual
  review.
  Five additional snapshots close the Blazer EV, Corvette, and Low Cab Forward
  regular-palette identity omissions documented above.

The current Silverado sources retain two unresolved literal conflicts for
page-level re-review. The stored Upfitter rows say Silver Ice Metallic
`5IS / WA-363R` and Sterling Gray Metallic `GNO / WA-130H`; the live Order
Guide says `5IS / WA-636R` and `GXD / WA-130H`. Neither value is silently
overwritten.

Forest Service Green remains a separately named research lead. Reviewed USDA
sources establish Forest Service Green as Federal Standard 595 No. 14260 or,
in separate documents, identifier 5032. They do not establish a Chevrolet
model-year, GM paint code, factory finish, or equivalence with Woodland Green,
Forest Green Metallic, or WA-7927.

## Photo status

The complete candidate and rights metadata are in
[`commons-release-manifest.json`](../data/photos/commons-release-manifest.json).
Every retained original and preview has a release URL, Wikimedia source page,
author, license, dimensions, byte count, and digest.

The current-model files remain identification candidates. A photo is never
treated as proof of its paint name, factory finish, model year, or orderability
unless those facts are independently supported.

One BrightDrop 400 identity reference now passes the archive’s conservative
cross-reference rule. Commons identifies the exact file as a 2025 Chevrolet
BrightDrop at the 2025 Montreal International Auto Show, but does not provide
the 400 designation. The exact-file English Wikipedia caption identifies a
2025 BrightDrop 400, and the show organizer’s official report lists a 2025
Chevrolet BrightDrop 400 as the event’s BrightDrop Canadian debut. The manifest
therefore records `official_event_roster_plus_exact_file_caption` as the basis.
This does not turn a generic BrightDrop photograph into paint evidence, and the
official 2026 GM Fleet Guide remains the dimensional and silhouette reference.

### August 7 Commons refresh

The release manifest now has 54 archived candidates across the 18 current
nameplates and nine qualified current model photo to color links. The full identity
evidence ledger is
[`current-model-commons-photo-audit.json`](../data/photos/current-model-commons-photo-audit.json).
The separate color-link evidence is in
[`current-model-color-photo-links.json`](../data/photos/current-model-color-photo-links.json).

- BrightDrop 400 now has one cross-referenced 2025 identity candidate. The
  Commons page, exact-file caption, and official show report remain separately
  linked so the 400 designation is not misattributed to Commons metadata.
- Low Cab Forward remains at one archived candidate. Fresh 2025 and 2026
  queries returned none, and the only other LCF search result was explicitly a
  GMC truck.
- BrightDrop 600 now has two archived candidates. The June 2025 file explicitly
  described as a Chevrolet BrightDrop 600 was visually reviewed, hashed, copied
  to the existing `photo-archive-v1` Release with its WebP preview, and verified
  against the GitHub-reported byte counts and SHA-256 digests. The June 2025
  date remains a capture date only, not model-year evidence.

The existing 2019 Low Cab Forward photo mentions Bright White `16U`, but it is
not current-model paint evidence. No current photo is promoted as factory color
evidence in this audit.

The retained 2024 Trax ACTIV photograph is now linked to the exact 2024
Crimson Metallic palette row. Commons identifies the exact model year and says
the photographed vehicle is finished in Crimson Metallic; the retained image
was visually reviewed as a clear complete-vehicle example. The association is
still marked `factory_paint_match_status = unverified`. A photograph and its
caption do not prove original factory finish.

Eight additional exact label Commons leads were completed from
[`current-model-color-photo-crawl-queue.json`](../data/photos/current-model-color-photo-crawl-queue.json):
four 2024 Trax views, three 2024 Colorado views, and one 2025 Traverse view.
The published set preserves multiple views for Trax Summit White and Colorado
Nitro Yellow Metallic. Every original matched the Commons SHA-1 and local
SHA-256, every preview was visually reviewed, and all 16 Release assets matched
GitHub's reported size and a fresh downloaded SHA-256. The exact VPS original,
preview, and verification payloads were deleted after verification. The complete
Commons API response, visual review, and Release receipt are retained in
[`current-model-color-photo-review.json`](../data/photos/current-model-color-photo-review.json),
[`current-model-color-photo-release-verification.json`](../data/photos/current-model-color-photo-release-verification.json),
and
[`current-model-color-photo-commons-api-2026-08-07.json`](../data/photos/source-records/current-model-color-photo-commons-api-2026-08-07.json).
Philippine-market Jinx Metallic, Sharkskin Metallic, and Crimson Metallic leads
remain rejected or unresolved for the U.S. archive rather than being joined by
name alone.

## Highest-priority work queue

1. Review current 2025–2026 order guides or paint sections at trim level so
   qualified palette unions can become governing model-year charts.
2. Expand exact current-model color-photo examples only where Commons metadata
   prints the complete reviewed palette label for the same model year.
3. Continue searching for a second BrightDrop 400 image whose own Commons
   metadata states the exact 400 identity.
4. Continue exact-year heritage-kit review for the legacy years still marked
   unreviewed, beginning with the highest-yield dedicated PDF batches.
