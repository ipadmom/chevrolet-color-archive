import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const ledgerUrl = new URL(
  "data/sources/specialty-color-source-candidates.json",
  root,
);
const manifestUrl = new URL(
  "data/sources/brochure-source-release-manifest.json",
  root,
);
const localSourceUrl = new URL(
  "tmp/specialty-color-sources/gm-truck-kits/1993-Chevrolet-Truck.pdf",
  root,
);

const sourceContract = {
  asset_name: "1993-chevrolet-truck-vehicle-information-kit-gm.pdf",
  archive_url:
    "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/1993-chevrolet-truck-vehicle-information-kit-gm.pdf",
  sha256: "5183176f4af0d61bd63cc7d6fb02117129c870c28c42bc9fe22abcc2eea52d3e",
  bytes: 13_034_550,
  source_id: "gm-heritage-1993-chevrolet-truck",
  original_source_url:
    "https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1993-Chevrolet-Truck.pdf",
  pdf_page_count: 94,
};

const programId = "gm-1993-ck-pickup-special-equipment-option-paint";
const programLabel = "1993 C/K Pickup Special Equipment Options";
const colors = [
  {
    label: "Tangier Orange",
    sourceLabelRaw: "Orange, Tangier",
    paintCode: "WE9417",
    seoCode: "9W4",
  },
  {
    label: "Wheatland Yellow",
    sourceLabelRaw: "Yellow, Wheatland",
    paintCode: "WE9418",
    seoCode: "9W3",
  },
  {
    label: "Woodland Green",
    sourceLabelRaw: "Green, Woodland",
    paintCode: "WE9015",
    seoCode: "9V5",
  },
  {
    label: "Doeskin Tan",
    sourceLabelRaw: "Tan, Doeskin",
    paintCode: "WE9403",
    seoCode: "9V9",
  },
];

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sourceCitation() {
  return {
    source_id: sourceContract.source_id,
    title: "1993 Chevrolet Light-Duty Truck Technical Guide: C/K Pickup",
    publisher: "General Motors",
    source_type: "official light-duty truck technical guide",
    url: sourceContract.original_source_url,
    pdf_page: 12,
    printed_page: "Page 18 - C/K Pickup",
    section: "Special Equipment Options (Cont.); Paints: Solid",
    revision: "1993 model year",
    retrieved_at: null,
    bytes: sourceContract.bytes,
    sha256: sourceContract.sha256,
    pdf_page_count: sourceContract.pdf_page_count,
    archive_asset_name: sourceContract.asset_name,
    archive_url: sourceContract.archive_url,
  };
}

const records = colors.map((color) => ({
  record_id: `gm-1993-ck-pickup-${slug(color.label)}-${color.paintCode.toLowerCase()}-${color.seoCode.toLowerCase()}`,
  publication_status: "published_specialty_subset",
  model_year: 1993,
  catalog_model_ids: ["ck-series"],
  source_model_scope: ["C/K Pickup"],
  program_id: programId,
  program_label: programLabel,
  application_type: "manufacturer_special_equipment_option",
  availability_state: "available",
  label: color.label,
  source_label_raw: color.sourceLabelRaw,
  finish: "solid",
  paint_code: color.paintCode,
  seo_code: color.seoCode,
  code_display: `${color.paintCode} / SEO ${color.seoCode}`,
  touch_up_paint_number: null,
  lead_time_days: 0,
  restrictions: [
    "The C/K Pickup table lists this solid paint under Special Equipment Options (Cont.).",
    "The table prints a lead time of 0 days.",
    "This listing is limited to the 1993 C/K Pickup. No Tahoe, Suburban, S-10, or other Chevrolet application is inferred.",
    "This page does not state that the paint was installed at the assembly plant.",
    "The source prints a WE code. The archive preserves it literally and does not normalize it to a WA identity.",
  ],
  source: sourceCitation(),
}));

const programDefinition = {
  program_id: programId,
  program_ids: [programId],
  model_year_scopes: ["1993 C/K Pickup"],
  application_type: "manufacturer_special_equipment_option",
  catalog_model_ids: ["ck-series"],
  factory_installation_claim: false,
  lead_time_days: 0,
  source_scope: "C/K Pickup only",
  restrictions: [
    "The source does not extend these four rows to Suburban, Tahoe, S-10, Blazer, or any other model.",
    "The source page does not state that these paints were installed at the assembly plant.",
  ],
};

