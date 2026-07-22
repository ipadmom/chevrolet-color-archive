import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const ledgerUrl = new URL(
  "data/sources/specialty-color-source-candidates.json",
  root,
);
const releaseBase =
  "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/";
const generatedAt = "2026-07-22T22:30:43Z";

const sources = {
  2011: {
    source_id: "gm-2011-police-manual",
    title: "2011 Chevrolet Municipal Vehicles Technical Manual",
    source_type: "official municipal vehicle technical manual",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/07/2011_Chevrolet-Police-Technical-Manual.pdf",
    local_path:
      "tmp/specialty-color-research/historic-official-pdfs/gm-2011-police-manual.pdf",
    bytes: 8_346_299,
    sha256: "6c0eef224d9c67c4a841bbaf1fb68383bc74cc5a0ecc3c0d1a412683b6474534",
    pdf_page_count: 182,
    archive_asset_name:
      "2011-chevrolet-municipal-vehicles-technical-manual-gm.pdf",
    revision: "Revisions marked in blue January 24, 2011",
    retrieved_at: "2026-07-21T07:14:44.1730319Z",
  },
  2012: {
    source_id: "gm-2012-municipal-manual",
    title: "2012 Chevrolet Municipal Vehicles Technical Manual",
    source_type: "official municipal vehicle technical manual",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/05/2012-Police-Specifications-Manual-9-29-11.pdf",
    local_path:
      "tmp/specialty-color-research/historic-official-pdfs/gm-2012-municipal-manual.pdf",
    bytes: 8_600_436,
    sha256: "2bf54f148d063b69a2b114166163b7225641daf1fba62bc41ca20a4a7dd4473d",
    pdf_page_count: 199,
    archive_asset_name:
      "2012-chevrolet-municipal-vehicles-specifications-manual-gm.pdf",
    revision: "September 29, 2011",
    retrieved_at: null,
  },
  2013: {
    source_id: "gm-2013-municipal-guide",
    title: "2013 Chevrolet Municipal Vehicles Technical Manual",
    source_type: "official municipal vehicle technical manual",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/07/2013-Municipal-Guide.pdf",
    local_path:
      "tmp/specialty-color-research/historic-official-pdfs/gm-2013-municipal-guide.pdf",
    bytes: 10_595_751,
    sha256: "1753082e7bcea94e29737e8d09470ee9e87059bd5fb8a560ffe463b850abc18c",
    pdf_page_count: 197,
    archive_asset_name: "2013-chevrolet-municipal-vehicles-guide-gm.pdf",
    revision: "2013 model year",
    retrieved_at: null,
  },
  2014: {
    source_id: "gm-2014-police-guide",
    title: "2014 Chevrolet Police Vehicles Technical Guide",
    source_type: "official municipal vehicle technical guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/06/2014_Police_Technical_Guide_FINAL.pdf",
    local_path:
      "tmp/specialty-color-research/historic-official-pdfs/gm-2014-police-guide.pdf",
    bytes: 9_610_503,
    sha256: "d21cdc63dc71d20295d94075573f083560be5c73204bba13b939c8699dd77fdc",
    pdf_page_count: 147,
    archive_asset_name: "2014-chevrolet-police-vehicles-technical-guide-gm.pdf",
    revision: "2014 model year",
    retrieved_at: null,
  },
  2015: {
    source_id: "gm-2015-caprice-9c1-specification-guide",
    title: "2015 Chevrolet Caprice Police Package Specification Guide",
    source_type: "official municipal vehicle specification guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/07/2015_caprice_specification_guide_4_10.pdf",
    local_path:
      "tmp/specialty-color-research/historic-official-pdfs/gm-2015-caprice-9c1-specification-guide.pdf",
    bytes: 16_376_061,
    sha256: "6f6431fa6f246e493c3f3da26b2bf05b463ec1d26c68a2ced3282c7ecf91823a",
    pdf_page_count: 37,
    archive_asset_name:
      "2015-chevrolet-caprice-ppv-9c1-specification-guide-gm.pdf",
    revision: "Revised 3/18/2015",
    retrieved_at: "2026-07-22T22:30:40Z",
  },
  2016: {
    source_id: "gm-2016-caprice-9c1-specification-guide",
    title: "2016 Chevrolet Caprice Police Package Specification Guide",
    source_type: "official municipal vehicle specification guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/05/2016-Caprice-Specification-Guide.pdf",
    local_path:
      "tmp/specialty-color-research/historic-official-pdfs/gm-2016-caprice-9c1-specification-guide.pdf",
    bytes: 9_492_057,
    sha256: "48c2d7112bede1f7aac294d3024fdd1002614fdcf6d5d34c1ce5c3b48a95c2e0",
    pdf_page_count: 37,
    archive_asset_name:
      "2016-chevrolet-caprice-ppv-9c1-specification-guide-gm.pdf",
    revision: "Revised 09/08/2015",
    retrieved_at: "2026-07-22T22:30:38Z",
  },
  2017: {
    source_id: "gm-2017-caprice-9c1-specification-guide",
    title: "2017 Chevrolet Caprice Police Package Specification Guide",
    source_type: "official municipal vehicle specification guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/05/Caprice-9C1-Specification-Guide-2017.pdf",
    local_path:
      "tmp/specialty-color-research/historic-official-pdfs/gm-2017-caprice-9c1-specification-guide.pdf",
    bytes: 37_298_379,
    sha256: "850e9f0196641ef73f0ab9e892047f25e7212d2e772999f4de545d63653c615d",
    pdf_page_count: 40,
    archive_asset_name:
      "2017-chevrolet-caprice-ppv-9c1-specification-guide-gm.pdf",
    revision:
      "Cover dated 8/28/16; update page prints Revised 07/17/2015",
    retrieved_at: "2026-07-22T22:30:43Z",
  },
};

