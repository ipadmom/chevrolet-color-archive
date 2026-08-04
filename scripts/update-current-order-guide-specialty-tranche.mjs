import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = new URL("../", import.meta.url);
const ledgerUrl = new URL(
  "data/sources/specialty-color-source-candidates.json",
  root,
);
const releaseManifestUrl = new URL(
  "data/sources/current-order-guide-source-release-manifest.json",
  root,
);
const reconciliationUrl = new URL(
  "data/audits/current-model-order-guide-reconciliation.json",
  root,
);
const localSourceDirectoryUrl = new URL(
  "tmp/specialty-color-research/official-order-guides/",
  root,
);

const reviewedAt = "2026-07-23T20:05:54Z";

const TAHOE_POLICE_COLORS = [
  { label: "Victory Red", seoCode: "5T4", waCode: "WA-9260" },
  { label: "MSP Blue", seoCode: "9V2", waCode: "WA-5665" },
  { label: "Woodland Green", seoCode: "9V5", waCode: "WA-9015" },
  {
    label: "Dark Blue Metallic",
    seoCode: "9V7",
    waCode: "WA-722J",
  },
  { label: "Wheatland Yellow", seoCode: "9W3", waCode: "WA-253A" },
  {
    label: "Silver Ice Metallic",
    seoCode: "9W5",
    waCode: "WA-636R",
  },
];

const WOODLAND_GREEN = {
  label: "Woodland Green",
  sourceLabelRaw: "Woodland Green",
  seoCode: "9V5",
  waCode: "WA-9015",
};

const EXPRESS_WOODLAND_GREEN = {
  ...WOODLAND_GREEN,
  sourceLabelRaw: "Green, Woodland",
};

