---
title: Chevrolet current-model color and photo coverage audit
visibility: public
classification: archive-internal
period: 2025-2026 model years
sources:
  - https://www.gmfleetorderguide.com/
  - https://commons.wikimedia.org/w/api.php
---

# Current-model color and photo coverage audit

Audited July 23, 2026.

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
| Corvette | 73 | 1956–1958, 1960–1962 | 1954–1955, 1959; 2025–2026 | None | 1953 no chart; 1963–1982, 1984–2024 unreviewed | 10 |
| Suburban | 89 | 1969, 1972–2005, 2007 | 2008–2026 | None | 1963, 1970–1971 no chart; 1935–1942, 1946–1962, 1964–1968, 2006 unreviewed | 3 |
| Blazer | 45 | None | 2025–2026 | 1979–1980 | 1969–1978, 1981–2005, 2019–2024 | 2 |
| Tahoe | 32 | 1995–2007 | 2022, 2025–2026 | 2011–2020 | 2008–2010, 2021, 2023–2024 | 5 |
| Express | 31 | None | 2025–2026 | 2011–2014 | 1996–2010, 2015–2024 | 2 |
| Silverado | 28 | None | 2025–2026 | 2012, 2014; 2025–2026 Retail and Fleet Woodland Green | 1999–2011, 2013, 2015–2024 | 2 |
| Silverado HD | 26 | None | 2023, 2025–2026 | 2011 | 2001–2010, 2012–2022, 2024 | 2 |
| TrailBlazer | 14 | None | 2025–2026 | None | 2002–2009, 2021–2024 | 2 |
| Colorado | 21 | None | 2023, 2025–2026 | None | 2004–2012, 2015–2022, 2024 | 2 |
| Equinox | 22 | None | 2025–2026 | None | 2005–2024 | 2 |
| Traverse | 18 | None | 2025–2026 | None | 2009–2024 | 2 |
| Trax | 11 | None | 2025–2026 | None | 2015–2022, 2024 | 2 |
| Low Cab Forward | 11 | None | 2025–2026 | None | 2016–2024 | 1 |
| Blazer EV | 3 | None | 2025–2026 | See separate 2024–2026 9C1/9C3/5W4 evidence | 2024 regular palette | 2 |
| Equinox EV | 3 | None | 2025–2026 | None | 2024 | 2 |
| Silverado EV | 3 | None | 2025–2026 | None | 2024 | 2 |
| BrightDrop 400 | 2 | None | 2025–2026 | None | None | 0 |
| BrightDrop 600 | 2 | None | 2025–2026 | None | None | 1 |

Totals:

- 434 catalog model-years.
- 55 model-years with complete reviewed charts.
- 59 model-years with qualified regular or historical palettes.
- 19 model-years represented only by a reviewed specialty subset.
- 4 model-years whose inspected source had no governing color chart.
- 297 unreviewed model-years.
- 1,326 published availability rows.
- 44 archived Commons originals and 44 archived previews for current
  nameplates.
- 0 current-model photo-to-color links promoted from candidate status.

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
| Express | `23014`, `23015`, `23016` | `23276`, `23277`, `23278` | Four regular names match. Eighteen SEO colors per year, including Woodland Green, remain outside the normalized regular layer. |
| Low Cab Forward | `22745`, `22775`, `22821` | `22954`, `22975`, `23023` | Three retained 2025 body-family tables now publish the six-color union: Arc White `16U`, Cardinal Red `74U`, Dark Blue `47U`, Ebony Black `41U`, Wheatland Yellow `86U`, and Woodland Green `46U`. The five nonwhite diesel colors are extra cost. Isuzu Woodland Green `46U` has no printed WA number and is not GM Woodland Green `9V5 / WA-9015`. |
| Silverado 1500 | `22917` | `23168` | Nine regular names match. Woodland Green `9V5 / WA-9015` is published for the exact retail/fleet scope; the other 20 SEO colors per year remain separate from the regular layer and from PPV/SSV. |
| Silverado EV | `22982` | `23290` | Names match. Several 2026 colors are late, built out, extra cost, or trim limited. |
| Silverado HD | `22903`, `22904`, `22905`, `23022` | `23195`, `23196`, `23197`, `23260` | Regular body-series unions match. Forty-eight distinct SEO name/code identities across HD and medium-duty entries remain unnormalized for each year. |
| Suburban | `23035` | `23233` | Eight regular names match. Victory Red, Woodland Green, and Wheatland Yellow SEO rows remain absent for both years. |
| Tahoe | `22944`; police/SSV `22974` | `23232`; police/SSV `23213` | Eight regular names match. Three retail/fleet SEO colors and the full current PPV/SSV program remain absent. |
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

- Tahoe PPV and SSV programs are published only for the exact reviewed
  2011–2020 applications. No current-generation Tahoe specialty palette is
  inferred from those years.
- The 2026 Blazer EV guide publishes four 9C1/9C3/5W4 specialty colors. That
  table is not a complete regular Blazer EV palette.
- The 2026 Silverado 9C1 PPV and 5W4 SSV guides each publish four standard
  colors and 21 SEO colors that closed to ordering after February 2, 2026.
- The current Tahoe police/SSV Order Guide entries each expose six standard
  colors and six SEO colors for 2025 and 2026: Victory Red
  `5T4 / WA-9260`, MSP Blue `9V2 / WA-5665`, Woodland Green
  `9V5 / WA-9015`, Dark Blue Metallic `9V7 / WA-722J`, Wheatland Yellow
  `9W3 / WA-253A`, and Silver Ice Metallic `9W5 / WA-636R`. The retained
  generated PDFs locate the combined program table on page 29. Those pages
  remain page-located rather than visually reviewed, so separate PPV-versus-SSV
  applicability is not inferred.
- Thirty-one retained 2025–2026 GM Order Guide snapshots now form the current
  source release. Twenty-six locate Woodland Green `9V5 / WA-9015` or related
  specialty pages for current trucks, vans, SUVs, police, and SSV
  configurations. The exact 2025 and 2026 Silverado 1500 Retail and Fleet
  pages have been visually reviewed and now publish one scoped specialty row
  per year, including the five-order minimum and extended-lead-time warning.
  The other 24 in that specialty queue remain page-located but unreviewed.
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

No exact BrightDrop 400 photograph was found under the archive’s conservative
identity rule. Current Commons files are generic BrightDrops or explicit
BrightDrop 600/Zevo 600 vehicles. A generic van cannot be relabeled 400 merely
because its license permits reuse. The official 2026 GM Fleet Guide illustration
therefore remains the dimensional and silhouette reference for BrightDrop 400.

## Highest-priority work queue

1. Visually review the 24 retained Woodland Green Order Guide records and publish
   only exact model, year, configuration, code, and restriction scopes.
2. Complete current-generation Tahoe PPV/SSV source review without carrying
   forward 2011–2020 programs.
3. Review current 2025–2026 order guides or paint sections at trim level so
   qualified palette unions can become governing model-year charts.
4. Review the 44 current-model Commons candidates for identity and composition,
   then link a photograph to a color only when separate color evidence supports
   the association.
5. Keep BrightDrop 400 photo coverage explicitly empty until an exact,
   reusable, model-identified file is found.
