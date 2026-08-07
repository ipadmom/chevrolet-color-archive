from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import pdfplumber
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DATA_PATH = (
    ROOT / "data" / "sources" / "modern-chevrolet-color-source-candidates.json"
)
CATALOG_PATH = ROOT / "data" / "catalog" / "chevrolet-us-nameplates.json"
OUTPUT_PATH = ROOT / "data" / "audits" / "modern-fleet-palettes-2008-2026.json"
AUDITED_ON = "2026-08-06"

COLOR_HEADER_PATTERN = re.compile(
    r"(?:AVAILABLE\s+)?EXTERIOR\s+COLORS?", re.IGNORECASE
)
RESET_PATTERN = re.compile(r"\b(?:OVERVIEW|MODEL\s+AVAILABILITY|AVAILABLE\s+MODELS)\b")
CODE_PATTERN = re.compile(
    r"^(?:\d{2,3}U|[A-Z]\dU|\d[A-Z]U|\d[A-Z]|G[A-Z0-9]{2})$"
)

HUE_TERMS = {
    "aqua",
    "beige",
    "black",
    "blue",
    "bronze",
    "brown",
    "burgundy",
    "carmine",
    "cashmere",
    "champagne",
    "charcoal",
    "cherry",
    "chocolate",
    "copper",
    "cream",
    "crimson",
    "gold",
    "granite",
    "gray",
    "green",
    "grey",
    "indigo",
    "ivory",
    "lime",
    "mahogany",
    "maroon",
    "mocha",
    "orange",
    "pearl",
    "pewter",
    "platinum",
    "purple",
    "red",
    "rose",
    "ruby",
    "sand",
    "silver",
    "slate",
    "tan",
    "taupe",
    "teal",
    "titanium",
    "turquoise",
    "violet",
    "white",
    "yellow",
}

FINISH_TERMS = {
    "chroma",
    "chromaflair",
    "metallic",
    "mica",
    "pearl",
    "satin",
    "tintcoat",
    "tricoat",
}


@dataclass(frozen=True)
class ModelRule:
    model_ids: tuple[str, ...]
    patterns: tuple[str, ...]
    display_label: str


MODEL_RULES = (
    ModelRule(("traverse-limited",), (r"TRAVERSE\s+LIMITED",), "Traverse Limited"),
    ModelRule(("malibu-classic-2008",), (r"MALIBU\s+CLASSIC",), "Malibu Classic"),
    ModelRule(("malibu-limited",), (r"MALIBU\s+LIMITED",), "Malibu Limited"),
    ModelRule(("cruze-limited",), (r"CRUZE\s+LIMITED",), "Cruze Limited"),
    ModelRule(("impala-limited",), (r"IMPALA\s+LIMITED",), "Impala Limited"),
    ModelRule(("spark-ev",), (r"SPARK\s+EV",), "Spark EV"),
    ModelRule(("bolt-euv",), (r"BOLT\s+EUV",), "Bolt EUV"),
    ModelRule(("bolt-ev",), (r"BOLT\s+EV",), "Bolt EV"),
    ModelRule(("blazer-ev",), (r"BLAZER\s+EV",), "Blazer EV"),
    ModelRule(("equinox-ev",), (r"EQUINOX\s+EV",), "Equinox EV"),
    ModelRule(("silverado-ev",), (r"SILVERADO\s+EV",), "Silverado EV"),
    ModelRule(
        ("caprice-ppv",),
        (r"CAPRICE(?:\s+(?:POLICE|DETECTIVE|PPV))", r"CAPRICE\s+POLICE"),
        "Caprice PPV",
    ),
    ModelRule(
        ("silverado-hd",),
        (
            r"SILVERADO\s+(?:2500\s*HD|3500\s*HD|2500HD|3500HD)",
            r"SILVERADO\s+4500\s*HD",
            r"SILVERADO\s+5500\s*HD",
            r"SILVERADO\s+6500\s*HD",
        ),
        "Silverado HD",
    ),
    ModelRule(
        ("low-cab-forward",),
        (r"LOW\s+CAB\s+FORWARD", r"CHEVROLET\s+LCF"),
        "Low Cab Forward",
    ),
    ModelRule(
        ("tiltmaster-w-series",),
        (r"CHEVROLET\s+W[- ]SERIES", r"\bW[- ]SERIES\b"),
        "Tiltmaster / W-Series",
    ),
    ModelRule(
        ("t-series-medium-duty",),
        (r"CHEVROLET\s+T[- ]SERIES", r"\bT[- ]SERIES\b"),
        "T-Series Medium Duty",
    ),
    ModelRule(("kodiak",), (r"\bKODIAK\b",), "Kodiak"),
    ModelRule(("city-express",), (r"CITY\s+EXPRESS",), "City Express"),
    ModelRule(("captiva-sport",), (r"CAPTIVA\s+SPORT",), "Captiva Sport"),
    ModelRule(("ss-sedan",), (r"CHEVROLET\s+SS(?:\s|$)",), "SS"),
    ModelRule(("trailblazer",), (r"TRAIL\s*BLAZER",), "TrailBlazer"),
    ModelRule(("suburban", "tahoe"), (r"TAHOE\s*/\s*SUBURBAN",), "Tahoe/Suburban"),
    ModelRule(("suburban",), (r"\bSUBURBAN(?:\s+HD)?\b",), "Suburban"),
    ModelRule(("tahoe",), (r"\bTAHOE\b",), "Tahoe"),
    ModelRule(("silverado",), (r"SILVERADO\s+1500", r"\bSILVERADO\s+HYBRID\b"), "Silverado"),
    ModelRule(("silverado",), (r"\bSILVERADO\b",), "Silverado"),
    ModelRule(
        ("express",),
        (
            r"\bCHEVROLET\s+EXPRESS\b",
            r"\bEXPRESS\s+(?:PASSENGER|CARGO|CUTAWAY|VAN)\b",
            r"\bEXPRESS\s*$",
        ),
        "Express",
    ),
    ModelRule(("colorado",), (r"\bCOLORADO\b",), "Colorado"),
    ModelRule(("uplander",), (r"\bUPLANDER\b",), "Uplander"),
    ModelRule(("avalanche",), (r"\bAVALANCHE\b",), "Avalanche"),
    ModelRule(("traverse",), (r"\bTRAVERSE\b",), "Traverse"),
    ModelRule(("equinox",), (r"\bEQUINOX\b",), "Equinox"),
    ModelRule(("blazer",), (r"(?<!TRAIL)\bBLAZER\b",), "Blazer"),
    ModelRule(("trax",), (r"\bTRAX\b",), "Trax"),
    ModelRule(("hhr",), (r"\bHHR\b",), "HHR"),
    ModelRule(("corvette",), (r"\bCORVETTE\b",), "Corvette"),
    ModelRule(("camaro",), (r"\bCAMARO\b",), "Camaro"),
    ModelRule(("volt",), (r"(?<![\d-])\bVOLT\b",), "Volt"),
    ModelRule(("spark",), (r"\bSPARK\b(?!\s+IGNITION)",), "Spark"),
    ModelRule(("sonic",), (r"\bSONIC\b",), "Sonic"),
    ModelRule(("cruze",), (r"\bCRUZE\b",), "Cruze"),
    ModelRule(("cobalt",), (r"\bCOBALT\b",), "Cobalt"),
    ModelRule(("aveo",), (r"\bAVEO(?:5)?\b",), "Aveo"),
    ModelRule(("malibu",), (r"\bMALIBU\b",), "Malibu"),
    ModelRule(("impala",), (r"\bIMPALA\b",), "Impala"),
)

