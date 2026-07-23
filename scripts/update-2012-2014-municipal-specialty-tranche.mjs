import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);
const ledgerUrl = new URL(
  "data/sources/specialty-color-source-candidates.json",
  root,
);
const manifestUrl = new URL(
  "data/sources/brochure-source-release-manifest.json",
  root,
);
const releaseBase =
  "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/";
const generatedAt = "2026-07-22T23:45:00Z";

export const SOURCE_CONTRACTS = {
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
    asset_name:
      "2012-chevrolet-municipal-vehicles-specifications-manual-gm.pdf",
    archive_url: `${releaseBase}2012-chevrolet-municipal-vehicles-specifications-manual-gm.pdf`,
    role: "controlling_specialty_vehicle_manual",
    revision: "September 29, 2011",
    retrieved_at: null,
    candidate_pages: [84, 92, 136, 151, 169, 171],
    published_model_scopes: [
      "Tahoe 2WD Police Package PPV",
      "Tahoe 4WD Special Service 5W4",
      "Express Transport Van 1LS and 2LS",
      "Suburban Commercial Fleet 1FL",
      "Silverado 1500 Crew Cab Pickup Work Truck 1WT",
    ],
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
    asset_name: "2013-chevrolet-municipal-vehicles-guide-gm.pdf",
    archive_url: `${releaseBase}2013-chevrolet-municipal-vehicles-guide-gm.pdf`,
    role: "controlling_specialty_vehicle_manual",
    revision: "2013 model year",
    retrieved_at: null,
    candidate_pages: [80, 92, 136, 151, 164, 168],
    published_model_scopes: [
      "Tahoe 2WD Police Package PPV",
      "Tahoe 4WD Special Service 5W4",
      "Express Transport Van 1LS and 2LS",
      "Suburban Commercial Fleet 1FL",
    ],
  },
  2014: {
    source_id: "gm-2014-police-guide",
    title: "2014 Chevrolet Municipal Vehicles Technical Manual",
    source_type: "official municipal vehicle technical manual",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/06/2014_Police_Technical_Guide_FINAL.pdf",
    local_path:
      "tmp/specialty-color-research/historic-official-pdfs/gm-2014-police-guide.pdf",
    bytes: 9_610_503,
    sha256: "d21cdc63dc71d20295d94075573f083560be5c73204bba13b939c8699dd77fdc",
    pdf_page_count: 147,
    asset_name: "2014-chevrolet-police-vehicles-technical-guide-gm.pdf",
    archive_url: `${releaseBase}2014-chevrolet-police-vehicles-technical-guide-gm.pdf`,
    role: "controlling_specialty_vehicle_manual",
    revision: "2014 model year",
    retrieved_at: null,
    candidate_pages: [71, 75, 83, 87, 113, 121, 126, 140],
    published_model_scopes: [
      "Tahoe 2WD Police Package PPV",
      "Tahoe 4WD Special Service 5W4",
      "Express Transport Van 1LS and 2LS",
      "Suburban Commercial Fleet 1FL",
      "Silverado 1500 Crew Cab Pickup Work Truck 1WT",
    ],
  },
};

const paint = (wa, label, seoCode = null, sourceLabelRaw = label) => ({
  wa,
  label,
  source_label_raw: sourceLabelRaw,
  seo_code: seoCode,
});

const tahoePalette = [
  paint("253A", "Wheatland Yellow", "9W3"),
  paint("334D", "Dark Toreador Red"),
  paint("722J", "Dark Blue Metallic", "9V7"),
  paint("5665", "Blue", "9V2"),
  paint("7941", "Green"),
  paint("9015", "Woodland Green", "9V5"),
  paint("9260", "Victory Red", "5T4"),
  paint("9414", "Yellow"),
];

const expressPalette = [
  paint("215D", "Yellow"),
  paint("259L", "Yellow"),
  paint("451N", "Blue"),
  paint("478G", "Yellow"),
  paint("519F", "Galaxy Silver Metallic"),
  paint("529F", "Bronzemist"),
  paint("811K", "Berry Red"),
  paint("5456", "Yellow"),
  paint("7927", "Green"),
  paint("7941", "Green"),
  paint("8867", "Silver Metallic"),
  paint("9015", "Woodland Green", "9V5"),
  paint("9403", "Doeskin Tan", "9V9"),
  paint("9414", "Yellow"),
  paint("9417", "Tangier Orange", "9W4"),
];

const suburbanPalette = [
  paint("334D", "Dark Toreador Red"),
  paint("253A", "Wheatland Yellow", "9W3"),
  paint("722J", "Dark Blue Metallic", "9V7"),
  paint("5665", "Blue"),
  paint("7941", "Green"),
  paint("9015", "Woodland Green", "9V5"),
  paint("9260", "Victory Red", "5T4"),
  paint("9414", "Yellow"),
];

