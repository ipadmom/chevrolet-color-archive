import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const ledgerUrl = new URL(
  "data/sources/specialty-color-source-candidates.json",
  root,
);
const manifestUrl = new URL(
  "data/sources/brochure-source-release-manifest.json",
  root,
);
const sourceRegistryUrl = new URL("data/sources/source-registry.json", root);
const catalogUrl = new URL("data/catalog/chevrolet-us-nameplates.json", root);
const stagingDirectoryUrl = new URL(
  "tmp/release-staging/brochure-source-archive-v1/",
  root,
);
const checksumAssetName = "source-sha256-manifest.txt";
const releaseBase =
  "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/";
const generatedAt = "2026-07-22T23:59:00Z";

const sourceContracts = [
  {
    source_id: "gm-heritage-1981-chevrolet-g-van",
    title: "1981 Chevrolet G Van Vehicle Information Kit",
    asset_name: "1981-chevrolet-g-van-vehicle-information-kit-gm.pdf",
    archive_url: `${releaseBase}1981-chevrolet-g-van-vehicle-information-kit-gm.pdf`,
    original_source_url:
      "https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1981-Chevrolet-G-Van.pdf",
    local_path:
      "tmp/crawler-state/objects/sha256/9a/fb/9afb28d13caca261b3cc2f493b353c2d79e2c678c8e67de2906906ec5229a317.pdf",
    registry_archive_relpath:
      "9a/fb/9afb28d13caca261b3cc2f493b353c2d79e2c678c8e67de2906906ec5229a317.pdf",
    sha256: "9afb28d13caca261b3cc2f493b353c2d79e2c678c8e67de2906906ec5229a317",
    bytes: 2_028_295,
    pdf_page_count: 61,
    role: "controlling_qualified_historical_vehicle_information_kit",
  },
  {
    source_id: "gm-heritage-1981-chevrolet-motorhome",
    title: "1981 Chevrolet Motorhome Vehicle Information Kit",
    asset_name: "1981-chevrolet-motorhome-vehicle-information-kit-gm.pdf",
    archive_url: `${releaseBase}1981-chevrolet-motorhome-vehicle-information-kit-gm.pdf`,
    original_source_url:
      "https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1981-Chevrolet-Motorhome.pdf",
    local_path:
      "tmp/crawler-state/objects/sha256/ea/5a/ea5aa8b61c7975cf814e56518293f870b46a390f4db5b33d3428eb2d38d655c9.pdf",
    registry_archive_relpath:
      "ea/5a/ea5aa8b61c7975cf814e56518293f870b46a390f4db5b33d3428eb2d38d655c9.pdf",
    sha256: "ea5aa8b61c7975cf814e56518293f870b46a390f4db5b33d3428eb2d38d655c9",
    bytes: 11_196_101,
    pdf_page_count: 50,
    role: "controlling_qualified_historical_vehicle_information_kit",
  },
  {
    source_id: "gm-1983-chevrolet-truck-color-trim",
    title: "1983 Chevrolet Truck Vehicle Information Kit",
    asset_name: "1983-chevrolet-truck-vehicle-information-kit-gm.pdf",
    archive_url: `${releaseBase}1983-chevrolet-truck-vehicle-information-kit-gm.pdf`,
    original_source_url:
      "https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1983-Chevrolet-Truck.pdf",
    local_path:
      "tmp/specialty-color-sources/gm-truck-kits/1983-Chevrolet-Truck.pdf",
    registry_archive_relpath: null,
    sha256: "4e8b447e6617d7be8b9c56fa4ef6e1e5e62918c8d8d45c5abc71f74e5ee04ce1",
    bytes: 6_802_994,
    pdf_page_count: 181,
    role: "controlling_specialty_vehicle_information_kit",
  },
];

const sourcesById = new Map(
  sourceContracts.map((source) => [source.source_id, source]),
);

function sourceCitation(sourceId, details) {
  const source = sourcesById.get(sourceId);
  if (!source) throw new Error(`unknown source contract: ${sourceId}`);
  return {
    source_id: source.source_id,
    title: source.title,
    publisher: "General Motors",
    source_type: "official vehicle information kit",
    url: source.original_source_url,
    ...details,
    retrieved_at: null,
    bytes: source.bytes,
    sha256: source.sha256,
    pdf_page_count: source.pdf_page_count,
    archive_asset_name: source.asset_name,
    archive_url: source.archive_url,
  };
}

