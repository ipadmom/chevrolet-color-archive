---
title: Chevrolet model-year platform and era audit
visibility: public
classification: archive-internal
period: 1918-2026 model years
sources:
  - https://www.gm.com/heritage/archive/vehicle-information-kits
  - https://www.gmupfitter.com/wp-content/uploads/2021/05/2007_LD_ElectricalUtilitiesSUV.pdf
  - https://news.gm.com/home.detail.html/Pages/topic/us/en/2024/dec/1216-silverado.html
  - https://cdn.motor1.com/pdf-files/programdirnam.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1996-Chevrolet-G-Van.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1970-Chevrolet-Truck.pdf
  - https://news.chevrolet.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1962-Chevrolet-Truck.pdf
  - https://en.wikipedia.org/wiki/Chevrolet_Step-Van
  - https://en.wikipedia.org/wiki/Chevrolet/GMC_B_series
  - https://www.hemmings.com/stories/1933-chevrolet-canopy-express/
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1980-Chevrolet-Truck.pdf
  - https://imcdb.opencommunity.be/forum_topic-7960-60340-Chevrolet_Tilt_Cab_and_Steel_Tilt_Cab__GMC_Steel_Tilt_Cab.html
tier_note: Public-source research only. Manufacturer material controls model years and public program documents; secondary histories supply internal platform codes that GM does not consistently publish in consumer literature.
---

# Chevrolet model-year platform and era audit

## Result

`data/catalog/chevrolet-platform-eras.json` is the sourced label overlay for model-year bands. It maps 61 catalog model IDs to 218 ordered, nonoverlapping era records. Each record carries its inclusive model-year bounds, display label, aliases, evidence URLs, confidence, and a short qualification.

The exhaustive machine audit is [`data/audits/chevrolet-platform-era-coverage.json`](../data/audits/chevrolet-platform-era-coverage.json). It lists all 149 catalog models, all 1,792 catalog model-years, each model's platform-band count, and every unresolved year range. After this expansion, 59 models have complete platform coverage, two are partial, and 88 remain without a defensible overlay. The sourced overlay now covers 1,339 model-years; 453 remain explicit gaps.

Tahoe and Suburban are complete across every model year in `chevrolet-us-nameplates.json`:

- Tahoe: all 32 model years from 1995 through 2026.
- Suburban: all 89 catalog model years from 1935 through 1942 and 1946 through 2026.
- Suburban does not acquire false 1943-1945 rows.
- Neither model contains an overlap or an unlabeled catalog year.

The first expansion pass also covers the principal Chevrolet car, truck, van, crossover, and EV lineages, including Camaro, Corvette, Impala, Malibu, Caprice, Monte Carlo, Chevelle, El Camino, Corvair, Nova, Cavalier, Lumina, Silverado, Silverado HD, C/K, Colorado, Blazer, TrailBlazer, S-10, S-10 Blazer, Avalanche, SSR, Kodiak, Express, G-Series Van, Astro, Equinox, Traverse, Trax, Cruze, Volt, Spark, Bolt, the current Chevrolet EVs, and Chevrolet BrightDrop vans.

The July 21 commercial-coverage pass added the ten longest previously uncovered catalog records: P-Series/Step-Van, pre-C/K truck, B-Series bus chassis, Panel Truck, Sportvan, Sedan Delivery, Bel Air, Tiltmaster/W-Series, Canopy Express, and the Chevrolet Tilt Cab family. Their 55 new bands label 313 catalog model-years. The splits use actual truck eras, generation boundaries, body-family bases, or contemporary series names. A long run remains one band only where the evidence describes one stable commercial family, as with the Isuzu-derived Tiltmaster/W-Series.

That pass also corrected three catalog boundaries. The Sportvan record now begins in 1965 and ends in 1996, matching the first-year brochure and the final Chevrolet order guide. The C10 Panel continues through 1970, as Chevrolet's 1970 specifications expressly list models `CS10905` and `CE10905`. Canopy Express now begins in 1931, the debut year reported independently by Hemmings and Old Cars Weekly. The Panel correction adds three catalog model-years and the Canopy correction removes two, producing a net catalog increase of one year.