const color = (rpo, label, sourceLabelRaw, finish) => ({
  rpo,
  label,
  source_label_raw: sourceLabelRaw ?? label,
  finish,
});

const common = {
  GII: color("GII", "Heron White", null, "solid"),
  GHY: color("GHY", "Red Hot", null, "solid"),
  GIG: color("GIG", "Karma Metallic", null, "metallic"),
  GIE: color("GIE", "Phantom Black Metallic", null, "metallic"),
  GAN: color("GAN", "Silver Ice Metallic", null, "metallic"),
  GGG: color("GGG", "Alto Grey Metallic", null, "metallic"),
  GYW: color(
    "GYW",
    "Hugo Blue (Dark Blue) Metallic",
    "Hugo Blue* (Dark Blue) Metallic",
    "metallic",
  ),
  GZ7: color("GZ7", "Mystic Green", null, "not printed"),
};

const palettes = [
  {
    year: 2011,
    program: "9C1",
    pdf_page: 15,
    printed_page: 4,
    colors: [
      common.GII,
      common.GHY,
      common.GIG,
      common.GIE,
      color("GST", "Mirage Gold Metallic", null, "metallic"),
      common.GAN,
      common.GGG,
    ],
  },
  {
    year: 2011,
    program: "9C3",
    pdf_page: 19,
    printed_page: 8,
    colors: [
      common.GII,
      common.GHY,
      common.GIG,
      common.GIE,
      color("GST", "Mirage Glow Metallic", null, "metallic"),
      common.GAN,
      { ...common.GGG, source_label_raw: "Alto Gray Metallic" },
    ],
  },
  ...["9C1", "9C3"].map((program) => ({
    year: 2012,
    program,
    pdf_page: program === "9C1" ? 15 : 19,
    printed_page: program === "9C1" ? 4 : 8,
    colors: [
      common.GYW,
      common.GII,
      common.GHY,
      common.GIG,
      common.GIE,
      color("GST", "Mirage Gold Metallic", null, "metallic"),
      common.GAN,
      common.GGG,
    ],
  })),
  ...["9C1", "9C3"].map((program) => ({
    year: 2013,
    program,
    pdf_page: program === "9C1" ? 15 : 19,
    printed_page: program === "9C1" ? 4 : 8,
    colors: [
      { ...common.GYW, source_label_raw: "Hugo Blue* (Dark Blue) Meatllic" },
      common.GII,
      common.GHY,
      common.GIG,
      common.GIE,
      common.GAN,
      common.GGG,
    ],
  })),
  {
    year: 2014,
    program: "9C1",
    pdf_page: 13,
    printed_page: 5,
    colors: [
      { ...common.GYW, source_label_raw: "Hugo Blue* (Dark Blue) Meatllic" },
      common.GII,
      common.GHY,
      { ...common.GIG, source_label_raw: "Karma Metallic (Jade)" },
      common.GIE,
      common.GAN,
      { ...common.GZ7, source_label_raw: "Mystic Green (New)" },
    ],
  },
  ...[2015, 2016].map((year) => ({
    year,
    program: "9C1",
    pdf_page: 8,
    printed_page: 8,
    colors: [common.GYW, common.GII, common.GHY, common.GIE, common.GAN, common.GZ7],
  })),
  {
    year: 2017,
    program: "9C1",
    pdf_page: 10,
    printed_page: 6,
    colors: [common.GII, common.GHY, common.GIE, common.GAN],
  },
];

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function programId({ year, program }) {
  return `gm-${year}-caprice-${program.toLowerCase()}-${
    program === "9C1" ? "ppv" : "detective"
  }-standard-palette`;
}