const records1981 = [
  {
    record_id: "gm-1981-sportvan-woodland-green-46",
    publication_status: "published_qualified_historical_subset",
    model_year: 1981,
    catalog_model_ids: ["sportvan"],
    source_model_scope: ["Sportvan"],
    program_id: "gm-1981-sportvan-exterior-color-chart",
    program_label: "1981 Sportvan Exterior Color Availability Chart",
    evidence_class: "qualified_historical_table",
    application_type: "standard_program_palette",
    availability_state: "available",
    factory_installation_claim: false,
    label: "Woodland Green",
    source_label_raw: "WOODLAND GREEN",
    finish: "solid and two-tone",
    paint_code: "46",
    seo_code: null,
    code_display: "46",
    touch_up_paint_number: null,
    paint_combinations: [
      { primary_code: "46", secondary_code: "46", treatment: "solid" },
      {
        primary_code: "46",
        secondary_code: "12",
        secondary_label: "Frost White",
        treatment: "two-tone",
      },
      {
        primary_code: "46",
        secondary_code: "17",
        secondary_label: "Light Silver Metallic",
        treatment: "two-tone",
      },
    ],
    restrictions: [
      "The Sportvan chart prints Woodland Green as primary color 46 and secondary color 46 for solid paint.",
      "The chart also prints Woodland Green primary 46 with Frost White secondary 12 or Light Silver Metallic secondary 17 as recommended two-tone combinations.",
      "The chart states that any exterior combination may be ordered with any available seat trim.",
      "This record is limited to Sportvan. Chevy Van, Cutaway Van, Hi-Cube Van, Step-Van, and adjacent years are not inferred.",
      "The source does not state an assembly-plant installation claim.",
    ],
    source: sourceCitation("gm-heritage-1981-chevrolet-g-van", {
      pdf_page: 24,
      printed_page: "Sportvan - Page H",
      section: "Sportvan Interior and Exterior Color Availability Chart",
      revision: "August 8, 1980",
    }),
  },
  {
    record_id: "gm-1981-chevy-van-woodland-green-46",
    publication_status: "published_qualified_historical_subset",
    model_year: 1981,
    catalog_model_ids: ["g-series-van"],
    source_model_scope: ["Chevy Van"],
    program_id: "gm-1981-chevy-van-exterior-color-chart",
    program_label: "1981 Chevy Van Exterior Color Availability Chart",
    evidence_class: "qualified_historical_table",
    application_type: "standard_program_palette",
    availability_state: "available",
    factory_installation_claim: false,
    label: "Woodland Green",
    source_label_raw: "WOODLAND GREEN",
    finish: "solid and two-tone",
    paint_code: "46",
    seo_code: null,
    code_display: "46",
    touch_up_paint_number: null,
    paint_combinations: [
      { primary_code: "46", secondary_code: "46", treatment: "solid" },
      {
        primary_code: "46",
        secondary_code: "12",
        secondary_label: "Frost White",
        treatment: "two-tone",
      },
      {
        primary_code: "46",
        secondary_code: "17",
        secondary_label: "Light Silver Metallic",
        treatment: "two-tone",
      },
    ],
    restrictions: [
      "The Chevy Van chart prints Woodland Green as primary color 46 and secondary color 46 for solid paint.",
      "The chart also prints Woodland Green primary 46 with Frost White secondary 12 or Light Silver Metallic secondary 17 as recommended two-tone combinations.",
      "The chart states that any exterior combination may be ordered with any available seat trim.",
      "This record is limited to Chevy Van. The adjacent Nomad and Beauville seat-trim footnote is not represented as a Woodland Green restriction.",
      "Sportvan, Cutaway Van, Hi-Cube Van, Step-Van, and adjacent years are not inferred.",
      "The source does not state an assembly-plant installation claim.",
    ],
    source: sourceCitation("gm-heritage-1981-chevrolet-g-van", {
      pdf_page: 57,
      printed_page: "Chevy Van - Page J",
      section: "Chevy Van Interior and Exterior Color Availability Chart",
      revision: "August 8, 1980",
    }),
  },
  {
    record_id: "gm-1981-cutaway-hi-cube-woodland-green-46",
    publication_status: "published_qualified_historical_subset",
    model_year: 1981,
    catalog_model_ids: ["g-series-van"],
    source_model_scope: ["Cutaway Van", "Hi-Cube Van"],
    program_id: "gm-1981-cutaway-hi-cube-exterior-color-chart",
    program_label: "1981 Cutaway Van and Hi-Cube Van Exterior Color Availability Chart",
    evidence_class: "qualified_historical_table",
    application_type: "standard_program_palette",
    availability_state: "available",
    factory_installation_claim: false,
    label: "Woodland Green",
    source_label_raw: "WOODLAND GREEN",
    finish: "solid and conditional two-tone",
    paint_code: "46",
    seo_code: null,
    code_display: "46; ZY1 solid; ZY2 aluminum-body Hi-Cube two-tone with bare aluminum 02",
    touch_up_paint_number: null,
    paint_systems: [
      {
        code: "ZY1",
        applicability: ["Cutaway Van", "steel-body Hi-Cube Van"],
        treatment: "solid",
      },
      {
        code: "ZY1",
        applicability: ["aluminum-body Hi-Cube Van"],
        treatment: "solid",
      },
      {
        code: "ZY2",
        applicability: ["aluminum-body Hi-Cube Van"],
        treatment: "two-tone",
        primary_treatment: "cab in primary color 46",
        secondary_label: "Bare Aluminum",
        secondary_code: "02",
      },
    ],
    restrictions: [
      "The Cutaway Van and Hi-Cube Van chart prints Woodland Green as primary color 46 and secondary color 46.",
      "Cutaway Van and steel-body Hi-Cube Van may be ordered only with ZY1 solid paint.",
      "Aluminum-body Hi-Cube Van may use ZY1 solid paint or ZY2 two-tone paint.",
      "For ZY2 on an aluminum-body Hi-Cube Van, the cab is primary color 46 and the body is unpainted bare aluminum, secondary code 02.",
      "Code 02 denotes bare aluminum, not Woodland Green.",
      "Sportvan, Chevy Van, Step-Van, and adjacent years are not inferred.",
      "The source does not state an assembly-plant installation claim.",
    ],
    source: sourceCitation("gm-heritage-1981-chevrolet-motorhome", {
      pdf_page: 18,
      printed_page: "Cutaway Van - Page F",
      section: "Cutaway Van and Hi-Cube Van Interior and Exterior Color Availability Chart",
      revision: "August 8, 1980",
    }),
  },
  {
    record_id: "gm-1981-step-van-step-van-king-woodland-green-46",
    publication_status: "published_qualified_historical_subset",
    model_year: 1981,
    catalog_model_ids: ["p-series-step-van"],
    source_model_scope: ["Step-Van", "Step-Van King"],
    program_id: "gm-1981-step-van-exterior-color-chart",
    program_label: "1981 Step-Van and Step-Van King Exterior Color Availability Chart",
    evidence_class: "qualified_historical_table",
    application_type: "standard_program_palette",
    availability_state: "available",
    factory_installation_claim: false,
    label: "Woodland Green",
    source_label_raw: "WOODLAND GREEN",
    finish: "solid",
    paint_code: "46",
    seo_code: null,
    code_display: "46; ZY1 solid",
    touch_up_paint_number: null,
    paint_systems: [
      {
        code: "ZY1",
        applicability: ["steel E32 body-code Step-Van"],
        treatment: "solid",
        availability: "standard",
      },
      {
        code: "ZY1",
        applicability: ["aluminum E33 body-code Step-Van"],
        treatment: "solid",
        availability: "available",
      },
      {
        code: "02",
        applicability: ["aluminum E33 body-code Step-Van"],
        treatment: "bare aluminum body alternative",
        relationship_to_woodland_green: "separate alternative, not a Woodland Green code",
      },
    ],
    restrictions: [
      "The Step-Van chart prints Woodland Green as primary color 46 and secondary color 46.",
      "Two-tone paint is not available for Step-Van or Step-Van King.",
      "ZY1 solid paint is standard on the steel E32 body-code Step-Van and available on the aluminum E33 body-code Step-Van.",
      "Bare aluminum code 02 is available only on the aluminum E33 Step-Van and is a separate alternative, not a Woodland Green code.",
      "Sportvan, Chevy Van, Cutaway Van, Hi-Cube Van, and adjacent years are not inferred.",
      "The source does not state an assembly-plant installation claim.",
    ],
    source: sourceCitation("gm-heritage-1981-chevrolet-motorhome", {
      pdf_page: 42,
      printed_page: "Step Vans and FC Chassis - Page L",
      section: "Step-Van Interior and Exterior Color Availability Chart; Step-Van and Step-Van King",
      revision: "August 8, 1980",
    }),
  },
];

