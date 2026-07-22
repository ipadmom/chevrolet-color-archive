import modelCatalogData from "../data/catalog/chevrolet-us-nameplates.json";
import colorResearchGapData from "../data/audits/color-research-gap-inventory.json";
import commonsPhotoManifestData from "../data/photos/commons-release-manifest.json";
import suburban2000to2007AuditData from "../data/audits/suburban-2000-2007.json";
import rockAutoPaintCodeLeadData from "../data/sources/rockauto-paint-code-leads.json";
import tahoePaintSchemeData from "../data/audits/tahoe-1995-2000.json";
import suburbanPaintSchemeData from "../data/audits/suburban-paint-schemes-1977-1999.json";
import type {
  ArchiveColor,
  ArchiveModel,
  AvailabilityState,
  Generation,
  YearSource,
} from "./archive-data";

export type ArchiveSearchRecordKind =
  | "availability"
  | "model-year"
  | "paint-scheme"
  | "photo"
  | "research-lead"
  | "secondary-lead"
  | "source-candidate"
  | "supplemental";

export type ArchiveSearchRecord = {
  colorCode: string | null;
  colorId: string | null;
  colorName: string | null;
  contextLabel?: string;
  id: string;
  modelId: string;
  modelName: string;
  recordKind: ArchiveSearchRecordKind;
  searchText: string;
  subtitle: string;
  title: string;
  year: string;
  researchOnly?: boolean;
};

export type StructuredColorResolution = {
  error: string | null;
  record: ArchiveSearchRecord | null;
};

function normalizedStructuredChoice(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function structuredColorChoiceLabel(record: ArchiveSearchRecord) {
  const color = [
    record.colorName,
    record.colorCode ? `[${record.colorCode}]` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return [color, record.contextLabel].filter(Boolean).join(" / ");
}

export function resolveStructuredColorChoice(
  records: readonly ArchiveSearchRecord[],
  rawValue: string,
): StructuredColorResolution {
  const requested = normalizedStructuredChoice(rawValue);
  if (!requested) return { error: null, record: null };

  const exactMatches = records.filter((record) =>
    [record.id, record.colorId, structuredColorChoiceLabel(record)]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizedStructuredChoice(value) === requested),
  );
  if (exactMatches.length === 1) {
    return { error: null, record: exactMatches[0] };
  }
  if (exactMatches.length > 1) {
    return {
      error: "Choose a program-qualified color suggestion.",
      record: null,
    };
  }

  const looseMatches = records.filter((record) =>
    [record.colorName, record.colorCode]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizedStructuredChoice(value) === requested),
  );
  if (looseMatches.length === 1) {
    return { error: null, record: looseMatches[0] };
  }
  if (looseMatches.length > 1) {
    return {
      error: "That color appears in more than one program. Choose a program-qualified suggestion.",
      record: null,
    };
  }
  return {
    error:
      "Choose a verified color suggestion, or leave color blank to open the model year.",
    record: null,
  };
}

export type ArchiveSearchSupplementalRecord = {
  colorCode?: string | null;
  colorId?: string | null;
  colorName?: string | null;
  id: string;
  modelId: string;
  modelName: string;
  researchOnly?: boolean;
  searchFields: readonly (boolean | number | string | null | undefined)[];
  subtitle: string;
  title: string;
  year: string;
};

export type BuildArchiveSearchOptions = {
  additionalRecords?: readonly ArchiveSearchSupplementalRecord[];
  includeDefaultSupplementalRecords?: boolean;
};

export type ArchiveSearchResearchLead = {
  id: string;
  source_urls: string[];
  status: string;
  subtitle: string;
  terms: string[];
  title: string;
};

export type CompiledArchivePattern = {
  error: string | null;
  regex: RegExp | null;
};

export type ArchiveMatrixColor = ArchiveColor & {
  matrixKey: string;
  sourceColorIdsByYear: Record<string, string>;
};

export type ArchiveMatrix = {
  colors: ArchiveMatrixColor[];
  range: string;
  reviewedYears: string[];
  sources: Record<string, YearSource>;
  years: string[];
};

export type ArchiveYearIndexBand = {
  id: string;
  label: string;
  range: string;
  years: string[];
};

export type ArchiveTimelineSegment = {
  code: string;
  end: number;
  label: string;
  restriction?: string;
  start: number;
  state: AvailabilityState;
  years: string[];
};

type CatalogSearchData = {
  models: {
    aliases?: string[];
    id: string;
  }[];
};

type ModelYearSourceCandidate = {
  audit_state?: string | null;
  catalog_nonofficial_evidence_urls?: string[];
  catalog_official_evidence_urls?: string[];
  crawler_candidate_state?: string | null;
  current_app_source?: {
    url?: string | null;
    [field: string]: unknown;
  } | null;
  likely_source_availability?: string | null;
  model_id: string;
  model_name: string;
  model_year: number;
  model_year_key: string;
  official_source_record_count?: number;
  official_source_records?: ModelYearOfficialSourceCandidate[];
  [field: string]: unknown;
};

type ModelYearOfficialSourceCandidate = {
  crawler_source_id?: string | null;
  model_label?: string | null;
  pdf_url?: string | null;
  relation?: string | null;
  title?: string | null;
  years?: number[];
  [field: string]: unknown;
};

type ColorResearchGapData = {
  model_years: ModelYearSourceCandidate[];
};

type CommonsPhotoSearchAsset = {
  attribution?: string | null;
  attribution_required?: boolean;
  author?: string | null;
  bytes?: number;
  candidate_id: string;
  commons_sha1?: string | null;
  credit?: string | null;
  description?: string | null;
  explicit_year?: number | null;
  explicit_year_evidence?: string | null;
  explicit_year_source?: string | null;
  height?: number;
  license?: string | null;
  license_family?: string | null;
  mime?: string | null;
  model_ids: string[];
  model_queries?: string[];
  original_filename?: string | null;
  release_asset_name?: string | null;
  release_tag?: string | null;
  selection_contexts?: unknown[];
  selection_kinds?: string[];
  sha256?: string | null;
  status?: string | null;
  usage_terms?: string | null;
  width?: number;
};

type CommonsPhotoSearchData = {
  assets: CommonsPhotoSearchAsset[];
};