function programLabel(program) {
  return program === "9C1"
    ? "Caprice 9C1 PPV standard program palette"
    : "Caprice 9C3 Detective standard program palette";
}

function sourceCitation(palette) {
  const source = sources[palette.year];
  return {
    source_id: source.source_id,
    title: source.title,
    publisher: "General Motors",
    source_type: source.source_type,
    url: source.url,
    pdf_page: palette.pdf_page,
    printed_page: palette.printed_page,
    section: `${palette.year} Caprice ${palette.program} - Available Exterior Colors`,
    revision: source.revision,
    retrieved_at: source.retrieved_at,
    bytes: source.bytes,
    sha256: source.sha256,
    pdf_page_count: source.pdf_page_count,
    archive_asset_name: source.archive_asset_name,
    archive_url: `${releaseBase}${source.archive_asset_name}`,
  };
}

const capriceRecords = palettes.flatMap((palette) =>
  palette.colors.map((item) => {
    const hugo = item.rpo === "GYW";
    const restrictionPolicy = hugo
      ? palette.year === 2016
        ? "caprice-hugo-blue-2016-additional-charge-20-unit-batch"
        : "caprice-hugo-blue-2012-2015-extra-cost-20-unit-batch"
      : null;
    return {
      record_id: `gm-${palette.year}-caprice-${palette.program.toLowerCase()}-${item.rpo.toLowerCase()}-${slug(item.label)}`,
      publication_status: "published_specialty_subset",
      model_year: palette.year,
      catalog_model_ids: ["caprice-ppv"],
      source_model_scope: [
        `${palette.year} Caprice ${
          palette.program === "9C1"
            ? "Police Package 9C1"
            : "Detective Police Package 9C3"
        }`,
      ],
      program_id: programId(palette),
      program_label: programLabel(palette.program),
      program_code: palette.program,
      application_type: "standard_program_palette",
      availability_state: hugo
        ? "available_with_minimum_batch"
        : "available",
      label: item.label,
      source_label_raw: item.source_label_raw,
      finish: item.finish,
      paint_code: "Not printed",
      factory_paint_code: null,
      wa_code: null,
      seo_code: null,
      rpo_code: item.rpo,
      code_display: `RPO ${item.rpo}; factory paint code not printed`,
      touch_up_paint_number: null,
      premium_batch_color: hugo,
      minimum_batch_units: hugo ? 20 : null,
      restriction_policy_id: restrictionPolicy,
      restrictions: [
        `This row is limited to the ${programLabel(palette.program)} for model year ${palette.year}.`,
        "The guide prints an exterior-color RPO but no factory paint, WA, refinish, or touch-up code.",
        "The guide states that actual colors may vary.",
        ...(hugo
          ? [
              palette.year === 2016
                ? "Additional charge; orders below 20 units wait for a 20-unit production batch and require additional lead time."
                : "Extra cost; orders below 20 units wait for a 20-unit production batch and require additional lead time.",
            ]
          : []),
      ],
      source: sourceCitation(palette),
    };
  }),
);