MODEL_BY_ID = {
    model_id: rule.display_label
    for rule in MODEL_RULES
    for model_id in rule.model_ids
}

# These Fleet Guide pages have misleading or incomplete extracted text layers.
# Each override was visually checked against the rendered page. The 2008 and
# 2009 Equinox pages also carry stale Cobalt text from the preceding layout;
# the extracted palette itself is the Equinox palette printed on the page.
PAGE_MODEL_OVERRIDES: dict[tuple[str, int], tuple[tuple[str, ...], str]] = {
    ("gm-fleet-guide-us-2008-v2", 63): (("equinox",), "Equinox"),
    ("gm-fleet-guide-us-2009-v2", 70): (("equinox",), "Equinox"),
    ("gm-fleet-guide-us-2013", 18): (("cruze",), "Cruze"),
    ("gm-fleet-guide-us-2013", 14): (("spark",), "Spark"),
    ("gm-fleet-guide-us-2014", 27): (("spark",), "Spark"),
    ("gm-fleet-guide-us-2014", 81): (("suburban", "tahoe"), "Tahoe/Suburban"),
    ("gm-fleet-guide-us-2014", 109): (("caprice-ppv",), "Caprice PPV"),
    ("gm-fleet-guide-us-2014", 110): (("impala-limited",), "Impala Limited"),
    ("gm-fleet-guide-us-2014", 111): (("impala-limited",), "Impala Limited"),
    ("gm-fleet-guide-us-2015", 29): (("sonic",), "Sonic"),
    ("gm-fleet-guide-us-2015", 113): (("caprice-ppv",), "Caprice PPV"),
    ("gm-fleet-guide-us-2015", 114): (("impala-limited",), "Impala Limited"),
    ("gm-fleet-guide-us-2016-november", 41): (("impala-limited",), "Impala Limited"),
}

# These pages describe the entire catalog model even though a trim, body form,
# or powertrain word appears near the start of the extracted text. The generic
# specialty detector otherwise mistakes that nearby word for the palette scope.
PAGE_PROGRAM_SCOPE_OVERRIDES: dict[tuple[str, int], str | None] = {
    ("gm-fleet-guide-us-2009-v2", 72): None,
    ("gm-fleet-guide-us-2015", 99): None,
    ("gm-fleet-guide-us-2016-november", 106): None,
    ("gm-fleet-guide-us-2018", 32): None,
}

# A program label is the model's defining identity in these cases, rather than
# a restricted subset of a broader retail model.
NATIVE_SPECIALTY_MODEL_IDS = {"caprice-ppv"}

_CANONICAL_COLOR_ALIASES: dict[str, str] | None = None


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\u00ad", "")).strip()


def canonicalize_extracted_color(value: str) -> str:
    global _CANONICAL_COLOR_ALIASES
    if _CANONICAL_COLOR_ALIASES is None:
        source_data = json.loads(SOURCE_DATA_PATH.read_text(encoding="utf-8"))
        candidates: dict[str, set[str]] = defaultdict(set)
        for table in source_data["verified_palette_tables"]:
            for color in table["colors"]:
                base = re.sub(
                    r"\s+(?:Metallic|Tintcoat|Tricoat|Mica|ChromaFlair)$",
                    "",
                    color,
                    flags=re.I,
                )
                candidates[base.casefold()].add(color)
        _CANONICAL_COLOR_ALIASES = {
            base: next(iter(names))
            for base, names in candidates.items()
            if len(names) == 1
        }
    return _CANONICAL_COLOR_ALIASES.get(value.casefold(), value)


def source_year(source_id: str) -> int:
    match = re.match(r"gm-fleet-guide-us-(\d{4})", source_id)
    if not match:
        raise ValueError(f"Fleet Guide source ID has no model year: {source_id}")
    return int(match.group(1))


def rule_matches(rule: ModelRule, value: str) -> bool:
    return any(re.search(pattern, value, re.IGNORECASE) for pattern in rule.patterns)


def specific_model_rules(value: str) -> list[ModelRule]:
    matched: list[ModelRule] = []
    occupied: set[str] = set()
    blocked: set[str] = set()
    base_models_by_variant = {
        "blazer-ev": {"blazer"},
        "city-express": {"express"},
        "cruze-limited": {"cruze"},
        "equinox-ev": {"equinox"},
        "impala-limited": {"impala"},
        "malibu-classic-2008": {"malibu"},
        "malibu-limited": {"malibu"},
        "silverado-ev": {"silverado"},
        "silverado-hd": {"silverado"},
        "spark-ev": {"spark"},
        "traverse-limited": {"traverse"},
    }
    for rule in MODEL_RULES:
        if occupied.intersection(rule.model_ids) or blocked.intersection(rule.model_ids):
            continue
        if rule_matches(rule, value):
            matched.append(rule)
            occupied.update(rule.model_ids)
            for model_id in rule.model_ids:
                blocked.update(base_models_by_variant.get(model_id, set()))
    return matched