const silverado2012Palette = [
  paint("228A", "Light Autumnwood Metallic"),
  paint("253A", "Wheatland Yellow", "9W3"),
  paint("334D", "Dark Toreador Red"),
  paint("382E", "Pewter"),
  paint("454N", "Blue"),
  paint("769H", "Blue"),
  paint("770H", "Orange"),
  paint("815K", "Arrival Blue"),
  paint("926L", "Silver Burch Metallic"),
  paint("5248", "Yellow"),
  paint("5405", "Blue Metallic"),
  paint("5445", "Yellow"),
  paint("5456", "Yellow"),
  paint("5663", "Blue"),
  paint("5758", "Green"),
  paint("7154", "Blue"),
  paint("7159", "Blue Metallic"),
  paint("7840", "Gray Metallic"),
  paint("7941", "Green"),
  paint("9015", "Woodland Green", "9V5"),
  paint("9403", "Doeskin Tan", "9V9"),
  paint("9414", "Yellow"),
  paint("9417", "Tangier Orange", "9W4"),
  paint("9419", "Orange"),
  paint("9539", "Green Metallic"),
  paint("9792", "Indigo Blue"),
];

const silverado2014Palette = [
  paint("9015", "Woodland Green", "9V5"),
  paint("9403", "Doeskin Tan", "9V9"),
  paint("253A", "Wheatland Yellow", "9W3"),
  paint("9417", "Tangier Orange", "9W4"),
  paint("7159", "Blue Metallic"),
  paint("334D", "Dark Toreador Red", null, "Dark Toreador red"),
  paint("136X", "Unripened Green Metallic"),
  paint("9792", "Indigo Blue"),
  paint("228A", "Light Autumnwood Metallic"),
  paint("382E", "Pewter", null, "Pewter none"),
];

const victoryOnly = suburbanPalette.filter(({ wa }) => wa === "9260");

const minimumBatchRestriction =
  "SEO paint orders containing fewer than five vehicles were delayed until a five-unit minimum was received for batch production.";
const noFactoryInstallationClaim =
  "The source identifies this as SEO paint availability but does not state that the paint was installed at the assembly plant.";