const sourcePrecedencePolicy = {
  policy_id: "caprice-model-specific-guide-over-fleet-summary",
  scope: "2011-2017 Chevrolet Caprice 9C1 and 9C3 exterior-color palettes",
  higher_authority:
    "The revised, model-specific General Motors municipal or Caprice specification guide.",
  lower_authority:
    "The annual General Motors Fleet Guide summary when its label, omission, or carryover conflicts with the model-specific guide.",
  rule:
    "Publish the final palette in the model-specific guide. Preserve every conflicting Fleet Guide literal in source_conflict_assertions without creating an additional availability row.",
};

const fleetSources = {
  2011: ["gm-fleet-guide-us-2011", "2011-gm-fleet-guide-mirror.pdf", [92, 93]],
  2012: ["gm-fleet-guide-us-2012", "2012-gm-car-truck-guide-mirror.pdf", [94, 95]],
  2013: ["gm-fleet-guide-us-2013", "2013-gm-car-truck-guide-mirror.pdf", [91, 92]],
  2014: ["gm-fleet-guide-us-2014", "2014-gm-fleet-car-truck-guide-mirror.pdf", [109]],
  2015: ["gm-fleet-guide-us-2015", "2015-gm-fleet-car-truck-guide-mirror.pdf", [113]],
  2017: ["gm-fleet-guide-us-2017", "2017-gm-fleet-guide-mirror.pdf", [124]],
};

function conflict(year, conflictId, governingPages, differences, resolution) {
  const source = sources[year];
  const [fleetSourceId, fleetAsset, fleetPages] = fleetSources[year];
  return {
    assertion_id: `caprice-ppv-${year}-${conflictId}`,
    model_year: year,
    catalog_model_ids: ["caprice-ppv"],
    precedence_policy_id: sourcePrecedencePolicy.policy_id,
    governing_source: {
      source_id: source.source_id,
      url: source.url,
      archive_url: `${releaseBase}${source.archive_asset_name}`,
      pdf_pages: governingPages,
    },
    comparison_source: {
      source_id: fleetSourceId,
      archive_url: `${releaseBase}${fleetAsset}`,
      pdf_pages: fleetPages,
    },
    differences,
    resolution,
  };
}

const sourceConflictAssertions = [
  conflict(
    2011,
    "fleet-labels-differ",
    [15, 19],
    [
      { rpo_code: "GAN", model_guide: "Silver Ice Metallic", fleet_guide: "Switchblade Silver (Silver Pearl)" },
      { rpo_code: "GIG", model_guide: "Karma Metallic", fleet_guide: "Karma (Jade Green)" },
      { rpo_code: "GGG", model_guide: ["Alto Grey Metallic", "Alto Gray Metallic"], fleet_guide: "Alto Gray (Medium Gray)" },
      { rpo_code: "GST", model_guide: ["Mirage Gold Metallic", "Mirage Glow Metallic"], fleet_guide: "Mirage Gold (Light Gold)" },
    ],
    "The app rows preserve the model-specific 9C1 and 9C3 labels. Fleet labels remain comparison literals only.",
  ),
  conflict(
    2012,
    "fleet-omits-hugo-and-labels-differ",
    [15, 19],
    [
      { rpo_code: "GYW", model_guide: "Hugo Blue* (Dark Blue) Metallic", fleet_guide: "Omitted" },
      { rpo_code: "GST", model_guide: "Mirage Gold Metallic", fleet_guide: "Mirage Glow Metallic" },
      { rpo_code: "GGG", model_guide: "Alto Grey Metallic", fleet_guide: "Alto Gray Metallic" },
    ],
    "Hugo Blue is published with its 20-unit batch restriction; the model-guide GST and GGG literals control.",
  ),
  conflict(
    2013,
    "fleet-retains-deleted-mirage",
    [15, 16, 19],
    [{ rpo_code: "GST", model_guide: "Deleted and omitted from both final palette tables", fleet_guide: "Mirage Glow Metallic" }],
    "No 2013 GST availability record is published.",
  ),
  conflict(
    2014,
    "fleet-renames-gz7",
    [9, 13],
    [{ rpo_code: "GZ7", model_guide: "Mystic Green (New)", fleet_guide: "Prussian Steel (new)" }],
    "GZ7 is published once as Mystic Green. Prussian Steel remains a source-literal alias, not a second color.",
  ),
  conflict(
    2015,
    "fleet-retains-deleted-alto-grey",
    [8],
    [{ rpo_code: "GGG", model_guide: "Omitted from the revised final palette", fleet_guide: "Alto Grey Metallic" }],
    "No 2015 GGG availability record is published because the 2014 model guide deleted it and the revised 2015 palette omits it.",
  ),
  conflict(
    2017,
    "fleet-retains-discontinued-mystic-green",
    [5, 10],
    [{ rpo_code: "GZ7", model_guide: "Discontinued and omitted from the final palette", fleet_guide: "Mystic Green" }],
    "No 2017 GZ7 availability record is published.",
  ),
];