def strong_page_models(text: str) -> tuple[list[str], str | None]:
    compact = normalize_text(text)
    upper = compact.upper()
    windows: list[tuple[int, str]] = []

    for marker in ("OVERVIEW", "MODEL AVAILABILITY", "AVAILABLE MODELS"):
        start = upper.find(marker)
        if start >= 0:
            windows.append((9, compact[start : start + 900]))

    for match in re.finditer(r"CHEVROLET", upper):
        start = max(0, match.start() - 80)
        windows.append((11, compact[start : match.start() + 180]))

    if not windows:
        return [], None

    scores: Counter[str] = Counter()
    labels: dict[str, str] = {}
    for weight, window in windows:
        for rule in specific_model_rules(window):
            for model_id in rule.model_ids:
                scores[model_id] += weight
                labels[model_id] = rule.display_label

    if not scores:
        return [], None

    highest = max(scores.values())
    selected = sorted(model_id for model_id, score in scores.items() if score == highest)
    if set(selected) == {"suburban", "tahoe"}:
        return selected, "Tahoe/Suburban"
    label = "/".join(labels[model_id] for model_id in selected)
    return selected, label


def specialty_label(text: str, include_body_style: bool = False) -> str | None:
    upper = normalize_text(text).upper()
    labels: list[str] = []
    for pattern, label in (
        (r"POLICE", "police"),
        (r"SPECIAL\s+SERVICE", "special service"),
        (r"TRANSPORT", "transport"),
        (r"MOBILITY|PARATRANSIT", "mobility or paratransit"),
        (r"HYBRID", "hybrid"),
        (r"CNG|BI-FUEL", "alternative fuel"),
        (r"CHASSIS\s+CAB", "chassis cab"),
        (r"CUTAWAY", "cutaway"),
    ):
        if re.search(pattern, upper):
            labels.append(label)
    if include_body_style:
        for pattern, label in ((r"CARGO", "cargo"), (r"PANEL", "panel")):
            if re.search(pattern, upper):
                labels.append(label)
    return ", ".join(dict.fromkeys(labels)) or None


def table_of_contents_map(reader: PdfReader) -> tuple[list[dict[str, Any]], int]:
    dotted_entry = re.compile(r"\.{2,}\s*(\d(?:\s*\d){0,2})\b")
    best_text = ""
    best_matches: list[re.Match[str]] = []
    early_page_texts = [
        page.extract_text() or "" for page in reader.pages[: min(30, len(reader.pages))]
    ]
    candidate_page_texts = early_page_texts
    for raw_text in candidate_page_texts:
        compact = normalize_text(raw_text)
        matches = list(dotted_entry.finditer(compact))
        if len(matches) > len(best_matches):
            best_text = compact
            best_matches = matches

    entries: list[dict[str, Any]] = []
    def append_entry(label: str, printed_page: int) -> None:
        if printed_page > len(reader.pages) + 5:
            return
        rules = specific_model_rules(label[-180:])
        model_ids = sorted({model_id for rule in rules for model_id in rule.model_ids})
        entries.append(
            {
                "printed_page": printed_page,
                "model_ids": model_ids,
                "source_model_label": "/".join(rule.display_label for rule in rules)
                if rules
                else None,
                "program_scope": specialty_label(label[-180:], include_body_style=True),
            }
        )

    if len(best_matches) >= 8:
        start = 0
        for match in best_matches:
            label = normalize_text(best_text[start : match.start()]).strip(" .")
            start = match.end()
            append_entry(label, int(re.sub(r"\s+", "", match.group(1))))
    else:
        best_line_entries: list[tuple[str, int]] = []
        best_line_score = (-1, -1, -1)
        best_hallmark_count = 0
        line_number = re.compile(r"^(.*?)(\d{1,3})(?:\s*,\s*\d{1,3})?\s*$")
        for raw_text in candidate_page_texts:
            parsed: list[tuple[str, int]] = []
            pending: list[str] = []
            for raw_line in raw_text.splitlines():
                line = normalize_text(raw_line)
                if not line:
                    continue
                match = line_number.match(line)
                if not match:
                    pending.append(line)
                    continue
                label_part = normalize_text(match.group(1)).strip(" .")
                number_text = match.group(2)
                printed_page = int(number_text)
                if len(number_text) == 3 and (
                    printed_page > len(reader.pages) + 5 or number_text.startswith("0")
                ):
                    label_part += number_text[0]
                    number_text = number_text[1:]
                    printed_page = int(number_text)
                label = normalize_text(" ".join(pending + ([label_part] if label_part else [])))
                pending = []
                if not label or len(label) > 220:
                    continue
                parsed.append((label, printed_page))
            model_entry_count = sum(bool(specific_model_rules(label)) for label, _ in parsed)
            upper = normalize_text(raw_text).upper()
            hallmark_count = sum(
                term in upper
                for term in (
                    "COMPACT CAR",
                    "MIDSIZE/LARGE CAR",
                    "SPORT CAR",
                    "ELECTRIC VEHICLE",
                    "SPORT UTILITY",
                    "CROSSOVER",
                    "PICKUP",
                    "CHASSIS CAB",
                    "PASSENGER VAN",
                    "CARGO/CUTAWAY",
                    "SPECIALTY VEHICLE",
                    "RESOURCES",
                )
            )
            score = (hallmark_count, model_entry_count, len(parsed))
            if score > best_line_score:
                best_line_entries = parsed
                best_line_score = score
                best_hallmark_count = hallmark_count
        if best_hallmark_count < 4:
            best_line_entries = []
        for label, printed_page in best_line_entries:
            append_entry(label, printed_page)

    if len(entries) < 8:
        return [], 0
    entries.sort(key=lambda entry: entry["printed_page"])

    offsets: Counter[int] = Counter()
    footer_patterns = (
        re.compile(r"Google\s+Play\s+(\d{1,3})\b", re.I),
        re.compile(r"gmfleet\.com\s+(\d{1,3})\b", re.I),
        re.compile(r"^\s*(\d{1,3})\b"),
    )
    for physical_page, page in enumerate(
        reader.pages[: min(60, len(reader.pages))], start=1
    ):
        text = normalize_text(page.extract_text() or "")
        for pattern in footer_patterns:
            match = pattern.search(text)
            if not match:
                continue
            printed_page = int(match.group(1))
            offset = physical_page - printed_page
            if -3 <= offset <= 5:
                offsets[offset] += 1
                break
    offset = offsets.most_common(1)[0][0] if offsets else 0
    return entries, offset