const programSpecs = [
  {
    year: 2012,
    model_id: "tahoe",
    program_key: "tahoe-ppv",
    program_label: "Tahoe 2WD Police Package PPV SEO paint",
    program_code: "PPV",
    source_model_scope: "2012 Tahoe 2WD Police Package PPV",
    pdf_pages: [84],
    printed_pages: [5],
    section: "Tahoe 2WD Police Package PPV - SEO Paint Available",
    palette: tahoePalette,
    source_code_mode: "blank",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [
      "Normally body-colored non-sheet-metal parts were Flat Black, except Victory Red parts matched.",
      minimumBatchRestriction,
    ],
  },
  {
    year: 2012,
    model_id: "tahoe",
    program_key: "tahoe-5w4",
    program_label: "Tahoe 4WD Special Service 5W4 SEO paint",
    program_code: "5W4",
    source_model_scope: "2012 Tahoe 4WD Special Service 5W4",
    pdf_pages: [92],
    printed_pages: [13],
    section: "Tahoe 4WD Special Service 5W4 - SEO Paint Available",
    palette: tahoePalette,
    source_code_mode: "blank",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [
      "Normally body-colored non-sheet-metal parts were Flat Black, except Victory Red parts matched.",
      minimumBatchRestriction,
    ],
  },
  {
    year: 2012,
    model_id: "express",
    program_key: "express-1ls-2ls",
    program_label: "Express Transport Van 1LS and 2LS SEO paint",
    program_code: "1LS/2LS",
    source_model_scope: "2012 Express Transport Van 1LS and 2LS",
    pdf_pages: [136],
    printed_pages: [5],
    section: "Express Transport Van 1LS and 2LS - SEO Paint Available",
    palette: expressPalette,
    source_code_mode: "blank",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [
      "Normally body-colored non-sheet-metal parts were Flat Black.",
      minimumBatchRestriction,
    ],
  },
  {
    year: 2012,
    model_id: "suburban",
    program_key: "suburban-1fl",
    program_label: "Suburban Commercial Fleet 1FL SEO paint",
    program_code: "1FL",
    source_model_scope: "2012 Suburban Commercial Fleet 1FL",
    pdf_pages: [151],
    printed_pages: [6],
    section: "Suburban Commercial Fleet 1FL - SEO Paint Available",
    palette: suburbanPalette,
    source_code_mode: "blank",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [
      "Normally body-colored non-sheet-metal parts were Flat Black, except Victory Red parts matched.",
      minimumBatchRestriction,
    ],
  },
  {
    year: 2012,
    model_id: "silverado",
    program_key: "silverado-1wt-tgk",
    program_label: "Silverado 1500 Crew Cab Work Truck 1WT TGK SEO paint",
    program_code: "1WT/TGK",
    source_model_scope:
      "2012 Silverado 1500 Crew Cab Pickup Work Truck 1WT, CK10543 4WD special-paint scope",
    pdf_pages: [169, 171],
    printed_pages: [6, 8],
    section:
      "Silverado 1500 Crew Cab Pickup Work Truck 1WT - SEO Paint Available; TGK special-paint option",
    palette: silverado2012Palette,
    source_code_mode: "blank",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [
      "TGK required 01U with any special-paint selection and could require extended lead time.",
      "TGK required CK10543 4WD, the LC9 5.3L V8, and the MYC six-speed automatic transmission; the four printed 9V5, 9V9, 9W3, and 9W4 paint options also state that they were unavailable on CC10543.",
      "Door handles, mirrors, and other normally body-colored non-sheet-metal parts were Flat Black; the selection deleted standard or package body-side moldings.",
      minimumBatchRestriction,
    ],
  },
  {
    year: 2013,
    model_id: "tahoe",
    program_key: "tahoe-ppv",
    program_label: "Tahoe 2WD Police Package PPV SEO paint",
    program_code: "PPV",
    source_model_scope: "2013 Tahoe 2WD Police Package PPV",
    pdf_pages: [80],
    printed_pages: [5],
    section: "Tahoe 2WD Police Package PPV - SEO Paint Available",
    palette: tahoePalette,
    source_code_mode: "blank",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [
      "Normally body-colored non-sheet-metal parts were Glossy Black, except Victory Red parts matched.",
      minimumBatchRestriction,
    ],
  },
  {
    year: 2013,
    model_id: "tahoe",
    program_key: "tahoe-5w4",
    program_label: "Tahoe 4WD Special Service 5W4 SEO paint",
    program_code: "5W4",
    source_model_scope: "2013 Tahoe 4WD Special Service 5W4",
    pdf_pages: [92],
    printed_pages: [17],
    section: "Tahoe 4WD Special Service 5W4 - SEO Paint Available",
    palette: tahoePalette,
    source_code_mode: "blank",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [
      "Normally body-colored non-sheet-metal parts were Glossy Black, except Victory Red parts matched.",
      minimumBatchRestriction,
    ],
  },
  {
    year: 2013,
    model_id: "express",
    program_key: "express-1ls-2ls",
    program_label: "Express Transport Van 1LS and 2LS SEO paint",
    program_code: "1LS/2LS",
    source_model_scope: "2013 Express Transport Van 1LS and 2LS",
    pdf_pages: [136],
    printed_pages: [5],
    section: "Express Transport Van 1LS and 2LS - SEO Paint Available",
    palette: expressPalette,
    source_code_mode: "blank",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [
      "Normally body-colored non-sheet-metal parts were Flat Black.",
      minimumBatchRestriction,
    ],
  },
  {
    year: 2013,
    model_id: "suburban",
    program_key: "suburban-1fl",
    program_label: "Suburban Commercial Fleet 1FL SEO paint",
    program_code: "1FL",
    source_model_scope: "2013 Suburban Commercial Fleet 1FL",
    pdf_pages: [151],
    printed_pages: [6],
    section: "Suburban Commercial Fleet 1FL - SEO Paint Available",
    palette: suburbanPalette,
    source_code_mode: "blank",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [
      "Normally body-colored non-sheet-metal parts were Flat Black, except Victory Red parts matched.",
      minimumBatchRestriction,
    ],
  },
  {
    year: 2014,
    model_id: "tahoe",
    program_key: "tahoe-ppv",
    program_label: "Tahoe 2WD Police Package PPV SEO paint",
    program_code: "PPV",
    source_model_scope: "2014 Tahoe 2WD Police Package PPV",
    pdf_pages: [75],
    printed_pages: [5],
    section: "Tahoe 2WD Police Package PPV - SEO Paint Available",
    palette: victoryOnly,
    source_code_mode: "blank",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [minimumBatchRestriction],
  },
  {
    year: 2014,
    model_id: "tahoe",
    program_key: "tahoe-5w4",
    program_label: "Tahoe 4WD Special Service 5W4 SEO paint",
    program_code: "5W4",
    source_model_scope: "2014 Tahoe 4WD Special Service 5W4",
    pdf_pages: [87],
    printed_pages: [17],
    section: "Tahoe 4WD Special Service 5W4 - SEO Paint Available",
    palette: victoryOnly,
    source_code_mode: "blank",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [minimumBatchRestriction],
  },
  {
    year: 2014,
    model_id: "express",
    program_key: "express-1ls-2ls",
    program_label: "Express Transport Van 1LS and 2LS SEO paint",
    program_code: "1LS/2LS",
    source_model_scope: "2014 Express Transport Van 1LS and 2LS",
    pdf_pages: [113],
    printed_pages: [5],
    section: "Express Transport Van 1LS and 2LS - SEO Paint Available",
    palette: expressPalette,
    source_code_mode: "tbd",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [
      "Normally body-colored non-sheet-metal parts were Flat Black.",
      minimumBatchRestriction,
    ],
  },
  {
    year: 2014,
    model_id: "suburban",
    program_key: "suburban-1fl",
    program_label: "Suburban Commercial Fleet 1FL SEO paint",
    program_code: "1FL",
    source_model_scope: "2014 Suburban Commercial Fleet 1FL",
    pdf_pages: [126],
    printed_pages: [6],
    section: "Suburban Commercial Fleet 1FL - SEO Paint Available",
    palette: victoryOnly,
    source_code_mode: "blank",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
    restrictions: [
      "Normally body-colored non-sheet-metal parts were Flat Black, except Victory Red parts matched.",
      minimumBatchRestriction,
    ],
  },
  {
    year: 2014,
    model_id: "silverado",
    program_key: "silverado-1wt",
    program_label: "Silverado 1500 Crew Cab Work Truck 1WT SEO paint",
    program_code: "1WT",
    source_model_scope:
      "2014 Silverado 1500 Crew Cab Pickup Work Truck 1WT",
    pdf_pages: [140],
    printed_pages: [4],
    section:
      "Silverado 1500 Crew Cab Pickup Work Truck 1WT - SEO Paint Available",
    palette: silverado2014Palette,
    source_code_mode: "tbd",
    availability_state: "available",
    minimum_batch_units: null,
    restrictions: [
      "The cited 2014 table prints no five-unit minimum or extended-lead-time condition; no condition is carried forward from 2012.",
    ],
  },
];

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function programId(spec) {
  return `gm-${spec.year}-${spec.program_key}-seo-paint`;
}

