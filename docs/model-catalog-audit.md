---
title: Chevrolet U.S. model and nameplate catalog audit
visibility: public
classification: archive-internal
period: 1913-2026 model years
sources:
  - https://www.gm.com/heritage/archive/vehicle-information-kits
  - https://www.chevrolet.com/vehicles
  - https://www.chevrolet.com/discontinued-vehicles
tier_note: Public-source research only. Primary GM and Chevrolet material controls; government records and secondary histories fill explicitly identified gaps.
---

# Chevrolet U.S. model and nameplate catalog audit

## Result

`data/catalog/chevrolet-us-nameplates.json` is the archive's seed inventory for all U.S.-market Chevrolet model years, not a classic-car subset. It contains 149 consumer-searchable model and nameplate records, spanning retail model years 1913 through 2026. The only global model-year interruption after Chevrolet's first retail model year is 1943-1945, when civilian passenger-car production was suspended for World War II.

The catalog includes passenger cars, sports cars, station wagons, coupe utilities, pickups, SUVs, passenger and cargo vans, EVs, police and fleet carryovers, incomplete commercial chassis, cab-over trucks, medium-duty trucks, and Chevrolet's former Class 8 vehicles. Tahoe and Suburban are full first-class entries, not aliases or future placeholders:

- Tahoe: 1995-2026.
- Suburban: 1935-1942 and 1946-2026.
- Silverado: 1999-2026.
- Silverado HD: 2001-2026.
- Colorado: 2004-2012 and 2015-2026.
- Blazer: 1969-2005 and 2019-2026, with S-10 Blazer and Blazer EV separately searchable.
- TrailBlazer: 2002-2009 and 2021-2026.
- Express: 1996-2026.

This is a catalog-completeness milestone, not a claim that all 149 models already have complete color evidence or photo coverage. Each model-year and color cell still needs its own brochure, order-guide, paint-bulletin, or equivalent claim-level source before publication as verified.

## Governing boundary

The inclusion test is whether a U.S. buyer, fleet operator, dealer, body builder, or present-day researcher would reasonably search a Chevrolet-badged vehicle under that model or nameplate.

Included:

- U.S. retail Chevrolet-badged vehicles.
- U.S. fleet-only identities such as Caprice PPV, Impala Limited, Malibu Limited, Cruze Limited, Captiva Sport, and Traverse Limited.
- Major renamed or rebadged products such as Metro, Prizm, Tracker, Spectrum, Sprint, LUV, City Express, and Low Cab Forward, but only for Chevrolet-badged U.S. years.
- Wagon and commercial identities that period Chevrolet literature presented as model names, including Yeoman, Brookwood, Parkwood, Kingswood, Concours Estate, Sportvan, Corvan, Sedan Delivery, Panel Truck, and Step-Van.
- Incomplete Chevrolet commercial chassis where Chevrolet published distinct sales, paint, or equipment literature, including P-Series, B-Series bus chassis, Tiltmaster/W-Series, T-Series, and Silverado chassis cabs.
- Reused nameplates as discontinuous ranges, rather than false continuous histories.

Excluded:

- Geo-badged years. Geo Metro, Geo Prizm, and Geo Tracker do not become Chevrolet color records merely because Chevrolet later used the names.
- GMC-badged twins and later GMC-only continuation years.
- Vehicles sold only outside the United States, including later global Aveo, LUV, S10, Captiva, Orlando, and Tracker runs.
- Concepts, prototypes, race-only vehicles, and one-off show cars.
- Ordinary trim and option packages such as Z28, ZR2, High Country, LTZ, and Corvette Z06. They belong under a base nameplate unless Chevrolet sold a mechanically distinct vehicle under a separately expected search identity.
- Calendar-year announcements with no matching U.S. retail model year.
- Second-stage bodies not built or branded by Chevrolet. The Chevrolet incomplete chassis remains in scope, but the coachbuilder's finished bus, motorhome, or box body is not a new Chevrolet nameplate.

## Evidence tiers

### Tier 1: primary manufacturer material