def toc_models_for_page(
    toc_entries: list[dict[str, Any]], printed_page: int
) -> dict[str, Any] | None:
    preceding = [entry for entry in toc_entries if entry["printed_page"] <= printed_page]
    if not preceding:
        return None
    return preceding[-1]


def printed_page_number(text: str, physical_page: int) -> int | None:
    compact = normalize_text(text)
    for pattern in (
        re.compile(r"Google\s+Play\s+(\d{1,3})\b", re.I),
        re.compile(r"gmfleet\.com\s+(\d{1,3})\b", re.I),
        re.compile(r"For more information[^\d]{0,80}(\d{1,3})\b", re.I),
    ):
        match = pattern.search(compact)
        if not match:
            continue
        printed_page = int(match.group(1))
        if -3 <= physical_page - printed_page <= 20:
            return printed_page
    return None


def scan_source_pages(source: dict[str, Any]) -> dict[str, Any]:
    path = ROOT / source["local_file_path"]
    reader = PdfReader(path)
    year = source_year(source["source_id"])
    toc_entries, printed_page_offset = (
        table_of_contents_map(reader) if year <= 2018 else ([], 0)
    )
    current_models: list[str] = []
    current_label: str | None = None
    current_scope: str | None = None
    current_page = 0
    palette_pages: list[dict[str, Any]] = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        printed_page = printed_page_number(text, page_number)
        toc_entry = toc_models_for_page(
            toc_entries,
            printed_page if printed_page is not None else page_number - printed_page_offset,
        )
        models, label = strong_page_models(text)
        override = PAGE_MODEL_OVERRIDES.get((source["source_id"], page_number))
        if override:
            models, label = list(override[0]), override[1]
        if models:
            current_models = models
            current_label = label
            current_scope = specialty_label(normalize_text(text)[:600])
            current_page = page_number
        elif toc_entry:
            current_models = toc_entry["model_ids"]
            current_label = toc_entry["source_model_label"]
            current_scope = toc_entry["program_scope"]
            current_page = page_number
        elif RESET_PATTERN.search(text) or page_number - current_page > 1:
            current_models = []
            current_label = None
            current_scope = None

        scope_override_key = (source["source_id"], page_number)
        if scope_override_key in PAGE_PROGRAM_SCOPE_OVERRIDES:
            current_scope = PAGE_PROGRAM_SCOPE_OVERRIDES[scope_override_key]
        if current_models and set(current_models).issubset(NATIVE_SPECIALTY_MODEL_IDS):
            current_scope = None

        compact_text = re.sub(
            r"\be\s+xterior\b", "exterior", normalize_text(text), flags=re.I
        )
        has_color_header = bool(COLOR_HEADER_PATTERN.search(compact_text)) or bool(
            re.search(r"\bexterior\b", compact_text, re.I)
            and re.search(r"\bcolors?\d{1,2}\b", compact_text, re.I)
        )
        if not has_color_header:
            continue
        if not current_models:
            continue
        palette_pages.append(
            {
                "pdf_page": page_number,
                "model_ids": current_models,
                "source_model_label": current_label,
                "program_scope": current_scope,
                "page_text": text,
            }
        )

    return {
        "source_id": source["source_id"],
        "model_year": source_year(source["source_id"]),
        "palette_pages": palette_pages,
    }


def line_words(words: Iterable[dict[str, Any]], tolerance: float = 2.2) -> list[list[dict[str, Any]]]:
    ordered = sorted(words, key=lambda word: (word["top"], word["x0"]))
    lines: list[list[dict[str, Any]]] = []
    for word in ordered:
        if not lines or abs(lines[-1][0]["top"] - word["top"]) > tolerance:
            lines.append([word])
        else:
            lines[-1].append(word)
    for line in lines:
        line.sort(key=lambda word: word["x0"])
    return lines


def clean_color_name(value: str) -> str:
    value = normalize_text(value)
    value = re.sub(r"^(?:COLORS?\s+)+", "", value, flags=re.IGNORECASE)
    value = re.sub(
        r"^(?:up\s+split-?|a\s+safe\s+at\s+all)\s*",
        "",
        value,
        flags=re.IGNORECASE,
    )
    value = re.sub(r"\bLink\b", "", value, flags=re.IGNORECASE)
    value = re.split(
        r"\s*(?:\*\s*Always|For important legal|For more information|MODEL\s+AVAILABILITY|SPECIFICATIONS|Shown with|Seating|Head room|Shoulder room|Leg room|Max\.|Approx\.|oVer\s+VieW|SPor\s+T\s+Car|MidSiZe|FuLL.?SiZe|eLeCTri\s+C|HYBrID|model year shown)\b",
        value,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]
    value = re.sub(
        r"\((?:new|late availability|interim availability|limited availability)\)",
        "",
        value,
        flags=re.IGNORECASE,
    )
    value = re.sub(
        r"\b(?:new|late availability|interim availability|limited availability)\b",
        "",
        value,
        flags=re.IGNORECASE,
    )
    value = re.sub(r"(?<=[A-Za-z])\d+(?:,\s*\d+)*\b", "", value)
    value = re.sub(r"\s+\d{1,2}\b", " ", value)
    value = re.sub(
        r"\b(Metallic|Tintcoat|Tricoat|ChromaFlair|Mica)([a-f])\b",
        r"\1",
        value,
        flags=re.IGNORECASE,
    )
    value = re.sub(
        r"\b(White|Black|Red|Blue|Green|Yellow|Orange|Hot)([a-f])\b",
        r"\1",
        value,
        flags=re.IGNORECASE,
    )
    value = re.sub(r"\s+", " ", value).strip(" .,:;*-$")
    tokens = value.split()
    terminal_terms = HUE_TERMS | FINISH_TERMS | {
        "cacti",
        "cayenne",
        "hot",
        "ink",
        "kalamata",
        "pipe",
        "raspberry",
        "salsa",
        "sly",
        "victory",
    }
    terminal_positions = [
        index
        for index, token in enumerate(tokens[:10])
        if re.sub(r"[^A-Za-z]", "", token).casefold() in terminal_terms
    ]
    if terminal_positions and terminal_positions[-1] + 1 < len(tokens):
        value = " ".join(tokens[: terminal_positions[-1] + 1])
    return value