function sourceCitation(spec) {
  const source = SOURCE_CONTRACTS[spec.year];
  const citation = {
    source_id: source.source_id,
    title: source.title,
    publisher: "General Motors",
    source_type: source.source_type,
    url: source.url,
    section: spec.section,
    revision: source.revision,
    retrieved_at: source.retrieved_at,
    bytes: source.bytes,
    sha256: source.sha256,
    pdf_page_count: source.pdf_page_count,
    archive_asset_name: source.asset_name,
    archive_url: source.archive_url,
  };
  if (spec.pdf_pages.length === 1) {
    citation.pdf_page = spec.pdf_pages[0];
    citation.printed_page = spec.printed_pages[0];
  } else {
    citation.pdf_pages = [...spec.pdf_pages];
    citation.printed_pages = [...spec.printed_pages];
  }
  return citation;
}

function sourceCodeFields(row, mode) {
  if (row.seo_code) {
    return {
      seo_code: row.seo_code,
      source_seo_code_raw: row.seo_code,
      source_seo_code_cell_state: "printed",
    };
  }
  if (mode === "tbd") {
    return {
      seo_code: "Not stated",
      source_seo_code_raw: "TBD",
      source_seo_code_cell_state: "tbd",
    };
  }
  return {
    seo_code: "Not printed",
    source_seo_code_raw: null,
    source_seo_code_cell_state: "blank",
  };
}

function finishFromLabel(label) {
  return /metallic/i.test(label) ? "metallic" : "not printed";
}

function recordFor(spec, row) {
  const sourceCode = sourceCodeFields(row, spec.source_code_mode);
  const paintCode = `WA-${row.wa}`;
  const codeDisplay = row.seo_code
    ? `${paintCode} / SEO ${row.seo_code}`
    : paintCode;
  const sourceCodeRestriction =
    sourceCode.source_seo_code_cell_state === "blank"
      ? "The SEO-code cell is blank in the cited table; no code is inferred."
      : sourceCode.source_seo_code_cell_state === "tbd"
        ? "The SEO-code cell literally prints TBD; the archive retains that literal as source metadata and does not promote it to a code."
        : `The cited table prints SEO code ${row.seo_code}.`;
  return {
    record_id: `${programId(spec)}-${row.wa.toLowerCase()}-${slug(row.label)}`,
    publication_status: "published_specialty_subset",
    model_year: spec.year,
    catalog_model_ids: [spec.model_id],
    source_model_scope: [spec.source_model_scope],
    program_id: programId(spec),
    program_label: spec.program_label,
    program_code: spec.program_code,
    application_type: "special_equipment_option_paint",
    availability_state: spec.availability_state,
    label: row.label,
    source_label_raw: row.source_label_raw,
    finish: finishFromLabel(row.label),
    paint_code: paintCode,
    factory_paint_code: paintCode,
    wa_code: paintCode,
    ...sourceCode,
    rpo_code: null,
    code_display: codeDisplay,
    touch_up_paint_number: null,
    minimum_batch_units: spec.minimum_batch_units,
    factory_installation_claim: false,
    installation_semantics:
      "Manufacturer SEO paint listing; assembly-plant installation is not stated.",
    restrictions: [
      `This row is limited to ${spec.source_model_scope}.`,
      `The table prints WA# ${row.wa}; the archive displays it as ${paintCode}.`,
      sourceCodeRestriction,
      "The guide states that actual colors may vary.",
      noFactoryInstallationClaim,
      ...spec.restrictions,
    ],
    source: sourceCitation(spec),
  };
}