const woodlandIdentity = {
  identity_id: "gm-woodland-green-we9015-1993-ck",
  label: "Woodland Green",
  codes: ["WE9015", "SEO 9V5"],
  authority: "General Motors",
  status: "verified_historical_specialty_color_continuity_not_asserted",
  not_equated_to: [
    "Forest Service Green",
    "Forestry Green",
    "Woodland Green WE7156",
    "Woodland Green WA-9015",
    "Forest Green Metallic",
  ],
};

async function verifyLocalSource() {
  const bytes = await readFile(localSourceUrl);
  const metadata = await stat(localSourceUrl);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (
    metadata.size !== sourceContract.bytes ||
    digest !== sourceContract.sha256
  ) {
    throw new Error("retained 1993 C/K source does not match its manifest contract");
  }
}

function verifyManifestEntry(entry) {
  for (const key of Object.keys(sourceContract)) {
    if (entry[key] !== sourceContract[key]) {
      throw new Error(`1993 C/K manifest mismatch for ${key}`);
    }
  }
  if (
    ![
      "comparison_vehicle_information_kit",
      "controlling_specialty_vehicle_information_kit",
    ].includes(entry.role)
  ) {
    throw new Error(`unexpected 1993 C/K manifest role: ${entry.role}`);
  }
}

await verifyLocalSource();

const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const manifestEntry = manifest.entries.find(
  ({ asset_name: assetName }) => assetName === sourceContract.asset_name,
);
if (!manifestEntry) throw new Error("retained 1993 C/K source is absent from manifest");
verifyManifestEntry(manifestEntry);
manifestEntry.role = "controlling_specialty_vehicle_information_kit";

const ledger = JSON.parse(await readFile(ledgerUrl, "utf8"));
ledger.app_publication_records = [
  ...ledger.app_publication_records.filter(
    ({ record_id: recordId }) => !recordId.startsWith("gm-1993-ck-pickup-"),
  ),
  ...records,
];
ledger.program_definitions = [
  ...(ledger.program_definitions ?? []).filter(
    ({ program_id: existingProgramId }) => existingProgramId !== programId,
  ),
  programDefinition,
];
ledger.identity_ledger = [
  ...ledger.identity_ledger.filter(
    ({ identity_id: identityId }) => identityId !== woodlandIdentity.identity_id,
  ),
  woodlandIdentity,
];
ledger.integrity_audit.promoted_pdf_pages_visually_rechecked = [
  ...new Set([
    ...ledger.integrity_audit.promoted_pdf_pages_visually_rechecked,
    "gm-heritage-1993-chevrolet-truck PDF page 12",
  ]),
];
ledger.integrity_audit.publication_boundary =
  `The ${ledger.app_publication_records.length} app_publication_records are limited to directly reviewed model, year, and program scopes. ` +
  "The 1993 C/K Pickup tranche is limited to the four zero-lead-day solid paints on PDF page 12 and does not assert assembly-plant installation or extend them to another model. " +
  "The Caprice PPV tranche contains one row per exact 2011-2017 program, color, and model year, applies the revised model-specific guide over conflicting Fleet Guide summaries, and publishes no inferred WA, SEO, or factory paint code. " +
  "The 2024 Blazer EV SEO rows marked not available and the 2025 rows marked planned or not available remain nonrouting snapshot evidence. " +
  "The five no-RPO rows on the 2003 SEO chart remain research-only because the adjacent TGK ordering table expressly identifies only four orderable specialty colors. " +
  "Forest Service Green remains a research lead without Chevrolet model-year availability.";

if (records.length !== 4) throw new Error("1993 C/K record count must be four");
if (new Set(records.map(({ record_id: recordId }) => recordId)).size !== 4) {
  throw new Error("1993 C/K record IDs must be unique");
}
if (records.some(({ label }) => /forest service green/i.test(label))) {
  throw new Error("Forest Service Green must remain nonrouting research evidence");
}

await Promise.all([
  writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
  writeFile(ledgerUrl, `${JSON.stringify(ledger, null, 2)}\n`, "utf8"),
]);

console.log(
  JSON.stringify({
    record_count: records.length,
    model_year_scope: "ck-series:1993",
    application_type: "manufacturer_special_equipment_option",
    availability_state: "available",
    factory_installation_claim: false,
  }),
);
