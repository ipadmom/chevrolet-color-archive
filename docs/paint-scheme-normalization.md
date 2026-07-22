---
title: Chevrolet paint-scheme normalization audit
visibility: public
classification: archive-internal
period: 1977-1999 audited model years
sources:
  - ../data/audits/tahoe-1995-2000.json
  - ../data/audits/suburban-paint-schemes-1977-1999.json
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1977-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1978-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1979-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1980-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1981-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1983-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1984-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1985-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1986-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1987-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1988-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1989-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1990-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1991-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1992-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1993-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1994-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1995-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1996-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1997-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1998-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1999-Chevrolet-Suburban.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1995-Chevrolet-Tahoe.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1996-Chevrolet-Tahoe.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1997-Chevrolet-Tahoe.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1998-Chevrolet-Tahoe.pdf
  - https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1999-Chevrolet-Tahoe.pdf
---

# Chevrolet paint-scheme normalization audit

## Result

The normalized builder produces 1,369 exact model-year paint schemes and 2,738
ordered components before publication:

| Model | Model years | Paint schemes | Components |
|---|---|---:|---:|
| Tahoe | 1995-1999 | 184 | 368 |
| Suburban | 1977-1981, 1983-1999 | 1,185 | 2,370 |
| Total | 27 exact model years | 1,369 | 2,738 |

Tahoe records are read directly from the existing structured audit at
`data/audits/tahoe-1995-2000.json`. Suburban records are stored in the new
structured audit at `data/audits/suburban-paint-schemes-1977-1999.json`.
Parquet generation never scrapes prose from the Markdown audit documents.
`scripts/compile-suburban-paint-scheme-audit.py` deterministically reconciles
the 1990-1999 Markdown transcriptions into that structured corpus and emits to
standard output for review.

## Data contract

`paint_schemes.parquet` has one row per exact source combination. It preserves:

- model and exact model year;
- package code and package name;
- body style scope;
- standard stripe, optional D85 stripe, interior, and wheel-flare metadata;
- source placement note and restriction;
- source annotation, including printed restriction and change markers;
- source ID, immutable source revision ID, chart title, exact PDF and printed
  pages, source revision label, archived artifact SHA-256, byte count, and PDF
  page count.

`paint_scheme_components.parquet` has exactly two ordered rows per scheme:

1. `component_role = primary`;
2. `component_role = secondary`.

Each component retains the exact chart label and code. Every component has
`standalone_availability_asserted = false`. Neither component table nor scheme
table has a foreign key to `color_availability.parquet`. A scheme-only
secondary paint therefore cannot become a standalone availability row through
this normalization.

The 1995 Tahoe chart provides a concrete sentinel. Gray, Gunmetal code 91L is
retained in seven four-door ZY2 scheme rows as a secondary component. It has no
1995 Tahoe standalone availability row.

## Suburban reconciliation

| Model year | Source rows | Package evidence | Source locator |
|---|---:|---|---|
| 1977 | 6 | ZY3 and ZY5 | PDF p. 7 |
| 1978 | 6 | Two-tone chart; no package code asserted | PDF p. 31 |
| 1979 | 6 | ZY3 and ZY5 | PDF pp. 33-34 |
| 1980 | 6 | ZY3 and ZY5 | PDF p. 30 |
| 1981 | 8 | ZY3 and ZY5 | PDF p. 27 |
| 1983 | 8 | ZY5 | PDF p. 27, lower section |
| 1984 | 23 | ZY5 | PDF p. 31, lower section |
| 1985 | 23 | ZY5 | PDF p. 31, lower section |
| 1986 | 23 | ZY5 | PDF p. 32, lower section |
| 1987 | 56 | ZY1 / ZY3: 33; ZY5: 23 | PDF p. 39 |
| 1988 | 112 | ZY1 / ZY3: 49; ZY5: 63 | PDF pp. 29-30 |
| 1989 | 188 | ZY2: 48; ZY3: 70; ZY4: 70 | PDF pp. 18-20 |
| 1990 | 135 | ZY2: 33; ZY3: 51; ZY4: 51 | PDF pp. 21, 24-25 |
| 1991 | 147 | ZY2: 37; ZY3: 55; ZY4: 55 | PDF pp. 21-23 |
| 1992 | 168 | ZY2: 57; ZY3: 55; ZY4: 56 | PDF pp. 21-23 |
| 1993 | 31 | ZY4: 31; Heritage kit supplies scheme-only evidence | PDF p. 10 |
| 1994 | 43 | ZY2: 22; ZY4: 21 | PDF pp. 19-20 |
| 1995 | 47 | ZY2: 22; ZY4: 25 | PDF pp. 20-21 |
| 1996 | 51 | ZY2: 24; ZY4: 27 | PDF pp. 22-23 |
| 1997 | 43 | ZY2: 27; ZY4: 16 | PDF pp. 22-23 |
| 1998 | 21 | ZY2: 21; option list contains no ZY4 | PDF pp. 53, 56 |
| 1999 | 34 | ZY2: 34; option list contains no ZY4 | PDF pp. 36, 39 |

