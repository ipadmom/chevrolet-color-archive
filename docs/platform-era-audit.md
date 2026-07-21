---
title: Chevrolet model-year platform and era audit
visibility: public
classification: archive-internal
period: 1935-2026 model years
sources:
  - https://www.gm.com/heritage/archive/vehicle-information-kits
  - https://www.gmupfitter.com/wp-content/uploads/2021/05/2007_LD_ElectricalUtilitiesSUV.pdf
  - https://news.gm.com/home.detail.html/Pages/topic/us/en/2024/dec/1216-silverado.html
  - https://cdn.motor1.com/pdf-files/programdirnam.pdf
tier_note: Public-source research only. Manufacturer material controls model years and public program documents; secondary histories supply internal platform codes that GM does not consistently publish in consumer literature.
---

# Chevrolet model-year platform and era audit

## Result

`data/catalog/chevrolet-platform-eras.json` is the sourced label overlay for model-year bands. It maps 50 catalog model IDs to 162 ordered, nonoverlapping era records. Each record carries its inclusive model-year bounds, display label, aliases, evidence URLs, confidence, and a short qualification.

Tahoe and Suburban are complete across every model year in `chevrolet-us-nameplates.json`:

- Tahoe: all 32 model years from 1995 through 2026.
- Suburban: all 89 catalog model years from 1935 through 1942 and 1946 through 2026.
- Suburban does not acquire false 1943-1945 rows.
- Neither model contains an overlap or an unlabeled catalog year.

The first expansion pass also covers the principal Chevrolet car, truck, van, crossover, and EV lineages, including Camaro, Corvette, Impala, Malibu, Caprice, Monte Carlo, Chevelle, El Camino, Corvair, Nova, Cavalier, Lumina, Silverado, Silverado HD, C/K, Colorado, Blazer, TrailBlazer, S-10, S-10 Blazer, Avalanche, SSR, Kodiak, Express, G-Series Van, Astro, Equinox, Traverse, Trax, Cruze, Volt, Spark, Bolt, the current Chevrolet EVs, and Chevrolet BrightDrop vans.

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
      "evidence_urls": ["https://example.com/source"],
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

### Secondary platform-code sources

GM does not consistently publish engineering program codes in consumer-facing material. Individual model and platform histories are therefore used to connect documented generation boundaries to codes such as GMT410, GMT420, GMT820, GMT830, GMT805, GMT368, GMT530, GMT560, GMT600, GMT610, K2XX, and 31XX-2. These are secondary identifiers, not color evidence.

The overlay marks a record `medium` when the platform label is sound but its exact public program string is less firmly documented. No low-confidence or speculative code is included.

## Validation

The JSON was parsed and checked against `chevrolet-us-nameplates.json` on 2026-07-20. Results:

- 50 valid catalog model IDs.
- 162 total era bands.
- Zero invalid model IDs.
- Zero reversed bands.
- Zero overlapping bands.
- Tahoe coverage: 32 of 32 catalog years.
- Suburban coverage: 89 of 89 catalog years.

## Remaining queue

Ninety-nine of the 149 nameplate records still rely on their existing catalog range rather than a researched platform overlay. Many are short annual series or wagon/body-style identities where repeating the model name as an “era” would add no information. They should receive new records only when a brochure, body manual, VIN filing, or reliable platform history supplies a real distinction.

Priority remaining families are the 1933-1942 passenger-series hierarchy; full-size Chevrolet wagon derivatives from 1953-1972; Beretta, Corsica, Celebrity, Citation, Chevette, Monza, Vega, Aveo, Tracker, Prizm, and Metro; the P-Series and B-Series commercial chassis; and Tiltmaster/W-Series, T-Series, L-Series, and former Class 8 trucks.
