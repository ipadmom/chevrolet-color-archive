#!/usr/bin/env python3
"""Compile the reviewed Suburban scheme audits into the structured JSON corpus.

The Markdown audits are the human-readable transcriptions. This compiler keeps
their ordered, duplicate scheme rows intact while preserving the older
1977-1989 structured corpus. It writes JSON to stdout only; publication remains
an explicit apply-patch step.
"""

from __future__ import annotations

import json
import re
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
NEW_AUDIT = ROOT / "data" / "audits" / "suburban-paint-schemes-1977-1999.json"
AUDIT_1990_1994 = ROOT / "docs" / "source-audit-suburban-1990-1994.md"
AUDIT_1995_1999 = ROOT / "docs" / "source-audit-suburban-1995-1999.md"

COMPACT_FIELDS = [
    "primary_code",
    "secondary_code",
    "stripe_colors",
    "d85_stripe_colors",
    "interior_colors",
    "wheel_flare_color",
    "restriction",
    "source_note",
    "source_annotation",
    "primary_name",
    "secondary_name",
]

RESTRICTIONS = {
    1992: "N/A K1500 w/B71 or K2500 models",
    1993: "N/A K1500 w/B71 Wheel Flare or on K2500 Models",
    1994: "N/A B71 Moldings or K2500 Models",
    1995: "N/A B71 Molding or K10906 w/L65 Eng or on K20906",
    1996: "N/A B71 Molding or K10906 w/L65 Eng or on K20906",
    1997: "N/A B71 Molding or K10906 w/L65 Eng or on K20906",
    1998: "N/A B71 or K10906 or w/L65 Eng or on K20906",
    1999: "N/A B71, L65 Eng or 4-Wheel Drive",
}

ARTIFACTS = {
    1990: ("46b985c6943036e27efd890122a3d3ffc5d0ba625d19305a978da5d3fec57df9", 1_130_037, 27),
    1991: ("24f2a80e283d48d02a137e0c71114e76d31466515130aa8b21a93d1ac1a0ff7f", 1_229_801, 29),
    1992: ("c91ee8f67a3e33f5e6485572f1347e90d12de287dcf8720e0529599032a05b78", 746_842, 23),
    1993: ("607f0de7aa91612d9c406dd41df126b1959bd13d9d74c05c3137f01739b23341", 573_990, 14),
    1994: ("895ef9992d0f5172084047683acfa8d543acea6bf37464df24fee50d9e3385df", 1_078_053, 28),
    1995: ("19161144f0aecfd285c1d4e51e549a8e39c70e7b3d42a139c240404fcef4fe9b", 962_051, 28),
    1996: ("c7f1f9a1537331b0f4b5ba6bb96baf3d9bfe3919b4cb3e5241e2cf704ecdb217", 770_378, 24),
    1997: ("1d28da68523c509ffce68ce2e96ef5566894dd886caf761071afce6b5b240a1d", 948_044, 33),
    1998: ("7975a9871c0b41551bc5802aa1c833c25e31de238abce8d424def565261c3449", 2_294_103, 56),
    1999: ("684a88324706a990ad05687faee61b1d45f2e7af3ce7f291df4f47c3c3800598", 1_747_598, 47),
}


def section(text: str, heading: str) -> str:
    marker = f"### {heading}"
    start = text.index(marker) + len(marker)
    next_subheading = text.find("\n### ", start)
    next_year = text.find("\n## ", start)
    ends = [value for value in (next_subheading, next_year) if value >= 0]
    return text[start : min(ends) if ends else len(text)]


def year_section(text: str, year: int) -> str:
    marker = f"## {year}"
    start = text.index(marker) + len(marker)
    end = text.find("\n## ", start)
    return text[start : end if end >= 0 else len(text)]


def numbered_rows(text: str) -> list[str]:
    return re.findall(r"^\d+\. (.+)$", text, flags=re.MULTILINE)


def clean_terminal(value: str) -> str:
    return value[:-1] if value.endswith(".") else value