The identical 1984 and 1985 ZY5 lists remain separate exact-year rows with
different source IDs and revisions. The cropped 1986 chart is the direct source
for 1986; the complete duplicate at 1985 kit PDF p. 67 is retained as
corroborating evidence, not substituted as the logical 1986 source.

The 1988 ZY5 chart contains 63 printed rows across 49 unique primary and
secondary pairs. The 1989 ZY3 and ZY4 charts each contain 70 printed rows
across 48 pairs. Those repeated pairs remain separate scheme rows when the
printed stripe or interior columns differ. In particular, the 1989 Summit
White code 50 and Quicksilver Met. code 96 pair has two Vermillion/Slate rows
with different interior dots under ZY3. Under ZY4, it instead has one Dk.
Blue/Slate row and one Vermillion/Slate row. The 1989 kit has no governing
solid-color chart, so its scheme components do not create standalone
availability. A separately retained model-specific GM-authored brochure
supplies the ten published 1989 regular colors.

The 1990-1999 rows preserve the source's package distinctions and anomalies.
The 1991 `97/76` row remains `76 Fire Red`; it is not silently changed to code
74. The 1992 conventional rows retain optional D85 stripe colors separately
from standard ZY3 and ZY4 stripes. The ZY3 `96/74` row remains one
Vermilion/Silver variant, while ZY4 retains its two distinct Vermilion/Garnet
and Vermilion/Silver variants. The 1994-1997 duplicate code pairs remain
separate rows when their stripe or interior cells differ.

Codes ending in `U` and `L` retain their printed upper and lower roles for
1995-1999. A lower-code scheme component is never promoted into standalone
availability. This matters particularly for `55L` Autumnwood in 1997 and 1998,
where no same-year `55U` standalone row exists. The 1993 kit supplies only ZY4
scheme rows, so those rows do not create standalone availability. A separately
retained GM-authored 1993 Blazers/Suburban brochure supplies the ten published
regular colors. The 1998 and 1999 package lists expressly contain only ZY1 and
ZY2, so no ZY4 rows are inferred from adjacent years or Tahoe charts.

The detailed page reviews remain in:

- [1977](source-audit-suburban-1977.md)
- [1978-1979](source-audit-suburban-1978-1979.md)
- [1980](source-audit-suburban-1980.md)
- [1981](source-audit-suburban-1981.md)
- [1983](source-audit-suburban-1983.md)
- [1984-1985](source-audit-suburban-1984-1985.md)
- [1986](source-audit-suburban-1986.md)
- [1987](source-audit-suburban-1987.md)
- [1988](source-audit-suburban-1988.md)
- [1989](source-audit-suburban-1989.md)
- [1990-1994](source-audit-suburban-1990-1994.md)
- [1995-1999](source-audit-suburban-1995-1999.md)
- [1982, 1989, and 1993 regular-palette brochures](source-audit-suburban-1982-1989-1993.md)

## Search and validation

The all-field search indexes each combination as `recordKind = paint-scheme`.
Primary and secondary names and codes, package, body style, standard stripe,
D85 stripe, interior, wheel flare, restriction, source annotation, source ID,
chart, locator, revision, URL, artifact hash, byte count, and PDF page count are
searchable. A result routes to its model and exact year without claiming a
standalone color route.

The builder and validator enforce the exact 184/1,185 split, two components per
scheme, ordered primary and secondary roles, immutable source revision links,
nonempty parsed PDF pages, the Gray, Gunmetal no-flattening sentinel, and the
rule that no 1989 or 1993 scheme component is promoted into standalone
availability. Tests also pin the
1990-1999 package counts, archived artifact identities, D85 distinction, U/L
roles, duplicate variants, printed restriction markers, and the lack of 1998
or 1999 ZY4 evidence.