def extract_inline_palette(text: str) -> list[dict[str, Any]]:
    compact = normalize_text(text)
    headers = list(re.finditer(r"\bColors?\s*\d{0,2}\b", compact, re.I))
    if not headers:
        return []
    exterior_headers = [
        match
        for match in headers
        if re.search(
            r"e\s*xterior\s*$",
            compact[max(0, match.start() - 64) : match.start()],
            re.I,
        )
    ]
    header = exterior_headers[-1] if exterior_headers else headers[-1]
    window_start = 0
    window_end = len(compact)
    tail = compact[window_start:window_end]
    header_start = header.start() - window_start
    header_end = header.end() - window_start
    tail = re.sub(r"\b(\d[A-Z])\d\b", r"\1", tail)
    code_pattern = re.compile(
        r"\b(?:\d{2,3}U|[A-Z]\dU|\d[A-Z]U|\d[A-Z]|G[A-Z0-9]{2})\b"
    )
    matches = list(code_pattern.finditer(tail))
    if not matches:
        return []

    # Some guide text layers place the paint disclaimer between the visible
    # heading and the swatches. Keep the densest run of paint codes instead of
    # cutting at the disclaimer, which erased the 2013-2015 palettes.
    runs: list[list[re.Match[str]]] = [[matches[0]]]
    for match in matches[1:]:
        if match.start() - runs[-1][-1].start() <= 350:
            runs[-1].append(match)
        else:
            runs.append([match])
    matches = max(
        runs,
        key=lambda run: (
            len(run),
            -min(abs(run[-1].end() - header_start), abs(run[0].start() - header_end)),
        ),
    )

    entries: list[dict[str, Any]] = []
    for index, match in enumerate(matches):
        if index + 1 < len(matches):
            end = matches[index + 1].start()
        elif header_start > match.end():
            end = header_start
        else:
            end = min(len(tail), match.end() + 280)
        candidate = clean_color_name(tail[match.end() : end])
        if plausible_color_name(candidate):
            entries.append(
                {"name": candidate, "factory_code": match.group(0).upper()}
            )
    return entries


def plausible_color_name(value: str) -> bool:
    cleaned = clean_color_name(value)
    if not cleaned or len(cleaned) > 72:
        return False
    lowered = cleaned.casefold()
    words = set(re.findall(r"[a-z]+", lowered))
    if words.intersection(HUE_TERMS | FINISH_TERMS):
        return True
    return lowered in {
        "cacti",
        "cayenne",
        "kalamata",
        "passion fruit",
        "raspberry",
        "salsa",
        "sly",
        "son of a gun",
        "toasted marshmallow",
        "victory",
    }


def color_header(words: list[dict[str, Any]]) -> dict[str, Any] | None:
    color_words = [
        word for word in words if re.fullmatch(r"colors?\d*", word["text"], re.I)
    ]
    adjacent = [
        word
        for word in words
        if word["text"].casefold() == "exterior"
        and any(
            abs(word["top"] - color["top"]) <= 3
            and 0 <= color["x0"] - word["x1"] <= 18
            for color in color_words
        )
    ]
    if adjacent:
        return sorted(adjacent, key=lambda word: (-word["height"], word["top"]))[0]
    candidates = [
        word
        for word in words
        if word["text"] == "EXTERIOR" or word["text"].upper() == "EEXXTTEERRIIOORR"
    ]
    if not candidates:
        candidates = [word for word in words if word["text"].upper() == "EXTERIOR"]
    if not candidates:
        return None
    uppercase = [word for word in candidates if word["text"] == word["text"].upper()]
    return sorted(uppercase or candidates, key=lambda word: (-word["height"], word["top"]))[0]


def extract_overprinted_palette(
    page: pdfplumber.page.Page, header: dict[str, Any]
) -> list[dict[str, Any]]:
    crop_x0 = page.width * 0.63
    crop_x1 = page.width - 8
    crop_y0 = header["top"] + 12
    crop_y1 = page.height - 18
    character_groups: dict[tuple[float, float], list[str]] = defaultdict(list)
    for character in page.chars:
        if not (
            crop_x0 <= character["x0"] <= crop_x1
            and crop_y0 <= character["top"] <= crop_y1
        ):
            continue
        character_groups[(round(character["top"], 1), round(character["x0"], 1))].append(
            character["text"]
        )

    duplicated_by_top: dict[float, list[tuple[float, str]]] = defaultdict(list)
    for (top, x0), values in character_groups.items():
        visible = [value for value in values if value.strip()]
        if len(visible) < 2:
            continue
        duplicated_by_top[top].append((x0, visible[-1]))

    anchors: list[dict[str, Any]] = []
    for top, characters in duplicated_by_top.items():
        characters.sort()
        groups: list[list[tuple[float, str]]] = []
        for character in characters:
            if not groups or character[0] - groups[-1][-1][0] > 9:
                groups.append([character])
            else:
                groups[-1].append(character)
        for group in groups:
            value = "".join(character for _, character in group).upper()
            if re.fullmatch(
                r"(?:\d{2,3}U|[A-Z]\dU|\d[A-Z]U|G[A-Z0-9]{2})", value
            ):
                anchors.append({"x0": group[0][0], "top": top, "code": value})
    words = page.extract_words(x_tolerance=1.5, y_tolerance=2, use_text_flow=False)

    def recover_code(value: str) -> str | None:
        upper = value.upper()
        if re.fullmatch(
            r"(?:\d{2,3}U|[A-Z]\dU|\d[A-Z]U|G[A-Z0-9]{2})", upper
        ):
            return upper
        repeated_u = re.fullmatch(r"(\d{2,3})U+", upper)
        if repeated_u:
            return f"{repeated_u.group(1)}U"
        letters = "".join(character for character in upper if character.isalpha())
        if len(letters) == 4 and letters.startswith("G") and "U" in letters:
            letters = letters.replace("U", "", 1)
        return letters if re.fullmatch(r"G[A-Z0-9]{2}", letters) else None

    word_anchors: list[dict[str, Any]] = []
    for word in words:
        code = recover_code(word["text"])
        if not (
            code
            and crop_x0 <= word["x0"] <= crop_x1
            and crop_y0 <= word["top"] <= crop_y1
        ):
            continue
        word_anchors.append({"x0": word["x0"], "top": word["top"], "code": code})
    if len(word_anchors) >= 3:
        anchors = word_anchors
    else:
        for word_anchor in word_anchors:
            if not any(
                anchor["code"] == word_anchor["code"]
                and abs(anchor["x0"] - word_anchor["x0"]) <= 8
                and abs(anchor["top"] - word_anchor["top"]) <= 4
                for anchor in anchors
            ):
                anchors.append(word_anchor)
    if not anchors:
        return []

    x_values = sorted({anchor["x0"] for anchor in anchors})
    gaps = [
        (x_values[index + 1] - x_values[index], index)
        for index in range(len(x_values) - 1)
    ]
    split_x = (
        (x_values[max(gaps)[1]] + x_values[max(gaps)[1] + 1]) / 2
        if gaps and max(gaps)[0] > 30
        else page.width * 0.80
    )
    for anchor in anchors:
        anchor["column"] = 0 if anchor["x0"] < split_x else 1

    right_code_x0 = min(
        (anchor["x0"] for anchor in anchors if anchor["column"] == 1),
        default=crop_x1,
    )
    entries: list[dict[str, Any]] = []
    for column in (0, 1):
        column_anchors = sorted(
            [anchor for anchor in anchors if anchor["column"] == column],
            key=lambda anchor: anchor["top"],
        )
        if not column_anchors:
            continue
        name_x0 = max(anchor["x0"] for anchor in column_anchors) + 22
        name_x1 = right_code_x0 - 4 if column == 0 else crop_x1
        for index, anchor in enumerate(column_anchors):
            previous_top = (
                (column_anchors[index - 1]["top"] + anchor["top"]) / 2
                if index > 0
                else anchor["top"] - 13
            )
            next_top = (
                (anchor["top"] + column_anchors[index + 1]["top"]) / 2
                if index + 1 < len(column_anchors)
                else crop_y1
            )
            name_words = [
                word
                for word in words
                if name_x0 <= word["x0"] < name_x1
                and previous_top <= word["top"] < next_top
            ]
            candidate = clean_color_name(
                " ".join(
                    word["text"] for line in line_words(name_words) for word in line
                )
            )
            if plausible_color_name(candidate):
                entries.append({"name": candidate, "factory_code": anchor["code"]})
    return entries