type SuburbanSupplementalAuditData = {
  years: {
    audit_status: string;
    limitations: string[];
    source: {
      page_locator: string;
      revision: string;
      source_id: string;
      title: string;
      url: string;
    } | null;
    supplemental_colors: {
      evidence_class: string;
      factory_code: string | null;
      name: string;
      scope: string;
    }[];
    year: number;
  }[];
};

type RockAutoPaintCodeLeadData = {
  code_candidates: {
    candidate_id: string;
    canonical_model_id: string;
    fitment_id: string;
    model_year: number;
    paint_code_raw: string;
    product_id: string;
    retailer_color_label_raw: string;
    source_variant: string | null;
    verification_status: string;
    governing_official_source_id: string | null;
  }[];
  configurations: Record<string, unknown>[];
  dataset_kind: string;
  fitments: ({
    catalog_configuration_id: string;
    fitment_id: string;
    product_id: string;
  } & Record<string, unknown>)[];
  products: ({ product_id: string } & Record<string, unknown>)[];
  publication_policy: {
    import_into_all_fields_regex_search: boolean;
    import_into_color_availability: boolean;
    import_into_public_model_year_routes: boolean;
    import_into_structured_search: boolean;
  };
  scope: Record<string, unknown>;
  source: Record<string, unknown> & {
    claim_type: string;
    officiality: string;
    source_id: string;
  };
};

type PaintSchemeComponent = {
  code: string;
  name: string;
};

type TahoePaintSchemeAudit = {
  years: {
    publication?: {
      pages?: string[];
      publication_date?: string | null;
      publication_date_note?: string | null;
      publisher: string;
      title: string;
      url: string;
    };
    two_tone_combinations?: {
      body_style?: string | null;
      code_1: string;
      code_2: string;
      color_1: string;
      color_2: string;
      restriction?: string | null;
      scheme?: string | null;
      source_anomaly?: string | null;
    }[];
    year: number;
  }[];
};

type SuburbanPaintSchemeRow = {
  d85_stripe_colors?: string | null;
  interior_colors?: string | null;
  primary: PaintSchemeComponent;
  restriction?: string | null;
  secondary: PaintSchemeComponent;
  source_annotation?: string | null;
  source_note?: string | null;
  stripe_colors?: string | null;
  wheel_flare_color?: string | null;
};

type SuburbanPaintSchemeVariant = Pick<
  SuburbanPaintSchemeRow,
  | "d85_stripe_colors"
  | "interior_colors"
  | "restriction"
  | "source_annotation"
  | "source_note"
  | "stripe_colors"
  | "wheel_flare_color"
>;

type SuburbanPaintSchemePair = SuburbanPaintSchemeVariant & {
  secondary_code: string;
  variants?: SuburbanPaintSchemeVariant[];
};

type SuburbanPaintSchemeAudit = {
  color_legends?: Record<string, Record<string, string>>;
  compact_scheme_row_fields?: string[];
  scheme_sets: {
    color_legend_id?: string;
    defaults?: SuburbanPaintSchemeVariant;
    groups?: {
      pairs?: SuburbanPaintSchemePair[];
      primary_code: string;
      secondary_codes?: string[];
    }[];
    primary_color_legend_id?: string;
    rows?: (null | string)[][];
    scheme_set_id: string;
    schemes?: SuburbanPaintSchemeRow[];
    secondary_color_legend_id?: string;
  }[];
  years: {
    body_style_scope?: string | null;
    package_code?: string | null;
    package_name: string;
    placement_note?: string | null;
    scheme_set_id: string;
    source: {
      chart: string;
      artifact_bytes?: number;
      artifact_sha256?: string;
      locator: string;
      pdf_page_count?: number;
      revision: string;
      source_id: string;
      title: string;
      url: string;
    };
    year: number;
  }[];
};

const catalogSearchData = modelCatalogData as CatalogSearchData;
const colorResearchGap = colorResearchGapData as ColorResearchGapData;
const commonsPhotoSearchData = commonsPhotoManifestData as CommonsPhotoSearchData;
const suburbanSupplementalAudit =
  suburban2000to2007AuditData as SuburbanSupplementalAuditData;
const rockAutoPaintCodeLeads = rockAutoPaintCodeLeadData as RockAutoPaintCodeLeadData;
const tahoePaintSchemes = tahoePaintSchemeData as TahoePaintSchemeAudit;
const suburbanPaintSchemes = suburbanPaintSchemeData as SuburbanPaintSchemeAudit;
const catalogAliasesByModelId = new Map(
  catalogSearchData.models.map((model) => [model.id, model.aliases ?? []]),
);

function distinct(values: string[]) {
  return [...new Set(values)];
}