const REVIEWED_SOURCES = [
  {
    vehicleId: 22974,
    catalogModelId: "tahoe",
    sourceModelScope: "New Tahoe Police Package and Special Service",
    programId: "gm-tahoe-police-special-service-seo-solid-paint-2025-2026",
    programLabel: "Tahoe Police Package and Special Service SEO solid paint",
    section: "COLOR AND TRIM - SEO SOLID PAINT",
    targetPage: 29,
    colors: TAHOE_POLICE_COLORS,
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks each published row available with the single Jet Black interior.",
      "GM will require five orders before sending the order to the plant.",
      "The source is one combined Police Package and Special Service entry. It does not establish separate PPV-only or SSV-only applicability.",
    ],
    finding:
      "The combined Police Package and Special Service SEO Solid Paint table confirms six available rows for Jet Black: Victory Red 5T4 / WA-9260, MSP Blue 9V2 / WA-5665, Woodland Green 9V5 / WA-9015, Dark Blue Metallic 9V7 / WA-722J, Wheatland Yellow 9W3 / WA-253A, and Silver Ice Metallic 9W5 / WA-636R. The page requires five orders before plant submission and does not split PPV from SSV.",
  },
  {
    vehicleId: 23213,
    catalogModelId: "tahoe",
    sourceModelScope: "Tahoe Police Package and Special Service",
    programId: "gm-tahoe-police-special-service-seo-solid-paint-2025-2026",
    programLabel: "Tahoe Police Package and Special Service SEO solid paint",
    section: "COLOR AND TRIM - SEO SOLID PAINT",
    targetPage: 29,
    colors: TAHOE_POLICE_COLORS,
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks each published row available with the single Jet Black interior.",
      "GM will require five orders before sending the order to the plant.",
      "The source is one combined Police Package and Special Service entry. It does not establish separate PPV-only or SSV-only applicability.",
    ],
    finding:
      "The combined Police Package and Special Service SEO Solid Paint table confirms six available rows for Jet Black: Victory Red 5T4 / WA-9260, MSP Blue 9V2 / WA-5665, Woodland Green 9V5 / WA-9015, Dark Blue Metallic 9V7 / WA-722J, Wheatland Yellow 9W3 / WA-253A, and Silver Ice Metallic 9W5 / WA-636R. The page requires five orders before plant submission and does not split PPV from SSV.",
  },
  {
    vehicleId: 22944,
    catalogModelId: "tahoe",
    sourceModelScope: "New Tahoe Retail and Fleet",
    programId: "gm-tahoe-retail-fleet-seo-solid-paint-2025-2026",
    programLabel: "Tahoe Retail and Fleet SEO solid paint",
    section: "COLOR AND TRIM - SEO SOLID PAINT",
    targetPage: 83,
    colors: [WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Woodland Green available with both listed interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "Victory Red and Wheatland Yellow are printed on the same page but remain outside this bounded publication tranche.",
    ],
    finding:
      "The Retail and Fleet SEO Solid Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors, with a five-order minimum. Victory Red and Wheatland Yellow remain unpromoted.",
  },
  {
    vehicleId: 23232,
    catalogModelId: "tahoe",
    sourceModelScope: "Tahoe Retail and Fleet",
    programId: "gm-tahoe-retail-fleet-seo-solid-paint-2025-2026",
    programLabel: "Tahoe Retail and Fleet SEO solid paint",
    section: "COLOR AND TRIM - SEO SOLID PAINT",
    targetPage: 90,
    colors: [WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Woodland Green available with both listed interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "Victory Red and Wheatland Yellow are printed on the same page but remain outside this bounded publication tranche.",
    ],
    finding:
      "The Retail and Fleet SEO Solid Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors, with a five-order minimum. The source prints Wheatland Yellow's color-code cell as the literal value 3; that conflict is preserved and the row is not promoted.",
  },
  {
    vehicleId: 23035,
    catalogModelId: "suburban",
    sourceModelScope: "New Suburban",
    programId: "gm-suburban-seo-solid-paint-2025-2026",
    programLabel: "Suburban SEO solid paint",
    section: "COLOR AND TRIM - SEO SOLID PAINT",
    targetPage: 64,
    colors: [WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Woodland Green available with both listed interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "Victory Red and Wheatland Yellow are printed on the same page but remain outside this bounded publication tranche.",
    ],
    finding:
      "The SEO Solid Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors, with a five-order minimum. Victory Red and Wheatland Yellow remain unpromoted.",
  },
  {
    vehicleId: 23233,
    catalogModelId: "suburban",
    sourceModelScope: "Suburban",
    programId: "gm-suburban-seo-solid-paint-2025-2026",
    programLabel: "Suburban SEO solid paint",
    section: "COLOR AND TRIM - SEO SOLID PAINT",
    targetPage: 68,
    colors: [WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Woodland Green available with both listed interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "Victory Red and Wheatland Yellow are printed on the same page but remain outside this bounded publication tranche.",
    ],
    finding:
      "The SEO Solid Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors, with a five-order minimum. Victory Red and Wheatland Yellow remain unpromoted.",
  },
  {
    vehicleId: 23014,
    catalogModelId: "express",
    sourceModelScope: "Express Cargo",
    programId: "gm-express-cargo-seo-solid-paint-2025-2026",
    programLabel: "Express Cargo SEO solid paint",
    section: "COLOR AND TRIM - SEO SOLID PAINT",
    targetPage: 35,
    colors: [EXPRESS_WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Green, Woodland available with both Neutral and Medium Pewter interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "All extraneous body components formerly color-keyed to body color will be flat Black.",
      "The other seventeen SEO solid-paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The Express Cargo SEO Solid Paint table confirms the source-literal label Green, Woodland, code 9V5, touch-up paint number WA-9015, available with both listed interiors. The page requires five orders and states that extraneous formerly color-keyed body components will be flat Black.",
  },
  {
    vehicleId: 23276,
    catalogModelId: "express",
    sourceModelScope: "Express Cargo",
    programId: "gm-express-cargo-seo-solid-paint-2025-2026",
    programLabel: "Express Cargo SEO solid paint",
    section: "COLOR AND TRIM - SEO SOLID PAINT",
    targetPage: 37,
    colors: [EXPRESS_WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Green, Woodland available with both Neutral and Medium Pewter interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "All extraneous body components formerly color-keyed to body color will be flat Black.",
      "The other seventeen SEO solid-paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The Express Cargo SEO Solid Paint table confirms the source-literal label Green, Woodland, code 9V5, touch-up paint number WA-9015, available with both listed interiors. The page requires five orders and states that extraneous formerly color-keyed body components will be flat Black.",
  },
  {
    vehicleId: 23015,
    catalogModelId: "express",
    sourceModelScope: "Express Cutaway",
    programId: "gm-express-cutaway-seo-solid-paint-2025-2026",
    programLabel: "Express Cutaway SEO solid paint",
    section: "COLOR AND TRIM - SEO SOLID PAINT",
    targetPage: 49,
    colors: [EXPRESS_WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Green, Woodland available with both Neutral and Medium Pewter interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "All extraneous body components formerly color-keyed to body color will be flat Black.",
      "The other seventeen SEO solid-paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The Express Cutaway SEO Solid Paint table confirms the source-literal label Green, Woodland, code 9V5, touch-up paint number WA-9015, available with both listed interiors. The page requires five orders and states that extraneous formerly color-keyed body components will be flat Black.",
  },
  {
    vehicleId: 23277,
    catalogModelId: "express",
    sourceModelScope: "Express Cutaway",
    programId: "gm-express-cutaway-seo-solid-paint-2025-2026",
    programLabel: "Express Cutaway SEO solid paint",
    section: "COLOR AND TRIM - SEO SOLID PAINT",
    targetPage: 51,
    colors: [EXPRESS_WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Green, Woodland available with both Neutral and Medium Pewter interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "All extraneous body components formerly color-keyed to body color will be flat Black.",
      "The other seventeen SEO solid-paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The Express Cutaway SEO Solid Paint table confirms the source-literal label Green, Woodland, code 9V5, touch-up paint number WA-9015, available with both listed interiors. The page requires five orders and states that extraneous formerly color-keyed body components will be flat Black.",
  },
  {
    vehicleId: 23016,
    catalogModelId: "express",
    sourceModelScope: "Express Passenger",
    programId: "gm-express-passenger-seo-solid-paint-2025-2026",
    programLabel: "Express Passenger SEO solid paint",
    section: "COLOR AND TRIM - SEO SOLID PAINT",
    targetPage: 28,
    colors: [EXPRESS_WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Green, Woodland available with the listed Medium Pewter interior.",
      "GM will require five orders before sending the order to the plant.",
      "All extraneous body components formerly color-keyed to body color will be flat Black.",
      "The other seventeen SEO solid-paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The Express Passenger SEO Solid Paint table confirms the source-literal label Green, Woodland, code 9V5, touch-up paint number WA-9015, available with the listed Medium Pewter interior. The page requires five orders and states that extraneous formerly color-keyed body components will be flat Black.",
  },
  {
    vehicleId: 23278,
    catalogModelId: "express",
    sourceModelScope: "Express Passenger",
    programId: "gm-express-passenger-seo-solid-paint-2025-2026",
    programLabel: "Express Passenger SEO solid paint",
    section: "COLOR AND TRIM - SEO SOLID PAINT",
    targetPage: 30,
    colors: [EXPRESS_WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Green, Woodland available with the listed Medium Pewter interior.",
      "GM will require five orders before sending the order to the plant.",
      "All extraneous body components formerly color-keyed to body color will be flat Black.",
      "The other seventeen SEO solid-paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The Express Passenger SEO Solid Paint table confirms the source-literal label Green, Woodland, code 9V5, touch-up paint number WA-9015, available with the listed Medium Pewter interior. The page requires five orders and states that extraneous formerly color-keyed body components will be flat Black.",
  },
  {
    vehicleId: 22903,
    catalogModelId: "silverado-hd",
    sourceModelScope: "Silverado 2500 HD Retail and Fleet",
    programId: "gm-silverado-2500-hd-retail-fleet-seo-paint-2025-2026",
    programLabel: "Silverado 2500 HD Retail and Fleet SEO paint",
    section: "COLOR AND TRIM - SEO PAINT",
    targetPage: 106,
    adjacentNoColorPages: [105],
    colors: [WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Woodland Green available with both listed interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "The color may require extended lead time.",
      "The page prints Silver Ice Metallic as 5IS / WA-636R. That literal conflicts with the separate 2026 Silverado police and special-service guide and is not normalized in this tranche.",
      "The other twenty SEO paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The SEO Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors, a five-order minimum, and possible extended lead time. The page prints Silver Ice Metallic as 5IS / WA-636R; that separate literal is preserved and not promoted.",
  },
  {
    vehicleId: 23195,
    catalogModelId: "silverado-hd",
    sourceModelScope: "Silverado 2500 HD Retail and Fleet",
    programId: "gm-silverado-2500-hd-retail-fleet-seo-paint-2025-2026",
    programLabel: "Silverado 2500 HD Retail and Fleet SEO paint",
    section: "COLOR AND TRIM - SEO PAINT",
    targetPage: 102,
    adjacentNoColorPages: [101],
    colors: [WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Woodland Green available with both listed interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "The color may require extended lead time.",
      "The page prints Silver Ice Metallic as 5IS / WA-636R. That literal conflicts with the separate 2026 Silverado police and special-service guide and is not normalized in this tranche.",
      "The other twenty SEO paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The SEO Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors, a five-order minimum, and possible extended lead time. The page prints Silver Ice Metallic as 5IS / WA-636R; that separate literal is preserved and not promoted.",
  },
  {
    vehicleId: 22905,
    catalogModelId: "silverado-hd",
    sourceModelScope: "Silverado 3500 HD CC",
    programId: "gm-silverado-3500-hd-cc-seo-paint-2025-2026",
    programLabel: "Silverado 3500 HD CC SEO paint",
    section: "COLOR AND TRIM - SEO PAINT",
    targetPage: 31,
    adjacentNoColorPages: [30],
    colors: [WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Woodland Green available with both listed interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "The color may require extended lead time.",
      "The page prints Silver Ice Metallic as 5IS / WA-636R. That literal conflicts with the separate 2026 Silverado police and special-service guide and is not normalized in this tranche.",
      "The other twenty SEO paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The SEO Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors, a five-order minimum, and possible extended lead time. The page prints Silver Ice Metallic as 5IS / WA-636R; that separate literal is preserved and not promoted.",
  },
  {
    vehicleId: 23197,
    catalogModelId: "silverado-hd",
    sourceModelScope: "Silverado 3500 HD CC",
    programId: "gm-silverado-3500-hd-cc-seo-paint-2025-2026",
    programLabel: "Silverado 3500 HD CC SEO paint",
    section: "COLOR AND TRIM - SEO PAINT",
    targetPage: 30,
    adjacentNoColorPages: [29],
    colors: [WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Woodland Green available with both listed interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "The color may require extended lead time.",
      "The page prints Silver Ice Metallic as 5IS / WA-636R. That literal conflicts with the separate 2026 Silverado police and special-service guide and is not normalized in this tranche.",
      "The other twenty SEO paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The SEO Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors, a five-order minimum, and possible extended lead time. The page prints Silver Ice Metallic as 5IS / WA-636R; that separate literal is preserved and not promoted.",
  },
  {
    vehicleId: 22904,
    catalogModelId: "silverado-hd",
    sourceModelScope: "Silverado 3500 HD Retail and Fleet",
    programId: "gm-silverado-3500-hd-retail-fleet-seo-paint-2025-2026",
    programLabel: "Silverado 3500 HD Retail and Fleet SEO paint",
    section: "COLOR AND TRIM - SEO PAINT",
    targetPage: 85,
    adjacentNoColorPages: [84],
    colors: [WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Woodland Green available with both listed interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "The color may require extended lead time.",
      "The page prints Silver Ice Metallic as 5IS / WA-636R. That literal conflicts with the separate 2026 Silverado police and special-service guide and is not normalized in this tranche.",
      "The other twenty SEO paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The SEO Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors, a five-order minimum, and possible extended lead time. The page prints Silver Ice Metallic as 5IS / WA-636R; that separate literal is preserved and not promoted.",
  },
  {
    vehicleId: 23196,
    catalogModelId: "silverado-hd",
    sourceModelScope: "Silverado 3500 HD Retail and Fleet",
    programId: "gm-silverado-3500-hd-retail-fleet-seo-paint-2025-2026",
    programLabel: "Silverado 3500 HD Retail and Fleet SEO paint",
    section: "COLOR AND TRIM - SEO PAINT",
    targetPage: 84,
    adjacentNoColorPages: [83],
    colors: [WOODLAND_GREEN],
    minimumBatchUnits: 5,
    restrictions: [
      "The table marks Woodland Green available with both listed interior columns.",
      "GM will require five orders before sending the order to the plant.",
      "The color may require extended lead time.",
      "The page prints Silver Ice Metallic as 5IS / WA-636R. That literal conflicts with the separate 2026 Silverado police and special-service guide and is not normalized in this tranche.",
      "The other twenty SEO paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The SEO Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors, a five-order minimum, and possible extended lead time. The page prints Silver Ice Metallic as 5IS / WA-636R; that separate literal is preserved and not promoted.",
  },
  {
    vehicleId: 23022,
    catalogModelId: "silverado-hd",
    sourceModelScope: "Silverado 4500 HD, 5500 HD and 6500 HD",
    programId: "gm-silverado-4500-6500-hd-seo-paint-2025-2026",
    programLabel: "Silverado 4500 HD, 5500 HD and 6500 HD SEO paint",
    section: "COLOR AND TRIM - SEO PAINT",
    targetPage: 122,
    adjacentNoColorPages: [121],
    colors: [WOODLAND_GREEN],
    minimumBatchUnits: null,
    restrictions: [
      "The table marks Woodland Green available with both listed interior columns.",
      "The page prints no five-order minimum or extended lead-time warning.",
      "The page footnote states that the applicable item is not available with APL Passenger Seat Delete, but no footnote marker is attached to the Woodland Green row.",
      "The other twenty-nine SEO paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The SEO Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors. The page prints no five-order or extended lead-time note. Its only footnote concerns APL Passenger Seat Delete and is not marked on the Woodland Green row.",
  },
  {
    vehicleId: 23260,
    catalogModelId: "silverado-hd",
    sourceModelScope: "Silverado 4500 HD, 5500 HD and 6500 HD",
    programId: "gm-silverado-4500-6500-hd-seo-paint-2025-2026",
    programLabel: "Silverado 4500 HD, 5500 HD and 6500 HD SEO paint",
    section: "COLOR AND TRIM - SEO PAINT",
    targetPage: 119,
    adjacentNoColorPages: [118],
    colors: [WOODLAND_GREEN],
    minimumBatchUnits: null,
    restrictions: [
      "The table marks Woodland Green available with both listed interior columns.",
      "The page prints no five-order minimum or extended lead-time warning.",
      "The page footnote states that the applicable item is not available with APL Passenger Seat Delete, but no footnote marker is attached to the Woodland Green row.",
      "The other twenty-nine SEO paint identities on the page remain outside this bounded publication tranche.",
    ],
    finding:
      "The SEO Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors. The page prints no five-order or extended lead-time note. Its only footnote concerns APL Passenger Seat Delete and is not marked on the Woodland Green row.",
  },
];

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function releaseEntryByVehicleId(releaseManifest, vehicleId) {
  const entry = releaseManifest.entries.find(
    (candidate) => candidate.vehicle_id === vehicleId,
  );
  if (!entry) throw new Error(`missing retained Order Guide vehicle ${vehicleId}`);
  return entry;
}

function citedPage(entry, pdfPage) {
  const page = entry.cited_pages.find(
    (candidate) => candidate.pdf_page === pdfPage,
  );
  if (!page) {
    throw new Error(
      `retained Order Guide ${entry.vehicle_id} is missing cited page ${pdfPage}`,
    );
  }
  return page;
}

function sourceCitation(entry, config) {
  const page = citedPage(entry, config.targetPage);
  return {
    source_id: entry.source_id,
    title: `${entry.model_year} Chevrolet Truck ${entry.vehicle_name} Order Guide`,
    publisher: "General Motors",
    source_type: "official electronic order guide snapshot",
    url: entry.original_source_url,
    section: config.section,
    revision: `Published ${page.published_date}`,
    retrieved_at: entry.retrieved_at,
    bytes: entry.bytes,
    sha256: entry.sha256,
    pdf_page_count: entry.pdf_page_count,
    archive_asset_name: entry.asset_name,
    archive_url: entry.archive_url,
    pdf_page: page.pdf_page,
    printed_page: page.printed_page,
  };
}

function buildRecord(entry, config, color) {
  const sourceLabelRaw = color.sourceLabelRaw ?? color.label;
  return {
    record_id: `gm-eog-current-${entry.model_year}-${slug(config.sourceModelScope)}-${slug(color.label)}-${slug(color.seoCode)}-${slug(color.waCode)}`,
    publication_status: "published_specialty_subset",
    model_year: entry.model_year,
    catalog_model_ids: [config.catalogModelId],
    source_model_scope: [config.sourceModelScope],
    program_id: config.programId,
    program_label: config.programLabel,
    application_type: "special_equipment_option_paint",
    availability_state:
      config.minimumBatchUnits == null
        ? "available"
        : "available_with_minimum_batch",
    label: color.label,
    source_label_raw: sourceLabelRaw,
    finish: "solid",
    paint_code: color.waCode,
    factory_paint_code: null,
    wa_code: color.waCode,
    source_wa_code_raw: color.waCode,
    source_wa_code_cell_state: "printed_with_prefix",
    seo_code: color.seoCode,
    source_seo_code_raw: color.seoCode,
    source_seo_code_cell_state: "printed",
    rpo_code: null,
    code_display: `${color.waCode} / SEO ${color.seoCode}`,
    touch_up_paint_number: color.waCode,
    minimum_batch_units: config.minimumBatchUnits,
    factory_installation_claim: null,
    installation_semantics:
      "Official GM Electronic Order Guide SEO paint listing; application site is not expressly stated.",
    restrictions: [
      `This row is limited to ${entry.model_year} Chevrolet Truck ${config.sourceModelScope}.`,
      `The table prints ${sourceLabelRaw}, color code ${color.seoCode}, and touch-up paint number ${color.waCode}.`,
      ...config.restrictions,
      "No availability is inferred for another Chevrolet model, configuration, or year.",
    ],
    source: sourceCitation(entry, config),
  };
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
    const prior = artifacts.get(value.url);
    if (prior && prior !== identity) {
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
  const specialty = ledger.app_publication_records.filter(
    (record) => record.publication_status === "published_specialty_subset",
  );
  const historical = ledger.app_publication_records.filter(
    (record) =>
      record.publication_status === "published_qualified_historical_subset",
  );
  ledger.integrity_audit.unique_retained_artifacts_reconciled =
    collectArtifactIdentities(ledger).size;
  ledger.integrity_audit.artifact_reference_groups = {
    ...(ledger.integrity_audit.artifact_reference_groups ?? {}),
    published_record_sources: collectArtifactIdentities(
      ledger.app_publication_records,
    ).size,
    published_specialty_sources: collectArtifactIdentities(specialty).size,
    published_qualified_historical_sources:
      collectArtifactIdentities(historical).size,
    verified_not_published_sources: collectArtifactIdentities(
      ledger.verified_not_published,
    ).size,
    historic_gm_upfitter_candidates: collectArtifactIdentities(
      ledger.historic_gm_upfitter_candidates,
    ).size,
    usda_primary_sources: collectArtifactIdentities(ledger.usda_primary_sources)
      .size,
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
    script: "scripts/update-current-order-guide-specialty-tranche.mjs",
    source_ids: REVIEWED_SOURCES.map(({ vehicleId }) => `gm-online-order-guide-pdf-${vehicleId}`),
    file_count: REVIEWED_SOURCES.length,
  };
}

function publicationRecords(releaseManifest) {
  return REVIEWED_SOURCES.flatMap((config) => {
    const entry = releaseEntryByVehicleId(releaseManifest, config.vehicleId);
    return config.colors.map((color) => buildRecord(entry, config, color));
  });
}

export function applyCurrentOrderGuideSpecialtyTranche(
  inputLedger,
  inputReleaseManifest,
) {
  const ledger = structuredClone(inputLedger);
  const releaseManifest = structuredClone(inputReleaseManifest);
  const records = publicationRecords(releaseManifest);
  const recordIds = new Set(records.map((record) => record.record_id));
  const reviewedVehicleIds = new Set(
    REVIEWED_SOURCES.map(({ vehicleId }) => vehicleId),
  );

  if (records.length !== 30 || recordIds.size !== records.length) {
    throw new Error("current Order Guide tranche must contain 30 unique rows");
  }
  if (
    records.some((record) =>
      /forest service green|forestry green/i.test(record.label),
    )
  ) {
    throw new Error("Forest Service Green must remain unresolved");
  }

  ledger.app_publication_records = [
    ...ledger.app_publication_records.filter(
      (record) => !recordIds.has(record.record_id),
    ),
    ...records,
  ];
  ledger.modern_order_guide_snapshot_candidates =
    ledger.modern_order_guide_snapshot_candidates.map((candidate) =>
      reviewedVehicleIds.has(candidate.vehicle_id)
        ? { ...candidate, status: "visually_verified_exact_snapshot" }
        : candidate,
    );

  const reviewedLocators = REVIEWED_SOURCES.map(
    ({ vehicleId, targetPage }) =>
      `gm-online-order-guide-pdf-${vehicleId} PDF page ${targetPage}`,
  );
  ledger.integrity_audit.promoted_pdf_pages_visually_rechecked = [
    ...new Set([
      ...(ledger.integrity_audit.promoted_pdf_pages_visually_rechecked ?? []),
      ...reviewedLocators,
    ]),
  ];
  const currentBoundary = String(
    ledger.integrity_audit.publication_boundary ?? "",
  ).replace(
    /The \d+ app_publication_records/,
    `The ${ledger.app_publication_records.length} app_publication_records`,
  );
  const trancheBoundary =
    "The retained 2025 and 2026 Tahoe, Suburban, Express, and Silverado HD Order Guide tranche publishes 30 exact configuration-color rows from twenty visually reviewed sources. It publishes the six-color combined Tahoe Police Package and Special Service palette for each year without splitting PPV from SSV, and publishes only Woodland Green from the reviewed retail, van, and HD tables. It preserves the Express flat-Black body-component rule, the light-duty HD five-order and extended-lead-time note, the medium-duty absence of that note, and the printed 5IS / WA-636R conflict. Forest Service Green and Isuzu Woodland Green 46U remain separate identities.";
  ledger.integrity_audit.publication_boundary = currentBoundary.includes(
    trancheBoundary,
  )
    ? currentBoundary
    : `${currentBoundary.trim()} ${trancheBoundary}`;
  ledger.integrity_audit.audited_on = "2026-07-23";
  ledger.generated_at = reviewedAt;
  updateArtifactAudit(ledger);

  for (const config of REVIEWED_SOURCES) {
    const entry = releaseEntryByVehicleId(releaseManifest, config.vehicleId);
    for (const page of entry.cited_pages) {
      if (page.pdf_page === config.targetPage) {
        page.visual_review_status = "visually_verified_exact_snapshot";
        page.visual_reviewed_at = reviewedAt;
        page.visual_review_finding = config.finding;
      } else if ((config.adjacentNoColorPages ?? []).includes(page.pdf_page)) {
        page.visual_review_status =
          "visually_reviewed_no_exterior_color_evidence";
        page.visual_reviewed_at = reviewedAt;
        page.visual_review_finding =
          "Seat-trim table only; this page contains no exterior-color row.";
      }
    }
    if (
      entry.cited_pages.every(
        (page) => typeof page.visual_review_status === "string",
      )
    ) {
      entry.review_status = "cited_pages_visually_reviewed";
    }
  }
  releaseManifest.generated_at ??= reviewedAt;

  return { ledger, releaseManifest, records };
}

function yearRow(reconciliation, modelId, modelYear) {
  const model = reconciliation.records.find(
    (candidate) => candidate.model_id === modelId,
  );
  if (!model) throw new Error(`missing reconciliation model ${modelId}`);
  const year = model.years.find(
    (candidate) => candidate.model_year === modelYear,
  );
  if (!year) {
    throw new Error(`missing reconciliation year ${modelId}:${modelYear}`);
  }
  return { model, year };
}

export function applyCurrentOrderGuideReconciliation(
  inputReconciliation,
  releaseManifest,
  records,
) {
  const reconciliation = structuredClone(inputReconciliation);
  reconciliation.audited_at = reviewedAt;

  for (const modelId of ["tahoe", "suburban", "express", "silverado-hd"]) {
    for (const modelYear of [2025, 2026]) {
      const { year } = yearRow(reconciliation, modelId, modelYear);
      const exactRecords = records.filter(
        (record) =>
          record.catalog_model_ids.includes(modelId) &&
          record.model_year === modelYear,
      );
      const sourceIds = [
        ...new Set(exactRecords.map((record) => record.source.source_id)),
      ];
      year.published_current_order_guide_specialty_record_count =
        exactRecords.length;
      year.retained_specialty_source_ids = sourceIds;
      year.retained_specialty_pdf_pages = sourceIds.map((sourceId) => {
        const entry = releaseManifest.entries.find(
          (candidate) => candidate.source_id === sourceId,
        );
        const sourceRecord = exactRecords.find(
          (record) => record.source.source_id === sourceId,
        );
        return {
          source_id: sourceId,
          vehicle_id: entry.vehicle_id,
          pdf_page: sourceRecord.source.pdf_page,
          printed_page: sourceRecord.source.printed_page,
        };
      });
    }
  }

  const express = reconciliation.records.find(
    (record) => record.model_id === "express",
  );
  for (const year of express.years) {
    year.published_specialty_identity_count = 1;
    year.published_configuration_row_count = 3;
    year.missing_specialty_identity_count = 17;
  }
  express.result =
    "Four regular names match. Woodland Green 9V5 / WA-9015 is now published for Cargo, Cutaway, and Passenger from exact retained pages for both years. Seventeen other SEO identities per year remain outside the normalized regular layer.";

  const suburban = reconciliation.records.find(
    (record) => record.model_id === "suburban",
  );
  for (const year of suburban.years) {
    year.published_specialty_identity_count = 1;
    year.omitted_specialty_colors = year.omitted_specialty_colors.filter(
      (color) => color !== "Woodland Green",
    );
  }
  suburban.result =
    "The regular names match. Woodland Green 9V5 / WA-9015 is published from the exact SEO Solid Paint page for both years. Victory Red and Wheatland Yellow remain outside this bounded tranche.";

  const tahoe = reconciliation.records.find(
    (record) => record.model_id === "tahoe",
  );
  for (const year of tahoe.years) {
    year.published_retail_fleet_seo_identity_count = 1;
    year.omitted_retail_fleet_seo_identity_count = 2;
    year.published_police_ssv_seo_identity_count = 6;
    year.omitted_police_ssv_seo_identity_count = 0;
    year.omitted_police_ssv_standard_identity_count = 6;
  }
  tahoe.result =
    "The regular names match. Woodland Green is published for Retail and Fleet, and all six exact SEO Solid Paint rows are published for the combined Police Package and Special Service entry for each year. The source does not split PPV from SSV, and two other retail/fleet SEO identities plus standard police-program memberships remain outside this tranche.";

  const silveradoHd = reconciliation.records.find(
    (record) => record.model_id === "silverado-hd",
  );
  for (const year of silveradoHd.years) {
    year.published_body_series_seo_identity_count = 1;
    year.published_configuration_row_count = 4;
    year.missing_body_series_seo_identity_count = 47;
  }
  silveradoHd.result =
    "The regular body-series unions match. Woodland Green 9V5 / WA-9015 is published for the exact 2500 HD Retail and Fleet, 3500 HD CC, 3500 HD Retail and Fleet, and 4500/5500/6500 HD configurations in both years. Forty-seven other distinct SEO identities per year remain unnormalized.";

  const tahoeFinding = reconciliation.specialty_findings.find(
    (finding) => finding.model_id === "tahoe",
  );
  tahoeFinding.publication_status =
    "retained_pages_visually_verified_and_published";
  tahoeFinding.qualification =
    "The six rows are published only for the combined Police Package and Special Service entry. No separate PPV-only or SSV-only applicability is inferred.";
  tahoeFinding.source_pages = [
    { vehicle_id: 22974, model_year: 2025, pdf_page: 29, printed_page: 29 },
    { vehicle_id: 23213, model_year: 2026, pdf_page: 29, printed_page: 29 },
  ];

  return reconciliation;
}

async function verifyLocalSources(releaseManifest) {
  for (const config of REVIEWED_SOURCES) {
    const entry = releaseEntryByVehicleId(releaseManifest, config.vehicleId);
    citedPage(entry, config.targetPage);
    for (const page of config.adjacentNoColorPages ?? []) citedPage(entry, page);
    const localUrl = new URL(entry.asset_name, localSourceDirectoryUrl);
    const bytes = await readFile(localUrl);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== entry.bytes || digest !== entry.sha256) {
      throw new Error(
        `local Order Guide does not match retained contract: ${entry.asset_name}`,
      );
    }
  }
}

export async function main() {
  const [ledger, releaseManifest, reconciliation] = await Promise.all([
    readFile(ledgerUrl, "utf8").then(JSON.parse),
    readFile(releaseManifestUrl, "utf8").then(JSON.parse),
    readFile(reconciliationUrl, "utf8").then(JSON.parse),
  ]);
  await verifyLocalSources(releaseManifest);
  const updated = applyCurrentOrderGuideSpecialtyTranche(
    ledger,
    releaseManifest,
  );
  const updatedReconciliation = applyCurrentOrderGuideReconciliation(
    reconciliation,
    updated.releaseManifest,
    updated.records,
  );

  await Promise.all([
    writeFile(
      ledgerUrl,
      `${JSON.stringify(updated.ledger, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      releaseManifestUrl,
      `${JSON.stringify(updated.releaseManifest, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      reconciliationUrl,
      `${JSON.stringify(updatedReconciliation, null, 2)}\n`,
      "utf8",
    ),
  ]);

  console.log(
    JSON.stringify({
      record_count: updated.records.length,
      source_count: REVIEWED_SOURCES.length,
      reviewed_vehicle_ids: REVIEWED_SOURCES.map(({ vehicleId }) => vehicleId),
      release_assets_changed: false,
    }),
  );
}

const isMain =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) await main();