def row(
    primary_code: str,
    secondary_code: str,
    primary_name: str,
    secondary_name: str,
    *,
    stripe_colors: str | None = None,
    d85_stripe_colors: str | None = None,
    interior_colors: str | None = None,
    wheel_flare_color: str | None = None,
    restriction: str | None = None,
    source_note: str | None = None,
    source_annotation: str | None = None,
) -> dict[str, str | None]:
    return {
        "primary_code": primary_code,
        "secondary_code": secondary_code,
        "stripe_colors": stripe_colors,
        "d85_stripe_colors": d85_stripe_colors,
        "interior_colors": interior_colors,
        "wheel_flare_color": wheel_flare_color,
        "restriction": restriction,
        "source_note": source_note,
        "source_annotation": source_annotation,
        "primary_name": primary_name,
        "secondary_name": secondary_name,
    }


def parse_code_first(
    raw: str,
    *,
    year: int,
    default_stripe: str | None = None,
) -> dict[str, str | None]:
    match = re.fullmatch(
        r"(?P<c1>\d+) (?P<n1>.+?) / (?P<c2>\d+) (?P<n2>.+?); (?P<rest>.+)",
        raw,
    )
    if not match:
        raise ValueError(f"Unparsed code-first row: {raw}")
    values: dict[str, str | None] = {
        "stripe_colors": default_stripe,
        "d85_stripe_colors": None,
        "interior_colors": None,
        "restriction": None,
        "source_annotation": None,
    }
    rest = match.group("rest")
    anomaly = None
    if ". The source plainly prints" in rest:
        rest, _ = rest.split(". The source plainly prints", 1)
        anomaly = (
            "Source plainly prints 76 Fire Red in this row while the same-year "
            "swatch and ZY1 table print 74 Fire Red; preserved without correction."
        )
    for item in rest.split("; "):
        item = clean_terminal(item)
        if item.startswith("stripe "):
            values["stripe_colors"] = item.removeprefix("stripe ")
        elif item.startswith("D85 "):
            values["d85_stripe_colors"] = item.removeprefix("D85 ")
        elif item.startswith("I="):
            values["interior_colors"] = item.removeprefix("I=")
        elif item == "restricted, bold":
            values["restriction"] = RESTRICTIONS[year]
            values["source_annotation"] = "Source chart prints this row in bold."
        else:
            raise ValueError(f"Unparsed code-first field: {item!r} in {raw}")
    if anomaly:
        values["source_annotation"] = anomaly
    return row(
        match.group("c1"),
        match.group("c2"),
        match.group("n1"),
        match.group("n2"),
        **values,
    )


def parse_name_first(raw: str, *, year: int) -> dict[str, str | None]:
    match = re.fullmatch(
        r"(?P<names>.+); (?P<c1>\d+)/(?P<c2>\d+); (?P<rest>.+)", raw
    )
    if not match:
        raise ValueError(f"Unparsed name-first row: {raw}")
    try:
        primary_name, secondary_name = match.group("names").split(" / ", 1)
    except ValueError as exc:
        raise ValueError(f"Unparsed name pair: {raw}") from exc
    values: dict[str, str | None] = {
        "stripe_colors": None,
        "d85_stripe_colors": None,
        "interior_colors": None,
        "wheel_flare_color": None,
        "restriction": None,
        "source_annotation": None,
    }
    for item in match.group("rest").split("; "):
        item = clean_terminal(item)
        if item.startswith("stripe "):
            values["stripe_colors"] = item.removeprefix("stripe ")
        elif item.startswith("I="):
            values["interior_colors"] = item.removeprefix("I=")
        elif item.startswith("wheel flare "):
            values["wheel_flare_color"] = item.removeprefix("wheel flare ")
        elif item in {"restricted, asterisk", "restricted, bold"}:
            values["restriction"] = RESTRICTIONS[year]
            marker = "asterisk" if "asterisk" in item else "bold type"
            values["source_annotation"] = f"Source restriction marker: {marker}."
        else:
            raise ValueError(f"Unparsed name-first field: {item!r} in {raw}")
    return row(
        match.group("c1"),
        match.group("c2"),
        primary_name,
        secondary_name,
        **values,
    )