const permanentFleetColors1983 = [
  {
    slug: "tangier-orange",
    label: "Tangier Orange",
    source_label_raw: "TANGIER ORANGE (ORANGE)",
    seo_code: "9V2",
  },
  {
    slug: "wheatland-yellow",
    label: "Wheatland Yellow",
    source_label_raw: "WHEATLAND YELLOW (DARK YELLOW)",
    seo_code: "9V4",
  },
  {
    slug: "woodland-green",
    label: "Woodland Green",
    source_label_raw: "WOODLAND GREEN",
    seo_code: "9V5",
  },
  {
    slug: "cardinal-red",
    label: "Cardinal Red",
    source_label_raw: "CARDINAL RED",
    seo_code: "9V8",
    source_exclusion:
      "Not available on S-10/15, El Camino/Caballero models.",
  },
];

const records1983 = permanentFleetColors1983.map((color) => ({
  record_id: `gm-1983-ck-pickup-permanent-fleet-${color.slug}-${color.seo_code.toLowerCase()}`,
  publication_status: "published_specialty_subset",
  model_year: 1983,
  catalog_model_ids: ["ck-series"],
  source_model_scope: ["C/K Pickup"],
  program_id: "gm-1983-ck-pickup-permanent-fleet-colors",
  program_label: "1983 C/K Pickup Permanent Fleet Colors",
  application_type: "manufacturer_special_equipment_option",
  availability_state: "available",
  factory_installation_claim: false,
  label: color.label,
  source_label_raw: color.source_label_raw,
  finish: "not stated",
  paint_code: "Not printed",
  seo_code: color.seo_code,
  code_display: `SEO ${color.seo_code}; factory paint code not printed`,
  touch_up_paint_number: null,
  restrictions: [
    "The permanent fleet table prints the color name and SEO code but does not print a paint or refinish code.",
    "The C/K Pickup chart directs special paint applications to the Zone Office.",
    "Publication is limited to the reviewed 1983 C/K Pickup scope. No other Chevrolet truck or passenger-car application is inferred.",
    "The source does not state that the paint was installed at the assembly plant.",
    ...(color.source_exclusion ? [color.source_exclusion] : []),
  ],
  source: sourceCitation("gm-1983-chevrolet-truck-color-trim", {
    pdf_pages: [37, 59],
    printed_page: "C/K Pickup - Page N; Color & Trim - Page 2",
    section: "C/K Pickup special paint applications; 1983 Paint Refinish Numbers, Permanent Fleet Colors",
    revision: "C/K Pickup chart February 1983; color and trim table September 1982",
  }),
}));