function expandSuburbanPaintSchemeSet(
  audit: SuburbanPaintSchemeAudit,
  schemeSet: SuburbanPaintSchemeAudit["scheme_sets"][number],
): SuburbanPaintSchemeRow[] {
  if (schemeSet.schemes) return schemeSet.schemes;
  const legendId = schemeSet.color_legend_id;
  const primaryLegendId = schemeSet.primary_color_legend_id ?? legendId;
  const secondaryLegendId = schemeSet.secondary_color_legend_id ?? legendId;
  const primaryLegend = primaryLegendId
    ? audit.color_legends?.[primaryLegendId]
    : undefined;
  const secondaryLegend = secondaryLegendId
    ? audit.color_legends?.[secondaryLegendId]
    : undefined;
  if (!primaryLegend || !secondaryLegend) {
    throw new Error(`Missing color legend for ${schemeSet.scheme_set_id}`);
  }

  if (schemeSet.rows) {
    const fields = audit.compact_scheme_row_fields;
    if (!fields) {
      throw new Error(`Missing compact row fields for ${schemeSet.scheme_set_id}`);
    }
    return schemeSet.rows.map((values, rowIndex) => {
      if (values.length > fields.length) {
        throw new Error(`Too many compact fields in ${schemeSet.scheme_set_id}:${rowIndex + 1}`);
      }
      const compact = Object.fromEntries(
        values.map((value, index) => [fields[index], value]),
      ) as Record<string, null | string | undefined>;
      const primaryCode = compact.primary_code;
      const secondaryCode = compact.secondary_code;
      if (!primaryCode || !secondaryCode) {
        throw new Error(`Missing compact color code in ${schemeSet.scheme_set_id}:${rowIndex + 1}`);
      }
      const primaryName = compact.primary_name ?? primaryLegend[primaryCode];
      const secondaryName = compact.secondary_name ?? secondaryLegend[secondaryCode];
      if (!primaryName || !secondaryName) {
        throw new Error(`Unknown compact color in ${schemeSet.scheme_set_id}:${rowIndex + 1}`);
      }
      const metadata: SuburbanPaintSchemeVariant = { ...schemeSet.defaults };
      for (const field of [
        "d85_stripe_colors",
        "interior_colors",
        "restriction",
        "source_annotation",
        "source_note",
        "stripe_colors",
        "wheel_flare_color",
      ] as const) {
        if (compact[field] !== undefined && compact[field] !== null) {
          metadata[field] = compact[field];
        }
      }
      return {
        ...metadata,
        primary: { code: primaryCode, name: primaryName },
        secondary: { code: secondaryCode, name: secondaryName },
      };
    });
  }

  const rows: SuburbanPaintSchemeRow[] = [];
  for (const group of schemeSet.groups ?? []) {
    const primaryName = primaryLegend[group.primary_code];
    if (!primaryName) {
      throw new Error(
        `Unknown primary code ${group.primary_code} in ${schemeSet.scheme_set_id}`,
      );
    }
    const hasSecondaryCodes = group.secondary_codes !== undefined;
    const hasPairs = group.pairs !== undefined;
    if (hasSecondaryCodes === hasPairs) {
      throw new Error(
        `Scheme group ${schemeSet.scheme_set_id}:${group.primary_code} must define exactly one pair form`,
      );
    }
    const pairs: SuburbanPaintSchemePair[] = hasSecondaryCodes
      ? group.secondary_codes!.map((secondaryCode) => ({
          secondary_code: secondaryCode,
        }))
      : group.pairs!;
    for (const pair of pairs) {
      const secondaryName = secondaryLegend[pair.secondary_code];
      if (!secondaryName) {
        throw new Error(
          `Unknown secondary code ${pair.secondary_code} in ${schemeSet.scheme_set_id}`,
        );
      }
      const pairMetadata: SuburbanPaintSchemeVariant = {};
      if (pair.interior_colors !== undefined) {
        pairMetadata.interior_colors = pair.interior_colors;
      }
      if (pair.d85_stripe_colors !== undefined) {
        pairMetadata.d85_stripe_colors = pair.d85_stripe_colors;
      }
      if (pair.restriction !== undefined) {
        pairMetadata.restriction = pair.restriction;
      }
      if (pair.source_note !== undefined) {
        pairMetadata.source_note = pair.source_note;
      }
      if (pair.source_annotation !== undefined) {
        pairMetadata.source_annotation = pair.source_annotation;
      }
      if (pair.stripe_colors !== undefined) {
        pairMetadata.stripe_colors = pair.stripe_colors;
      }
      if (pair.wheel_flare_color !== undefined) {
        pairMetadata.wheel_flare_color = pair.wheel_flare_color;
      }
      for (const variant of pair.variants ?? [{}]) {
        rows.push({
          ...schemeSet.defaults,
          ...pairMetadata,
          ...variant,
          primary: { code: group.primary_code, name: primaryName },
          secondary: { code: pair.secondary_code, name: secondaryName },
        });
      }
    }
  }
  return rows;
}

function searchText(values: readonly (boolean | number | string | null | undefined)[]) {
  return distinct(
    values.flatMap((value) =>
      value === null || value === undefined || value === "" ? [] : [String(value)],
    ),
  ).join("\n");
}

function searchRecordSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function flattenSearchValues(value: unknown) {
  const values: string[] = [];
  const seen = new Set<object>();

  function visit(item: unknown) {
    if (item === null || item === undefined || item === "") return;
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean"
    ) {
      values.push(String(item));
      return;
    }
    if (typeof item !== "object" || seen.has(item)) return;
    seen.add(item);
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    Object.values(item).forEach(visit);
  }

  visit(value);
  return values;
}

function generationBandKey(generation: Generation) {
  if (
    generation.platformAliases?.length ||
    generation.platformConfidence ||
    generation.platformNotes
  ) {
    return [
      "platform",
      generation.label,
      ...(generation.platformAliases ?? []),
      generation.platformConfidence ?? "",
    ].join("\u001f");
  }
  const exactProgramOnly = generation.years.every((year) => {
    const evidenceClass = generation.sources[year]?.evidenceClass;
    return (
      evidenceClass === "specialty_palette_subset" ||
      evidenceClass === "qualified_exact_program_palette"
    );
  });
  if (exactProgramOnly) {
    return ["exact-program-year", generation.label, ...generation.years].join(
      "\u001f",
    );
  }
  return `generation\u001f${generation.id}`;
}

function isYearIndexGeneration(
  model: ArchiveModel,
  itemGeneration: Generation,
) {
  const specialtyOnly = itemGeneration.years.every(
    (itemYear) =>
      itemGeneration.sources[itemYear]?.evidenceClass ===
      "specialty_palette_subset",
  );
  if (!specialtyOnly) return true;
  return !itemGeneration.years.every((itemYear) =>
    model.generations.some(
      (candidate) =>
        candidate !== itemGeneration &&
        candidate.years.includes(itemYear) &&
        candidate.sources[itemYear]?.evidenceClass !==
          "specialty_palette_subset",
    ),
  );
}

function contiguousYearRuns(years: string[]) {
  const ordered = distinct(years).sort(
    (left, right) => Number(left) - Number(right),
  );
  const runs: string[][] = [];
  for (const year of ordered) {
    const current = runs.at(-1);
    const previousYear = current?.at(-1);
    if (current && previousYear && Number(year) === Number(previousYear) + 1) {
      current.push(year);
    } else {
      runs.push([year]);
    }
  }
  return runs;
}

export function buildArchiveYearIndexBands(
  model: ArchiveModel,
): ArchiveYearIndexBand[] {
  const generationsByBand = new Map<string, Generation[]>();
  for (const generation of model.generations) {
    if (!isYearIndexGeneration(model, generation)) continue;
    const key = generationBandKey(generation);
    const matches = generationsByBand.get(key) ?? [];
    matches.push(generation);
    generationsByBand.set(key, matches);
  }

  return [...generationsByBand.entries()]
    .flatMap(([bandKey, generations]) => {
      const years = generations.flatMap((generation) => generation.years);
      return contiguousYearRuns(years).map((runYears) => {
        const firstYear = runYears[0];
        const lastYear = runYears.at(-1) ?? firstYear;
        const representative = generations.find((generation) =>
          generation.years.some((year) => runYears.includes(year)),
        )!;
        return {
          id: `${bandKey}\u001f${firstYear}\u001f${lastYear}`,
          label: representative.label,
          range:
            firstYear === lastYear ? firstYear : `${firstYear}\u2013${lastYear}`,
          years: runYears,
        };
      });
    })
    .sort((left, right) => Number(left.years[0]) - Number(right.years[0]));
}