function lifecycle(assertionId, year, recordType, subject, pdfPages, printedPages, fact, effect) {
  const source = sources[year];
  return {
    assertion_id: `caprice-ppv-${assertionId}`,
    model_year: year,
    catalog_model_ids: ["caprice-ppv"],
    record_type: recordType,
    subject,
    fact,
    publication_effect: effect,
    source: {
      source_id: source.source_id,
      url: source.url,
      archive_url: `${releaseBase}${source.archive_asset_name}`,
      pdf_pages: pdfPages,
      printed_pages: printedPages,
    },
  };
}

const programLifecycleAssertions = [
  lifecycle("2013-gst-deleted", 2013, "color_deletion", "RPO GST", [16], [5], "The 9C3 update page marks Mirage Gold Metallic deleted; both final Caprice palette tables omit GST.", "No 2013 GST row is published."),
  lifecycle("2014-9c3-deleted", 2014, "program_deletion", "Caprice Detective Package 9C3", [9], [1], "The guide lists the Detective Package, option 9C3, under deletions.", "No 2014 or later Caprice 9C3 palette is published."),
  lifecycle("2014-ggg-deleted", 2014, "color_deletion", "RPO GGG Alto Grey Metallic", [9, 13], [1, 5], "The guide lists Alto Grey Metallic under deletions and omits GGG from the final palette.", "No 2014 or later GGG row is published."),
  lifecycle("2014-gz7-new", 2014, "color_addition", "RPO GZ7 Mystic Green", [9, 13], [1, 5], "The guide identifies Mystic Green as a new exterior color and includes it in the final palette.", "A 2014 GZ7 row is published."),
  lifecycle("2017-gyw-discontinued", 2017, "color_discontinuation", "RPO GYW Hugo Blue", [5, 10], [1, 6], "The update page lists Hugo Blue as discontinued and the final palette omits it.", "No 2017 GYW row is published."),
  lifecycle("2017-gz7-discontinued", 2017, "color_discontinuation", "RPO GZ7 Mystic Green", [5, 10], [1, 6], "The update page lists Mystic Green as discontinued and the final palette omits it.", "No 2017 GZ7 row is published."),
];

const premiumColorRestrictions = [
  {
    restriction_policy_id: "caprice-hugo-blue-2012-2015-extra-cost-20-unit-batch",
    model_years: [2012, 2013, 2014, 2015],
    rpo_code: "GYW",
    charge_label_raw: "Extra cost",
    minimum_batch_units: 20,
    effect: "Orders below 20 units are delayed until a 20-unit production batch is received; additional lead time is required.",
  },
  {
    restriction_policy_id: "caprice-hugo-blue-2016-additional-charge-20-unit-batch",
    model_years: [2016],
    rpo_code: "GYW",
    charge_label_raw: "Additional charge",
    minimum_batch_units: 20,
    effect: "Orders below 20 units are delayed until a 20-unit production batch is received; additional lead time is required.",
  },
];