export const MUNICIPAL_RECORDS = programSpecs.flatMap((spec) =>
  spec.palette.map((row) => recordFor(spec, row)),
);

const groupedProgramDefinition = (
  groupId,
  modelId,
  specPredicate,
  restrictions,
) => {
  const specs = programSpecs.filter(specPredicate);
  return {
    program_id: groupId,
    program_ids: specs.map(programId),
    model_year_scopes: specs.map(({ source_model_scope: scope }) => scope),
    application_type: "special_equipment_option_paint",
    catalog_model_ids: [modelId],
    factory_installation_claim: false,
    restrictions,
  };
};

export const PROGRAM_DEFINITIONS = [
  groupedProgramDefinition(
    "gm-tahoe-ppv-seo-paint-2012-2014",
    "tahoe",
    ({ program_key: key }) => key === "tahoe-ppv",
    [
      "Each model year has its own exact PPV table; adjacent years are not inferred.",
      "All three exact tables impose a five-unit batch minimum.",
      "The 2014 update expressly deletes seven 2013 SEO colors, leaving Victory Red as the only printed 2014 SEO row.",
    ],
  ),
  groupedProgramDefinition(
    "gm-tahoe-5w4-seo-paint-2012-2014",
    "tahoe",
    ({ program_key: key }) => key === "tahoe-5w4",
    [
      "The source calls the package Tahoe 4WD Special Service 5W4; it is not relabeled as 9C1.",
      "Each model year has its own exact table and a five-unit batch minimum.",
      "The 2014 update expressly deletes seven 2013 SEO colors, leaving Victory Red as the only printed 2014 SEO row.",
    ],
  ),
  groupedProgramDefinition(
    "gm-express-1ls-2ls-seo-paint-2012-2014",
    "express",
    ({ program_key: key }) => key === "express-1ls-2ls",
    [
      "All 15 rows are printed independently in each 2012, 2013, and 2014 Express table.",
      "Blank 2012-2013 SEO-code cells are distinguished from the literal TBD cells printed in 2014.",
      "Each exact table imposes a five-unit batch minimum.",
    ],
  ),
  groupedProgramDefinition(
    "gm-suburban-1fl-seo-paint-2012-2014",
    "suburban",
    ({ program_key: key }) => key === "suburban-1fl",
    [
      "The rows are limited to Suburban Commercial Fleet 1FL and do not replace the separately published regular Suburban palette.",
      "The 2014 update expressly deletes seven 2013 SEO colors, leaving Victory Red as the only printed 2014 SEO row.",
      "The 2014 update separately states that there were no 3/4-ton models for model year 2014.",
    ],
  ),
  groupedProgramDefinition(
    "gm-silverado-1wt-seo-paint-2012-2014",
    "silverado",
    ({ model_id: modelId }) => modelId === "silverado",
    [
      "The retained 2012 table prints 26 rows, including the final WA# 9792 Indigo Blue row.",
      "The 2013 Silverado 1WT section prints a standard exterior-color block but no SEO-paint table; no specialty row or unavailability claim is inferred.",
      "The 2014 table independently prints ten rows and no batch or extended-lead-time condition; no 2012 restriction is carried forward.",
    ],
  ),
];

const deletedFor2014 = [
  { paint_code: "WA-253A", label: "Wheatland Yellow" },
  { paint_code: "WA-334D", label: "Dark Toreador Red" },
  { paint_code: "WA-722J", label: "Dark Blue Metallic" },
  { paint_code: "WA-5665", label: "Blue" },
  { paint_code: "WA-7941", label: "Green" },
  { paint_code: "WA-9015", label: "Woodland Green" },
  { paint_code: "WA-9414", label: "Yellow" },
];

function lifecycleSource(year, pdfPages, printedPages) {
  const source = SOURCE_CONTRACTS[year];
  return {
    source_id: source.source_id,
    url: source.url,
    archive_url: source.archive_url,
    pdf_pages: pdfPages,
    printed_pages: printedPages,
  };
}

function deletionAssertion(
  assertionId,
  modelId,
  subject,
  program,
  pdfPages,
  printedPages,
) {
  return {
    assertion_id: assertionId,
    model_year: 2014,
    catalog_model_ids: [modelId],
    program_id: program,
    record_type: "color_deletion",
    subject,
    deleted_colors: structuredClone(deletedFor2014),
    fact:
      "The 2014 update page expressly lists these seven specialty paints under Deleted; the final SEO table prints only Victory Red WA-9260, SEO 5T4.",
    publication_effect:
      "No 2014 availability row is published for a deleted color. Victory Red remains a separately source-confirmed active row.",
    source: lifecycleSource(2014, pdfPages, printedPages),
  };
}