function contiguousRun(years: string[], selectedYear: string) {
  const ordered = distinct(years).sort((left, right) => Number(left) - Number(right));
  const selectedIndex = ordered.indexOf(selectedYear);
  if (selectedIndex < 0) return [];

  let start = selectedIndex;
  let end = selectedIndex;
  while (start > 0 && Number(ordered[start]) === Number(ordered[start - 1]) + 1) {
    start -= 1;
  }
  while (
    end < ordered.length - 1 &&
    Number(ordered[end + 1]) === Number(ordered[end]) + 1
  ) {
    end += 1;
  }
  return ordered.slice(start, end + 1);
}

export function relevantYearBand(model: ArchiveModel, selectedYear: string) {
  const selectedGeneration = model.generations.find((generation) =>
    generation.years.includes(selectedYear),
  );
  if (!selectedGeneration) return [];

  const allModelYears = model.generations.flatMap((generation) => generation.years);
  const selectedRun = new Set(contiguousRun(allModelYears, selectedYear));
  const selectedBandKey = generationBandKey(selectedGeneration);

  return distinct(
    model.generations
      .filter((generation) => generationBandKey(generation) === selectedBandKey)
      .flatMap((generation) => generation.years)
      .filter((year) => selectedRun.has(year)),
  ).sort((left, right) => Number(left) - Number(right));
}

function exactColorIdentity(
  color: ArchiveColor,
  source: YearSource,
  generation: Generation,
) {
  const programQualified =
    source.evidenceClass === "qualified_exact_program_palette" ||
    source.evidenceClass === "specialty_palette_subset";
  if (programQualified) {
    const stableProgramColorKey = /^not printed(?:$|[; /])/i.test(
      color.rowCode.trim(),
    )
      ? `source-name:${color.name}`
      : `source-code:${color.rowCode}`;
    return JSON.stringify([
      "program-color",
      generation.programLabel ?? generation.id,
      stableProgramColorKey,
    ]);
  }
  return JSON.stringify(["source-name", color.name]);
}

export function buildArchiveMatrix(
  model: ArchiveModel,
  selectedYear: string,
): ArchiveMatrix {
  const years = relevantYearBand(model, selectedYear);
  const selectedGeneration = model.generations.find((generation) =>
    generation.years.includes(selectedYear),
  );
  const selectedBandKey = selectedGeneration
    ? generationBandKey(selectedGeneration)
    : null;
  const generationsByYear = new Map<string, Generation[]>();
  for (const generation of model.generations) {
    if (selectedBandKey && generationBandKey(generation) !== selectedBandKey) {
      continue;
    }
    for (const year of generation.years) {
      const matches = generationsByYear.get(year) ?? [];
      matches.push(generation);
      generationsByYear.set(year, matches);
    }
  }
  const sourceLists: Record<string, YearSource[]> = {};
  const rows = new Map<string, ArchiveMatrixColor>();
  const ingestionOrder = [
    selectedYear,
    ...years.filter((year) => year !== selectedYear),
  ];

  for (const year of ingestionOrder) {
    for (const generation of generationsByYear.get(year) ?? []) {
      const source = generation.sources[year];
      if (!source) continue;
      const yearSources = sourceLists[year] ?? [];
      yearSources.push(source, ...(source.supportingSources ?? []));
      sourceLists[year] = yearSources;

      for (const color of generation.colors) {
        const availability = color.availability[year];
        if (!availability) continue;
        const matrixKey = exactColorIdentity(color, source, generation);
        const row = rows.get(matrixKey);
        if (row) {
          row.availability[year] = availability;
          row.sourceColorIdsByYear[year] = color.id;
          continue;
        }
        rows.set(matrixKey, {
          ...color,
          availability: { [year]: availability },
          matrixKey,
          sourceColorIdsByYear: { [year]: color.id },
        });
      }
    }
  }

  const sources = Object.fromEntries(
    Object.entries(sourceLists).map(([year, yearSources]) => {
      const sourcesByArtifact = new Map<string, YearSource>();
      for (const source of yearSources) {
        const artifactKey = [source.sourceId ?? "", source.url].join("\u001f");
        const existing = sourcesByArtifact.get(artifactKey);
        if (!existing) {
          const citation = { ...source };
          delete citation.supportingSources;
          sourcesByArtifact.set(artifactKey, citation);
          continue;
        }
        existing.chart = distinct([existing.chart, source.chart]).join("; ");
        existing.locator = distinct([existing.locator, source.locator]).join("; ");
        existing.limitations = distinct([
          ...(existing.limitations ?? []),
          ...(source.limitations ?? []),
        ]);
      }
      const uniqueSources = [...sourcesByArtifact.values()];
      const [primary, ...supportingSources] = uniqueSources;
      return [
        year,
        {
          ...primary,
          ...(supportingSources.length ? { supportingSources } : {}),
        },
      ];
    }),
  ) as Record<string, YearSource>;

  const firstYear = years[0] ?? selectedYear;
  const lastYear = years.at(-1) ?? firstYear;
  return {
    colors: [...rows.values()],
    range: firstYear === lastYear ? firstYear : `${firstYear}\u2013${lastYear}`,
    reviewedYears: years.filter((year) => Boolean(sources[year])),
    sources,
    years,
  };
}

export function buildArchiveTimelineSegments(
  color: ArchiveColor,
  years: string[],
) {
  const segments: ArchiveTimelineSegment[] = [];

  for (let index = 0; index < years.length; index += 1) {
    const itemYear = years[index];
    const value = color.availability[itemYear];
    if (!value) continue;
    const previous = segments.at(-1);
    const previousYear = previous?.years.at(-1);
    const matchesPrevious =
      previous &&
      previous.end === index - 1 &&
      previousYear !== undefined &&
      Number(itemYear) === Number(previousYear) + 1 &&
      previous.code === value.code &&
      previous.label === value.label &&
      previous.state === value.state &&
      previous.restriction === value.restriction;

    if (matchesPrevious) {
      previous.end = index;
      previous.years.push(itemYear);
    } else {
      segments.push({
        code: value.code,
        end: index,
        label: value.label,
        restriction: value.restriction,
        start: index,
        state: value.state,
        years: [itemYear],
      });
    }
  }
  return segments;
}

