---
title: Chevrolet Suburban qualified Fleet Guide palette audit, 2008-2014
visibility: public
classification: archive-internal
period: 2008-2014
sources:
  - 2008 GM Car & Truck Guide
  - 2009 GM Car & Truck Guide
  - 2010 GM Car & Truck Guide
  - 2011 GM Car & Truck Guide
  - 2012 GM Car & Truck Guide
  - 2013 GM Car & Truck Guide
  - 2014 GM Car & Truck Guide
---

# Chevrolet Suburban qualified Fleet Guide palette audit, 2008-2014

## Governing result

The retained complete GM Fleet and Commercial guides contain one combined
Tahoe/Suburban model page with an exterior-color panel for each model year from
2008 through 2014. Every one of those model pages, each cover, and each linked
detailed-notes page was rendered and inspected visually. Text extraction was
used only to locate pages and cross-check spelling.

The result is 63 guide-listed Suburban color rows:

| Model year | Guide palette rows | Premium-paint rows | Classification |
|---:|---:|---:|---|
| 2008 | 8 | 0 | Qualified guide palette union |
| 2009 | 9 | 1 | Qualified guide palette union |
| 2010 | 10 | 3 | Qualified guide palette union |
| 2011 | 10 | 2 | Qualified guide palette union |
| 2012 | 8 | 2 | Qualified guide palette union |
| 2013 | 10 | 5 | Qualified guide palette union |
| 2014 | 8 | 3 | Qualified guide palette union |
| **Total** | **63** | **16** | |

None of the seven pages is a complete governing option-code chart. Each is a
Fleet Guide overview panel titled Tahoe/Suburban, with a shared "Available
Exterior Colors" list and a separate model-availability table. The pages do not
map every color to trim, equipment group, body style, retail/fleet ordering
status, or Special Equipment Option availability. The rows must therefore remain
qualified guide palette unions. They establish that the guide associated the
listed color union with its combined Tahoe/Suburban coverage, but not that every
listed color could be ordered on every Suburban configuration.

No row is borrowed from Tahoe, a Tahoe Hybrid page, or an adjacent model year.
The guides repeatedly direct the reader to a separate Tahoe Hybrid section.
Those hybrid palettes are excluded. The 2014 guide does not list the prior
Suburban 3/4-ton applications, so none is inferred.

## Audit method and transcription rules