export const LIFECYCLE_ASSERTIONS = [
  deletionAssertion(
    "municipal-specialty-2014-tahoe-ppv-seven-seo-colors-deleted",
    "tahoe",
    "2014 Tahoe 2WD Police Package PPV SEO palette",
    "gm-2014-tahoe-ppv-seo-paint",
    [71, 75],
    [1, 5],
  ),
  deletionAssertion(
    "municipal-specialty-2014-tahoe-5w4-seven-seo-colors-deleted",
    "tahoe",
    "2014 Tahoe 4WD Special Service 5W4 SEO palette",
    "gm-2014-tahoe-5w4-seo-paint",
    [83, 87],
    [13, 17],
  ),
  deletionAssertion(
    "municipal-specialty-2014-suburban-1fl-seven-seo-colors-deleted",
    "suburban",
    "2014 Suburban Commercial Fleet 1FL SEO palette",
    "gm-2014-suburban-1fl-seo-paint",
    [121, 126],
    [1, 6],
  ),
  {
    assertion_id: "municipal-specialty-2014-suburban-no-three-quarter-ton",
    model_year: 2014,
    catalog_model_ids: ["suburban"],
    program_id: "gm-2014-suburban-1fl-seo-paint",
    record_type: "model_scope_deletion",
    subject: "2014 Suburban 3/4-ton models",
    fact: "The 2014 Suburban 1FL update page states that there were no 3/4-ton models for the 2014 model year.",
    publication_effect:
      "The 2014 1FL SEO row is not extended to a 3/4-ton Suburban configuration.",
    source: lifecycleSource(2014, [121], [1]),
  },
  {
    assertion_id: "municipal-specialty-2013-silverado-no-seo-table",
    model_year: 2013,
    catalog_model_ids: ["silverado"],
    record_type: "nonpublication_guard",
    subject: "2013 Silverado 1500 Crew Cab Pickup Work Truck 1WT SEO paint",
    fact:
      "The complete 2013 Silverado 1WT section on PDF pages 164-180 prints a standard Available Exterior Colors block on PDF page 168 but no SEO Paint Available table.",
    publication_effect:
      "No 2013 Silverado specialty-paint row is published. Silence is not treated as affirmative unavailability, and neither 2012 nor 2014 is propagated into 2013.",
    source: lifecycleSource(
      2013,
      Array.from({ length: 17 }, (_, index) => 164 + index),
      Array.from({ length: 17 }, (_, index) => 1 + index),
    ),
  },
];

const unresolvedForestPatterns = [
  /forest service green/i,
  /forestry green/i,
  /(?:^|\D)14260(?:\D|$)/,
  /(?:^|\D)5032(?:\D|$)/,
];

export function validateNoUnresolvedForestRouting(records) {
  for (const record of records) {
    const routedFields = [
      record.label,
      record.source_label_raw,
      record.paint_code,
      record.factory_paint_code,
      record.wa_code,
      record.rpo_code,
      record.seo_code,
      record.code_display,
      record.touch_up_paint_number,
    ];
    if (
      unresolvedForestPatterns.some((pattern) =>
        routedFields.some((value) => pattern.test(String(value ?? ""))),
      )
    ) {
      throw new Error(
        `unresolved Forest Service Green identity entered availability: ${record.record_id}`,
      );
    }
  }
}