export function nearbyYearThumbnails(
  relevantYears: string[],
  selectedYear: string,
  maximum = 5,
) {
  if (maximum < 1) return [];
  const ordered = distinct(relevantYears).sort(
    (left, right) => Number(left) - Number(right),
  );
  const selectedIndex = ordered.indexOf(selectedYear);
  if (selectedIndex < 0 || ordered.length <= maximum) return ordered.slice(0, maximum);

  const before = Math.floor((maximum - 1) / 2);
  let start = Math.max(0, selectedIndex - before);
  start = Math.min(start, ordered.length - maximum);
  return ordered.slice(start, start + maximum);
}

export function buildArchiveSearchRecords(
  models: ArchiveModel[],
  researchLeads: ArchiveSearchResearchLead[] = [],
  options: BuildArchiveSearchOptions = {},
) {
  const records: ArchiveSearchRecord[] = [];

  for (const model of models) {
    for (const generation of model.generations) {
      const generationContextLabel = [generation.label, generation.programLabel]
        .filter(Boolean)
        .join(" / ");
      for (const year of generation.years) {
        const source = generation.sources[year];
        const applications = generation.colors.flatMap((color) => {
          const availability = color.availability[year];
          return availability ? [{ color, availability }] : [];
        });
        const rows = applications.length ? applications : [null];

        for (const row of rows) {
          const color = row?.color;
          const availability = row?.availability;
          const fields = distinct(
            [
              model.id,
              model.name,
              model.vehicleClass,
              model.era,
              model.status,
              model.pendingCopy,
              ...(catalogAliasesByModelId.get(model.id) ?? []),
              generation.id,
              generation.label,
              generation.programId,
              generation.programLabel,
              generation.range,
              generation.revisionNote,
              generation.platformAliases?.join(" "),
              generation.platformConfidence,
              generation.platformNotes,
              year,
              color?.id,
              color?.name,
              color?.rowCode,
              color?.note,
              availability?.label,
              availability?.code,
              availability?.state,
              availability?.applicationType,
              availability?.restriction,
              ...flattenSearchValues(availability?.sourceIds),
              source?.name,
              source?.chart,
              source?.locator,
              source?.revision,
              source?.url,
              ...flattenSearchValues(source),
              ...(generation.catalogSources ?? []),
            ].filter((value): value is string => Boolean(value)),
          );
          const colorName = availability?.label ?? color?.name ?? null;
          const colorCode = availability?.code ?? color?.rowCode ?? null;
          const title = colorName
            ? `${year} Chevrolet ${model.name} / ${colorName}`
            : `${year} Chevrolet ${model.name}`;
          const subtitle = colorName
            ? [colorCode ? `code ${colorCode}` : null, availability?.restriction, generationContextLabel]
                .filter(Boolean)
                .join(" / ")
            : `No verified color rows / ${generation.label}`;

          records.push({
            colorCode,
            colorId: color?.id ?? null,
            colorName,
            contextLabel: generationContextLabel,
            id: `${model.id}:${year}:${color?.id ?? "model-year"}`,
            modelId: model.id,
            modelName: model.name,
            recordKind: color ? "availability" : "model-year",
            searchText: searchText(fields),
            subtitle,
            title,
            year,
          });
        }
      }
    }
  }

  for (const lead of researchLeads) {
    records.push({
      colorCode: null,
      colorId: null,
      colorName: lead.title,
      id: `research:${lead.id}`,
      modelId: "",
      modelName: "Specialty research lead",
      recordKind: "research-lead",
      researchOnly: true,
      searchText: searchText([
        lead.id,
        lead.title,
        lead.subtitle,
        lead.status,
        ...lead.terms,
        ...lead.source_urls,
      ]),
      subtitle: lead.subtitle,
      title: lead.title,
      year: "",
    });
  }

  if (options.includeDefaultSupplementalRecords ?? true) {
    records.push(...buildModelYearSourceRecords(models));
    records.push(...buildArchivedPhotoSearchRecords(models));
    records.push(...buildPaintSchemeSearchRecords(models));
    records.push(...buildSuburbanSupplementalColorSearchRecords(models));
    records.push(...buildRockAutoSecondaryLeadSearchRecords(models));
  }

  for (const additional of options.additionalRecords ?? []) {
    records.push({
      colorCode: additional.colorCode ?? null,
      colorId: additional.colorId ?? null,
      colorName: additional.colorName ?? null,
      id: `supplemental:${additional.id}`,
      modelId: additional.modelId,
      modelName: additional.modelName,
      recordKind: "supplemental",
      researchOnly: additional.researchOnly,
      searchText: searchText([
        additional.id,
        additional.modelId,
        additional.modelName,
        additional.year,
        additional.colorId,
        additional.colorName,
        additional.colorCode,
        additional.title,
        additional.subtitle,
        ...additional.searchFields,
      ]),
      subtitle: additional.subtitle,
      title: additional.title,
      year: additional.year,
    });
  }

  return records;
}

export function buildSuburbanSupplementalColorSearchRecords(models: ArchiveModel[]) {
  const suburban = models.find((model) => model.id === "suburban");
  if (!suburban) return [];
  return suburbanSupplementalAudit.years.flatMap((yearRecord) => {
    if (!yearRecord.supplemental_colors.length) return [];
    if (yearRecord.audit_status !== "supplemental_only" || !yearRecord.source) {
      throw new Error(
        `Suburban ${yearRecord.year} supplemental search evidence is not isolated`,
      );
    }
    const source = yearRecord.source;
    return yearRecord.supplemental_colors.map((mention) => ({
      colorCode: mention.factory_code,
      colorId: null,
      colorName: mention.name,
      id: `supplemental-color:suburban:${yearRecord.year}:${searchRecordSlug(mention.name)}`,
      modelId: suburban.id,
      modelName: suburban.name,
      recordKind: "supplemental" as const,
      researchOnly: true,
      searchText: searchText([
        "official supplemental color mention",
        "not a complete model-year palette",
        yearRecord.year,
        suburban.id,
        suburban.name,
        mention.name,
        mention.factory_code,
        mention.evidence_class,
        mention.scope,
        `${mention.name} ${mention.scope}`,
        source.source_id,
        source.title,
        source.page_locator,
        source.revision,
        source.url,
        ...yearRecord.limitations,
      ]),
      subtitle:
        "OFFICIAL SUPPLEMENTAL MENTION. NOT A COMPLETE MODEL-YEAR PALETTE.",
      title: `${yearRecord.year} Chevrolet Suburban / ${mention.name}`,
      year: String(yearRecord.year),
    }));
  });
}