const records = [...records1981, ...records1983];
const expectedRecordIds = [
  "gm-1981-sportvan-woodland-green-46",
  "gm-1981-chevy-van-woodland-green-46",
  "gm-1981-cutaway-hi-cube-woodland-green-46",
  "gm-1981-step-van-step-van-king-woodland-green-46",
  "gm-1983-ck-pickup-permanent-fleet-tangier-orange-9v2",
  "gm-1983-ck-pickup-permanent-fleet-wheatland-yellow-9v4",
  "gm-1983-ck-pickup-permanent-fleet-woodland-green-9v5",
  "gm-1983-ck-pickup-permanent-fleet-cardinal-red-9v8",
];

const programDefinitions = [
  {
    program_id: "gm-1981-sportvan-exterior-color-chart",
    program_ids: ["gm-1981-sportvan-exterior-color-chart"],
    model_year_scopes: ["1981 Sportvan"],
    application_type: "standard_program_palette",
    catalog_model_ids: ["sportvan"],
    source_scope: "Sportvan only",
    factory_installation_claim: false,
    restrictions: ["Solid and recommended two-tone combinations are preserved exactly from PDF page 24."],
  },
  {
    program_id: "gm-1981-chevy-van-exterior-color-chart",
    program_ids: ["gm-1981-chevy-van-exterior-color-chart"],
    model_year_scopes: ["1981 Chevy Van"],
    application_type: "standard_program_palette",
    catalog_model_ids: ["g-series-van"],
    source_scope: "Chevy Van only",
    catalog_mapping_basis: "The catalog lists Chevy Van as a G-Series Van alias.",
    factory_installation_claim: false,
  },
  {
    program_id: "gm-1981-cutaway-hi-cube-exterior-color-chart",
    program_ids: ["gm-1981-cutaway-hi-cube-exterior-color-chart"],
    model_year_scopes: ["1981 Cutaway Van and Hi-Cube Van"],
    application_type: "standard_program_palette",
    catalog_model_ids: ["g-series-van"],
    source_scope: "Cutaway Van and Hi-Cube Van only",
    catalog_mapping_basis: "The source is the 1981 G Van family kit, and the retained archive already maps Cutaway Van and Hi-Cube Van to g-series-van.",
    factory_installation_claim: false,
    paint_systems: ["ZY1", "ZY2", "02 bare aluminum"],
  },
  {
    program_id: "gm-1981-step-van-exterior-color-chart",
    program_ids: ["gm-1981-step-van-exterior-color-chart"],
    model_year_scopes: ["1981 Step-Van and Step-Van King"],
    application_type: "standard_program_palette",
    catalog_model_ids: ["p-series-step-van"],
    source_scope: "Step-Van and Step-Van King only",
    catalog_mapping_basis: "The catalog lists Step-Van under P-Series / Step-Van.",
    factory_installation_claim: false,
    paint_systems: ["ZY1", "02 bare aluminum"],
  },
  {
    program_id: "gm-1983-ck-pickup-permanent-fleet-colors",
    program_ids: ["gm-1983-ck-pickup-permanent-fleet-colors"],
    model_year_scopes: ["1983 C/K Pickup"],
    application_type: "manufacturer_special_equipment_option",
    catalog_model_ids: ["ck-series"],
    source_scope: "C/K Pickup only",
    factory_installation_claim: false,
    factory_paint_code_printed: false,
    seo_code_printed: true,
    restrictions: [
      "The permanent fleet color table is read with the C/K Pickup chart's direction to contact the Zone Office for special paint applications.",
      "Cardinal Red retains the source footnote excluding S-10/15 and El Camino/Caballero models.",
      "No assembly-plant installation claim or cross-model availability is inferred.",
    ],
  },
];

