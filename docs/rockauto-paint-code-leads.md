---
title: RockAuto paint-code lead audit
visibility: public
classification: archive-internal
period: 1969-2024
sources:
  - https://www.rockauto.com/
  - https://www.rockauto.com/robots.txt
  - https://www.rockauto.com/en/catalog/chevrolet,1969,camaro
  - https://www.rockauto.com/en/catalog/chevrolet,2011,camaro
  - https://www.rockauto.com/en/catalog/chevrolet,2022,camaro
  - https://www.rockauto.com/en/catalog/chevrolet,2000,tahoe
  - https://www.rockauto.com/en/catalog/chevrolet,2001,tahoe
  - https://www.rockauto.com/en/catalog/chevrolet,2002,tahoe
  - https://www.rockauto.com/en/catalog/chevrolet,2003,tahoe
  - https://www.rockauto.com/en/catalog/chevrolet,2004,tahoe
  - https://www.rockauto.com/en/catalog/chevrolet,2005,tahoe
  - https://www.rockauto.com/en/catalog/chevrolet,2006,tahoe
  - https://www.rockauto.com/en/catalog/chevrolet,2007,tahoe
  - https://www.rockauto.com/en/partsearch/?mfr=ACDELCO&parttype=1001876
  - https://www.rockauto.com/en/moreinfo.php?pk=10004972&cc=0&pt=1001876
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1977-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1995-Chevrolet-Tahoe.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2000-Chevrolet-Tahoe.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2001-Chevrolet-Tahoe.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2007-Chevrolet-Tahoe.pdf
  - https://www.chevrolet.com/content/dam/chevrolet/na/us/english/index/shopping-tools/download-catalog/08-pdf/2022-chevrolet-tahoe-ebrochure.pdf
  - https://xr793.com/wp-content/uploads/2020/03/2011-GM-Fleet-Guide.pdf
---

# RockAuto paint-code lead audit

## Decision