export function buildRockAutoSecondaryLeadSearchRecords(models: ArchiveModel[]) {
  const policy = rockAutoPaintCodeLeads.publication_policy;
  if (
    !policy.import_into_all_fields_regex_search ||
    policy.import_into_structured_search ||
    policy.import_into_color_availability ||
    policy.import_into_public_model_year_routes
  ) {
    throw new Error("RockAuto secondary-lead publication policy drifted");
  }
  if (
    rockAutoPaintCodeLeads.source.officiality !== "secondary" ||
    rockAutoPaintCodeLeads.source.claim_type !== "retailer_touchup_fitment_lead"
  ) {
    throw new Error("RockAuto secondary-lead provenance drifted");
  }

  const modelsById = new Map(models.map((model) => [model.id, model]));
  const configurationsById = new Map(
    rockAutoPaintCodeLeads.configurations.map((row) => [
      String(row.catalog_configuration_id),
      row,
    ]),
  );
  const productsById = new Map(
    rockAutoPaintCodeLeads.products.map((row) => [row.product_id, row]),
  );
  const fitmentsById = new Map(
    rockAutoPaintCodeLeads.fitments.map((row) => [row.fitment_id, row]),
  );

  return rockAutoPaintCodeLeads.code_candidates.flatMap((candidate) => {
    const model = modelsById.get(candidate.canonical_model_id);
    const fitment = fitmentsById.get(candidate.fitment_id);
    const product = productsById.get(candidate.product_id);
    const configuration = fitment
      ? configurationsById.get(fitment.catalog_configuration_id)
      : undefined;
    if (!model || !fitment || !product || !configuration) return [];

    const year = String(candidate.model_year);
    const variant = candidate.source_variant
      ? ` / RockAuto variant ${candidate.source_variant}`
      : "";
    const engineLabel = String(
      configuration.source_engine_label ?? "engine unspecified",
    );
    const configurationCode = String(configuration.cc ?? "unknown");
    return [
      {
        colorCode: candidate.paint_code_raw,
        colorId: null,
        colorName: candidate.retailer_color_label_raw,
        id: `secondary-lead:${candidate.candidate_id}`,
        modelId: model.id,
        modelName: model.name,
        recordKind: "secondary-lead" as const,
        researchOnly: true,
        searchText: searchText([
          "RockAuto secondary retailer paint-code lead",
          "not Chevrolet factory availability",
          "official corroboration required",
          rockAutoPaintCodeLeads.dataset_kind,
          ...flattenSearchValues(rockAutoPaintCodeLeads.scope),
          ...flattenSearchValues(rockAutoPaintCodeLeads.source),
          ...flattenSearchValues(configuration),
          ...flattenSearchValues(product),
          ...flattenSearchValues(fitment),
          ...flattenSearchValues(candidate),
        ]),
        subtitle:
          `SECONDARY RETAILER LEAD ONLY / NOT CHEVROLET FACTORY AVAILABILITY / ` +
          `UNVERIFIED${variant}`,
        title:
          `RockAuto secondary lead / ${year} Chevrolet ${model.name} / ` +
          `${engineLabel} (cc ${configurationCode}) / ` +
          `${candidate.retailer_color_label_raw} [${candidate.paint_code_raw}]`,
        year,
      },
    ];
  });
}

function modelYears(model: ArchiveModel) {
  return distinct(model.generations.flatMap((generation) => generation.years)).sort(
    (left, right) => Number(left) - Number(right),
  );
}

function buildModelYearSourceRecords(models: ArchiveModel[]) {
  const modelsById = new Map(models.map((model) => [model.id, model]));
  const yearsByModelId = new Map(
    models.map((model) => [model.id, new Set(modelYears(model))]),
  );

  const relationRank: Record<string, number> = {
    dedicated: 1,
    related_line: 2,
    generic_full_line: 3,
  };

  return colorResearchGap.model_years.flatMap((candidate) => {
    const model = modelsById.get(candidate.model_id);
    const year = String(candidate.model_year);
    if (!model || !yearsByModelId.get(model.id)?.has(year)) return [];

    return (candidate.official_source_records ?? []).map((source, index) => {
      const relation = source.relation ?? "source_candidate";
      const candidateStatus =
        candidate.current_app_source?.url &&
        source.pdf_url === candidate.current_app_source.url
          ? "governing_source_reviewed"
          : candidate.audit_state === "source_located_chart_unreviewed"
            ? "source_located_chart_unreviewed"
            : "retrieval_candidate_unreviewed";
      const sourceId = source.crawler_source_id ?? `candidate-${index + 1}`;
      return {
        colorCode: null,
        colorId: null,
        colorName: null,
        id: `source-candidate:${candidate.model_year_key}:${sourceId}:${relation}`,
        modelId: model.id,
        modelName: model.name,
        recordKind: "source-candidate" as const,
        searchText: searchText([
          candidate.model_year_key,
          candidate.model_id,
          candidate.model_name,
          candidate.model_year,
          candidate.likely_source_availability,
          candidate.audit_state,
          candidate.crawler_candidate_state,
          ...flattenSearchValues(candidate.current_app_source),
          ...(candidate.catalog_official_evidence_urls ?? []),
          ...(candidate.catalog_nonofficial_evidence_urls ?? []),
          sourceId,
          relation,
          relationRank[relation],
          candidateStatus,
          ...flattenSearchValues(source),
          ...(catalogAliasesByModelId.get(model.id) ?? []),
        ]),
        subtitle: [relation.replaceAll("_", " "), source.title, candidateStatus]
          .filter(Boolean)
          .join(" / "),
        title: `${year} Chevrolet ${model.name} / source candidate`,
        year,
      };
    });
  });
}