The prewar Sedan Delivery record remains in the catalog from 1928 at medium confidence because public histories conflict. Old Cars Weekly reports a mid-1928 introduction, while Curbside Classic concludes that Chevrolet's first factory production body appeared in spring 1929. No prewar era band is assigned until a primary Chevrolet body or production record resolves that disagreement. The model is therefore partial by design, not silently labeled with a generic annual-series placeholder.

This file is an overlay, not a replacement for `chevrolet-us-nameplates.json`. A model absent from the overlay must continue to use its catalog year range without an invented era name.

## Data contract

The root object is keyed by the exact catalog `model_id`. Each value is an array ordered by `start` year:

```json
{
  "model_id": [
    {
      "start": 2000,
      "end": 2006,
      "label": "GMT800 family, GMT830",
      "aliases": ["Ninth generation", "GMT830", "GMT800"],
      "evidence_urls": ["source-url-placeholder"],
      "confidence": "high",
      "notes": "Qualification or variant distinction."
    }
  ]
}
```

Rules:

1. `start` and `end` are inclusive retail model years.
2. Bands for one model may not overlap.
3. A production gap remains a gap. The overlay never stretches through an absent model year.
4. A mixed model year receives one explicit transition band rather than two overlapping records.
5. `label` favors the most useful contemporary platform or truck-era name. A numbered generation appears only where the boundary is well supported.
6. Program codes belonging to a related GMC or Cadillac are not assigned to a Chevrolet merely because the vehicles share an architecture.
7. A facelift may receive its own era band where the body design changes enough to control thumbnails, even when the base platform remains unchanged.

## Tahoe code map

| Model years | Display era | Code meaning |
|---|---|---|
| 1995-1999 | GMT400 family, GMT420 | GMT420 is the Chevrolet Tahoe derivative. GMT430 identifies the related GMC Yukon. |
| 2000 | GMT420 carryover / GMT820 launch | The 2000 Tahoe Limited and Z71 retained GMT420 while the redesigned regular Tahoe launched on GMT820. |
| 2001-2006 | GMT800 family, GMT820 | GMT800 is the umbrella truck architecture; GMT820 is its standard-wheelbase Tahoe/Yukon SUV derivative. |
| 2007-2014 | GMT900 / GMT920 / GMT921 | GMT900 is the architecture, GMT920 the short-wheelbase SUV program, and GMT921 the Chevrolet Tahoe product code. |
| 2015-2020 | K2XX / GMTK2UC | K2XX is the architecture family; GMTK2UC is Chevrolet Tahoe. |
| 2021-2024 | T1XX / GMTT1UC | T1XX is the architecture family; GMTT1UC is Chevrolet Tahoe. |
| 2025-2026 | T1XX / GMTT1UC refresh | The 2025 redesign is a facelift inside the same T1XX program. |

The 2000 transition band is deliberate. Treating model year 2000 as only GMT400 or only GMT800 would be wrong.

## Suburban code map