[RockAuto](https://www.rockauto.com/) is useful as a discovery source for paint
codes attached to currently cataloged touch-up products. It is not evidence of
a complete Chevrolet factory palette. The archive therefore records RockAuto
with `officiality: secondary`, `source_type: retailer_catalog_fitment`, and
claim type `retailer_touchup_fitment_lead`.

The structured audit is
[`data/sources/rockauto-paint-code-leads.json`](../data/sources/rockauto-paint-code-leads.json).
It is deliberately not imported by `app/archive-data.ts`. The UI exposes only
the 96 coded fitment candidates as disabled, clearly labeled research leads in the
all-fields regex results. They do not enter the structured year/model/color
picker, model-year routes, color matrices, or factory-availability records.
The vehicle-neutral ACDelco product assertion is not exposed in search at all.
Focused tests enforce each boundary.

## Catalog structure

The audited navigation path was Chevrolet, model year, RockAuto model label,
engine, Body & Lamp Assembly, then Touch-Up Paint. The touch-up paint part type
is `pt=1001876`. RockAuto identifies a vehicle and engine configuration with
`cc` and a product with `pk`.

Catalog pages were public, server-rendered HTML during the audit. No login or
blocking challenge was encountered. The response declared ISO-8859-1, its meta
tag declared Windows-1252, and catalog listings disabled caching.
The category ampersand must be URL-encoded as `%26`. A fresh HTTP GET should be
used for each configuration because the interactive catalog can retain hidden
DOM branches from a previously selected vehicle.

The model page exposes engine-specific `cc` values in stable hrefs and
HTML-escaped nav-node JSON. A listing exposes `carcode`, `parttype`, and
`partkey` in `listing_data_essential`, and the manufacturer and part number in
`listing_data_supplemental`. Color names and codes remain source prose, not
JSON-LD. Preserve that prose before parsing. The ordinary page shell contains
dormant CAPTCHA markup for account creation, so a crawler must not treat the
word `captcha` alone as a challenge signal.

## Exact audited configurations

| Canonical model year | RockAuto model and engine | `cc` | Coded products | Uncoded products | Listing |
|---|---|---:|---:|---:|---|
| 1977 Suburban | C10 SUBURBAN, 5.7L 350cid V8 | 1295973 | 1 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,1977,c10+suburban,5.7l+350cid+v8,1295973,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 1995 Tahoe | TAHOE, 5.7L V8 | 1061345 | 4 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,1995,tahoe,5.7l+v8,1061345,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2000 Tahoe | TAHOE, 5.3L V8 | 1361551 | 6 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2000,tahoe,5.3l+v8,1361551,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2001 Tahoe | TAHOE, 5.3L V8 | 1371620 | 7 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2001,tahoe,5.3l+v8,1371620,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2002 Tahoe | TAHOE, 5.3L V8 | 1380372 | 9 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2002,tahoe,5.3l+v8,1380372,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2003 Tahoe | TAHOE, 5.3L V8 | 1412244 | 11 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2003,tahoe,5.3l+v8,1412244,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2004 Tahoe | TAHOE, 5.3L V8 | 1424247 | 7 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2004,tahoe,5.3l+v8,1424247,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2005 Tahoe | TAHOE, 5.3L V8 | 1431156 | 7 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2005,tahoe,5.3l+v8,1431156,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2006 Tahoe | TAHOE, 5.3L V8 | 1434093 | 7 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2006,tahoe,5.3l+v8,1434093,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2007 Tahoe | TAHOE, 5.3L V8 | 1433255 | 5 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2007,tahoe,5.3l+v8,1433255,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2022 Suburban | SUBURBAN, 5.3L V8 | 3450539 | 2 | 0 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2022,suburban,5.3l+v8,3450539,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2022 Tahoe | TAHOE, 5.3L V8 | 3450544 | 2 | 0 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2022,tahoe,5.3l+v8,3450544,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 1969 Camaro | CAMARO, 3.8L 230cid L6 | 1034693 | 2 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,1969,camaro,3.8l+230cid+l6,1034693,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 1969 Camaro | CAMARO, 5.7L 350cid V8 | 1034738 | 2 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,1969,camaro,5.7l+350cid+v8,1034738,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 1969 Camaro | CAMARO, 7.0L 427cid V8 | 1434751 | 2 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,1969,camaro,7.0l+427cid+v8,1434751,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2011 Camaro | CAMARO, 3.6L V6 | 1446663 | 8 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2011,camaro,3.6l+v6,1446663,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2011 Camaro | CAMARO, 6.2L V8 | 1446645 | 8 | 1 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2011,camaro,6.2l+v8,1446645,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2022 Camaro | CAMARO, 3.6L V6 | 3449758 | 2 | 0 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2022,camaro,3.6l+v6,3449758,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2022 Camaro | CAMARO, 6.2L V8 Supercharged | 3449760 | 2 | 0 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2022,camaro,6.2l+v8+supercharged,3449760,body+%26+lamp+assembly,touch-up+paint,1001876) |
| 2024 Camaro | CAMARO, 6.2L V8 | 3454665 | 2 | 0 | [Touch-Up Paint listing](https://www.rockauto.com/en/catalog/chevrolet,2024,camaro,6.2l+v8,3454665,body+%26+lamp+assembly,touch-up+paint,1001876) |

The 1977 RockAuto model list separately exposed `C10 SUBURBAN`,
`C20 SUBURBAN`, `K10 SUBURBAN`, and `K20 SUBURBAN`. Only C10 was opened and
product-audited. The source labels and the C/K variants remain separate in the
ledger even though all four map to the archive's canonical `suburban` model.

The Tahoe model routes exposed this complete engine/configuration inventory:

| Year | Engine-specific `cc` values | Full listing audited |
|---|---|---|
| 2000 | 4.8L V8 `1361540`; 5.3L V8 `1361551`; 5.7L V8 `1361562` | 5.3L V8 |
| 2001 | 4.8L V8 `1371619`; 5.3L V8 `1371620` | 5.3L V8 |
| 2002 | 4.8L V8 `1380361`; 5.3L V8 `1380372` | 5.3L V8 |
| 2003 | 4.8L V8 `1412233`; 5.3L V8 `1412244` | 5.3L V8 |
| 2004 | 4.8L V8 `1424236`; 5.3L V8 `1424247` | 5.3L V8 |
| 2005 | 4.8L V8 `1431159`; 5.3L V8 `1431156` | 5.3L V8 |
| 2006 | 4.8L V8 `1432499`; 5.3L V8 `1434093` | 5.3L V8 |
| 2007 | 4.8L V8 `1433503`; 5.3L V8 `1433255` | 5.3L V8 |

The unsampled configurations remain non-promoted retrieval leads. In
particular, 2000 is a split carryover and redesigned model year. The 5.7L
configuration cannot be collapsed into the sampled 5.3L configuration.

The exact coded product strings on the eight sampled 5.3L listings were:

| Year | Raw retailer paint-code strings |
|---|---|
| 2000 | `WA257C/WA203C/WA334D`, `WA391E`, `WA8624`, `WA8555`, `WA382E`, `WA398E` |
| 2001 | `WA391E`, `WA8624`, `WA8555`, `WA382E`, `WA9260`, `WA9539`, `WA398E` |
| 2002 | `WA722J`, `WA391E`, `WA9792`, `WA8624`, `WA8555`, `WA8554`, `WA382E`, `WA9260`, `WA9539` |
| 2003 | `WA711J`, `WA9417`, `WA722J`, `WA9792`, `WA8624`, `WA8555`, `WA8554`, `WA382E`, `WA9539`, `WA812K`, `WA805K` |
| 2004 | `WA711J`, `WA722J`, `WA8624`, `WA8555`, `WA9539`, `WA926L`, `WA805K` |
| 2005 | `WA711J`, `WA722J`, `WA929L`, `WA8624`, `WA8555`, `WA926L`, `WA805K` |
| 2006 | `WA711J`, `WA722J`, `WA929L`, `WA8624`, `WA8555`, `WA926L`, `WA805K` |
| 2007 | `WA722J`, `WA8624`, `WA8555`, `WA926L`, `WA317N` |

Three additional configurations received only a coded-product parity check:
1995 Tahoe 6.5L diesel (`cc=1051210`), 2022 Tahoe 3.0L diesel (`cc=3450543`),
and 2022 Tahoe 6.2L V8 (`cc=3450545`). They are retained as supplemental checks,
not normalized fitments, because the audit record did not retain their exact
resolved listing URLs and all uncoded rows.

The three checked 1969 Camaro engines returned the same three-product set. Both
exposed 2011 engines returned the same nine-product set. The checked 2022 V6
and supercharged V8 returned the same two-product set. These are bounded parity
observations, not permission to collapse `cc` fitments. Five other 1969 engines
and two other 2022 engines were not checked, and no parity finding carries to a
different model-year.

## Exact observed products

| `pk` | Manufacturer part | Retailer label | Retailer code | Candidate treatment | Example detail page |
|---:|---|---|---|---|---|
| 9168308 | DUPLI-COLOR ASF | Universal Colors | none | Excluded | [1995 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=9168308&cc=1061345&pt=1001876) |
| 16277273 | DUPLI-COLOR AGM0434 | Olympic White | WA8624 | Unverified secondary lead | [2022 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277273&cc=3450544&pt=1001876) |
| 16277333 | DUPLI-COLOR AGM0508 | ULTRA Silver | WA8867 | Unverified secondary lead | [1995 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277333&cc=1061345&pt=1001876) |
| 16277357 | DUPLI-COLOR AGM0518 | Emerald Green Metallic | WA177B | Unverified secondary lead | [1995 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277357&cc=1061345&pt=1001876) |
| 16277509 | DUPLI-COLOR AGM0592 | Black | WA8555 | Unverified secondary lead | [1977 C10 Suburban fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277509&cc=1295973&pt=1001876) |
| 16277257 | DUPLI-COLOR AGM0387 | Pure White | WA5111 | Unverified secondary lead | [1969 Camaro fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277257&cc=1034738&pt=1001876) |
| 16277457 | DUPLI-COLOR AGM0576 | Yellow Zinc | WA9414 | Unverified secondary lead | [2011 Camaro fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277457&cc=1446663&pt=1001876) |
| 16277237 | DUPLI-COLOR AGM0153 | Arctic White | WA9567 | Unverified secondary lead | [2011 Camaro fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277237&cc=1446663&pt=1001876) |
| 16277361 | DUPLI-COLOR AGM0519 | Victory Red | WA9260 | Unverified secondary lead | [2011 Camaro fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277361&cc=1446663&pt=1001876) |
| 16277397 | DUPLI-COLOR AGM0550 | Switchblade Silver Metallic | WA636R/WA730S | Unverified secondary lead | [2011 Camaro fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277397&cc=1446663&pt=1001876) |
| 16277401 | DUPLI-COLOR AGM0552 | Imperial Blue Metallic | WA403P | Unverified secondary lead | [2011 Camaro fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277401&cc=1446663&pt=1001876) |
| 16277497 | DUPLI-COLOR AGM0587 | Red Jewel Tintcoat | WA301N | Unverified secondary lead | [2011 Camaro fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277497&cc=1446663&pt=1001876) |
| 16277369 | DUPLI-COLOR AGM0521 | Dark Toreador Metallic | WA257C/WA203C/WA334D | Unverified secondary lead | [2000 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277369&cc=1361551&pt=1001876) |
| 16277373 | DUPLI-COLOR AGM0522 | Storm Gray Metallic | WA391E | Unverified secondary lead | [2000 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277373&cc=1361551&pt=1001876) |
| 16277297 | DUPLI-COLOR AGM0490 | Pewter Metallic | WA382E | Unverified secondary lead | [2000 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277297&cc=1361551&pt=1001876) |
| 16277301 | DUPLI-COLOR AGM0491 | Gold Metallic | WA398E | Unverified secondary lead | [2000 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277301&cc=1361551&pt=1001876) |
| 16277365 | DUPLI-COLOR AGM0520 | Medium Green Pearl Metallic | WA9539 | Unverified secondary lead | [2001 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277365&cc=1371620&pt=1001876) |
| 16277313 | DUPLI-COLOR AGM0500 | Dark Ming Blue | WA722J | Unverified secondary lead | [2002 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277313&cc=1380372&pt=1001876) |
| 16277325 | DUPLI-COLOR AGM0506 | Indigo Blue Metallic | WA9792 | Unverified secondary lead | [2002 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277325&cc=1380372&pt=1001876) |
| 16277241 | DUPLI-COLOR AGM0338 | White | WA8554 | Unverified secondary lead | [2002 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277241&cc=1380372&pt=1001876) |
| 16277449 | DUPLI-COLOR AGM0574 | Sandalwood Metallic | WA711J | Unverified secondary lead | [2003 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277449&cc=1412244&pt=1001876) |
| 16277433 | DUPLI-COLOR AGM0570 | Tangier Orange | WA9417 | Unverified secondary lead | [2003 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277433&cc=1412244&pt=1001876) |
| 16277381 | DUPLI-COLOR AGM0527 | Medium Spiral Gray Metallic | WA812K | Unverified secondary lead | [2003 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277381&cc=1412244&pt=1001876) |
| 16277389 | DUPLI-COLOR AGM0529 | Dark Spiral Gray Metallic | WA805K | Unverified secondary lead | [2003 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277389&cc=1412244&pt=1001876) |
| 16277385 | DUPLI-COLOR AGM0528 | Fine Silver Birch Metallic | WA926L | Unverified secondary lead | [2004 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277385&cc=1424247&pt=1001876) |
| 16277405 | DUPLI-COLOR AGM0555 | Cashmere Metallic | WA929L | Unverified secondary lead | [2005 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277405&cc=1431156&pt=1001876) |
| 16277417 | DUPLI-COLOR AGM0564 | Antique Bronze Metallic | WA317N | Unverified secondary lead | [2007 Tahoe fitment](https://www.rockauto.com/en/moreinfo.php?pk=16277417&cc=1433255&pt=1001876) |
| 10004972 | ACDELCO 19367652 | Summit White/Olympic White | WA8624 | Product-level crosswalk only, no vehicle scope | [Vehicle-neutral detail](https://www.rockauto.com/en/moreinfo.php?pk=10004972&cc=0&pt=1001876) |

The ledger preserves every audited configuration-product pair and its
configuration-specific detail URL. A product is deduplicated by `pk`, but no
`cc` fitment is collapsed. Observed prices are preserved only as time-stamped
retailer observations. They are not part of any historical color claim.

The uncoded ASF row says `Universal Colors` and asks the shopper to choose a
color. Its selectable options include an `OE Code 8555` phrase, but the product
headline has no paint code. It is excluded from `code_candidates` even when it
appears under a vehicle configuration.

## Vehicle-neutral product crosswalk

The [ACDelco Touch-Up Paint part search](https://www.rockauto.com/en/partsearch/?mfr=ACDELCO&parttype=1001876)
returned 50 distinct `pk` detail links. That response has no make, year, model,
or `cc` scope. Both the ACDelco and Dupli-Color searches returned exactly 50
links, so the response may be capped. It is not a complete product inventory.

The linked [ACDelco 19367652 detail](https://www.rockauto.com/en/moreinfo.php?pk=10004972&cc=0&pt=1001876)
prints these exact product assertions:

- listing: `GM Original Equipment; Summit White/Olympic White (WA8624)`;
- `Color`: `Summit White`;
- `GM Exterior Color RPO`: `GAZ`;
- `Original Equipment Manufacturers Color Code`: `GAZ / WA8624`; and
- `OEM / Interchange Numbers`: `WA8624`.

This is useful as a secondary product-level `GAZ` to `WA8624` to name
crosswalk. It has `cc=0`, so it cannot establish a Chevrolet model-year
fitment or factory availability. The structured assertion is vehicle-neutral,
excluded from search, and ineligible for `color_availability`.

## Completeness check against official sources

| Model year | Official palette | RockAuto coded products | Result |
|---|---:|---:|---|
| 1977 Suburban | 15 | 1 | Grossly incomplete. RockAuto's WA8555 Black is not a substitute for Chevrolet's printed code 86 Black, Midnight. |
| 1995 Tahoe | 10 | 4 | Incomplete. Retailer WA codes cannot be equated with the official U-suffixed chart codes without an official crosswalk. |
| 2000 redesigned Tahoe | 9 | 6 | Incomplete within the official Base/LS/LT palette union. The one-color carryover Limited and four-color carrier-qualified Z71 programs remain separate comparisons. |
| 2001 Tahoe | 9 | 7 | Incomplete. Only Victory Red matches an official source-literal name exactly, and the official page prints no codes. |
| 2007 Tahoe | 9 | 5 | Incomplete. Only Black matches an official source-literal name exactly. Similar blue, silver, bronze, and white labels are not crosswalks. |
| 2022 Tahoe | 10 | 2 | Incomplete. RockAuto lists Olympic White WA8624 and Black WA8555, while Chevrolet's per-trim brochure union has ten colors. |
| 2011 Camaro | 8 | 8 | Equal counts conceal different source-literal name sets. RockAuto is neither a complete palette nor a verified crosswalk. |

The controlling comparisons are:

- [1977 Chevrolet Suburban Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1977-Chevrolet-Suburban.pdf), PDF page 6, printed Suburban Page 6. It lists 15 boldface primary exterior colors.
- [1995 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1995-Chevrolet-Tahoe.pdf), PDF pages 18-19. It lists ten standalone colors plus separately modeled two-tone evidence.
- [2000 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2000-Chevrolet-Tahoe.pdf), PDF pages 12-13 and 18. It enumerates redesigned Base/LS and LT colors, the Onyx Black carryover Limited, and the four-color Z71 count. The separately retained [original Chevrolet Z71 brochure scan](https://www.gmt400.com/attachments/2000-z71-tahoe-brochure-colors-jpg.372777/) names Light Pewter Metallic, Indigo Blue Metallic, Emerald Green Metallic, and Victory Red; that carrier-qualified program remains distinct from the direct GM-kit rows.
- [2001 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2001-Chevrolet-Tahoe.pdf), PDF page 12, printed page 10. Its complete nine-color list shares only Victory Red exactly with the sampled retailer labels.
- [2007 Chevrolet Tahoe Vehicle Information Kit](https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/2007-Chevrolet-Tahoe.pdf), PDF page 11, printed page 3. Its complete nine-color sentence shares only Black exactly with the sampled retailer labels.
- [2022 Chevrolet Tahoe eBrochure](https://www.chevrolet.com/content/dam/chevrolet/na/us/english/index/shopping-tools/download-catalog/08-pdf/2022-chevrolet-tahoe-ebrochure.pdf), PDF pages 8, 10, 12, 14, 16, and 18. The per-trim union contains ten colors.
- [2011 GM Fleet Guide](https://xr793.com/wp-content/uploads/2020/03/2011-GM-Fleet-Guide.pdf), PDF page 46, printed page 45. Its Camaro panel lists Summit White, Black, Cyber Gray Metallic, Victory Red, Rally Yellow, Inferno Orange Metallic, Imperial Blue Metallic, and Silver Ice Metallic. RockAuto's eight coded product labels include five different source-literal names, including Arctic White and Red Jewel Tintcoat. Matching cardinality is not matching evidence.

These comparisons establish the governing rule: a RockAuto fitment can create
a research lead, but only a model-year-specific Chevrolet or General Motors
source can publish factory availability or confirm a color-code crosswalk.

## Normalized secondary tables

RockAuto data should remain separate from the authoritative color tables. Four
tables preserve the retailer evidence without contaminating the archive:

1. `secondary_catalog_configurations`: one `cc` configuration, preserving the
   RockAuto model label, engine label, canonical model mapping, and source
   variant.
2. `secondary_paint_products`: one `pk` product with raw retailer label, raw
   paint code, normalized code, and an explicit-code flag.
3. `secondary_paint_fitments`: one product listed for one `cc` at one observed
   time, including listing and detail URLs.
4. `color_code_crosswalk_candidates`: one unverified `cc` fitment and retailer
   code lead. `governing_official_source_id` stays null until official
   corroboration.

The structured ledger now contains 20 configurations, 28 products, 111
fitments, and 96 unverified fitment crosswalk candidates. The Tahoe 2000-2007
sample contributes eight configurations, 67 fitments, 59 coded candidates,
eight excluded Universal Colors fitments, and 19 distinct products. Fifteen of
those products are new to the ledger. The vehicle-neutral ACDelco product has
no fitment and no candidate. The four-table
builder consumes those arrays one-for-one; the schema 8 Parquets contain the
same counts. Configuration rows join to the secondary RockAuto source
record, and candidates join only through secondary fitment/product tables.
None joins into `color_availability` or `evidence_claims` as supporting
evidence.

## Retrieval and reuse boundary

[RockAuto's robots file](https://www.rockauto.com/robots.txt) did not disallow
`/en/catalog/` or `/en/moreinfo.php` for the generic crawler group on the audit
date. It did disallow `/info/`, where product assets may be served. Robots
directives are not a data-reuse license. No public catalog API or substantive
catalog-data reuse permission was identified during this audit.

Any follow-up should therefore be low-volume and human-triggered, or proceed
with permission. Stop on HTTP 403, HTTP 429, or a confirmed blocking challenge.
The dormant account CAPTCHA markup is not itself a stop signal. Do not fetch
RockAuto product images, do not crawl `/info/`, and do not mirror product
descriptions. The audit fetched no product images.

## Hard safeguards

- Keep `officiality=secondary` and claim type
  `retailer_touchup_fitment_lead`.
- Reject uncoded `Universal Colors` and `Choose Color` rows from code
  candidates.
- Preserve raw WA codes. Do not synthesize missing factory codes.
- Preserve multi-code strings such as `WA636R/WA730S` and
  `WA257C/WA203C/WA334D` before tokenization. Do not select one token or infer
  that any token is the Chevrolet model-year code.
- Deduplicate a product by `pk`, but preserve every `cc` fitment.
- Treat sampled engine parity as a bounded audit result, never as permission to
  infer untested `cc` fitments.
- Preserve C/K source variants even when the canonical archive model is
  Suburban.
- Never infer historical availability from current price, stock, presence, or
  disappearance.
- Require an official model-year source and locator before publication.
- Keep `cc=0` part-search and detail assertions vehicle-neutral. A product RPO
  to WA crosswalk is not model-year availability.
- Never import this ledger into `color_availability`, `evidence_claims`, the
  structured year/model/color search, public model-year routes, or matrices.
- All-fields regex results must remain disabled `secondary-lead` records labeled
  as unverified retailer leads and not Chevrolet factory availability.