function buildArchivedPhotoSearchRecords(models: ArchiveModel[]) {
  const modelsById = new Map(models.map((model) => [model.id, model]));
  const yearsByModelId = new Map(models.map((model) => [model.id, modelYears(model)]));

  return commonsPhotoSearchData.assets.flatMap((asset) =>
    asset.model_ids.flatMap((modelId) => {
      const model = modelsById.get(modelId);
      const availableYears = yearsByModelId.get(modelId) ?? [];
      if (!model || !availableYears.length) return [];

      const explicitYear = asset.explicit_year ? String(asset.explicit_year) : null;
      const routeYear =
        explicitYear && availableYears.includes(explicitYear)
          ? explicitYear
          : availableYears.at(-1)!;
      const title = explicitYear
        ? `${explicitYear} Chevrolet ${model.name} / archived photo`
        : `Chevrolet ${model.name} / archived photo`;
      const subtitle = [asset.author, asset.license, asset.original_filename]
        .filter(Boolean)
        .join(" / ");

      return [
        {
          colorCode: null,
          colorId: null,
          colorName: null,
          id: `photo:${asset.candidate_id}:${modelId}`,
          modelId,
          modelName: model.name,
          recordKind: "photo" as const,
          searchText: searchText([
            asset.candidate_id,
            asset.status,
            ...(asset.selection_kinds ?? []),
            ...flattenSearchValues(asset.selection_contexts ?? []),
            ...asset.model_ids,
            asset.explicit_year,
            asset.explicit_year_source,
            asset.explicit_year_evidence,
            asset.author,
            asset.credit,
            asset.license,
            asset.license_family,
            asset.usage_terms,
            asset.attribution_required,
            asset.attribution,
            asset.description,
            ...(asset.model_queries ?? []),
            asset.sha256,
            asset.commons_sha1,
            asset.mime,
            asset.width,
            asset.height,
            asset.bytes,
            asset.original_filename,
            asset.release_tag,
            asset.release_asset_name,
            ...(catalogAliasesByModelId.get(modelId) ?? []),
          ]),
          subtitle,
          title,
          year: routeYear,
        },
      ];
    }),
  );
}

function buildPaintSchemeSearchRecords(models: ArchiveModel[]) {
  const modelsById = new Map(models.map((model) => [model.id, model]));
  const records: ArchiveSearchRecord[] = [];
  const tahoe = modelsById.get("tahoe");
  if (tahoe) {
    for (const yearRecord of tahoePaintSchemes.years) {
      const publication = yearRecord.publication;
      for (const [index, scheme] of (
        yearRecord.two_tone_combinations ?? []
      ).entries()) {
        const primary = `${scheme.color_1} (${scheme.code_1})`;
        const secondary = `${scheme.color_2} (${scheme.code_2})`;
        const packageLabel = [scheme.scheme, "Conventional Two-Tone"]
          .filter(Boolean)
          .join(" / ");
        records.push({
          colorCode: `${scheme.code_1} / ${scheme.code_2}`,
          colorId: null,
          colorName: `${scheme.color_1} / ${scheme.color_2}`,
          id: `paint-scheme:tahoe:${yearRecord.year}:${index + 1}`,
          modelId: "tahoe",
          modelName: tahoe.name,
          recordKind: "paint-scheme",
          searchText: searchText([
            "paint scheme",
            "two tone",
            "primary",
            scheme.color_1,
            scheme.code_1,
            "secondary",
            scheme.color_2,
            scheme.code_2,
            scheme.scheme,
            scheme.body_style,
            scheme.restriction,
            scheme.source_anomaly,
            yearRecord.year,
            publication?.publisher,
            publication?.title,
            publication?.url,
            ...(publication?.pages ?? []),
            publication?.publication_date,
            publication?.publication_date_note,
          ]),
          subtitle: [
            packageLabel,
            scheme.body_style,
            `primary ${primary}`,
            `secondary ${secondary}`,
            scheme.restriction,
            scheme.source_anomaly,
          ]
            .filter(Boolean)
            .join(" / "),
          title: `${yearRecord.year} Chevrolet ${tahoe.name} / paint scheme`,
          year: String(yearRecord.year),
        });
      }
    }
  }

  const suburban = modelsById.get("suburban");
  if (suburban) {
    const schemeSets = new Map(
      suburbanPaintSchemes.scheme_sets.map((schemeSet) => [
        schemeSet.scheme_set_id,
        schemeSet,
      ]),
    );
    for (const yearRecord of suburbanPaintSchemes.years) {
      const schemeSet = schemeSets.get(yearRecord.scheme_set_id);
      if (!schemeSet) continue;
      const packageId = (yearRecord.package_code ?? "unlabeled")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      for (const [index, scheme] of expandSuburbanPaintSchemeSet(
        suburbanPaintSchemes,
        schemeSet,
      ).entries()) {
        const primary = `${scheme.primary.name} (${scheme.primary.code})`;
        const secondary = `${scheme.secondary.name} (${scheme.secondary.code})`;
        records.push({
          colorCode: `${scheme.primary.code} / ${scheme.secondary.code}`,
          colorId: null,
          colorName: `${scheme.primary.name} / ${scheme.secondary.name}`,
          id: `paint-scheme:suburban:${yearRecord.year}:${packageId}:${yearRecord.scheme_set_id}:${index + 1}`,
          modelId: "suburban",
          modelName: suburban.name,
          recordKind: "paint-scheme",
          searchText: searchText([
            "paint scheme",
            "two tone",
            yearRecord.scheme_set_id,
            yearRecord.package_code,
            yearRecord.package_name,
            yearRecord.body_style_scope,
            yearRecord.placement_note,
            "primary",
            scheme.primary.name,
            scheme.primary.code,
            "secondary",
            scheme.secondary.name,
            scheme.secondary.code,
            scheme.stripe_colors,
            scheme.d85_stripe_colors,
            scheme.interior_colors,
            scheme.wheel_flare_color,
            scheme.restriction,
            scheme.source_note,
            scheme.source_annotation,
            yearRecord.year,
            yearRecord.source.source_id,
            yearRecord.source.title,
            yearRecord.source.chart,
            yearRecord.source.locator,
            yearRecord.source.revision,
            yearRecord.source.url,
            yearRecord.source.artifact_sha256,
            yearRecord.source.artifact_bytes,
            yearRecord.source.pdf_page_count,
          ]),
          subtitle: [
            yearRecord.package_code,
            yearRecord.package_name,
            `primary ${primary}`,
            `secondary ${secondary}`,
            scheme.stripe_colors ? `stripe ${scheme.stripe_colors}` : null,
            scheme.d85_stripe_colors ? `D85 stripe ${scheme.d85_stripe_colors}` : null,
            scheme.interior_colors ? `interior ${scheme.interior_colors}` : null,
            scheme.wheel_flare_color ? `wheel flare ${scheme.wheel_flare_color}` : null,
            scheme.restriction,
          ]
            .filter(Boolean)
            .join(" / "),
          title: `${yearRecord.year} Chevrolet ${suburban.name} / paint scheme`,
          year: String(yearRecord.year),
        });
      }
    }
  }
  return records;
}