| Model years | Display era | Code meaning |
|---|---|---|
| 1935-1940 | First-generation all-steel Carryall | No stable retrospective GM platform code is established for the whole band. |
| 1941-1942 | AK Series / Art Deco | Formal truck-series identifier plus the accepted descriptive era name. |
| 1946 | AK Series / Art Deco postwar continuation | Resumption after the civilian production gap. |
| 1947-1954 | Advance Design | Chevrolet's official postwar truck era. |
| 1955 | Advance Design First Series / Task Force Second Series | Both designs existed in the same model year. |
| 1956-1959 | Task Force | Full model years after the 1955 changeover. |
| 1960-1966 | First-generation C/K chassis | Fifth Suburban generation on the first C/K chassis family. |
| 1967-1972 | Action Line | Three-side-door Suburban based on Chevrolet's Action Line C/K. |
| 1973-1986 | Rounded Line C/K / Square Body | Rounded Line is GM's era name; Square Body is the common enthusiast alias. |
| 1987-1991 | Rounded Line R/V continuation | The body continued while GM renamed the old C/K SUV series R/V. |
| 1992-1999 | GMT400 family, GMT410 | GMT410 is Chevrolet Suburban; GMT425 is the related GMC Suburban. |
| 2000-2006 | GMT800 family, GMT830 | GMT830 is the long-wheelbase Suburban/Yukon XL derivative. |
| 2007-2014 | GMT900 / GMT930 / GMT931 | GMT930 is the long-wheelbase SUV program; GMT931 is Chevrolet Suburban. |
| 2015-2020 | K2XX / GMTK2YC | GMTK2YC is the Chevrolet long-wheelbase SUV program. |
| 2021-2024 | T1XX / GMTT1YC | GMTT1YC is the current Chevrolet long-wheelbase SUV program. |
| 2025-2026 | T1XX / GMTT1YC refresh | The 2025 redesign remains on T1XX. |

## GMT800 variant warning

The familiar number is often only the umbrella architecture. The derivative code matters:

- GMT820: Chevrolet Tahoe and GMC Yukon.
- GMT830: Chevrolet Suburban and GMC Yukon XL.
- GMT805: Chevrolet Avalanche.
- GMT806: Cadillac Escalade EXT, not a Chevrolet program.

The archive therefore exposes GMT805 on Avalanche but does not falsely attach GMT806 to a Chevrolet model.

## Evidence hierarchy

### Primary manufacturer sources