The main historical backbone is the [GM Heritage Vehicle Information Kit index](https://www.gm.com/heritage/archive/vehicle-information-kits). It exposes Chevrolet passenger-car and truck literature by year and model from the early company years through the modern era. The [GM Heritage Chevrolet collection](https://www.gm.com/heritage/collection/chevrolet) and [Chevy Trucks collection](https://www.gm.com/heritage/collection/chevrolet-trucks) provide additional first-party model identification.

The current end of every live range is checked against Chevrolet's [U.S. vehicle lineup](https://www.chevrolet.com/vehicles), [commercial lineup](https://www.chevrolet.com/commercial), and model pages. The lineup confirms the current retail and commercial families, including Tahoe, Suburban, Silverado, Silverado HD, Colorado, Express, Low Cab Forward, Blazer EV, Equinox EV, Silverado EV, and BrightDrop. Chevrolet's [discontinued-vehicle page](https://www.chevrolet.com/discontinued-vehicles) confirms retired modern nameplates and explicitly states that 2025 was Malibu's final model year.

Representative primary documents used for difficult boundaries include:

- [1962 Chevrolet Truck Vehicle Information Kit](https://news.chevrolet.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1962-Chevrolet-Truck.pdf), for the Tilt Cab family.
- [2005 Chevrolet Uplander Vehicle Information Kit](https://news.chevrolet.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2005-Chevrolet-Uplander.pdf) and the [2008 Uplander owner manual](https://contentdelivery.ext.gm.com/content/dam/cope/en_us/public/pdf_assets/active/owners_manuals_browse/2k08uplander.pdf), supporting the U.S. 2005-2008 range.
- [2008 Malibu Classic owner manual](https://contentdelivery.ext.gm.com/content/dam/cope/en_us/public/pdf_assets/active/owners_manuals_browse/2k08malibu_classic.pdf), establishing that otherwise easy-to-miss fleet carryover identity.
- [2026 Express](https://www.chevrolet.com/commercial/express/vans/specs-models), [2026 Low Cab Forward](https://www.chevrolet.com/commercial/low-cab-forward-cab-over-truck), and [2026 Silverado medium-duty chassis cabs](https://www.chevrolet.com/commercial/silverado/4500hd-5500hd-6500hd-chassis-cab), confirming current commercial coverage.
- Chevrolet's [2024 Blazer EV announcement](https://news.chevrolet.com/newsroom.detail.html/Pages/news/us/en/2022/jul/0718-blazerev.html), [2024 Equinox EV announcement](https://news.chevrolet.com/newsroom.detail.html/Pages/news/us/en/2022/sep/0908-equinoxev-reveal.html), and [current EV page](https://www.chevrolet.com/electric/ev-range-battery).
- Chevrolet's [BrightDrop integration announcement](https://news.chevrolet.com/newsroom.detail.html/Pages/news/us/en/2024/aug/0829-brightdrop.html) and [Chevrolet BrightDrop product page](https://www.chevrolet.com/commercial/brightdrop).

### Tier 2: government or manufacturer-filed records

NHTSA and manufacturer-filed VIN documents fill commercial and fleet nomenclature gaps that retail brochures often omit. The [GM 2002 VIN standards filing](https://static.nhtsa.gov/nhtsa/downloads/MfrMail/01-022-N11B-8753.pdf), for example, identifies Forward/Tiltmaster, W-Series, and T-Series commercial truck lines.

### Tier 3: secondary histories

Secondary sources are used only where the GM index establishes the surrounding years but does not cleanly expose a stable nameplate boundary. Those ranges carry `medium` or `low` confidence in JSON. The principal secondary cross-check is the [list of Chevrolet vehicles](https://en.wikipedia.org/wiki/List_of_Chevrolet_vehicles), with individual model histories used for discontinuous wagon, fleet, and commercial runs. Truck history was also cross-checked against [Chevrolet's own legacy overview](https://www.chevrolet.com/legacy/trucks) and a [Chevrolet truck history](https://www.motortrend.com/features/chevy-truck-history).

Secondary evidence never authorizes a color value by itself. It seeds the crawl queue and tells the archive which model-year brochure must be found.

## Model-year rules and known edge cases

### Founding years

GM photographs and centennial material place Chevrolet activity and the first completed car in 1911-1912, but GM Heritage's retail vehicle-kit run begins with 1913 Chevrolet. The catalog therefore begins Classic Six at model year 1913 and records the 1912 calendar-year launch in notes. It does not invent a separate 1911 or 1912 model-year color row.

Four-Ninety was introduced during 1915, before modern model-year conventions were fully standardized. Its 1915-1922 range is retained with the introduction caveat.

### War interruption

No Chevrolet civilian model-year ranges are created for 1943, 1944, or 1945. Prewar Fleetline and related runs end in 1942; postwar runs restart in 1946. Military production is outside the consumer color archive.

### Corvette 1983

Corvette is explicitly 1953-1982 and 1984-2026. Chevrolet did not sell a retail 1983 Corvette. The surviving pilot car is not a basis for a 1983 production-color matrix.

### Badge changes and fleet carryovers

Chevy II and Nova overlap because Nova began as a Chevy II series before becoming the sole name. Bel Air begins in 1950 as a hardtop designation and becomes a full series in 1953. Caprice begins as an upper 1965 full-size subseries and becomes a standalone series for 1966. These are searchable from their first consumer-facing use, while notes preserve the hierarchy.

The catalog separates short carryover identities where the VIN, brochure, owner-manual, or color lookup may differ: Chevrolet Classic, 2008 Malibu Classic, Malibu Limited, Cruze Limited, Impala Limited, and Traverse Limited.

### Reused names

Blazer, TrailBlazer, Nova, Malibu, Camaro, Monte Carlo, Impala, Nomad, Brookwood, Townsman, Kingswood, Greenbrier, Colorado, and Trax have discontinuities or materially different later uses. JSON records separate `{start, end}` objects. A consumer timeline must render those gaps, not stretch a bar across years when the model did not exist.

### Current and announced models

This audit is bounded through model year 2026. Chevrolet's live navigation now markets a redesigned Bolt, but Chevrolet has identified that return as model year 2027. The catalog therefore leaves Bolt EV at 2017-2023 and Bolt EUV at 2022-2023 for the through-2026 dataset. The new Bolt must be added as a new 2027 range in the next model-year rollover, not backfilled into 2024-2026.

BrightDrop 400 and 600 are included only from model year 2025, when they became Chevrolet-badged products. Earlier BrightDrop-brand Zevo years remain excluded. Chevrolet still offers the Chevrolet-badged 2025 vehicles as of this audit, so `current` is true even though the latest displayed product model year is 2025.

## Remaining uncertainty queue

The following areas need brochure-by-brochure confirmation before their year matrices can be called complete:

1. Early series boundaries from 1913 through 1922, especially Classic Six launch terminology, Amesbury Special, and the Series F/FA transition.
2. The 1933-1942 overlap among Eagle, Mercury, Standard, Master, Master Deluxe, Master 85, and Special Deluxe. Annual series codes and brochure headings control.
3. Wagon hierarchy from 1953 through 1972. Handyman, Beauville, Nomad, Yeoman, Brookwood, Parkwood, Kingswood, Townsman, Greenbrier, Concours, and Concours Estate sometimes functioned as model, series, or body-style labels depending on year.
4. Pre-C/K truck numbered series beyond the consumer-searchable 3100, 3600, and 3800 rows. The umbrella Chevrolet Truck entry must retain exact series codes extracted from each annual truck kit.
5. Chevy 90's first-year nomenclature. Its 1966-1977 range is intentionally `low` confidence until every annual heavy-truck brochure is reconciled.
6. Commercial chassis end years and badge wording for L-Series Tilt Cab, B-Series, P-Series, Tiltmaster/W-Series, T-Series, and Kodiak. VIN standards and annual GM kits must both agree before color publication.
7. Fleet-only first and last sale dates for Beretta/Corsica prelaunch units, Caprice PPV, Captiva Sport, and the Limited carryovers.

These uncertainties are not silent gaps. They are encoded through range confidence, evidence URLs, and notes so the crawler can prioritize primary-source replacement.

## Crawl and publication implications

The catalog should drive a full model-year work queue:

1. Expand each explicit range into model-year tasks.
2. Keep discontinuous ranges separate.
3. Fetch the annual GM Heritage kit, U.S. brochure, order guide, paint bulletin, and fleet guide where applicable.
4. Record every color claim at model + model year + body/series applicability, with a page-level citation.
5. Treat a missing brochure as `unknown`, never as no colors or as permission to copy an adjacent year.
6. Publish a year matrix only after duplicate paint names/codes, restrictions, two-tone combinations, carryover colors, and midyear additions have been reconciled.
7. Crawl photographs only after the model-year-color claim exists. Photos illustrate a verified color; they do not establish availability.

The inventory is deliberately broader than the current archive UI data. That is necessary to keep Tahoe, Suburban, current EVs, commercial vehicles, and every non-classic model year in the same governed archive rather than creating another classic-only island.