def parse_markdown_scheme_table(
    text: str, *, year: int, package_code: str
) -> list[dict[str, str | None]]:
    heading = (
        "ZY2 conventional two-tone"
        if package_code == "ZY2"
        else "ZY4 deluxe two-tone"
    )
    segment = section(text, next(
        line.removeprefix("### ")
        for line in text.splitlines()
        if line.startswith(f"### {heading}")
    ))
    table_lines = [line for line in segment.splitlines() if line.startswith("|")]
    if len(table_lines) < 3:
        raise ValueError(f"Missing {year} {package_code} Markdown table")
    parsed: list[dict[str, str | None]] = []
    for line in table_lines[2:]:
        columns = [item.strip() for item in line.strip().strip("|").split("|")]
        printed_names = columns[0].split(" / ", 1)
        if len(printed_names) != 2:
            raise ValueError(f"Unparsed printed names in {year}: {columns[0]}")
        code_1 = columns[1].strip("`")
        code_2 = columns[2].strip("`")
        interior = columns[3] or None
        if package_code == "ZY2":
            stripe = None
            wheel_flare = columns[4] or None
            marker = columns[5].strip("`") if len(columns) > 5 else ""
        else:
            stripe = columns[4] or None
            wheel_flare = columns[5] or None
            marker = columns[6].strip("`") if len(columns) > 6 else ""

        restriction = None
        annotation = None
        if marker:
            if year == 1997 and marker.startswith("^"):
                annotation = "Source caret indicates change."
            else:
                restriction = RESTRICTIONS[year]
                printed_marker = (
                    "*" if marker.startswith("*") else
                    "+" if marker.startswith("+") else
                    "(a)" if marker.startswith("(a)") else marker
                )
                annotation = f"Source restriction marker: {printed_marker}."
        parsed.append(
            row(
                code_1,
                code_2,
                printed_names[0],
                printed_names[1],
                stripe_colors=stripe,
                interior_colors=interior,
                wheel_flare_color=wheel_flare,
                restriction=restriction,
                source_annotation=annotation,
            )
        )
    return parsed


def add_scheme_set(
    audit: dict[str, Any],
    scheme_set_id: str,
    rows: list[dict[str, str | None]],
    *,
    defaults: dict[str, str] | None = None,
) -> None:
    legend: dict[str, str] = {}
    for item in rows:
        legend.setdefault(str(item["primary_code"]), str(item["primary_name"]))
        legend.setdefault(str(item["secondary_code"]), str(item["secondary_name"]))
    compact_rows: list[list[str | None]] = []
    for item in rows:
        values = dict(item)
        if values["primary_name"] == legend[values["primary_code"]]:
            values["primary_name"] = None
        if values["secondary_name"] == legend[values["secondary_code"]]:
            values["secondary_name"] = None
        compact = [values[field] for field in COMPACT_FIELDS]
        while compact and compact[-1] is None:
            compact.pop()
        compact_rows.append(compact)
    audit["color_legends"][scheme_set_id] = legend
    scheme_set: dict[str, Any] = {
        "scheme_set_id": scheme_set_id,
        "color_legend_id": scheme_set_id,
        "rows": compact_rows,
    }
    if defaults:
        scheme_set["defaults"] = defaults
    audit["scheme_sets"].append(scheme_set)


def source(
    year: int,
    *,
    chart: str,
    locator: str,
    revision: str,
) -> dict[str, Any]:
    artifact_sha256, artifact_bytes, pdf_page_count = ARTIFACTS[year]
    return {
        "source_id": f"gm-heritage-{year}-chevrolet-suburban",
        "url": (
            "https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/"
            f"vehicle-information-kits/chevrolet/{year}-Chevrolet-Suburban.pdf"
        ),
        "title": f"{year} Chevrolet Suburban Vehicle Information Kit",
        "chart": chart,
        "locator": locator,
        "revision": revision,
        "artifact_sha256": artifact_sha256,
        "artifact_bytes": artifact_bytes,
        "pdf_page_count": pdf_page_count,
    }


def year_record(
    year: int,
    scheme_set_id: str,
    package_code: str,
    package_name: str,
    body_style_scope: str,
    *,
    chart: str,
    locator: str,
    revision: str,
    placement_note: str | None = None,
) -> dict[str, Any]:
    return {
        "year": year,
        "scheme_set_id": scheme_set_id,
        "package_code": package_code,
        "package_name": package_name,
        "body_style_scope": body_style_scope,
        "placement_note": placement_note,
        "source": source(
            year, chart=chart, locator=locator, revision=revision
        ),
    }