The [GM Heritage Vehicle Information Kit index](https://www.gm.com/heritage/archive/vehicle-information-kits) and its model-year PDFs control historical model existence and truck changeovers. Particularly useful primary records include both [1955 First Series](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1955-Chevrolet-Truck-1st-Series.pdf) and [1955 Second Series](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1955-Chevrolet-Truck-2nd-Series.pdf), which prevent a false single-design 1955 Suburban band.

GM's [2007 Light Duty Electrical Utilities manual](https://www.gmupfitter.com/wp-content/uploads/2021/05/2007_LD_ElectricalUtilitiesSUV.pdf) expressly identifies `921 - Utility - Chevrolet Tahoe` and `931 - Large Utility - Chevrolet Suburban` under GMT900. Current [Tahoe](https://www.chevrolet.com/suvs/tahoe) and [Suburban](https://www.chevrolet.com/suvs/suburban) product pages confirm the through-2026 endpoints.

Chevrolet's [Silverado 50-year history](https://news.gm.com/home.detail.html/Pages/topic/us/en/2024/dec/1216-silverado.html) confirms its 2007 second-generation and 2019 fourth-generation boundaries. Chevrolet's [2023 Colorado release](https://news.chevrolet.com/newsroom.detail.html/Pages/news/us/en/2022/jul/0728-colorado.html) establishes the current redesign. GM Upfitter manuals and the [manufacturer program directory](https://cdn.motor1.com/pdf-files/programdirnam.pdf) supply modern program strings such as GMT1UC, GMT1YC, C1YC, D2UC, A1BC, G2KCZ, C121, and BV1.

For the newly added commercial families, GM Heritage truck kits control model-year presence and the documented 1941, 1955, 1962, 1967, and 1981 nomenclature. The Step-Van and B-Series secondary histories are used only to connect those official records into named production eras. Federal manufacturer material identifies Forward/Tiltmaster as W-Series and supports retaining the Isuzu-derived cab-over run as one honestly qualified family.

### Commercial and body-style boundary sources

Every individual band links its evidence in `chevrolet-platform-eras.json`. The following source map records the sources that control the highest-impact commercial boundaries:

| Catalog record | Boundary established | Controlling sources |
|---|---|---|
| P-Series / Step-Van | 1940 first Dubl-Duti; 1941 AK restyle; 1949 second Dubl-Duti; 1955 chassis transition; 1958 factory Step-Van body; 1961 Step-Van 7; 1964 Step-Van King; 1967 round-front end; 1981 Step-Van 7 end; 1998 GM end | GM truck kits for [1942](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1942-Chevrolet-Truck.pdf), [1949](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1949-Chevrolet-Truck.pdf), [1955 First Series](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1955-Chevrolet-Truck-1st-Series.pdf), [1955 Second Series](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1955-Chevrolet-Truck-2nd-Series.pdf), [1956](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1956-Chevrolet-Truck.pdf), [1963](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1963-Chevrolet-Truck.pdf), [1964](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1964-Chevrolet-Truck.pdf), and [1967](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1967-Chevrolet-Truck.pdf); [Step-Van history](https://en.wikipedia.org/wiki/Chevrolet_Step-Van) |
| Pre-C/K truck | 1918 start; 1929 six-cylinder era; 1941 AK; 1947 Advance Design; split 1955 transition; 1956-1959 Task Force | [Chevrolet truck legacy](https://www.chevrolet.com/legacy/trucks), [GM Heritage kits](https://www.gm.com/heritage/archive/vehicle-information-kits), and the two 1955 kits above |
| B-Series bus chassis | 1967-1979 S-Series; 1980 B60 rename; 1984 second generation; no 1992 production band; 1993 GMT530/B7 | [1981 Chevrolet Bus Chassis](https://xr793.com/wp-content/uploads/2017/07/1981-Chevrolet-Bus-Chassis.pdf) and [B-Series history](https://en.wikipedia.org/wiki/Chevrolet/GMC_B_series) |
| Panel Truck | Action Line body survives through 1970 and ends before 1971 | [1970 Chevrolet Truck specifications](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1970-Chevrolet-Truck.pdf), PDF p. 7; [Action Line utility history](https://en.wikipedia.org/wiki/Chevrolet_C/K_(second_generation)) |
| Sportvan | 1965 first model year; 1967 and 1971 generation changes; 1996 final model year | [1965 Chevrolet Sportvan brochure index](https://www.oldcarbrochures.com/static/NA/GM%20Trucks%20and%20Vans/1965_Trucks_And_Vans/dirindex.html), [1996 Chevrolet G-Van order guide](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1996-Chevrolet-G-Van.pdf), PDF pp. 71-78; [Chevrolet van history](https://en.wikipedia.org/wiki/Chevrolet_van) |
| Sedan Delivery | Postwar Stylemaster, Styleline, One-Fifty, Delray, and Biscayne bases; prewar start remains unresolved | [GM Heritage kits](https://www.gm.com/heritage/archive/vehicle-information-kits), [Delray history](https://en.wikipedia.org/wiki/Chevrolet_Delray), [Old Cars Weekly 1928 account](https://www.oldcarsweekly.com/features/sedan-deliveries-the-handsome-handy-haulers), and [Curbside Classic 1929 account](https://www.curbsideclassic.com/automotive-histories/the-american-sedan-delivery-a-unique-combination-of-style-and-utility/) |
| Bel Air | Seven U.S. generation boundaries from 1950 through 1975 | [GM Heritage kits](https://www.gm.com/heritage/archive/vehicle-information-kits) and [Bel Air history](https://en.wikipedia.org/wiki/Chevrolet_Bel_Air) |
| Tiltmaster / W-Series | One 1984-2009 Isuzu-derived family because public records alternate Forward, Tiltmaster, and W-Series names without a universal rename year | [NHTSA manufacturer filing](https://static.nhtsa.gov/nhtsa/downloads/MfrMail/01-022-N11B-8753.pdf), PDF pp. 38-39; [GM Heritage kits](https://www.gm.com/heritage/archive/vehicle-information-kits) |
| Canopy Express | 1931 debut; AK, postwar AK, Advance Design, and 1955 First Series splits | [Hemmings history](https://www.hemmings.com/stories/1933-chevrolet-canopy-express/), [Old Cars Weekly history](https://www.oldcarsweekly.com/features/a-beloved-canopy-express-1949-chevy-canopy-express), and [1955 First Series kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1955-Chevrolet-Truck-1st-Series.pdf) |
| Chevrolet Tilt Cab | 1960-1972 Tilt Cab; 1973 Steel Tilt Cab; 1979 W60/W70 nomenclature; no Chevrolet L-Series display label | [1962 Chevrolet Truck specifications](https://news.chevrolet.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1962-Chevrolet-Truck.pdf), PDF pp. 25 and 81-82; [1980 Chevrolet Truck specifications](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1980-Chevrolet-Truck.pdf); [1979 brochure index](https://www.oldcarbrochures.com/static/NA/GM%20Trucks%20and%20Vans/1979_Trucks_and_Vans/1979_Chevrolet_Trucks_Brochure/dirindex.html); [brochure-based naming audit](https://imcdb.opencommunity.be/forum_topic-7960-60340-Chevrolet_Tilt_Cab_and_Steel_Tilt_Cab__GMC_Steel_Tilt_Cab.html) |

`L-Series` is retained only as a legacy search alias on the old catalog ID. It was GMC nomenclature. Chevrolet's display bands use the documented Tilt Cab, Steel Tilt Cab, and W60/W70 names.

### Secondary platform-code sources

GM does not consistently publish engineering program codes in consumer-facing material. Individual model and platform histories are therefore used to connect documented generation boundaries to codes such as GMT410, GMT420, GMT820, GMT830, GMT805, GMT368, GMT530, GMT560, GMT600, GMT610, K2XX, and 31XX-2. These are secondary identifiers, not color evidence.

The overlay marks a record `medium` when the platform label is sound but its exact public program string is less firmly documented. No low-confidence or speculative code is included.

## Validation

The JSON and exhaustive coverage audit were parsed and checked against `chevrolet-us-nameplates.json` on 2026-07-21. Results:

- 61 valid catalog model IDs.
- 218 total era bands.
- Zero invalid model IDs.
- Zero reversed bands.
- Zero overlapping bands.
- Zero platform years outside the catalog.
- 1,339 of 1,792 catalog model-years have sourced labels.
- 59 models are complete, two are partial, and 88 are missing.
- Tahoe coverage: 32 of 32 catalog years.
- Suburban coverage: 89 of 89 catalog years.

The 17 newly relied upon commercial-source URLs were range-probed or opened in a browser on 2026-07-21. GM, Old Car Manual Project, Old Cars Weekly, and IMCDb sources returned successful content. Hemmings and Curbside Classic blocked command-line retrieval with HTTP 403 but rendered in the browser. No new citation returned 404. An expired-certificate TrucksPlanet link found during QA was removed from the Tilt Cab evidence record rather than left as a fragile citation.

The two partial models are B-Series Bus Chassis and Sedan Delivery. B-Series bands cover 1967-1991 and 1993-2003. Model year 1992 stays unresolved because the catalog currently includes it while the available B-Series production history says GM skipped 1992. Sedan Delivery bands cover the documented postwar bases from 1946 through 1960; its 1928-1942 range stays unresolved because the two historical accounts above conflict on the start and no stable annual-series base label has yet been sourced. The overlay does not fabricate either transition to hide those conflicts.

## Remaining queue

Eighty-eight of the 149 nameplate records still rely on their existing catalog range rather than a researched platform overlay. Many are short annual series or wagon/body-style identities where repeating the model name as an “era” would add no information. They should receive new records only when a brochure, body manual, VIN filing, or reliable platform history supplies a real distinction. Every one is enumerated in the machine audit; none is hidden behind a summary count.

Priority remaining families are the 1913-1942 passenger-series hierarchy; full-size Chevrolet wagon derivatives from 1953-1972; Beretta, Corsica, Celebrity, Citation, Chevette, Monza, Vega, Aveo, Tracker, Prizm, and Metro; 3100/3600/3800 truck-era splits; T-Series medium duty; and former Class 8 trucks.