function unwrapPattern(input: string) {
  if (!input.startsWith("/")) return { flags: "im", source: input };
  const finalSlash = input.lastIndexOf("/");
  if (finalSlash <= 0) return { flags: "im", source: input };
  return {
    flags: input.slice(finalSlash + 1),
    source: input.slice(1, finalSlash),
  };
}

type UnboundedQuantifier = {
  alternative: number;
  atom: string;
  atomStart: number;
  quantifierEnd: number;
};

function regexAtomEnd(source: string, start: number) {
  const character = source[start];
  if (character === "\\") {
    if (source[start + 1] === "x" && /^[0-9a-f]{2}$/i.test(source.slice(start + 2, start + 4))) {
      return start + 4;
    }
    if (source[start + 1] === "u" && /^[0-9a-f]{4}$/i.test(source.slice(start + 2, start + 6))) {
      return start + 6;
    }
    if (source[start + 1] === "c" && source[start + 2]) return start + 3;
    return Math.min(source.length, start + 2);
  }
  if (character === "[") {
    let escaped = false;
    for (let index = start + 1; index < source.length; index += 1) {
      if (!escaped && source[index] === "]") return index + 1;
      if (!escaped && source[index] === "\\") {
        escaped = true;
      } else {
        escaped = false;
      }
    }
    return source.length;
  }
  if ("^$|(){}*+?".includes(character)) return null;
  return start + 1;
}

function regexQuantifier(source: string, start: number) {
  const character = source[start];
  if (character === "*" || character === "+" || character === "?") {
    const end = source[start + 1] === "?" ? start + 2 : start + 1;
    return { end, unbounded: character !== "?" };
  }
  if (character !== "{") return null;

  const match = source.slice(start).match(/^\{(\d+)(?:,(\d*))?\}/);
  if (!match) return null;
  let end = start + match[0].length;
  if (source[end] === "?") end += 1;
  return {
    end,
    unbounded: match[2] === "",
  };
}

function unboundedQuantifiers(source: string) {
  const quantifiers: UnboundedQuantifier[] = [];
  let alternative = 0;

  for (let index = 0; index < source.length; ) {
    if (source[index] === "|") {
      alternative += 1;
      index += 1;
      continue;
    }
    const atomEnd = regexAtomEnd(source, index);
    if (atomEnd === null) {
      index += 1;
      continue;
    }
    const quantifier = regexQuantifier(source, atomEnd);
    if (quantifier?.unbounded) {
      quantifiers.push({
        alternative,
        atom: source.slice(index, atomEnd),
        atomStart: index,
        quantifierEnd: quantifier.end,
      });
    }
    index = quantifier?.end ?? atomEnd;
  }

  return quantifiers;
}

function hasUnsafeUnboundedQuantifierSequence(source: string) {
  const byAlternative = new Map<number, UnboundedQuantifier[]>();
  for (const quantifier of unboundedQuantifiers(source)) {
    const alternative = byAlternative.get(quantifier.alternative) ?? [];
    alternative.push(quantifier);
    byAlternative.set(quantifier.alternative, alternative);
  }

  for (const quantifiers of byAlternative.values()) {
    if (quantifiers.length < 2) continue;
    if (quantifiers.length > 2) return true;

    const [left, right] = quantifiers;
    const requiredSeparator = source.slice(left.quantifierEnd, right.atomStart);
    const isSeparatedWildcardSequence =
      left.atom === "." &&
      right.atom === "." &&
      /^[A-Za-z0-9 _-]+$/.test(requiredSeparator) &&
      /[A-Za-z0-9]{3,}/.test(requiredSeparator);
    if (!isSeparatedWildcardSequence) return true;
  }

  return false;
}

export function compileSafeArchivePattern(input: string): CompiledArchivePattern {
  const trimmed = input.trim();
  if (!trimmed) return { error: null, regex: null };
  if (trimmed.length > 120) {
    return { error: "Pattern is too long. Use 120 characters or fewer.", regex: null };
  }

  const { flags, source } = unwrapPattern(trimmed);
  if (!/^[im]*$/.test(flags) || new Set(flags).size !== flags.length) {
    return { error: "Only the i and m regular-expression flags are supported.", regex: null };
  }
  if (/\(\?/.test(source)) {
    return {
      error: "Lookarounds and inline regular-expression options are not supported.",
      regex: null,
    };
  }
  if (/\\[1-9]/.test(source)) {
    return { error: "Regular-expression backreferences are not supported.", regex: null };
  }
  if (
    /\([^)]*\)[+*?{]/.test(source) ||
    /(?:[+*?]|\{\d+(?:,\d*)?\})[+*?{]/.test(source)
  ) {
    return {
      error: "Nested or repeated quantifiers are not supported. Simplify the wildcard pattern.",
      regex: null,
    };
  }
  if (hasUnsafeUnboundedQuantifierSequence(source)) {
    return {
      error:
        "Multiple unbounded quantifiers are not supported unless two wildcard spans are separated by a stable literal term.",
      regex: null,
    };
  }

  try {
    return { error: null, regex: new RegExp(source, flags) };
  } catch {
    return { error: "Invalid regular expression. Check brackets, escapes, and wildcards.", regex: null };
  }
}

export function recordMatchesPattern(
  record: ArchiveSearchRecord,
  regex: RegExp,
) {
  return record.searchText.split("\n").some((field) => {
    regex.lastIndex = 0;
    return regex.test(field);
  });
}