- The immutable source records are in
  [modern-chevrolet-color-source-candidates.json](file:///C:/Users/amita/Amybot/projects/chevrolet-color-archive/data/sources/modern-chevrolet-color-source-candidates.json).
- All seven complete PDFs were read from their recorded local paths and pinned
  in the [`brochure-source-archive-v1` Release](https://github.com/ipadmom/chevrolet-color-archive/releases/tag/brochure-source-archive-v1).
- A full-document search located every page whose text layer mentions
  Suburban. Table-of-contents, fuel-economy, assembly-plant, segmentation, and
  model-designation hits were reviewed as navigation evidence. The actual
  combined model/color page for each year was rendered at 300 dpi and visually
  inspected.
- Cover pages and the detailed-notes pages referenced by the color headings
  were separately rendered at 220 dpi and visually inspected.
- Codes, suffixes, names, parenthetical "new" labels, the Spring 2013 timing
  note, and the 2014 LTZ-only restriction are transcribed from the visual pages.
  Typographic long dashes are normalized to ASCII hyphens, but the printed words
  and capitalization are retained.
- The visual pages control over extraction artifacts. In particular, the 2010
  Summit White code is printed as `50U`, not the extracted `50UU`.
- The color swatches themselves are illustrations. No RGB, finish, or
  availability claim is inferred from their appearance.
- The color-heading footnote means "Actual colors may vary" in every guide:
  footnote 15 for 2008-2011 and footnote 10 for 2012-2014.
- A superscript 10 on a 2008-2011 color, or a superscript 7 on a 2012-2014
  color, means "Premium paint - available at extra cost." Only colors that
  visibly carry the marker are labeled premium below.

## Source authority and retrieval-host distinction

All seven files are GM-authored United States Fleet and Commercial guides.
Their content authority is General Motors. Their retained download host is
`xr793.com`, an archival mirror. The immutable records therefore classify them
as `official_manufacturer_document_archival_mirror`, not as live files served
from a GM host.

For every source:

- `publisher`: General Motors
- `market`: United States
- `direct_official_url`: null
- official current landing page:
  https://www.gmfleet.com/resources/guides-and-manuals
- retained retrieval host: https://xr793.com/
- immutable-record retrieval time: `2026-07-21T06:50:39Z`
- limitation: the original direct GM download URL was not recovered
- limitation: a Fleet Guide color panel is not a complete ordering-chart
  completeness assertion

The GM landing page documents the current guide program but is not the byte
source for these seven retained historical PDFs. The mirror URLs below are the
actual retrieval URLs whose local bytes were hashed.

## Artifact identities, dates, and links

All SHA-256 values, byte lengths, and page counts were independently recomputed
from the retained files and match the immutable records exactly.

| MY | Source ID | Cover wording | Recorded document date | SHA-256 | Bytes | PDF pages |
|---:|---|---|---|---|---:|---:|
| 2008 | `gm-fleet-guide-us-2008-v2` | "2008 Car & Truck Guide"; "Updated September 2007" | 2007-09-28 | `d9bcb174998f30051e0da47f5cd4fe02eae1afa97af1d04b71f9c06689050ac7` | 9,543,843 | 121 |
| 2009 | `gm-fleet-guide-us-2009-v2` | "2009 Car & Truck Guide"; "Revised November 2008" | 2008-11-04 | `402f99dddb300b7862315a90ec94b8e69416e71aa043141af0e7c23c8e39ae79` | 11,533,063 | 139 |
| 2010 | `gm-fleet-guide-us-2010` | "2010 Car & Truck Guide"; no printed revision | 2009-06-22 | `a147136a27501ec69102030c0cbf3ef1ec90c59aa1caccd0e7c95510c86a3767` | 10,735,575 | 116 |
| 2011 | `gm-fleet-guide-us-2011` | "2011 Car & Truck Guide"; no printed revision | 2010-05-17 | `543beec48e1c5428e583f260e7e64bc20f50836825ee32295c0eedcd7f017f5c` | 9,708,021 | 102 |
| 2012 | `gm-fleet-guide-us-2012` | "2012 Car & Truck Guide"; no printed revision | 2011-06-17 | `7dc20723b7a6147ac8b26cb900241ac90585d8ed65504ecff3a6572077533f3b` | 8,940,620 | 114 |
| 2013 | `gm-fleet-guide-us-2013` | "2013 Car & Truck Guide"; no printed revision | 2012-05-14 | `a980b93a1458969b0368d4a512bf9c17dfbbdca0fa0883d1071a4bd6256b50f4` | 25,115,496 | 111 |
| 2014 | `gm-fleet-guide-us-2014` | "2014 Car & Truck Guide"; no printed revision | 2013-09-09 | `aafeff44fa9f5c71493ec45db02b74a56e5f160bd6e89d936806e4e53d04676d` | 24,251,962 | 134 |

The immutable `revision_or_document_date` values correspond to each PDF's
metadata modification date. The first two covers also print their update or
revision month. The 2010 PDF has an inherited 2008 creation timestamp, but its
recorded 2009-06-22 modification date is the defensible document date and no
earlier printed revision is asserted.

Exact retrieval URLs and retained local files:

- 2008:
  https://xr793.com/wp-content/uploads/2020/03/2008-GM-Fleet-Guide-V2.pdf
  and
  [retained Release PDF](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2008-gm-fleet-guide-v2-mirror.pdf)
- 2009:
  https://xr793.com/wp-content/uploads/2020/03/2009-GM-Fleet-Guide-V2.pdf
  and
  [retained Release PDF](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2009-gm-fleet-guide-v2-mirror.pdf)
- 2010:
  https://xr793.com/wp-content/uploads/2020/03/2010-GM-Fleet-Guide.pdf
  and
  [retained Release PDF](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2010-gm-fleet-guide-mirror.pdf)
- 2011:
  https://xr793.com/wp-content/uploads/2020/03/2011-GM-Fleet-Guide.pdf
  and
  [retained Release PDF](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2011-gm-fleet-guide-mirror.pdf)
- 2012:
  https://xr793.com/wp-content/uploads/2020/03/2012-GM-Car-Truck-Guide.pdf
  and
  [retained Release PDF](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2012-gm-car-truck-guide-mirror.pdf)
- 2013:
  https://xr793.com/wp-content/uploads/2020/03/2013-GM-Car-Truck-Guide.pdf
  and
  [retained Release PDF](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2013-gm-car-truck-guide-mirror.pdf)
- 2014:
  https://xr793.com/wp-content/uploads/2020/03/2014-GM-Fleet-Car-Truck-Guide.pdf
  and
  [retained Release PDF](https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2014-gm-fleet-car-truck-guide-mirror.pdf)

## Visual page ledger

| MY | Visually inspected combined Tahoe/Suburban page | Model-page scope | Visually inspected detailed notes |
|---:|---|---|---|
| 2008 | PDF p. 69, printed p. 68 | Available Exterior Colors; Model Availability | PDF p. 120, printed p. 119 |
| 2009 | PDF p. 73, printed p. 72 | Available Exterior Colors; Model Availability | PDF p. 138 |
| 2010 | PDF p. 64, printed p. 64 | Available Exterior Colors; Model Availability | PDF p. 116, printed p. 116 |
| 2011 | PDF p. 53, printed p. 52 | Available Exterior Colors; Model Availability | PDF p. 102, printed p. 101 |
| 2012 | PDF p. 52, printed p. 52 | Available Exterior Colors; Model Availability | PDF p. 113, printed p. 113 |
| 2013 | PDF p. 53, printed p. 53 | Available Exterior Colors; Model Availability | PDF p. 111, printed p. 111 |
| 2014 | PDF p. 81, printed p. 81 | Available Exterior Colors; Model Availability | PDF p. 132, printed p. 132 |

## 2008

### Page and application scope

PDF p. 69, printed p. 68, is titled Tahoe/Suburban. Its Model Availability
table prints four Suburban applications:

| Printed application | Model code |
|---|---|
| Suburban 2WD 1/2-ton | `CC10906` |
| Suburban 4WD 1/2-ton | `CK10906` |
| Suburban 2WD 3/4-ton | `CC20906` |
| Suburban 4WD 3/4-ton | `CK20906` |

The eight-color panel is shared across the combined Tahoe/Suburban page. It
does not print per-color trim or body-style restrictions. The adjacent PDF
p. 68 is a separate hybrid page and is excluded.

### Exact qualified guide palette union

| Printed code | Printed color | Printed annotation or restriction |
|---|---|---|
| `16U` | Graystone Metallic | |
| `25U` | Dark Blue Metallic | |
| `41U` | Black | |
| `46U` | Blue Granite Metallic | `(new)` |
| `50U` | Summit White | |
| `51U` | Gold Mist Metallic | |
| `59U` | Silver Birch Metallic | |
| `66U` | Deep Ruby Metallic | `(new)` |

No color on this panel carries premium-paint footnote 10. Heading footnote 15
says actual colors may vary.

## 2009

### Page and application scope

PDF p. 73, printed p. 72, is titled Tahoe/Suburban. Its Model Availability
table prints:

| Printed application | Model code |
|---|---|
| Suburban 2WD 1/2-ton | `CC10906` |
| Suburban 4WD 1/2-ton | `CK10906` |
| Suburban 2WD 3/4-ton | `CC20906` |
| Suburban 4WD 3/4-ton | `CK20906` |

The page expressly sends the Tahoe Hybrid to a separate Hybrid section. No
hybrid color is imported into the Suburban union.

### Exact qualified guide palette union

| Printed code | Printed color | Printed annotation or restriction |
|---|---|---|
| `16U` | Graystone Metallic | |
| `25U` | Dark Blue Metallic | |
| `41U` | Black | |
| `46U` | Blue Granite Metallic | |
| `50U` | Summit White | |
| `51U` | Gold Mist Metallic | |
| `59U` | Silver Birch Metallic | |
| `66U` | Deep Ruby Metallic | |
| `80U` | Red Jewel Tintcoat | Footnote 10: premium paint, available at extra cost; `(new)` |

Heading footnote 15 says actual colors may vary.

## 2010

### Page and application scope

PDF p. 64, printed p. 64, is titled Tahoe/Suburban. Its Model Availability
table prints:

| Printed application | Model code |
|---|---|
| Suburban 2WD 1/2-ton | `CC10906` |
| Suburban 4WD 1/2-ton | `CK10906` |
| Suburban 2WD 3/4-ton | `CC20906` |
| Suburban 4WD 3/4-ton | `CK20906` |

The Tahoe Hybrid referral is excluded.

### Exact qualified guide palette union

| Printed code | Printed color | Printed annotation or restriction |
|---|---|---|
| `21U` | Laser Blue Metallic | `(new)` |
| `41U` | Black | |
| `46U` | Blue Granite Metallic | |
| `50U` | Summit White | |
| `51U` | Gold Mist Metallic | |
| `58U` | Black Granite Metallic | Footnote 10: premium paint, available at extra cost; `(new)` |
| `80U` | Red Jewel Tintcoat | Footnote 10: premium paint, available at extra cost |
| `98U` | White Diamond Tricoat | Footnote 10: premium paint, available at extra cost; `(new)` |
| `GGW` | Taupe Gray Metallic | `(new)` |
| `GGZ` | Sheer Silver Metallic | `(new)` |

Heading footnote 15 says actual colors may vary.

## 2011

### Page and application scope

PDF p. 53, printed p. 52, is titled Tahoe/Suburban. Its Model Availability
table prints:

| Printed application | Model code |
|---|---|
| Suburban 2WD 1/2-ton | `CC10906` |
| Suburban 4WD 1/2-ton | `CK10906` |
| Suburban 2WD 3/4-ton | `CC20906` |
| Suburban 4WD 3/4-ton | `CK20906` |

The overview says a 1FL model is available for fleet orders, but the color
panel does not map colors to 1FL. The Tahoe Hybrid referral is excluded.

### Exact qualified guide palette union

| Printed code | Printed color | Printed annotation or restriction |
|---|---|---|
| `41U` | Black | |
| `50U` | Summit White | |
| `51U` | Gold Mist Metallic | |
| `80U` | Red Jewel Tintcoat | Footnote 10: premium paint, available at extra cost |
| `98U` | White Diamond Tricoat | Footnote 10: premium paint, available at extra cost |
| `GGU` | Steel Green Metallic | `(new)` |
| `GGW` | Taupe Gray Metallic | |
| `GGZ` | Sheer Silver Metallic | |
| `GHA` | Mocha Steel Metallic | `(new)` |
| `GLF` | Ice Blue Metallic | `(new)` |

Heading footnote 15 says actual colors may vary. The printed Fleet Guide panel
does not establish whether Special Equipment Option colors were separately
orderable, so none is inferred or declared absent.

## 2012

### Page and application scope

PDF p. 52, printed p. 52, is titled Tahoe/Suburban. Its Model Availability
table prints:

| Printed application | Model code |
|---|---|
| Suburban 2WD 1/2-ton | `CC10906` |
| Suburban 4WD 1/2-ton | `CK10906` |
| Suburban 2WD 3/4-ton | `CC20906` |
| Suburban 4WD 3/4-ton | `CK20906` |

The Tahoe Hybrid referral is excluded.

### Exact qualified guide palette union

| Printed code | Printed color | Printed annotation or restriction |
|---|---|---|
| `41U` | Black | |
| `50U` | Summit White | |
| `51U` | Gold Mist Metallic | |
| `58U` | Black Granite Metallic | |
| `89U` | Crystal Red Tintcoat | Footnote 7: premium paint, available at extra cost; `(new)` |
| `98U` | White Diamond Tricoat | Footnote 7: premium paint, available at extra cost |
| `GAN` | Silver Ice Metallic | `(new)` |
| `GHA` | Mocha Steel Metallic | |

Heading footnote 10 says actual colors may vary. The absence of a premium
marker on 58U is preserved even though another model year may mark that label
premium.

## 2013

### Page and application scope

PDF p. 53, printed p. 53, is titled Tahoe/Suburban. Its Model Availability
table prints:

| Printed application | Model code |
|---|---|
| Suburban 2WD 1/2-ton | `CC10906` |
| Suburban 4WD 1/2-ton | `CK10906` |
| Suburban 2WD 3/4-ton | `CC20906` |
| Suburban 4WD 3/4-ton | `CK20906` |

The page says optional features are available on certain models only and
directs the reader to the Ordering Guide. It does not provide a complete
color-by-trim application chart. The Tahoe Hybrid referral is excluded.

### Exact qualified guide palette union

| Printed code | Printed color | Printed annotation or restriction |
|---|---|---|
| `41U` | Black | |
| `50U` | Summit White | |
| `58U` | Black Granite Metallic | Footnote 7: premium paint, available at extra cost |
| `89U` | Crystal Red Tintcoat | Footnote 7: premium paint, available at extra cost |
| `98U` | White Diamond Tricoat | Footnote 7: premium paint, available at extra cost |
| `GAN` | Silver Ice Metallic | |
| `GHA` | Mocha Steel Metallic | |
| `GWT` | Champagne Silver Metallic | `(new)` |
| `GWU` | Concord Metallic | Footnote 7: premium paint, available at extra cost; `(new - avail. Spring 2013)` |
| `GXH` | Blue Ray Metallic | Footnote 7: premium paint, available at extra cost; `(new)` |

Heading footnote 10 says actual colors may vary. The Spring 2013 timing limit
is a printed availability restriction and is not generalized to any other
model year.

## 2014

### Page and application scope

PDF p. 81, printed p. 81, is titled Tahoe/Suburban. Its Model Availability
table prints only:

| Printed application | Model code |
|---|---|
| Suburban 2WD | `CC10906` |
| Suburban 4WD | `CK10906` |

No 3/4-ton Suburban application is printed. None is carried forward from 2013.
The page says optional features are available on certain models only and
directs the reader to the Ordering Guide.

### Exact qualified guide palette union

| Printed code | Printed color | Printed annotation or restriction |
|---|---|---|
| `41U` | Black | |
| `50U` | Summit White | |
| `89U` | Crystal Red Tintcoat | Footnote 7: premium paint, available at extra cost |
| `98U` | White Diamond Tricoat | Footnote 7: premium paint, available at extra cost; `(LTZ Only)` |
| `GAN` | Silver Ice Metallic | |
| `GHA` | Mocha Steel Metallic | |
| `GWT` | Champagne Silver Metallic | |
| `GWU` | Concord Metallic | Footnote 7: premium paint, available at extra cost |

Heading footnote 10 says actual colors may vary. White Diamond Tricoat is the
only color on this panel with an explicit trim restriction. No other
color-by-trim claim is inferred.

## Cross-year no-inference boundaries

1. Each model year is transcribed only from its own combined Tahoe/Suburban
   page.
2. A color that appears in an adjacent model year is not carried into a year
   where it is absent.
3. Premium status is applied only when that year's visible color label carries
   the applicable footnote marker.
4. "New" and timing annotations are retained only in the year where printed.
5. Tahoe Hybrid colors are excluded because the model pages route that vehicle
   to a separate section and do not state a Suburban Hybrid palette.
6. The combined guide page supports a qualified palette union, not a claim
   that every color was orderable on every Suburban trim or body application.
7. The guides do not establish the completeness or absence of Special
   Equipment Option colors. Those require separate governing order-guide
   evidence.
8. The printed model-availability table controls body/application scope. The
   2014 omission of 3/4-ton Suburban is preserved.

## Final reconciliation

- Seven retained complete PDFs inspected.
- Blank years: none. Every requested model year from 2008 through 2014 has a
  visually verified Tahoe/Suburban guide panel.
- Seven cover pages inspected.
- Seven Tahoe/Suburban exterior-color and model-application pages inspected.
- Seven referenced detailed-notes pages inspected.
- 63 exact code/name rows transcribed.
- 16 exact premium-paint rows identified from visible markers.
- One exact temporal restriction retained: 2013 GWU Concord Metallic,
  available Spring 2013.
- One exact trim restriction retained: 2014 98U White Diamond Tricoat, LTZ
  Only.
- Seven SHA-256 values match the immutable source records.
- Seven byte lengths match.
- Seven page counts match.
- No governing option-code chart found.
- No Tahoe, Tahoe Hybrid, adjacent-year, or missing-body-style inference made.