const woodlandIdentities = [
  {
    identity_id: "gm-woodland-green-option-46-1981",
    label: "Woodland Green",
    codes: ["Chevrolet color 46"],
    authority: "General Motors",
    status: "verified_1981_model_specific_regular_color_continuity_not_asserted",
    not_equated_to: [
      "Forest Service Green",
      "Federal Standard No. 595 No. 14260",
      "Forest Service Green 5032",
      "Woodland Green SEO 9V5",
      "Woodland Green WE7156",
      "Woodland Green WE9015",
      "Woodland Green WA-9015",
    ],
  },
  {
    identity_id: "gm-woodland-green-seo-9v5-1983-ck",
    label: "Woodland Green",
    codes: ["SEO 9V5"],
    authority: "General Motors",
    status: "verified_1983_permanent_fleet_label_continuity_not_asserted",
    not_equated_to: [
      "Forest Service Green",
      "Federal Standard No. 595 No. 14260",
      "Forest Service Green 5032",
      "Woodland Green Chevrolet color 46",
      "Woodland Green WE7156",
      "Woodland Green WE9015",
      "Woodland Green WA-9015",
    ],
  },
];

function upsertStable(items, incoming, keyName) {
  const additions = new Map();
  for (const item of incoming) {
    const key = item[keyName];
    if (!key || additions.has(key)) {
      throw new Error(`invalid or duplicate incoming ${keyName}: ${key}`);
    }
    additions.set(key, item);
  }

  const seen = new Set();
  const result = items.map((item) => {
    const key = item[keyName];
    if (seen.has(key)) throw new Error(`duplicate existing ${keyName}: ${key}`);
    seen.add(key);
    if (!additions.has(key)) return item;
    const replacement = additions.get(key);
    additions.delete(key);
    return replacement;
  });
  return [...result, ...additions.values()];
}