def extract_coded_palette(
    page: pdfplumber.page.Page,
    year: int,
    header: dict[str, Any],
) -> list[dict[str, Any]]:
    if year <= 2011:
        return extract_overprinted_palette(page, header)
    if year <= 2015:
        words = page.extract_words(x_tolerance=1.5, y_tolerance=2, use_text_flow=False)
        x0 = max(0, header["x0"] - 50)
        x1 = min(page.width - 8, header["x0"] + 300)
        y0 = header["bottom"] + 2
        y1 = min(page.height - 8, header["top"] + 145)
        code_anchors = [
            word
            for word in words
            if x0 <= word["x0"] <= x1
            and y0 <= word["top"] <= y1
            and CODE_PATTERN.fullmatch(word["text"])
        ]
        if not code_anchors:
            return []
        columns: list[list[dict[str, Any]]] = []
        for anchor in sorted(code_anchors, key=lambda word: word["x0"]):
            if not columns or abs(columns[-1][0]["x0"] - anchor["x0"]) > 24:
                columns.append([anchor])
            else:
                columns[-1].append(anchor)
        centers = [
            sum(anchor["x0"] for anchor in column) / len(column) for column in columns
        ]
        boundaries = [x0] + [
            (centers[index] + centers[index + 1]) / 2
            for index in range(len(centers) - 1)
        ] + [min(x1, centers[-1] + 72)]
        entries: list[dict[str, Any]] = []
        for column_index, column in enumerate(columns):
            ordered = sorted(column, key=lambda word: word["top"])
            for index, anchor in enumerate(ordered):
                cell_bottom = (
                    ordered[index + 1]["top"] - 2
                    if index + 1 < len(ordered)
                    else min(y1, anchor["top"] + 25)
                )
                name_words = [
                    word
                    for word in words
                    if boundaries[column_index] <= word["x0"] < boundaries[column_index + 1]
                    and anchor["top"] + 2 <= word["top"] < cell_bottom
                    and word is not anchor
                ]
                candidate = clean_color_name(
                    " ".join(
                        word["text"]
                        for line in line_words(name_words)
                        for word in line
                    )
                )
                if plausible_color_name(candidate):
                    entries.append(
                        {"name": candidate, "factory_code": anchor["text"].upper()}
                    )
        return entries
    if year == 2016:
        x0, x1 = 28, min(310, page.width * 0.53)
        y0, y1 = header["top"] + 8, min(page.height - 20, header["top"] + 165)
    else:
        x0, x1 = max(0, page.width - 158), page.width - 16
        y0, y1 = header["top"] + 8, min(page.height - 28, header["top"] + 440)

    words = [
        word
        for word in page.extract_words(x_tolerance=1.5, y_tolerance=2, use_text_flow=False)
        if x0 <= word["x0"] <= x1 and y0 <= word["top"] <= y1
    ]
    code_words = [
        word
        for word in words
        if CODE_PATTERN.fullmatch(word["text"])
    ]
    if not code_words:
        return []

    clusters: list[list[dict[str, Any]]] = []
    for word in sorted(code_words, key=lambda item: item["x0"]):
        if not clusters or abs(clusters[-1][0]["x0"] - word["x0"]) > 24:
            clusters.append([word])
        else:
            clusters[-1].append(word)
    anchors = sorted(sum(word["x0"] for word in cluster) / len(cluster) for cluster in clusters)
    boundaries = [x0] + [
        (anchors[index] + anchors[index + 1]) / 2
        for index in range(len(anchors) - 1)
    ] + [x1]

    entries: list[dict[str, Any]] = []
    for index, anchor in enumerate(anchors):
        column_words = [
            word
            for word in words
            if boundaries[index] <= word["x0"] < boundaries[index + 1]
        ]
        buffered: list[str] = []
        for line in line_words(column_words):
            code = next(
                (word["text"].upper() for word in line if CODE_PATTERN.fullmatch(word["text"])),
                None,
            )
            text = " ".join(
                word["text"] for word in line if not CODE_PATTERN.fullmatch(word["text"])
            )
            if code:
                candidate = clean_color_name(" ".join(buffered + ([text] if text else [])))
                if plausible_color_name(candidate):
                    entries.append({"name": candidate, "factory_code": code})
                buffered = []
            elif text:
                if re.search(r"\b(?:NOTE|MODEL|SPECIFICATIONS|For more information)\b", text, re.I):
                    buffered = []
                else:
                    buffered.append(text)

    return entries