function validateMunicipalWoodlandIdentity(records) {
  const woodlandRows = records.filter(
    ({ label }) => label === "Woodland Green",
  );
  if (
    woodlandRows.some(
      ({ paint_code: paintCode, seo_code: seoCode }) =>
        paintCode !== "WA-9015" || seoCode !== "9V5",
    )
  ) {
    throw new Error("Woodland Green must remain the distinct WA-9015 / 9V5 identity");
  }
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export function validateTrancheContracts() {
  if (MUNICIPAL_RECORDS.length !== 132) {
    throw new Error(`municipal specialty record count must be 132, got ${MUNICIPAL_RECORDS.length}`);
  }
  if (
    new Set(MUNICIPAL_RECORDS.map(({ record_id: recordId }) => recordId)).size !==
    132
  ) {
    throw new Error("municipal specialty record IDs must be unique");
  }
  const stateCounts = countBy(MUNICIPAL_RECORDS, "availability_state");
  if (
    stateCounts.available_with_minimum_batch !== 122 ||
    stateCounts.available !== 10
  ) {
    throw new Error("municipal specialty availability-state counts are invalid");
  }
  if (
    MUNICIPAL_RECORDS.some(
      ({ application_type: applicationType }) =>
        applicationType !== "special_equipment_option_paint",
    )
  ) {
    throw new Error("municipal specialty application type drifted");
  }
  if (
    MUNICIPAL_RECORDS.some((record) =>
      record.availability_state === "available_with_minimum_batch"
        ? record.minimum_batch_units !== 5
        : record.minimum_batch_units !== null,
    )
  ) {
    throw new Error("municipal specialty minimum-batch semantics drifted");
  }
  const silverado2012 = MUNICIPAL_RECORDS.filter(
    ({ program_id: id }) => id === "gm-2012-silverado-1wt-tgk-seo-paint",
  );
  if (
    silverado2012.length !== 26 ||
    !silverado2012.some(({ paint_code: code }) => code === "WA-9792")
  ) {
    throw new Error("2012 Silverado must retain all 26 rows, including WA-9792");
  }
  if (
    MUNICIPAL_RECORDS.some(
      ({ model_year: year, catalog_model_ids: ids }) =>
        year === 2013 && ids.includes("silverado"),
    )
  ) {
    throw new Error("2013 Silverado specialty availability must not be inferred");
  }
  if (
    MUNICIPAL_RECORDS.filter(({ label }) => label === "Woodland Green").length !==
    11
  ) {
    throw new Error("expected eleven exact Woodland Green WA-9015 / 9V5 rows");
  }
  validateNoUnresolvedForestRouting(MUNICIPAL_RECORDS);
  validateMunicipalWoodlandIdentity(MUNICIPAL_RECORDS);
}

function manifestView(source) {
  return {
    asset_name: source.asset_name,
    archive_url: source.archive_url,
    sha256: source.sha256,
    bytes: source.bytes,
    role: source.role,
    source_id: source.source_id,
    original_source_url: source.url,
    pdf_page_count: source.pdf_page_count,
  };
}

export function validateManifestContracts(manifest) {
  for (const source of Object.values(SOURCE_CONTRACTS)) {
    const matches = manifest.entries.filter(
      ({ source_id: sourceId }) => sourceId === source.source_id,
    );
    if (matches.length !== 1) {
      throw new Error(
        `manifest must contain exactly one ${source.source_id} entry, got ${matches.length}`,
      );
    }
    const expected = manifestView(source);
    for (const [key, value] of Object.entries(expected)) {
      if (matches[0][key] !== value) {
        throw new Error(`${source.source_id} manifest mismatch for ${key}`);
      }
    }
  }
}

function validateLedgerSourceCandidates(ledger) {
  for (const source of Object.values(SOURCE_CONTRACTS)) {
    const matches = ledger.historic_gm_upfitter_candidates.filter(
      ({ source_id: sourceId }) => sourceId === source.source_id,
    );
    if (matches.length !== 1) {
      throw new Error(
        `ledger must reuse exactly one ${source.source_id} source candidate`,
      );
    }
    const candidate = matches[0];
    const expected = {
      url: source.url,
      bytes: source.bytes,
      sha256: source.sha256,
      archive_asset_name: source.asset_name,
      archive_url: source.archive_url,
      pdf_page_count: source.pdf_page_count,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (candidate[key] !== value) {
        throw new Error(`${source.source_id} ledger source mismatch for ${key}`);
      }
    }
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
    const identity = `${value.bytes}\u001f${value.sha256}`;
    const existing = artifacts.get(value.url);
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

function updateArtifactAudit(ledger) {
  const publishedSpecialtyRecords = ledger.app_publication_records.filter(
    ({ publication_status: status }) => status === "published_specialty_subset",
  );
  const publishedQualifiedHistoricalRecords = ledger.app_publication_records.filter(
    ({ publication_status: status }) =>
      status === "published_qualified_historical_subset",
  );
  ledger.integrity_audit.unique_retained_artifacts_reconciled =
    collectArtifactIdentities(ledger).size;
  ledger.integrity_audit.artifact_reference_groups = {
    published_record_sources: collectArtifactIdentities(
      ledger.app_publication_records,
    ).size,
    published_specialty_sources: collectArtifactIdentities(
      publishedSpecialtyRecords,
    ).size,
    published_qualified_historical_sources: collectArtifactIdentities(
      publishedQualifiedHistoricalRecords,
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
    comparison_sources: collectArtifactIdentities(ledger.comparison_sources)
      .size,
    rejected_or_unresolved_source_artifacts: collectArtifactIdentities(
      ledger.rejected_or_unresolved_leads,
    ).size,
  };
  ledger.integrity_audit.last_updater_rehash = {
    script: "scripts/update-2012-2014-municipal-specialty-tranche.mjs",
    source_ids: Object.values(SOURCE_CONTRACTS).map(
      ({ source_id: sourceId }) => sourceId,
    ),
    file_count: Object.keys(SOURCE_CONTRACTS).length,
  };
}

const trancheProgramIds = new Set(
  MUNICIPAL_RECORDS.map(({ program_id: id }) => id),
);
const definitionIds = new Set(
  PROGRAM_DEFINITIONS.map(({ program_id: id }) => id),
);
const lifecycleIds = new Set(
  LIFECYCLE_ASSERTIONS.map(({ assertion_id: id }) => id),
);

export function applyMunicipalSpecialtyTranche(inputLedger) {
  validateTrancheContracts();
  validateLedgerSourceCandidates(inputLedger);
  const ledger = structuredClone(inputLedger);
  ledger.app_publication_records = [
    ...ledger.app_publication_records.filter(
      ({ program_id: id }) => !trancheProgramIds.has(id),
    ),
    ...structuredClone(MUNICIPAL_RECORDS),
  ];
  ledger.program_definitions = [
    ...(ledger.program_definitions ?? []).filter(
      ({ program_id: id }) => !definitionIds.has(id),
    ),
    ...structuredClone(PROGRAM_DEFINITIONS),
  ];
  ledger.program_lifecycle_assertions = [
    ...(ledger.program_lifecycle_assertions ?? []).filter(
      ({ assertion_id: id }) => !lifecycleIds.has(id),
    ),
    ...structuredClone(LIFECYCLE_ASSERTIONS),
  ];

  ledger.historic_gm_upfitter_candidates =
    ledger.historic_gm_upfitter_candidates.map((candidate) => {
      const source = Object.values(SOURCE_CONTRACTS).find(
        ({ source_id: sourceId }) => sourceId === candidate.source_id,
      );
      if (!source) return candidate;
      const publishedModelScopes = [
        ...new Set(
          ledger.app_publication_records
            .filter(
              ({ source: recordSource }) =>
                recordSource?.source_id === source.source_id,
            )
            .flatMap(({ source_model_scope: scopes }) => scopes ?? []),
        ),
      ].sort((left, right) => left.localeCompare(right));
      if (publishedModelScopes.length === 0) {
        throw new Error(`published model scopes disappeared for ${source.source_id}`);
      }
      return {
        ...candidate,
        model: publishedModelScopes.join("; "),
        candidate_pages: [
          ...new Set([
            ...(candidate.candidate_pages ?? []),
            ...source.candidate_pages,
          ]),
        ].sort((a, b) => a - b),
        published_model_scopes: publishedModelScopes,
        status: "visually_verified_and_published",
      };
    });

  const reviewedPages = [
    "gm-2012-municipal-manual PDF pages 84, 92, 136, 151, 169, and 171",
    "gm-2013-municipal-guide PDF pages 80, 92, 136, 151, and Silverado section 164-180",
    "gm-2014-police-guide PDF pages 71, 75, 83, 87, 113, 121, 126, and 140",
  ];
  ledger.integrity_audit.promoted_pdf_pages_visually_rechecked = [
    ...new Set([
      ...(ledger.integrity_audit.promoted_pdf_pages_visually_rechecked ?? []),
      ...reviewedPages,
    ]),
  ];
  const boundarySentence =
    "The 2012-2014 municipal SEO tranche publishes 132 exact program-color rows, preserves blank versus literal TBD code cells, records the 2014 Tahoe and Suburban deletions, and does not infer a 2013 Silverado specialty palette.";
  const currentBoundary = String(
    ledger.integrity_audit.publication_boundary ?? "",
  ).replace(
    /The \d+ app_publication_records/,
    `The ${ledger.app_publication_records.length} app_publication_records`,
  );
  ledger.integrity_audit.publication_boundary = currentBoundary.includes(
    boundarySentence,
  )
    ? currentBoundary
    : `${currentBoundary.trim()} ${boundarySentence}`.trim();
  ledger.generated_at = generatedAt;
  updateArtifactAudit(ledger);
  validateNoUnresolvedForestRouting(ledger.app_publication_records);
  return ledger;
}

async function verifyLocalSources() {
  for (const source of Object.values(SOURCE_CONTRACTS)) {
    const fileUrl = new URL(source.local_path.replaceAll("\\", "/"), root);
    const bytes = await readFile(fileUrl);
    const metadata = await stat(fileUrl);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (metadata.size !== source.bytes || digest !== source.sha256) {
      throw new Error(`retained source mismatch: ${source.source_id}`);
    }
  }
}

export async function main() {
  const [manifestText, ledgerText] = await Promise.all([
    readFile(manifestUrl, "utf8"),
    readFile(ledgerUrl, "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  const ledger = JSON.parse(ledgerText);
  validateManifestContracts(manifest);
  await verifyLocalSources();
  const updated = applyMunicipalSpecialtyTranche(ledger);
  await writeFile(ledgerUrl, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify({
      municipal_specialty_record_count: MUNICIPAL_RECORDS.length,
      minimum_batch_record_count: MUNICIPAL_RECORDS.filter(
        ({ availability_state: state }) =>
          state === "available_with_minimum_batch",
      ).length,
      available_record_count: MUNICIPAL_RECORDS.filter(
        ({ availability_state: state }) => state === "available",
      ).length,
      exact_program_count: trancheProgramIds.size,
      lifecycle_assertion_count: LIFECYCLE_ASSERTIONS.length,
      source_ids: Object.values(SOURCE_CONTRACTS).map(
        ({ source_id: sourceId }) => sourceId,
      ),
    }),
  );
}

const isMain =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) await main();