async function verifyFile(fileUrl, source, label) {
  const bytes = await readFile(fileUrl);
  const metadata = await stat(fileUrl);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (metadata.size !== source.bytes || digest !== source.sha256) {
    throw new Error(`${label} mismatch: ${source.source_id}`);
  }
}

function manifestEntry(source) {
  return {
    asset_name: source.asset_name,
    archive_url: source.archive_url,
    sha256: source.sha256,
    bytes: source.bytes,
    role: source.role,
    source_id: source.source_id,
    original_source_url: source.original_source_url,
    pdf_page_count: source.pdf_page_count,
  };
}

function verifyExistingManifestEntry(entry, source) {
  if (!entry) return;
  for (const key of [
    "asset_name",
    "archive_url",
    "sha256",
    "bytes",
    "source_id",
    "original_source_url",
    "pdf_page_count",
  ]) {
    if (entry[key] !== source[key]) {
      throw new Error(`existing Release manifest contract mismatch for ${source.source_id}: ${key}`);
    }
  }
}

function verifyRegistryContracts(registry) {
  for (const source of sourceContracts.filter(({ registry_archive_relpath: path }) => path)) {
    const entry = registry.sources.find(({ source_id: sourceId }) => sourceId === source.source_id);
    if (!entry) throw new Error(`source registry entry missing: ${source.source_id}`);
    const expectations = {
      canonical_url: source.original_source_url,
      content_length_bytes: source.bytes,
      content_sha256: source.sha256,
      archive_relpath: source.registry_archive_relpath,
    };
    for (const [key, expected] of Object.entries(expectations)) {
      if (entry[key] !== expected) {
        throw new Error(`source registry contract mismatch for ${source.source_id}: ${key}`);
      }
    }
    if (entry.archive_url !== null && entry.archive_url !== source.archive_url) {
      throw new Error(`unexpected source registry archive URL: ${source.source_id}`);
    }
  }
}

function yearCovered(model, year) {
  return model.model_year_ranges.some(({ start, end }) => year >= start && year <= end);
}