def extract_uncoded_palette(
    page: pdfplumber.page.Page,
    year: int,
    header: dict[str, Any],
) -> list[dict[str, Any]]:
    x_limit = 440 if page.width >= 1100 else 350
    y0 = header["bottom"]
    y1 = min(page.height - 20, header["top"] + 150)
    all_words = page.extract_words(x_tolerance=1, y_tolerance=2, use_text_flow=False)
    words = [
        word
        for word in all_words
        if 24 <= word["x0"] < x_limit and y0 <= word["top"] <= y1
    ]
    note_tops = [word["top"] for word in words if word["text"].upper().startswith("NOTE")]
    if note_tops:
        words = [word for word in words if word["top"] < min(note_tops) - 2]
    if not words:
        return []

    swatches = []
    seen_swatches: set[tuple[float, float]] = set()
    for image in page.images:
        if not (
            20 <= image["x0"] < x_limit
            and y0 <= image["top"] <= y1
            and 15 <= image["width"] <= 100
            and 8 <= image["height"] <= 60
        ):
            continue
        key = (round(image["x0"], 1), round(image["top"], 1))
        if key in seen_swatches:
            continue
        seen_swatches.add(key)
        swatches.append(image)

    if not swatches:
        return []

    rows: list[list[dict[str, Any]]] = []
    for swatch in sorted(swatches, key=lambda item: (item["top"], item["x0"])):
        if not rows or abs(rows[-1][0]["top"] - swatch["top"]) > 4:
            rows.append([swatch])
        else:
            rows[-1].append(swatch)
    for row in rows:
        row.sort(key=lambda item: item["x0"])

    anchors: list[float] = []
    for swatch in sorted(swatches, key=lambda item: item["x0"]):
        if not anchors or abs(anchors[-1] - swatch["x0"]) > 6:
            anchors.append(float(swatch["x0"]))
    boundaries = [24.0] + [anchor - 2 for anchor in anchors[1:]] + [float(x_limit)]

    page_text = page.extract_text() or ""
    metallic_markers = set(
        re.findall(r"\b(\d{1,2})\s+Metallic paint\b", page_text, re.I)
    )

    def finalize(raw_value: str) -> str:
        candidate = clean_color_name(raw_value)
        if (
            candidate
            and "metallic" not in candidate.casefold()
            and any(
                re.search(rf"(?<=[A-Za-z]){re.escape(marker)}(?:\b|,)", raw_value)
                for marker in metallic_markers
            )
        ):
            candidate = f"{candidate} Metallic"
        return canonicalize_extracted_color(candidate)

    entries: list[dict[str, Any]] = []
    if year >= 2023:
        typical_step = min(
            [right - left for left, right in zip(anchors, anchors[1:])] or [90.0]
        )
        for row in rows:
            for swatch in row:
                column = min(
                    range(len(anchors)), key=lambda index: abs(anchors[index] - swatch["x0"])
                )
                cell_x0 = swatch["x1"] + 2
                cell_x1 = (
                    anchors[column + 1] - 3
                    if column + 1 < len(anchors)
                    else min(float(x_limit), swatch["x0"] + typical_step - 3)
                )
                cell_words = [
                    word
                    for word in words
                    if cell_x0 <= word["x0"] < cell_x1
                    and swatch["top"] - 1 <= word["top"] <= swatch["bottom"]
                ]
                raw = " ".join(
                    word["text"] for line in line_words(cell_words) for word in line
                )
                candidate = finalize(raw)
                if plausible_color_name(candidate):
                    entries.append({"name": candidate, "factory_code": None})
        return entries

    previous_bottom = y0
    for row in rows:
        row_top = min(swatch["top"] for swatch in row)
        row_bottom = max(swatch["bottom"] for swatch in row)
        for swatch in row:
            column = min(
                range(len(anchors)), key=lambda index: abs(anchors[index] - swatch["x0"])
            )
            cell_words = [
                word
                for word in words
                if boundaries[column] <= word["x0"] < boundaries[column + 1]
                and previous_bottom <= word["top"] < row_top - 1
            ]
            raw = " ".join(
                word["text"] for line in line_words(cell_words) for word in line
            )
            candidate = finalize(raw)
            if plausible_color_name(candidate):
                entries.append({"name": candidate, "factory_code": None})
        previous_bottom = row_bottom + 1
    return entries


def extract_source_palettes(
    source: dict[str, Any], page_records: list[dict[str, Any]]
) -> dict[int, list[dict[str, Any]]]:
    year = source_year(source["source_id"])
    palettes: dict[int, list[dict[str, Any]]] = {}
    with pdfplumber.open(ROOT / source["local_file_path"]) as pdf:
        for page_record in page_records:
            page_number = page_record["pdf_page"]
            if 2012 <= year <= 2015:
                palettes[page_number] = extract_inline_palette(page_record["page_text"])
                continue
            page = pdf.pages[page_number - 1]
            words = page.extract_words(
                x_tolerance=1.5, y_tolerance=2, use_text_flow=False
            )
            header = color_header(words)
            if header is None:
                palettes[page_number] = []
            elif year <= 2018:
                palettes[page_number] = extract_coded_palette(page, year, header)
            else:
                palettes[page_number] = extract_uncoded_palette(page, year, header)
    return palettes


def complete_source_scan(payload: tuple[dict[str, Any], dict[str, Any]]) -> dict[str, Any]:
    source, scan = payload
    palettes = extract_source_palettes(source, scan["palette_pages"])
    completed = dict(scan)
    completed["palette_pages"] = [
        {
            **page_record,
            "colors": palettes.get(page_record["pdf_page"], []),
        }
        for page_record in scan["palette_pages"]
    ]
    return completed


def source_metadata(source: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_id": source["source_id"],
        "title": source["title"],
        "publisher": source["publisher"],
        "document_authority": source["document_authority"],
        "retrieval_url": source["retrieval_url"],
        "direct_official_url": source.get("direct_official_url"),
        "historical_official_url": source.get("historical_official_url"),
        "landing_url": source.get("landing_url"),
        "archive_url": source.get("archive_url"),
        "sha256": source["sha256"],
        "bytes": source["bytes"],
        "pdf_page_count": source["page_count"],
        "revision_or_document_date": source.get("revision_or_document_date"),
    }