const programDefinition = {
  program_id: "gm-caprice-ppv-standard-palettes-2011-2017",
  program_ids: palettes.map(programId),
  model_year_scopes: palettes.map(
    ({ year, program }) => `${year} Caprice ${program}`,
  ),
  application_type: "standard_program_palette",
  catalog_model_ids: ["caprice-ppv"],
  factory_paint_code_printed: false,
  wa_code_printed: false,
  rpo_code_printed: true,
  program_evolution: [
    "9C1 is documented for 2011 through 2017.",
    "9C3 is documented for 2011 through 2013 and expressly deleted for 2014.",
    "Hugo Blue is batch restricted for 2012 through 2016.",
    "Hugo Blue and Mystic Green are expressly discontinued for 2017.",
  ],
};

async function verifySource(source) {
  const fileUrl = new URL(source.local_path.replaceAll("\\", "/"), root);
  const bytes = await readFile(fileUrl);
  const metadata = await stat(fileUrl);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (metadata.size !== source.bytes || digest !== source.sha256) {
    throw new Error(`retained source mismatch: ${source.source_id}`);
  }
}

function collectArtifactIdentities(value, artifacts = new Map()) {
  if (Array.isArray(value)) {
    for (const child of value) collectArtifactIdentities(child, artifacts);
    return artifacts;
  }
  if (!value || typeof value !== "object") return artifacts;
  if (
    typeof value.url === "string" &&
    Number.isInteger(value.bytes) &&
    typeof value.sha256 === "string" &&
    /^[0-9a-f]{64}$/.test(value.sha256)
  ) {
    const existing = artifacts.get(value.url);
    const identity = `${value.bytes}\u001f${value.sha256}`;
    if (existing && existing !== identity) {
      throw new Error(`conflicting retained artifact metadata: ${value.url}`);
    }
    artifacts.set(value.url, identity);
  }
  for (const child of Object.values(value)) {
    collectArtifactIdentities(child, artifacts);
  }
  return artifacts;
}

await Promise.all(Object.values(sources).map(verifySource));

const ledger = JSON.parse(await readFile(ledgerUrl, "utf8"));
const capriceRecordPrefix = "gm-20";
const isCapriceRecord = (record) =>
  record.catalog_model_ids?.includes("caprice-ppv") &&
  record.record_id?.startsWith(capriceRecordPrefix);
ledger.app_publication_records = [
  ...ledger.app_publication_records.filter((record) => !isCapriceRecord(record)),
  ...capriceRecords,
];
ledger.program_definitions = [
  ...(ledger.program_definitions ?? []).filter(
    ({ program_id }) => program_id !== programDefinition.program_id,
  ),
  programDefinition,
];

const promotedSourceIds = new Set([2015, 2016, 2017].map((year) => sources[year].source_id));
const promotedSources = [2015, 2016, 2017].map((year) => {
  const source = sources[year];
  return {
    source_id: source.source_id,
    year,
    model: "Caprice 9C1 PPV",
    url: source.url,
    candidate_pages: year === 2017 ? [5, 10] : [8],
    bytes: source.bytes,
    sha256: source.sha256,
    status: "visually_verified_and_published",
    archive_asset_name: source.archive_asset_name,
    archive_url: `${releaseBase}${source.archive_asset_name}`,
    pdf_page_count: source.pdf_page_count,
  };
});
ledger.historic_gm_upfitter_candidates = [
  ...ledger.historic_gm_upfitter_candidates.filter(
    ({ source_id }) => !promotedSourceIds.has(source_id),
  ),
  ...promotedSources,
];

ledger.source_precedence_policies = [
  ...(ledger.source_precedence_policies ?? []).filter(
    ({ policy_id }) => policy_id !== sourcePrecedencePolicy.policy_id,
  ),
  sourcePrecedencePolicy,
];
ledger.source_conflict_assertions = [
  ...(ledger.source_conflict_assertions ?? []).filter(
    ({ assertion_id }) => !assertion_id.startsWith("caprice-ppv-"),
  ),
  ...sourceConflictAssertions,
];
ledger.program_lifecycle_assertions = [
  ...(ledger.program_lifecycle_assertions ?? []).filter(
    ({ assertion_id }) => !assertion_id.startsWith("caprice-ppv-"),
  ),
  ...programLifecycleAssertions,
];
ledger.premium_color_restrictions = [
  ...(ledger.premium_color_restrictions ?? []).filter(
    ({ restriction_policy_id }) => !restriction_policy_id.startsWith("caprice-hugo-blue-"),
  ),
  ...premiumColorRestrictions,
];