def build() -> dict[str, Any]:
    audit = json.loads(NEW_AUDIT.read_text(encoding="utf-8-sig"))
    audit["scheme_sets"] = [
        item for item in audit["scheme_sets"]
        if not re.match(r"suburban-199[0-9]-", item["scheme_set_id"])
    ]
    audit["years"] = [item for item in audit["years"] if int(item["year"]) < 1990]
    audit["color_legends"] = {
        key: value
        for key, value in audit["color_legends"].items()
        if not key.startswith("suburban-199")
    }
    audit["schema_version"] = 2
    audit["audit_as_of"] = "2026-07-21"
    audit["scope"] = (
        "Exact two-tone and exterior-decor paint schemes transcribed from the "
        "reviewed 1977-1981 and 1983-1999 official Suburban charts. Scheme "
        "components preserve source placement roles and are not standalone "
        "color-availability assertions."
    )
    audit["compact_scheme_row_fields"] = COMPACT_FIELDS

    doc_90 = AUDIT_1990_1994.read_text(encoding="utf-8-sig")
    doc_95 = AUDIT_1995_1999.read_text(encoding="utf-8-sig")

    rows_1990_zy2 = [
        parse_code_first(item, year=1990, default_stripe="N/A")
        for item in numbered_rows(section(doc_90, "ZY2 Conventional Two-Tone rows, PDF p21, printed p20"))
    ]
    rows_1990_zy34 = [
        parse_code_first(item, year=1990)
        for item in numbered_rows(section(doc_90, "ZY3 Special Two-Tone and ZY4 Deluxe Two-Tone, identical 51-row table"))
    ]
    add_scheme_set(audit, "suburban-1990-zy2", rows_1990_zy2)
    add_scheme_set(audit, "suburban-1990-zy3-zy4", rows_1990_zy34)

    rows_1991_zy2 = [
        parse_code_first(item, year=1991, default_stripe="N/A")
        for item in numbered_rows(section(doc_90, "ZY2 Conventional Two-Tone rows, PDF p21, printed p20, dated October 1990"))
    ]
    rows_1991_zy34 = [
        parse_code_first(item, year=1991)
        for item in numbered_rows(section(doc_90, "ZY3 Special Two-Tone and ZY4 Deluxe Two-Tone, identical 55-row table"))
    ]
    add_scheme_set(audit, "suburban-1991-zy2", rows_1991_zy2)
    add_scheme_set(audit, "suburban-1991-zy3-zy4", rows_1991_zy34)

    rows_1992_zy2 = [
        parse_code_first(item, year=1992)
        for item in numbered_rows(section(doc_90, "ZY2 Conventional Two-Tone rows, with optional D85 stripe, PDF p21, printed p20"))
    ]
    shared_1992 = [
        parse_code_first(item, year=1992)
        for item in numbered_rows(section(doc_90, "ZY3 Special Two-Tone and ZY4 Deluxe Two-Tone, 54 shared exact rows plus divergent block"))
    ]
    rows_1992_zy3 = deepcopy(shared_1992)
    rows_1992_zy4 = deepcopy(shared_1992)
    for item in rows_1992_zy3:
        if item["interior_colors"]:
            item["interior_colors"] = item["interior_colors"].replace("Beige/Saddle", "Beige")
    for item in rows_1992_zy4:
        if item["interior_colors"]:
            item["interior_colors"] = item["interior_colors"].replace("Beige/Saddle", "Saddle")
    divergent_zy3 = row(
        "96", "74", "Quicksilver Met.", "Victory Red",
        stripe_colors="Vermilion/Silver", interior_colors="Garnet, Gray",
        restriction=RESTRICTIONS[1992],
        source_annotation="Source chart prints this row in bold.",
    )
    divergent_zy4 = [
        row(
            "96", "74", "Quicksilver Met.", "Victory Red",
            stripe_colors="Vermilion/Garnet", interior_colors="Garnet",
            restriction=RESTRICTIONS[1992],
            source_annotation="Source chart prints this row in bold.",
        ),
        row(
            "96", "74", "Quicksilver Met.", "Victory Red",
            stripe_colors="Vermilion/Silver", interior_colors="Gray",
            restriction=RESTRICTIONS[1992],
            source_annotation="Source chart prints this row in bold.",
        ),
    ]
    # The printed 96/74 block sits between the 96/41 and 96/76 blocks.
    insertion_index = next(
        index
        for index, item in enumerate(rows_1992_zy3)
        if item["primary_code"] == "96" and item["secondary_code"] == "76"
    )
    rows_1992_zy3[insertion_index:insertion_index] = [divergent_zy3]
    rows_1992_zy4[insertion_index:insertion_index] = divergent_zy4
    add_scheme_set(
        audit,
        "suburban-1992-zy2",
        rows_1992_zy2,
        defaults={"source_note": "K2500 wheel flares are color-keyed to Color Code 2 with ZY2."},
    )
    add_scheme_set(
        audit,
        "suburban-1992-zy3",
        rows_1992_zy3,
        defaults={"source_note": "K2500 wheel flares are color-keyed to Color Code 2 with ZY3."},
    )
    add_scheme_set(
        audit,
        "suburban-1992-zy4",
        rows_1992_zy4,
        defaults={"source_note": "K2500 wheel flares are color-keyed to Color Code 2 with ZY4."},
    )

    rows_1993_zy4 = [
        parse_name_first(item, year=1993)
        for item in numbered_rows(section(doc_90, "ZY4 exact scheme rows, PDF p10, printed Order Guide p15"))
    ]
    add_scheme_set(
        audit,
        "suburban-1993-zy4",
        rows_1993_zy4,
        defaults={"source_note": "With B71, wheel-flare color matches Color Code 1 where applicable."},
    )

    combined_1994 = [
        parse_name_first(item, year=1994)
        for item in numbered_rows(section(doc_90, "Complete combined ZY1 and ZY2 row list, PDF p19, printed Order Guide p14"))
    ]
    rows_1994_zy2 = [
        item for item in combined_1994
        if item["primary_code"] != item["secondary_code"]
    ]
    rows_1994_zy4 = [
        parse_name_first(item, year=1994)
        for item in numbered_rows(section(doc_90, "ZY4 exact scheme rows, PDF p20, printed Order Guide p15"))
    ]
    add_scheme_set(audit, "suburban-1994-zy2", rows_1994_zy2)
    add_scheme_set(audit, "suburban-1994-zy4", rows_1994_zy4)

    for year in range(1995, 2000):
        yearly = year_section(doc_95, year)
        rows_zy2 = parse_markdown_scheme_table(yearly, year=year, package_code="ZY2")
        default_note = (
            "Color Code 2 is a required (+) Plus option. ZY2 and ZY4 require LS/LT decor."
            if year <= 1997
            else "ZY2 is not available with base decor."
        )
        add_scheme_set(
            audit,
            f"suburban-{year}-zy2",
            rows_zy2,
            defaults={"source_note": default_note},
        )
        if year <= 1997:
            rows_zy4 = parse_markdown_scheme_table(yearly, year=year, package_code="ZY4")
            add_scheme_set(
                audit,
                f"suburban-{year}-zy4",
                rows_zy4,
                defaults={"source_note": default_note},
            )

    audit["years"].extend(
        [
            year_record(1990, "suburban-1990-zy2", "ZY2", "Conventional Two-Tone", "R/V Suburban", chart="R/V Suburban Conventional Two-Tone (ZY2) Color Combinations", locator="PDF p. 21, printed p. 20", revision="Model-year kit; chart revision not printed", placement_note="Color Code 1 covers the roof and upper body; Color Code 2 covers the lower body."),
            year_record(1990, "suburban-1990-zy3-zy4", "ZY3", "Special Two-Tone", "R/V Suburban", chart="R/V Suburban Special Two-Tone (ZY3) Color Combinations", locator="PDF p. 25, printed p. 21", revision="Model-year kit; chart revision not printed", placement_note="Color Code 1 covers the area above the striping; Color Code 2 covers the area below the striping."),
            year_record(1990, "suburban-1990-zy3-zy4", "ZY4", "Deluxe Two-Tone", "R/V Suburban", chart="R/V Suburban Deluxe Two-Tone (ZY4) Color Combinations", locator="PDF p. 24, printed p. 22", revision="Model-year kit; chart revision not printed", placement_note="Color Code 1 and Color Code 2 retain the source chart's deluxe two-tone geometry."),
            year_record(1991, "suburban-1991-zy2", "ZY2", "Conventional Two-Tone", "R/V Suburban", chart="R/V Suburban Conventional Two-Tone (ZY2) Color Combinations", locator="PDF p. 21, printed p. 20", revision="October 1990", placement_note="Color Code 1 covers the roof and upper body; Color Code 2 covers the lower body."),
            year_record(1991, "suburban-1991-zy3-zy4", "ZY3", "Special Two-Tone", "R/V Suburban", chart="R/V Suburban Special Two-Tone (ZY3) Color Combinations", locator="PDF p. 22, printed p. 21", revision="October 1990", placement_note="Color Code 1 covers the area above the striping; Color Code 2 covers the area below the striping."),
            year_record(1991, "suburban-1991-zy3-zy4", "ZY4", "Deluxe Two-Tone", "R/V Suburban", chart="R/V Suburban Deluxe Two-Tone (ZY4) Color Combinations", locator="PDF p. 23, printed p. 22", revision="October 1990", placement_note="Color Code 1 and Color Code 2 retain the source chart's deluxe two-tone geometry."),
            year_record(1992, "suburban-1992-zy2", "ZY2", "Conventional Two-Tone", "C/K Suburban", chart="C/K Suburban Conventional Two-Tone (ZY2) Color Combinations", locator="PDF p. 21, printed p. 20", revision="Model-year kit; chart revision not printed", placement_note="Color Code 1 and Color Code 2 retain the source chart's conventional two-tone geometry."),
            year_record(1992, "suburban-1992-zy3", "ZY3", "Special Two-Tone", "C/K Suburban", chart="C/K Suburban Special Two-Tone (ZY3) Color Combinations", locator="PDF p. 22, printed p. 21", revision="Model-year kit; chart revision not printed", placement_note="Color Code 1 covers the area above the striping; Color Code 2 covers the area below the striping."),
            year_record(1992, "suburban-1992-zy4", "ZY4", "Deluxe Two-Tone", "C/K Suburban", chart="C/K Suburban Deluxe Two-Tone (ZY4) Color Combinations", locator="PDF p. 23, printed p. 22", revision="Model-year kit; chart revision not printed", placement_note="Color Code 1 is above the striping and below the lower feature-line groove; Color Code 2 is below the striping and above that groove."),
            year_record(1993, "suburban-1993-zy4", "ZY4", "Deluxe Two-Tone", "C/K 1500 and C/K 2500 Suburban", chart="C/K Suburban ZY4 Interior and Exterior Color Availability Chart", locator="PDF p. 10, printed Order Guide p. 15", revision="1-22-93", placement_note="The governing chart supplies scheme rows only; it does not establish a standalone ZY1 palette."),
            year_record(1994, "suburban-1994-zy2", "ZY2", "Conventional Two-Tone", "C/K 1500 and C/K 2500 Suburban", chart="C/K Suburban combined ZY1 and ZY2 Interior and Exterior Color Availability Chart", locator="PDF p. 19, printed Order Guide p. 14", revision="1-10-94"),
            year_record(1994, "suburban-1994-zy4", "ZY4", "Deluxe Two-Tone", "C/K 1500 and C/K 2500 Suburban", chart="C/K Suburban ZY4 Interior and Exterior Color Availability Chart", locator="PDF p. 20, printed Order Guide p. 15", revision="1-10-94"),
            year_record(1995, "suburban-1995-zy2", "ZY2", "Conventional Two-Tone", "C/K 1500 and C/K 2500 Suburban", chart="C/K Suburban ZY2 Interior and Exterior Color Availability Chart", locator="PDF p. 20, printed Order Guide p. 14", revision="4-10-95"),
            year_record(1995, "suburban-1995-zy4", "ZY4", "Deluxe Two-Tone", "C/K 1500 and C/K 2500 Suburban", chart="C/K Suburban ZY4 Interior and Exterior Color Availability Chart", locator="PDF p. 21, printed Order Guide p. 15", revision="4-10-95"),
            year_record(1996, "suburban-1996-zy2", "ZY2", "Conventional Two-Tone", "C/K 1500 and C/K 2500 Suburban", chart="C/K Suburban ZY2 Interior and Exterior Color Availability Chart", locator="PDF p. 22, printed Order Guide p. 14", revision="1-29-96"),
            year_record(1996, "suburban-1996-zy4", "ZY4", "Deluxe Two-Tone", "C/K 1500 and C/K 2500 Suburban", chart="C/K Suburban ZY4 Interior and Exterior Color Availability Chart", locator="PDF p. 23, printed Order Guide p. 15", revision="1-29-96"),
            year_record(1997, "suburban-1997-zy2", "ZY2", "Conventional Two-Tone", "C/K 1500 and C/K 2500 Suburban", chart="C/K Suburban ZY2 Interior and Exterior Color Availability Chart", locator="PDF p. 22, printed Order Guide p. 14", revision="12-16-96"),
            year_record(1997, "suburban-1997-zy4", "ZY4", "Deluxe Two-Tone", "C/K 1500 and C/K 2500 Suburban", chart="C/K Suburban ZY4 Interior and Exterior Color Availability Chart", locator="PDF p. 23, printed Order Guide p. 15", revision="12-16-96"),
            year_record(1998, "suburban-1998-zy2", "ZY2", "Conventional Two-Tone", "C/K Suburban", chart="C/K Suburban ZY2 Interior and Exterior Color Availability Chart", locator="PDF p. 56, printed Order Guide p. 14; package list at PDF p. 53, printed Order Guide p. 11", revision="9-2-97"),
            year_record(1999, "suburban-1999-zy2", "ZY2", "Conventional Two-Tone", "C/K Suburban", chart="C/K Suburban ZY2 Interior and Exterior Color Availability Chart", locator="PDF p. 39, printed Order Guide p. 14; package list at PDF p. 36, printed Order Guide p. 11", revision="Published 4-1-98"),
        ]
    )

    expected_package_counts = {
        (1990, "ZY2"): 33, (1990, "ZY3"): 51, (1990, "ZY4"): 51,
        (1991, "ZY2"): 37, (1991, "ZY3"): 55, (1991, "ZY4"): 55,
        (1992, "ZY2"): 57, (1992, "ZY3"): 55, (1992, "ZY4"): 56,
        (1993, "ZY4"): 31,
        (1994, "ZY2"): 22, (1994, "ZY4"): 21,
        (1995, "ZY2"): 22, (1995, "ZY4"): 25,
        (1996, "ZY2"): 24, (1996, "ZY4"): 27,
        (1997, "ZY2"): 27, (1997, "ZY4"): 16,
        (1998, "ZY2"): 21,
        (1999, "ZY2"): 34,
    }
    sets = {item["scheme_set_id"]: item for item in audit["scheme_sets"]}
    actual_package_counts = {
        (item["year"], item["package_code"]): len(sets[item["scheme_set_id"]]["rows"])
        for item in audit["years"] if item["year"] >= 1990
    }
    if actual_package_counts != expected_package_counts:
        raise ValueError(
            f"Compiled package counts drifted: {actual_package_counts!r}"
        )
    if sum(actual_package_counts.values()) != 720:
        raise ValueError("The 1990-1999 compilation must contain exactly 720 scheme rows")
    return audit


def pretty_json(value: Any, level: int = 0) -> str:
    indent = "  " * level
    child_indent = "  " * (level + 1)
    if isinstance(value, dict):
        if not value:
            return "{}"
        items = [
            f"{child_indent}{json.dumps(key, ensure_ascii=False)}: "
            f"{pretty_json(item, level + 1)}"
            for key, item in value.items()
        ]
        return "{\n" + ",\n".join(items) + f"\n{indent}}}"
    if isinstance(value, list):
        if not value:
            return "[]"
        if all(not isinstance(item, (dict, list)) for item in value):
            return json.dumps(value, ensure_ascii=False)
        items = [f"{child_indent}{pretty_json(item, level + 1)}" for item in value]
        return "[\n" + ",\n".join(items) + f"\n{indent}]"
    return json.dumps(value, ensure_ascii=False)


def main() -> int:
    sys.stdout.write(pretty_json(build()) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