def build_audit(workers: int) -> dict[str, Any]:
    source_data = json.loads(SOURCE_DATA_PATH.read_text(encoding="utf-8"))
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    model_names = {model["id"]: model["name"] for model in catalog["models"]}
    catalog_modern_keys = {
        (model["id"], year)
        for model in catalog["models"]
        for model_range in model["model_year_ranges"]
        for year in range(max(2008, model_range["start"]), min(2024, model_range["end"]) + 1)
    }
    sources = [
        source
        for source in source_data["sources"]
        if source.get("source_type") == "fleet_guide_pdf"
        and source.get("annual_model_year_coverage_anchor", True)
        and 2008 <= source_year(source["source_id"]) <= 2024
    ]

    with ProcessPoolExecutor(max_workers=workers) as pool:
        scans = list(pool.map(scan_source_pages, sources))

    source_by_id = {source["source_id"]: source for source in sources}
    with ProcessPoolExecutor(max_workers=workers) as pool:
        scans = list(
            pool.map(
                complete_source_scan,
                [(source_by_id[scan["source_id"]], scan) for scan in scans],
            )
        )

    pages: list[dict[str, Any]] = []
    for scan in scans:
        for page_record in scan["palette_pages"]:
            page_record = dict(page_record)
            page_record["source_id"] = scan["source_id"]
            page_record["model_year"] = scan["model_year"]
            pages.append(page_record)

    grouped: dict[tuple[str, int], list[dict[str, Any]]] = defaultdict(list)
    for page_record in pages:
        for model_id in page_record["model_ids"]:
            grouped[(model_id, page_record["model_year"])].append(page_record)

    records: list[dict[str, Any]] = []
    for (model_id, model_year), model_pages in sorted(grouped.items()):
        if (model_id, model_year) not in catalog_modern_keys:
            continue
        colors_by_name: dict[str, dict[str, Any]] = {}
        for page_record in model_pages:
            for color in page_record["colors"]:
                normalized = clean_color_name(color["name"])
                key = normalized.casefold()
                entry = colors_by_name.setdefault(
                    key,
                    {
                        "name": normalized,
                        "factory_codes": [],
                        "source_pages": [],
                        "regular_source_pages": [],
                        "program_scopes": [],
                    },
                )
                if color.get("factory_code") and color["factory_code"] not in entry["factory_codes"]:
                    entry["factory_codes"].append(color["factory_code"])
                if page_record["pdf_page"] not in entry["source_pages"]:
                    entry["source_pages"].append(page_record["pdf_page"])
                scope = page_record.get("program_scope")
                if scope and scope not in entry["program_scopes"]:
                    entry["program_scopes"].append(scope)
                if not scope and page_record["pdf_page"] not in entry["regular_source_pages"]:
                    entry["regular_source_pages"].append(page_record["pdf_page"])

        source_ids = sorted({page["source_id"] for page in model_pages})
        has_regular_palette = any(not page.get("program_scope") for page in model_pages)
        records.append(
            {
                "record_id": f"modern-fleet:{model_id}:{model_year}",
                "model_id": model_id,
                "model_name": model_names.get(model_id, MODEL_BY_ID.get(model_id, model_id)),
                "model_year": model_year,
                "audit_state": (
                    "reviewed_qualified_palette_union"
                    if has_regular_palette
                    else "reviewed_specialty_palette_subset"
                ),
                "complete_regular_palette": False,
                "evidence_class": (
                    "qualified_palette_union"
                    if has_regular_palette
                    else "specialty_palette_subset"
                ),
                "source_ids": source_ids,
                "pdf_pages": sorted({page["pdf_page"] for page in model_pages}),
                "source_model_labels": sorted(
                    {
                        page["source_model_label"]
                        for page in model_pages
                        if page.get("source_model_label")
                    }
                ),
                "program_scopes": sorted(
                    {
                        page["program_scope"]
                        for page in model_pages
                        if page.get("program_scope")
                    }
                ),
                "colors": sorted(colors_by_name.values(), key=lambda color: color["name"].casefold()),
                "limitations": [
                    "This is the visually structured Fleet Guide palette union for the cited Chevrolet model pages.",
                    "Exact trim, equipment, body, and program restrictions remain subject to the governing Order Guide unless printed on the cited page.",
                    "Specialty pages are retained as program scoped evidence and are not treated as unrestricted retail availability.",
                ],
            }
        )

    audited_keys = {(record["model_id"], record["model_year"]) for record in records}
    empty_records = [record["record_id"] for record in records if not record["colors"]]

    return {
        "schema_version": 1,
        "audited_on": AUDITED_ON,
        "scope": "United States Chevrolet model years 2008-2024 in the complete annual GM Fleet Guide corpus.",
        "publication_rule": (
            "Publish only source printed model page palette unions. Preserve specialty program scope and never infer a missing color from an adjacent model or year."
        ),
        "sources": [source_metadata(source) for source in sources],
        "summary": {
            "source_count": len(sources),
            "source_page_count": sum(len(scan["palette_pages"]) for scan in scans),
            "record_count": len(records),
            "color_assertion_count": sum(len(record["colors"]) for record in records),
            "catalog_model_years_2008_2024": len(catalog_modern_keys),
            "audited_catalog_model_years_2008_2024": len(audited_keys & catalog_modern_keys),
            "remaining_catalog_model_years_2008_2024": len(catalog_modern_keys - audited_keys),
            "empty_record_count": len(empty_records),
        },
        "remaining_catalog_model_years": [
            {"model_id": model_id, "model_name": model_names[model_id], "model_year": year}
            for model_id, year in sorted(catalog_modern_keys - audited_keys)
        ],
        "empty_records": empty_records,
        "records": records,
        "page_diagnostics": sorted(
            [
                {
                    "source_id": page["source_id"],
                    "model_year": page["model_year"],
                    "pdf_page": page["pdf_page"],
                    "model_ids": page["model_ids"],
                    "source_model_label": page["source_model_label"],
                    "program_scope": page["program_scope"],
                    "color_count": len(page["colors"]),
                }
                for page in pages
            ],
            key=lambda row: (row["model_year"], row["pdf_page"], row["model_ids"]),
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    args = parser.parse_args()
    audit = build_audit(max(1, args.workers))
    output = args.output if args.output.is_absolute() else ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(audit, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(audit["summary"], indent=2))
    if audit["empty_records"]:
        print(f"empty records: {len(audit['empty_records'])}")
    if audit["remaining_catalog_model_years"]:
        print(f"remaining model years: {len(audit['remaining_catalog_model_years'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