function verifyCatalog(catalog) {
  const models = new Map(catalog.models.map((model) => [model.id, model]));
  const expectations = [
    ["sportvan", "Sportvan", 1981],
    ["g-series-van", "G-Series Van", 1981],
    ["p-series-step-van", "P-Series / Step-Van", 1981],
    ["ck-series", "C/K Series", 1983],
  ];
  for (const [id, name, year] of expectations) {
    const model = models.get(id);
    if (!model || model.name !== name || !yearCovered(model, year)) {
      throw new Error(`catalog mapping is missing or ambiguous: ${id}:${year}`);
    }
  }
  if (!models.get("g-series-van").aliases.includes("Chevy Van")) {
    throw new Error("catalog no longer maps Chevy Van to g-series-van");
  }
  for (const alias of ["Cutaway Van", "Hi-Cube Van"]) {
    if (!models.get("g-series-van").aliases.includes(alias)) {
      throw new Error(`catalog no longer maps ${alias} to g-series-van`);
    }
  }
  if (!models.get("p-series-step-van").aliases.includes("Step-Van")) {
    throw new Error("catalog no longer maps Step-Van to p-series-step-van");
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
  for (const child of Object.values(value)) collectArtifactIdentities(child, artifacts);
  return artifacts;
}

if (records1981.length !== 4 || records1983.length !== 4 || records.length !== 8) {
  throw new Error("historic fleet tranche must contain four 1981 and four 1983 records");
}
if (new Set(records.map(({ record_id: recordId }) => recordId)).size !== records.length) {
  throw new Error("historic fleet tranche record IDs must be unique");
}
if (
  records.map(({ record_id: recordId }) => recordId).sort().join("\n") !==
  [...expectedRecordIds].sort().join("\n")
) {
  throw new Error("historic fleet tranche record IDs changed");
}
if (
  records.some(({ label }) => /forest service green/i.test(label)) ||
  records1981.some(({ seo_code: seoCode }) => seoCode) ||
  records1983.some(({ paint_code: paintCode }) => paintCode !== "Not printed")
) {
  throw new Error("historic color identities or printed-code boundaries were widened");
}
const cardinal = records1983.find(({ label }) => label === "Cardinal Red");
if (
  !cardinal ||
  !cardinal.restrictions.includes("Not available on S-10/15, El Camino/Caballero models.")
) {
  throw new Error("Cardinal Red source exclusion must be preserved exactly");
}

await Promise.all(
  sourceContracts.map((source) =>
    verifyFile(new URL(source.local_path, root), source, "retained source"),
  ),
);

const [ledger, manifest, sourceRegistry, catalog] = await Promise.all([
  readFile(ledgerUrl, "utf8").then(JSON.parse),
  readFile(manifestUrl, "utf8").then(JSON.parse),
  readFile(sourceRegistryUrl, "utf8").then(JSON.parse),
  readFile(catalogUrl, "utf8").then(JSON.parse),
]);

verifyRegistryContracts(sourceRegistry);
verifyCatalog(catalog);

for (const source of sourceContracts) {
  verifyExistingManifestEntry(
    manifest.entries.find(({ asset_name: assetName }) => assetName === source.asset_name),
    source,
  );
}

await mkdir(stagingDirectoryUrl, { recursive: true });
await Promise.all(
  sourceContracts.map(async (source) => {
    const stagedUrl = new URL(source.asset_name, stagingDirectoryUrl);
    await copyFile(new URL(source.local_path, root), stagedUrl);
    await verifyFile(stagedUrl, source, "staged Release asset");
  }),
);

manifest.entries = upsertStable(
  manifest.entries,
  sourceContracts.map(manifestEntry),
  "asset_name",
);

const checksumEntry = manifest.entries.find(
  ({ asset_name: assetName }) => assetName === checksumAssetName,
);
if (!checksumEntry) {
  throw new Error(`Release manifest is missing ${checksumAssetName}`);
}
const orderedReleaseEntries = manifest.entries
  .filter(({ asset_name: assetName }) => assetName !== checksumAssetName)
  .sort(({ asset_name: left }, { asset_name: right }) => left.localeCompare(right));
const checksumText = orderedReleaseEntries
  .map(({ sha256, asset_name: assetName }) => `${sha256}  ${assetName}\n`)
  .join("");
const checksumUrl = new URL(checksumAssetName, stagingDirectoryUrl);
await writeFile(checksumUrl, checksumText, "utf8");
const checksumBytes = await readFile(checksumUrl);
checksumEntry.sha256 = createHash("sha256").update(checksumBytes).digest("hex");
checksumEntry.bytes = checksumBytes.byteLength;
manifest.entries = [...orderedReleaseEntries, checksumEntry];
const oldScopeFragment =
  "The archive also retains the 1979 Blazer and 1993 S-10 vehicle information kits, the 1980 Chevrolet truck color-and-trim kit,";
const historicScopeFragment =
  "The archive also retains the 1979 Blazer and 1993 S-10 vehicle information kits, the 1980 Chevrolet truck color-and-trim kit, the 1981 Chevrolet G Van and Motorhome vehicle information kits, the 1983 Chevrolet truck color-and-trim kit,";
if (manifest.scope.includes(historicScopeFragment)) {
  // Already expanded by an earlier deterministic run.
} else if (manifest.scope.includes(oldScopeFragment)) {
  manifest.scope = manifest.scope.replace(oldScopeFragment, historicScopeFragment);
} else {
  throw new Error("Release manifest scope does not contain the historic-source insertion point");
}

ledger.app_publication_records = upsertStable(
  ledger.app_publication_records,
  records,
  "record_id",
);
ledger.program_definitions = upsertStable(
  ledger.program_definitions ?? [],
  programDefinitions,
  "program_id",
);
ledger.identity_ledger = upsertStable(
  ledger.identity_ledger ?? [],
  woodlandIdentities,
  "identity_id",
);
ledger.generated_at = generatedAt;
ledger.dataset_kind = "chevrolet_color_source_candidates";
ledger.scope =
  "United States Chevrolet fleet, government, Special Equipment Option, and other specialty exterior colors, plus qualified historical exterior-color table subsets. Forest Service Green is retained as a named USDA research lead without an invented Chevrolet model-year application.";

const reviewedPages = [
  "gm-heritage-1981-chevrolet-g-van PDF page 24",
  "gm-heritage-1981-chevrolet-g-van PDF page 57",
  "gm-heritage-1981-chevrolet-motorhome PDF page 18",
  "gm-heritage-1981-chevrolet-motorhome PDF page 42",
  "gm-1983-chevrolet-truck-color-trim PDF pages 37 and 59",
];
ledger.integrity_audit.promoted_pdf_pages_visually_rechecked = [
  ...new Set([
    ...ledger.integrity_audit.promoted_pdf_pages_visually_rechecked,
    ...reviewedPages,
  ]),
];
ledger.integrity_audit.last_updater_rehash = {
  script: "scripts/update-1981-1983-historic-fleet-tranche.mjs",
  source_ids: sourceContracts.map(({ source_id: sourceId }) => sourceId),
  file_count: sourceContracts.length,
};
const artifactIdentities = collectArtifactIdentities(ledger);
const publishedSpecialtyRecords = ledger.app_publication_records.filter(
  ({ publication_status: status }) => status === "published_specialty_subset",
);
const publishedQualifiedHistoricalRecords = ledger.app_publication_records.filter(
  ({ publication_status: status }) =>
    status === "published_qualified_historical_subset",
);
ledger.integrity_audit.unique_retained_artifacts_reconciled = artifactIdentities.size;
ledger.integrity_audit.artifact_reference_groups = {
  published_record_sources: collectArtifactIdentities(ledger.app_publication_records).size,
  published_specialty_sources: collectArtifactIdentities(publishedSpecialtyRecords).size,
  published_qualified_historical_sources: collectArtifactIdentities(
    publishedQualifiedHistoricalRecords,
  ).size,
  verified_not_published_sources: collectArtifactIdentities(ledger.verified_not_published).size,
  historic_gm_upfitter_candidates: collectArtifactIdentities(ledger.historic_gm_upfitter_candidates).size,
  usda_primary_sources: collectArtifactIdentities(ledger.usda_primary_sources).size,
  modern_order_guide_snapshot_candidates: collectArtifactIdentities(ledger.modern_order_guide_snapshot_candidates).size,
  comparison_sources: collectArtifactIdentities(ledger.comparison_sources).size,
  rejected_or_unresolved_source_artifacts: collectArtifactIdentities(ledger.rejected_or_unresolved_leads).size,
};

const oldBoundary = ledger.integrity_audit.publication_boundary.replace(
  /^The \d+ app_publication_records are limited to directly reviewed model, year, and program scopes\.\s*/,
  "",
);
const trancheBoundary =
  "The 1981 Woodland Green records are limited to four separately reviewed Sportvan, Chevy Van, Cutaway/Hi-Cube, and Step-Van/Step-Van King charts, preserve ZY1, ZY2, code 02, and bare-aluminum distinctions, and assert no factory-installation claim or continuity with SEO 9V5. " +
  "The 1983 permanent fleet rows are limited to the C/K Pickup, preserve the Cardinal Red S-10/15 and El Camino/Caballero exclusion, print no inferred factory paint code or finish, and assert no assembly-plant installation. ";
ledger.integrity_audit.publication_boundary =
  `The ${ledger.app_publication_records.length} app_publication_records are limited to directly reviewed model, year, and program scopes. ` +
  (oldBoundary.includes("The 1981 Woodland Green records are limited")
    ? oldBoundary
    : trancheBoundary + oldBoundary);

await Promise.all([
  writeFile(ledgerUrl, `${JSON.stringify(ledger, null, 2)}\n`, "utf8"),
  writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
]);

console.log(
  JSON.stringify({
    record_count: records.length,
    records_1981: records1981.length,
    records_1983: records1983.length,
    staged_release_assets: sourceContracts.length,
    checksum_covered_assets: orderedReleaseEntries.length,
    catalog_model_ids: [...new Set(records.flatMap(({ catalog_model_ids: ids }) => ids))],
    factory_installation_claim: false,
  }),
);