ledger.generated_at = generatedAt;
const artifactIdentities = collectArtifactIdentities(ledger);
ledger.integrity_audit.unique_retained_artifacts_reconciled =
  artifactIdentities.size;
ledger.integrity_audit.artifact_reference_groups = {
  published_specialty_sources: collectArtifactIdentities(
    ledger.app_publication_records,
  ).size,
  verified_not_published_sources: collectArtifactIdentities(
    ledger.verified_not_published,
  ).size,
  historic_gm_upfitter_candidates: collectArtifactIdentities(
    ledger.historic_gm_upfitter_candidates,
  ).size,
  usda_primary_sources: collectArtifactIdentities(
    ledger.usda_primary_sources,
  ).size,
  modern_order_guide_snapshot_candidates: collectArtifactIdentities(
    ledger.modern_order_guide_snapshot_candidates,
  ).size,
  comparison_sources: collectArtifactIdentities(ledger.comparison_sources).size,
  rejected_or_unresolved_source_artifacts: collectArtifactIdentities(
    ledger.rejected_or_unresolved_leads,
  ).size,
};
ledger.integrity_audit.last_updater_rehash = {
  script: "scripts/update-caprice-ppv-specialty-tranche.mjs",
  source_ids: Object.values(sources).map(({ source_id: sourceId }) => sourceId),
  file_count: Object.keys(sources).length,
};
delete ledger.integrity_audit.unique_retained_files_rehashed;
delete ledger.integrity_audit.file_groups;
const reviewedPages = [
  "gm-2011-police-manual PDF pages 15 and 19",
  "gm-2012-municipal-manual PDF pages 15 and 19",
  "gm-2013-municipal-guide PDF pages 15, 16, and 19",
  "gm-2014-police-guide PDF pages 9 and 13",
  "gm-2015-caprice-9c1-specification-guide PDF page 8",
  "gm-2016-caprice-9c1-specification-guide PDF page 8",
  "gm-2017-caprice-9c1-specification-guide PDF pages 5 and 10",
];
ledger.integrity_audit.promoted_pdf_pages_visually_rechecked = [
  ...new Set([
    ...ledger.integrity_audit.promoted_pdf_pages_visually_rechecked,
    ...reviewedPages,
  ]),
];
ledger.integrity_audit.publication_boundary =
  `The ${ledger.app_publication_records.length} app_publication_records are limited to directly reviewed model, year, and program scopes. ` +
  "The 1993 C/K Pickup tranche is limited to the four zero-lead-day solid paints on PDF page 12 and does not assert assembly-plant installation or extend them to another model. " +
  "The Caprice PPV tranche contains one row per exact 2011-2017 program, color, and model year, applies the revised model-specific guide over conflicting Fleet Guide summaries, and publishes no inferred WA, SEO, or factory paint code. " +
  "The 2024 Blazer EV SEO rows marked not available and the 2025 rows marked planned or not available remain nonrouting snapshot evidence. " +
  "The five no-RPO rows on the 2003 SEO chart remain research-only because the adjacent TGK ordering table expressly identifies only four orderable specialty colors. " +
  "Forest Service Green remains a research lead without Chevrolet model-year availability.";

if (capriceRecords.length !== 67) throw new Error("Caprice record count must be 67");
if (new Set(capriceRecords.map(({ record_id }) => record_id)).size !== 67) {
  throw new Error("Caprice record IDs must be unique");
}

await writeFile(ledgerUrl, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({
    caprice_record_count: capriceRecords.length,
    minimum_batch_record_count: capriceRecords.filter(
      ({ availability_state }) =>
        availability_state === "available_with_minimum_batch",
    ).length,
    available_record_count: capriceRecords.filter(
      ({ availability_state }) => availability_state === "available",
    ).length,
    program_count: new Set(capriceRecords.map(({ program_id }) => program_id)).size,
    source_conflict_assertion_count: sourceConflictAssertions.length,
    lifecycle_assertion_count: programLifecycleAssertions.length,
  }),
);
