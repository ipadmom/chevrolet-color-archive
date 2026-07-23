import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = new URL("../", import.meta.url);
const ledgerUrl = new URL(
  "data/sources/specialty-color-source-candidates.json",
  root,
);
const manifestUrl = new URL(
  "data/sources/brochure-source-release-manifest.json",
  root,
);
const catalogUrl = new URL(
  "data/catalog/chevrolet-us-nameplates.json",
  root,
);
const stagingDirectoryUrl = new URL(
  "tmp/release-staging/brochure-source-archive-v1/",
  root,
);
const releaseBase =
  "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/";
const checksumAssetName = "source-sha256-manifest.txt";
const generatedAt = "2026-07-23T00:43:22Z";
const manifestScopeSentence =
  "This release also retains the eleven exact 2015-2020 GM Upfitter specification guides governing the audited Tahoe 9C1 and 5W4, Impala Limited 9C1/9C3 Kerr, and Suburban 1FL/3500HD specialty-paint tables.";
const publicationBoundarySentence =
  "The 2015-2020 later-fleet specialty tranche publishes 112 exact program-color rows from eleven separately retained and visually reviewed GM Upfitter guides, keeps Tahoe 9C1 and 5W4 separate, preserves Impala Kerr post-build application semantics, and does not infer adjacent years or route Forest Service Green.";

function source(contract) {
  return {
    ...contract,
    publisher: "General Motors",
    source_type: "official GM Upfitter specification guide",
    role: "controlling_specialty_vehicle_specification_guide",
    retrieved_at: "2026-07-22",
    archive_url: releaseBase + contract.asset_name,
  };
}

export const SOURCE_CONTRACTS = {
  "gm-2015-tahoe-5w4": source({
    source_id: "gm-2015-tahoe-5w4",
    year: 2015,
    title: "2015 Chevrolet Tahoe 4x4 Special Service 5W4 Specification Guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/07/2015_tahoe_5w4_4x4_specification_guide_4_10.pdf",
    local_path: "tmp/specialty-color-sources/gm-upfitter/2015-tahoe-5w4.pdf",
    bytes: 10_165_047,
    sha256: "aa9fa6a25c8deb0c53476730704a698d70f0b2c1adfd8afd8eaa5831ce2a32df",
    pdf_page_count: 41,
    candidate_pages: [8],
    printed_pages: [8],
    asset_name: "2015-chevrolet-tahoe-5w4-specification-guide-gm.pdf",
    published_model_scopes: ["2015 Tahoe 4x4 Special Service 5W4"],
  }),
  "gm-2016-tahoe-9c1": source({
    source_id: "gm-2016-tahoe-9c1",
    year: 2016,
    title: "2016 Chevrolet Tahoe 2WD Police Package 9C1 Specification Guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/07/2016-Tahoe-9C1-2WD-Specification-Guide.pdf",
    local_path: "tmp/specialty-color-research/historic-official-pdfs/gm-2016-tahoe-9c1.pdf",
    bytes: 11_491_154,
    sha256: "557d7f6e460d12ff257d563848f2c0aa905729495d8a99fb8bc8df68bef8ce4c",
    pdf_page_count: 42,
    candidate_pages: [8],
    printed_pages: [8],
    asset_name: "2016-chevrolet-tahoe-9c1-2wd-specification-guide-gm.pdf",
    published_model_scopes: ["2016 Tahoe 2WD Police Package 9C1"],
  }),
  "gm-2016-tahoe-5w4": source({
    source_id: "gm-2016-tahoe-5w4",
    year: 2016,
    title: "2016 Chevrolet Tahoe 4x4 Special Service 5W4 Specification Guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/05/2016-Tahoe-Special-Service-4x4-Specification-Guide.pdf",
    local_path: "tmp/specialty-color-sources/gm-upfitter/2016-tahoe-5w4.pdf",
    bytes: 38_765_853,
    sha256: "383f603bd378965d4932e145650ab90eadb084c6c5ae9c24ca870530721d1696",
    pdf_page_count: 42,
    candidate_pages: [8],
    printed_pages: [16],
    asset_name: "2016-chevrolet-tahoe-5w4-specification-guide-gm.pdf",
    published_model_scopes: ["2016 Tahoe 4x4 Special Service 5W4"],
  }),
  "gm-2017-tahoe-9c1-4wd": source({
    source_id: "gm-2017-tahoe-9c1-4wd",
    year: 2017,
    title: "2017 Chevrolet Tahoe 4WD Police Package 9C1 Specification Guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/07/Tahoe-9C1-4WD-Specification-Guide-2017.pdf",
    local_path: "tmp/specialty-color-sources/gm-upfitter/2017-tahoe-9c1.pdf",
    bytes: 21_730_455,
    sha256: "e51297ea8d36bb458db2e9cd2796807ad424930194ad4c283236d181619c2aaa",
    pdf_page_count: 46,
    candidate_pages: [10],
    printed_pages: [6],
    asset_name: "2017-chevrolet-tahoe-9c1-4wd-specification-guide-gm.pdf",
    published_model_scopes: ["2017 Tahoe 4WD Police Package 9C1"],
  }),
  "gm-2018-tahoe-9c1-4wd": source({
    source_id: "gm-2018-tahoe-9c1-4wd",
    year: 2018,
    title: "2018 Chevrolet Tahoe 4WD Police Package 9C1 Pursuit Specification Guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/05/2018-Tahoe-4WD-9C1-Pursuit.pdf",
    local_path: "tmp/specialty-color-sources/gm-upfitter/2018-tahoe-9c1.pdf",
    bytes: 17_155_009,
    sha256: "dfe05400fb07c349665a79aebdcec7e4e66ddbe38ac5efc98afe8991b61bb01d",
    pdf_page_count: 53,
    candidate_pages: [11],
    printed_pages: [7],
    asset_name: "2018-chevrolet-tahoe-9c1-4wd-specification-guide-gm.pdf",
    published_model_scopes: ["2018 Tahoe 4WD Police Package 9C1 Pursuit"],
  }),
  "gm-2019-tahoe-5w4": source({
    source_id: "gm-2019-tahoe-5w4",
    year: 2019,
    title: "2019 Chevrolet Tahoe 4x4 Special Service 5W4 Specification Guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/09/2019-Tahoe-4x4-Special-Service-5W4.pdf",
    local_path: "tmp/specialty-color-sources/gm-upfitter/2019-tahoe-5w4.pdf",
    bytes: 11_212_375,
    sha256: "31ad0b80b9f822761e7d01c33dae1e93f5e2267b96382dd8ddb70013000dc397",
    pdf_page_count: 45,
    candidate_pages: [10],
    printed_pages: [6],
    asset_name: "2019-chevrolet-tahoe-5w4-specification-guide-gm.pdf",
    published_model_scopes: ["2019 Tahoe 4x4 Special Service 5W4"],
  }),
  "gm-2020-tahoe-5w4": source({
    source_id: "gm-2020-tahoe-5w4",
    year: 2020,
    title: "2020 Chevrolet Tahoe 4x4 Special Service 5W4 Specification Guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/05/2020-Tahoe-4x4-Special-Service-5W4-8.pdf",
    local_path: "tmp/specialty-color-sources/gm-upfitter/2020-tahoe-5w4.pdf",
    bytes: 12_650_720,
    sha256: "152ce9c7e2f0a89908b0fe5b17b990b7a7897b22b6b085d8cc26a7ea5de7ebb1",
    pdf_page_count: 45,
    candidate_pages: [9],
    printed_pages: [5],
    asset_name: "2020-chevrolet-tahoe-5w4-specification-guide-gm.pdf",
    published_model_scopes: ["2020 Tahoe 4x4 Special Service 5W4"],
  }),
  "gm-2015-impala-limited-9c1-9c3": source({
    source_id: "gm-2015-impala-limited-9c1-9c3",
    year: 2015,
    title: "2015 Chevrolet Impala Limited 9C1 and 9C3 Police Specification Guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/05/2015_impala_limited_police_specification_guide_4_10.pdf",
    local_path: "tmp/specialty-color-sources/gm-upfitter/2015-impala-limited-9c1-9c3.pdf",
    bytes: 11_524_978,
    sha256: "e6247f215d4ea186b39a663eccd6454a27ad3adf05134e11318a19be39981f94",
    pdf_page_count: 35,
    candidate_pages: [8, 9],
    printed_pages: [8, 9],
    asset_name: "2015-chevrolet-impala-limited-9c1-9c3-specification-guide-gm.pdf",
    published_model_scopes: ["2015 Impala Limited 9C1 and 9C3"],
  }),
  "gm-2016-impala-limited-9c1-9c3": source({
    source_id: "gm-2016-impala-limited-9c1-9c3",
    year: 2016,
    title: "2016 Chevrolet Impala Limited 9C1 and 9C3 Police Specification Guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/05/2016-Impala-Limited-Police-Specification-Guide.pdf",
    local_path: "tmp/specialty-color-sources/gm-upfitter/2016-impala-limited-9c1-9c3.pdf",
    bytes: 9_949_295,
    sha256: "74f946e2a505d2c113002afc75188871e0f9b5f20361a42167d8329ec8b731fd",
    pdf_page_count: 36,
    candidate_pages: [8, 9],
    printed_pages: [8, 9],
    asset_name: "2016-chevrolet-impala-limited-9c1-9c3-specification-guide-gm.pdf",
    published_model_scopes: ["2016 Impala Limited 9C1 and 9C3"],
  }),
  "gm-2019-suburban-1fl-3500hd": source({
    source_id: "gm-2019-suburban-1fl-3500hd",
    year: 2019,
    title: "2019 Chevrolet Suburban 1FL and 3500HD Specification Guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/05/2019-Suburban-1FL-Suburban-3500HD.pdf",
    local_path: "tmp/specialty-color-sources/gm-upfitter/2019-suburban-1fl.pdf",
    bytes: 9_884_550,
    sha256: "42fc66eed0cb1f62418e2636c91c8c98c9ca0c84f1ddcccbdec772dae9e1d22c",
    pdf_page_count: 28,
    candidate_pages: [10],
    printed_pages: [6],
    asset_name: "2019-chevrolet-suburban-1fl-3500hd-specification-guide-gm.pdf",
    published_model_scopes: ["2019 Suburban 1FL and 3500HD"],
  }),
  "gm-2020-suburban-1fl": source({
    source_id: "gm-2020-suburban-1fl",
    year: 2020,
    title: "2020 Chevrolet Suburban 1FL Specification Guide",
    url: "https://www.gmupfitter.com/wp-content/uploads/2021/05/2020-Suburban-1FL-7.pdf",
    local_path: "tmp/specialty-color-sources/gm-upfitter/2020-suburban-1fl.pdf",
    bytes: 7_743_853,
    sha256: "0608bdfc002d40868fc1d3e2dd40c505799beaadf3ac1a5ce5037a8d41010cf2",
    pdf_page_count: 26,
    candidate_pages: [10],
    printed_pages: [6],
    asset_name: "2020-chevrolet-suburban-1fl-specification-guide-gm.pdf",
    published_model_scopes: ["2020 Suburban 1FL"],
  }),
};

const tahoeSeven = [
  ["Blue", "Blue", "5665", "9V2", "9V2", "printed"],
  ["Woodland Green", "Woodland Green", "9015", "9V5", "9V5", "printed"],
  ["Victory Red", "Victory Red", "9260", "5T4", "5T4", "printed"],
  ["Yellow", "Yellow", "9414", null, "\u2014", "em_dash"],
  ["Wheatland Yellow", "Wheatland Yellow (86U)", "253A", "9W3", "9W3", "printed"],
  ["Dark Toreador Red", "Dark Toreador Red", "334D", null, "\u2014", "em_dash"],
  ["Dark Blue Metallic", "Dark Blue Metallic (25U)", "722J", "9V7", "9V7", "printed"],
];

const tahoeSix = tahoeSeven.filter(([label]) => label !== "Dark Blue Metallic");
const tahoeFive = [
  ["MSP Blue", "MSP Blue", "5665", "9V2", "9V2", "printed"],
  ["Woodland Green", "Woodland Green", "9015", "9V5", "9V5", "printed"],
  ["Victory Red", "Victory Red", "9260", "5T4", "5T4", "printed"],
  ["Wheatland Yellow", "Wheatland Yellow (86U)", "253A", "9W3", "9W3", "printed"],
  ["Dark Toreador Red", "Dark Toreador Red", "334D", null, "\u2014", "em_dash"],
];

const suburbanFive = [
  ["Victory Red", "Victory Red", "9260", "5T4", "5T4", "printed"],
  ["Woodland Green", "Woodland Green", "9015", "9V5", "9V5", "printed"],
  ["Wheatland Yellow", "Wheatland Yellow", "253A", "9W3", "9W3", "printed"],
  ["MSP Blue", "MSP Blue", "5665", null, "NONE", "literal_none"],
  ["Dark Toreador Red", "Dark Toreador Red", "334D", null, "NONE", "literal_none"],
];

const impalaThirty = [
  ["Adriatic Blue", "Adriatic Blue", "121A", "BEA", "BFE"],
  ["Olive", "Olive", "311B", "BEB", "BFF"],
  ["Blue", "Blue", "5120", "BEQ", "BFU"],
  ["Neutral", "Neutral", "5236", "BEC", "BFG"],
  ["Driftwood", "Driftwood", "5322", "BER", "BFV"],
  ["Blue", "Blue", "5665", "BED", "BFH"],
  ["Gold", "Gold", "5749", "BES", "BFW"],
  ["Beige", "Beige", "5845", "BEE", "BFI"],
  ["Blue", "Blue", "7153", "BET", "BFX"],
  ["Blue", "Blue", "7159", "BEF", "BFJ"],
  ["Brown", "Brown", "7262", "BEU", "BFY"],
  ["Brown", "Brown", "7801", "BEG", "BFK"],
  ["Silver", "Silver", "7840", "BEV", "BFZ"],
  ["Blue", "Blue", "7868", "BEH", "BFL"],
  ["Blue", "Blue", "7888", "BEW", "BGA"],
  ["Blue", "Blue", "7889", "BEP", "BFT"],
  ["Green", "Green", "7964", "BEI", "BFM"],
  ["Blue", "Blue", "7999", "BEX", "BGB"],
  ["Blue", "Blue", "8380", "BEJ", "BFN"],
  ["Gray", "Gray", "8381", "BEY", "BGC"],
  ["Yellow", "Yellow", "8401", "BEK", "BFO"],
  ["Green", "Green", "8412", "BEZ", "BGD"],
  ["Rose Metallic", "Rose Metallic", "8431", "BEL", "BFP"],
  ["White", "White", "8554", "BFA", "BGE"],
  ["Black", "Black (41U)", "8555", "BEM", "BFQ"],
  ["Summit White", "Summit White (50U)", "8624", "BG8", "BGK"],
  ["Blue Black", "Blue Black", "8743", "BFB", "BGF"],
  ["Silver", "Silver", "9021", "BEN", "BFR"],
  ["Blue", "Blue", "9382", "BFC", "BGG"],
  ["Tan", "Tan", "9403", "BEO", "BFS"],
];

export const PROGRAM_SPECS = [
  {
    year: 2015,
    model_id: "tahoe",
    source_id: "gm-2015-tahoe-5w4",
    program_id: "gm-2015-tahoe-5w4-seo-paint",
    program_label: "Tahoe 4x4 Special Service 5W4 SEO paint",
    program_code: "5W4",
    source_model_scope: "2015 Tahoe 4x4 Special Service 5W4",
    section: "SEO Paint Available",
    palette: tahoeSeven,
    application_type: "special_equipment_option_paint",
    availability_state: "available",
    minimum_batch_units: null,
  },
  {
    year: 2016,
    model_id: "tahoe",
    source_id: "gm-2016-tahoe-9c1",
    program_id: "gm-2016-tahoe-9c1-seo-paint",
    program_label: "Tahoe 2WD Police Package 9C1 SEO paint",
    program_code: "9C1",
    source_model_scope: "2016 Tahoe 2WD Police Package 9C1",
    section: "SEO Paint Available",
    palette: tahoeSeven,
    application_type: "special_equipment_option_paint",
    availability_state: "available",
    minimum_batch_units: null,
  },
  {
    year: 2016,
    model_id: "tahoe",
    source_id: "gm-2016-tahoe-5w4",
    program_id: "gm-2016-tahoe-5w4-seo-paint",
    program_label: "Tahoe 4x4 Special Service 5W4 SEO paint",
    program_code: "5W4",
    source_model_scope: "2016 Tahoe 4x4 Special Service 5W4",
    section: "SEO Paint Available",
    palette: tahoeSeven,
    application_type: "special_equipment_option_paint",
    availability_state: "available",
    minimum_batch_units: null,
  },
  {
    year: 2017,
    model_id: "tahoe",
    source_id: "gm-2017-tahoe-9c1-4wd",
    program_id: "gm-2017-tahoe-9c1-seo-paint",
    program_label: "Tahoe 4WD Police Package 9C1 SEO paint",
    program_code: "9C1",
    source_model_scope: "2017 Tahoe 4WD Police Package 9C1",
    section: "SEO Paint Available",
    palette: tahoeSix,
    application_type: "special_equipment_option_paint",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
  },
  {
    year: 2018,
    model_id: "tahoe",
    source_id: "gm-2018-tahoe-9c1-4wd",
    program_id: "gm-2018-tahoe-9c1-seo-paint",
    program_label: "Tahoe 4WD Police Package 9C1 Pursuit SEO paint",
    program_code: "9C1",
    source_model_scope: "2018 Tahoe 4WD Police Package 9C1 Pursuit",
    section: "SEO Paint Available",
    palette: tahoeFive,
    application_type: "special_equipment_option_paint",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
  },
  {
    year: 2019,
    model_id: "tahoe",
    source_id: "gm-2019-tahoe-5w4",
    program_id: "gm-2019-tahoe-5w4-seo-paint",
    program_label: "Tahoe 4x4 Special Service 5W4 SEO paint",
    program_code: "5W4",
    source_model_scope: "2019 Tahoe 4x4 Special Service 5W4",
    section: "SEO Paint Available",
    palette: tahoeFive,
    application_type: "special_equipment_option_paint",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
  },
  {
    year: 2020,
    model_id: "tahoe",
    source_id: "gm-2020-tahoe-5w4",
    program_id: "gm-2020-tahoe-5w4-seo-paint",
    program_label: "Tahoe 4x4 Special Service 5W4 SEO paint",
    program_code: "5W4",
    source_model_scope: "2020 Tahoe 4x4 Special Service 5W4",
    section: "SEO Paint Available",
    palette: tahoeFive,
    application_type: "special_equipment_option_paint",
    availability_state: "available_with_minimum_batch",
    minimum_batch_units: 5,
  },
  {
    year: 2015,
    model_id: "impala-limited",
    source_id: "gm-2015-impala-limited-9c1-9c3",
    program_id: "gm-2015-impala-limited-kerr-authorized-upfitter-paint",
    program_label: "Impala Limited 9C1 and 9C3 Kerr Industries authorized-upfitter special-paint program",
    program_code: "9C1/9C3",
    source_model_scope: "2015 Impala Limited 9C1 and 9C3",
    section: "SEO Paint Available; To Order Special Paint",
    palette: impalaThirty,
    application_type: "authorized_upfitter_post_build",
    availability_state: "available_through_authorized_upfitter",
    minimum_batch_units: null,
  },
  {
    year: 2016,
    model_id: "impala-limited",
    source_id: "gm-2016-impala-limited-9c1-9c3",
    program_id: "gm-2016-impala-limited-kerr-authorized-upfitter-paint",
    program_label: "Impala Limited 9C1 and 9C3 Kerr Industries authorized-upfitter special-paint program",
    program_code: "9C1/9C3",
    source_model_scope: "2016 Impala Limited 9C1 and 9C3",
    section: "SEO Paint Available; To Order Special Paint",
    palette: impalaThirty,
    application_type: "authorized_upfitter_post_build",
    availability_state: "available_through_authorized_upfitter",
    minimum_batch_units: null,
  },
  {
    year: 2019,
    model_id: "suburban",
    source_id: "gm-2019-suburban-1fl-3500hd",
    program_id: "gm-2019-suburban-1fl-3500hd-seo-paint",
    program_label: "Suburban 1FL and 3500HD SEO paint",
    program_code: "1FL",
    source_model_scope: "2019 Suburban 1FL and 3500HD",
    section: "SEO Paint Available",
    palette: suburbanFive,
    application_type: "special_equipment_option_paint",
    availability_state: "available",
    minimum_batch_units: null,
  },
  {
    year: 2020,
    model_id: "suburban",
    source_id: "gm-2020-suburban-1fl",
    program_id: "gm-2020-suburban-1fl-seo-paint",
    program_label: "Suburban 1FL SEO paint",
    program_code: "1FL",
    source_model_scope: "2020 Suburban 1FL",
    section: "SEO Paint Available",
    palette: suburbanFive,
    application_type: "special_equipment_option_paint",
    availability_state: "available",
    minimum_batch_units: null,
  },
];

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function citationFor(spec) {
  const retained = SOURCE_CONTRACTS[spec.source_id];
  const citation = {
    source_id: retained.source_id,
    title: retained.title,
    publisher: retained.publisher,
    source_type: retained.source_type,
    url: retained.url,
    section: spec.section,
    revision: String(spec.year) + " model year",
    retrieved_at: retained.retrieved_at,
    bytes: retained.bytes,
    sha256: retained.sha256,
    pdf_page_count: retained.pdf_page_count,
    archive_asset_name: retained.asset_name,
    archive_url: retained.archive_url,
  };
  if (retained.candidate_pages.length === 1) {
    citation.pdf_page = retained.candidate_pages[0];
    citation.printed_page = retained.printed_pages[0];
  } else {
    citation.pdf_pages = [...retained.candidate_pages];
    citation.printed_pages = [...retained.printed_pages];
  }
  return citation;
}

function finishFor(label) {
  return /metallic/i.test(label) ? "metallic" : "not printed";
}

function seoRecord(spec, row) {
  const [label, sourceLabelRaw, rawWa, seoCode, rawSeo, seoState] = row;
  const waCode = "WA-" + rawWa;
  const waPrintedWithPrefix = spec.model_id !== "suburban";
  const sourceWaRaw = waPrintedWithPrefix ? waCode : rawWa;
  const restrictions = [
    "This row is limited to " + spec.source_model_scope + ".",
    "The WA# cell prints " +
      sourceWaRaw +
      "; no adjacent model year or program is inferred.",
    "The source does not expressly state where the paint was applied, so no assembly-plant installation claim is made.",
  ];
  if (seoState === "em_dash") {
    restrictions.push(
      "The SEO-code cell prints an em dash; the archive preserves the literal cell and does not invent an SEO code.",
    );
  } else if (seoState === "literal_none") {
    restrictions.push(
      "The SEO-code cell literally prints NONE; the archive preserves that state and does not promote NONE to a code.",
    );
  } else {
    restrictions.push("The SEO-code cell prints " + seoCode + ".");
  }
  if (spec.minimum_batch_units === 5) {
    restrictions.push(
      "The cited table states that five orders are required before the order is sent for plant processing.",
    );
  }
  if (spec.model_id === "suburban") {
    restrictions.push(
      "Normally body-colored nonmetal parts were gloss black; door handles and mirrors were grained flat black.",
    );
    if (label === "Victory Red") {
      restrictions.push(
        "Victory Red required SEO 5T4 and was not available with Z71.",
      );
    }
  }
  return {
    record_id: spec.program_id + "-" + rawWa.toLowerCase() + "-" + slug(label),
    publication_status: "published_specialty_subset",
    model_year: spec.year,
    catalog_model_ids: [spec.model_id],
    source_model_scope: [spec.source_model_scope],
    program_id: spec.program_id,
    program_label: spec.program_label,
    program_code: spec.program_code,
    application_type: spec.application_type,
    availability_state: spec.availability_state,
    label,
    source_label_raw: sourceLabelRaw,
    finish: finishFor(label),
    paint_code: waCode,
    factory_paint_code: waCode,
    wa_code: waCode,
    source_wa_code_raw: sourceWaRaw,
    source_wa_code_cell_state: waPrintedWithPrefix
      ? "printed_with_prefix"
      : "printed_without_prefix",
    seo_code: seoCode,
    source_seo_code_raw: rawSeo,
    source_seo_code_cell_state: seoState,
    rpo_code: spec.program_code,
    code_display:
      waCode + (seoCode === null ? "" : " / SEO " + seoCode),
    touch_up_paint_number: null,
    minimum_batch_units: spec.minimum_batch_units,
    factory_installation_claim: null,
    installation_semantics:
      "Manufacturer specialty-paint listing; application site is not expressly stated.",
    restrictions,
    source: citationFor(spec),
  };
}

function impalaRecord(spec, row) {
  const [label, sourceLabelRaw, rawWa, code1, code2] = row;
  return {
    record_id:
      spec.program_id +
      "-" +
      rawWa.toLowerCase() +
      "-" +
      code1.toLowerCase() +
      "-" +
      code2.toLowerCase(),
    publication_status: "published_specialty_subset",
    model_year: spec.year,
    catalog_model_ids: [spec.model_id],
    source_model_scope: [spec.source_model_scope],
    program_id: spec.program_id,
    program_label: spec.program_label,
    program_code: spec.program_code,
    application_type: spec.application_type,
    availability_state: spec.availability_state,
    label,
    source_label_raw: sourceLabelRaw,
    finish: "authorized upfitter solid or two-tone application",
    paint_code: rawWa,
    paint_code_heading: "WA#",
    factory_paint_code: null,
    wa_code: "WA-" + rawWa,
    source_wa_code_raw: rawWa,
    source_wa_code_cell_state: "printed_without_prefix",
    seo_code: null,
    source_seo_code_raw: null,
    source_seo_code_cell_state: "column_absent",
    rpo_code: "9C1/9C3",
    code_display:
      "WA# " +
      rawWa +
      "; Code 1 " +
      code1 +
      "; Code 2 " +
      code2 +
      "; AAS solid or AAT two-tone",
    upfitter_order_codes: {
      code_1: code1,
      code_2: code2,
      solid_color_option: "AAS",
      two_tone_color_option: "AAT",
    },
    touch_up_paint_number: null,
    minimum_batch_units: null,
    factory_installation_claim: false,
    installation_semantics:
      "Kerr Industries authorized-upfitter application after vehicle production.",
    restrictions: [
      "This row is limited to " + spec.source_model_scope + ".",
      "Orders were sent to Kerr Industries after the cars were built and incurred an additional charge.",
      "RPO White 50U or RPO Black 41U had to be ordered; Black 41U was recommended before special paint was applied.",
      "Only Class A surfaces were painted unless the dealer separately arranged and paid Kerr to paint mirrors and handles.",
      "Special-paint warranty claims were directed to Kerr Industries.",
      "The source table heading is WA#, but the cell prints " + rawWa + " without a WA- prefix.",
      "The source has no SEO-code column; no SEO code is inferred.",
    ],
    source: citationFor(spec),
  };
}

export const LATER_FLEET_RECORDS = PROGRAM_SPECS.flatMap((spec) =>
  spec.palette.map((row) =>
    spec.application_type === "authorized_upfitter_post_build"
      ? impalaRecord(spec, row)
      : seoRecord(spec, row),
  ),
);

function groupedDefinition(programId, modelId, predicate, restrictions) {
  const specs = PROGRAM_SPECS.filter(predicate);
  return {
    program_id: programId,
    program_ids: specs.map((spec) => spec.program_id),
    model_year_scopes: specs.map((spec) => spec.source_model_scope),
    application_type: specs[0].application_type,
    catalog_model_ids: [modelId],
    factory_installation_claim:
      specs[0].application_type === "authorized_upfitter_post_build"
        ? false
        : null,
    restrictions,
  };
}

export const PROGRAM_DEFINITIONS = [
  groupedDefinition(
    "gm-tahoe-9c1-seo-paint-2016-2018",
    "tahoe",
    (spec) => spec.model_id === "tahoe" && spec.program_code === "9C1",
    [
      "Each exact 2016, 2017, and 2018 9C1 table is independent.",
      "The 2016 table prints no five-order minimum; the 2017 and 2018 tables do.",
      "No 2015, 2019, or 2020 9C1 availability is inferred.",
    ],
  ),
  groupedDefinition(
    "gm-tahoe-5w4-seo-paint-2015-2020-reviewed-years",
    "tahoe",
    (spec) => spec.model_id === "tahoe" && spec.program_code === "5W4",
    [
      "The reviewed 5W4 years are exactly 2015, 2016, 2019, and 2020.",
      "No 2017 or 2018 5W4 palette is inferred from an adjacent year.",
      "The 2015 and 2016 tables print no five-order minimum; the 2019 and 2020 tables do.",
    ],
  ),
  groupedDefinition(
    "gm-impala-limited-kerr-authorized-upfitter-paint-2015-2016",
    "impala-limited",
    (spec) => spec.model_id === "impala-limited",
    [
      "The 2015 and 2016 9C1/9C3 guides each print all 30 Kerr rows independently.",
      "Kerr applied the finish after the cars were built; no factory-installation claim is made.",
      "Code 1, Code 2, AAS solid-color, and AAT two-tone order semantics are preserved.",
    ],
  ),
  groupedDefinition(
    "gm-suburban-1fl-seo-paint-2019-2020",
    "suburban",
    (spec) => spec.model_id === "suburban",
    [
      "The 2019 source heading covers Suburban 1FL and 3500HD; the scope is not narrowed to 1FL alone.",
      "The 2020 source covers Suburban 1FL.",
      "Neither exact table prints a five-order minimum, and no adjacent year is inferred.",
    ],
  ),
];

function lifecycleSource() {
  const retained = SOURCE_CONTRACTS["gm-2018-tahoe-9c1-4wd"];
  return {
    source_id: retained.source_id,
    url: retained.url,
    archive_url: retained.archive_url,
    archive_asset_name: retained.asset_name,
    sha256: retained.sha256,
    bytes: retained.bytes,
    pdf_page_count: retained.pdf_page_count,
    pdf_page: 11,
    printed_page: 7,
  };
}

export const LIFECYCLE_ASSERTIONS = [
  {
    assertion_id: "gm-2018-tahoe-9c1-havana-brown-standard-palette-no-longer-orderable",
    model_year: 2018,
    catalog_model_ids: ["tahoe"],
    program_id: "gm-2018-tahoe-9c1-seo-paint",
    record_type: "nonpublication_guard",
    subject: "2018 Tahoe 9C1 Havana Brown Metallic standard-palette row",
    fact:
      "The standard exterior-color block marks Havana Brown Metallic as no longer available to order as of 11-20-17; it is not a row in the SEO Paint Available table.",
    publication_effect:
      "No Havana Brown Metallic specialty-availability row is published, and the standard-palette lifecycle note is not promoted into the SEO table.",
    source: lifecycleSource(),
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
    const matched = unresolvedForestPatterns.some((pattern) =>
      routedFields.some((value) => pattern.test(String(value ?? ""))),
    );
    if (matched) {
      throw new Error(
        "unresolved Forest Service Green identity entered availability: " +
          record.record_id,
      );
    }
  }
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

const exactProgramCounts = {
  "gm-2015-tahoe-5w4-seo-paint": 7,
  "gm-2016-tahoe-9c1-seo-paint": 7,
  "gm-2016-tahoe-5w4-seo-paint": 7,
  "gm-2017-tahoe-9c1-seo-paint": 6,
  "gm-2018-tahoe-9c1-seo-paint": 5,
  "gm-2019-tahoe-5w4-seo-paint": 5,
  "gm-2020-tahoe-5w4-seo-paint": 5,
  "gm-2015-impala-limited-kerr-authorized-upfitter-paint": 30,
  "gm-2016-impala-limited-kerr-authorized-upfitter-paint": 30,
  "gm-2019-suburban-1fl-3500hd-seo-paint": 5,
  "gm-2020-suburban-1fl-seo-paint": 5,
};

function equalCounts(actual, expected) {
  return JSON.stringify(
    Object.fromEntries(Object.entries(actual).sort()),
  ) === JSON.stringify(Object.fromEntries(Object.entries(expected).sort()));
}

export function validateTrancheContracts() {
  if (LATER_FLEET_RECORDS.length !== 112) {
    throw new Error(
      "later-fleet specialty record count must be 112, got " +
        LATER_FLEET_RECORDS.length,
    );
  }
  if (
    new Set(LATER_FLEET_RECORDS.map((record) => record.record_id)).size !== 112
  ) {
    throw new Error("later-fleet specialty record IDs must be unique");
  }
  if (!equalCounts(countBy(LATER_FLEET_RECORDS, "program_id"), exactProgramCounts)) {
    throw new Error("later-fleet exact program counts drifted");
  }
  if (
    !equalCounts(countBy(LATER_FLEET_RECORDS, "availability_state"), {
      available: 31,
      available_with_minimum_batch: 21,
      available_through_authorized_upfitter: 60,
    })
  ) {
    throw new Error("later-fleet availability-state counts drifted");
  }
  if (
    !equalCounts(countBy(LATER_FLEET_RECORDS, "application_type"), {
      special_equipment_option_paint: 52,
      authorized_upfitter_post_build: 60,
    })
  ) {
    throw new Error("later-fleet application-type counts drifted");
  }
  if (
    !equalCounts(countBy(LATER_FLEET_RECORDS, "source_seo_code_cell_state"), {
      printed: 37,
      em_dash: 11,
      literal_none: 4,
      column_absent: 60,
    })
  ) {
    throw new Error("later-fleet raw SEO-cell states drifted");
  }
  if (
    !equalCounts(countBy(LATER_FLEET_RECORDS, "source_wa_code_cell_state"), {
      printed_with_prefix: 42,
      printed_without_prefix: 70,
    })
  ) {
    throw new Error("later-fleet raw WA-cell states drifted");
  }
  if (
    LATER_FLEET_RECORDS.some((record) =>
      record.availability_state === "available_with_minimum_batch"
        ? record.minimum_batch_units !== 5
        : record.minimum_batch_units !== null,
    )
  ) {
    throw new Error("later-fleet minimum-batch semantics drifted");
  }
  if (
    !equalCounts(countBy(LATER_FLEET_RECORDS, "factory_installation_claim"), {
      null: 52,
      false: 60,
    })
  ) {
    throw new Error("later-fleet factory-installation tri-state drifted");
  }
  const woodland = LATER_FLEET_RECORDS.filter(
    (record) => record.label === "Woodland Green",
  );
  if (
    woodland.length !== 9 ||
    woodland.some(
      (record) => record.wa_code !== "WA-9015" || record.seo_code !== "9V5",
    )
  ) {
    throw new Error("Woodland Green must remain nine exact WA-9015 / 9V5 rows");
  }
  if (
    LATER_FLEET_RECORDS.filter(
      (record) =>
        record.catalog_model_ids.includes("tahoe") &&
        record.label === "Dark Blue Metallic",
    ).length !== 3 ||
    LATER_FLEET_RECORDS.filter(
      (record) =>
        record.catalog_model_ids.includes("tahoe") &&
        record.label === "Yellow",
    ).length !== 4
  ) {
    throw new Error("later-fleet year-specific Tahoe palette boundary drifted");
  }
  if (
    LATER_FLEET_RECORDS.some(
      (record) => record.label === "Havana Brown Metallic",
    )
  ) {
    throw new Error("Havana Brown standard-palette lifecycle row was promoted");
  }
  validateNoUnresolvedForestRouting(LATER_FLEET_RECORDS);
}

function manifestView(retained) {
  return {
    asset_name: retained.asset_name,
    archive_url: retained.archive_url,
    sha256: retained.sha256,
    bytes: retained.bytes,
    role: retained.role,
    source_id: retained.source_id,
    original_source_url: retained.url,
    pdf_page_count: retained.pdf_page_count,
  };
}

function upsertStable(items, incoming, keyName) {
  const result = structuredClone(items ?? []);
  const locations = new Map(
    result.map((item, index) => [item[keyName], index]),
  );
  for (const item of incoming) {
    const copy = structuredClone(item);
    const index = locations.get(copy[keyName]);
    if (index === undefined) {
      locations.set(copy[keyName], result.length);
      result.push(copy);
    } else {
      result[index] = copy;
    }
  }
  return result;
}

function checksumTextFor(entries) {
  return entries
    .filter((entry) => entry.asset_name !== checksumAssetName)
    .sort((left, right) => left.asset_name.localeCompare(right.asset_name))
    .map((entry) => entry.sha256 + "  " + entry.asset_name + "\n")
    .join("");
}

export function applyReleaseManifest(inputManifest) {
  const manifest = structuredClone(inputManifest);
  const checksumMatches = manifest.entries.filter(
    (entry) => entry.asset_name === checksumAssetName,
  );
  if (checksumMatches.length !== 1) {
    throw new Error(
      "Release manifest must contain exactly one " + checksumAssetName,
    );
  }
  const checksumEntry = checksumMatches[0];
  let entries = upsertStable(
    manifest.entries.filter((entry) => entry.asset_name !== checksumAssetName),
    Object.values(SOURCE_CONTRACTS).map(manifestView),
    "asset_name",
  ).sort((left, right) => left.asset_name.localeCompare(right.asset_name));
  const checksumText = checksumTextFor(entries);
  const checksumBytes = Buffer.from(checksumText, "utf8");
  entries.push({
    ...checksumEntry,
    sha256: createHash("sha256").update(checksumBytes).digest("hex"),
    bytes: checksumBytes.byteLength,
  });
  manifest.entries = entries;
  const scope = String(manifest.scope ?? "").trim();
  manifest.scope = scope.includes(manifestScopeSentence)
    ? scope
    : (scope + " " + manifestScopeSentence).trim();
  return manifest;
}

export function validateManifestContracts(manifest) {
  for (const retained of Object.values(SOURCE_CONTRACTS)) {
    const matches = manifest.entries.filter(
      (entry) => entry.source_id === retained.source_id,
    );
    if (matches.length !== 1) {
      throw new Error(
        "manifest must contain exactly one " +
          retained.source_id +
          " entry, got " +
          matches.length,
      );
    }
    for (const [key, value] of Object.entries(manifestView(retained))) {
      if (matches[0][key] !== value) {
        throw new Error(retained.source_id + " manifest mismatch for " + key);
      }
    }
  }
  const checksumMatches = manifest.entries.filter(
    (entry) => entry.asset_name === checksumAssetName,
  );
  if (checksumMatches.length !== 1) {
    throw new Error(
      "manifest must contain exactly one " + checksumAssetName + " entry",
    );
  }
  const checksumText = checksumTextFor(manifest.entries);
  const checksumBytes = Buffer.from(checksumText, "utf8");
  const expectedHash = createHash("sha256").update(checksumBytes).digest("hex");
  if (
    checksumMatches[0].bytes !== checksumBytes.byteLength ||
    checksumMatches[0].sha256 !== expectedHash
  ) {
    throw new Error("manifest checksum entry does not cover the exact asset list");
  }
}

function mergeSourceCandidate(existing, retained) {
  const exact = {
    url: retained.url,
    bytes: retained.bytes,
    sha256: retained.sha256,
    archive_asset_name: retained.asset_name,
    archive_url: retained.archive_url,
    pdf_page_count: retained.pdf_page_count,
  };
  for (const [key, value] of Object.entries(exact)) {
    if (
      existing &&
      existing[key] !== undefined &&
      existing[key] !== null &&
      existing[key] !== value
    ) {
      throw new Error(
        "conflicting retained source candidate " +
          retained.source_id +
          " field " +
          key,
      );
    }
  }
  return {
    ...(existing ?? {}),
    source_id: retained.source_id,
    year: retained.year,
    model: retained.published_model_scopes.join("; "),
    ...exact,
    candidate_pages: [
      ...new Set([
        ...(existing?.candidate_pages ?? []),
        ...retained.candidate_pages,
      ]),
    ].sort((left, right) => left - right),
    published_model_scopes: [
      ...new Set([
        ...(existing?.published_model_scopes ?? []),
        ...retained.published_model_scopes,
      ]),
    ].sort((left, right) => left.localeCompare(right)),
    status: "visually_verified_and_published",
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
    const identity = String(value.bytes) + "\u001f" + value.sha256;
    const prior = artifacts.get(value.url);
    if (prior && prior !== identity) {
      throw new Error("conflicting retained artifact metadata: " + value.url);
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
  const knownGroups = {
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
  ledger.integrity_audit.unique_retained_artifacts_reconciled =
    collectArtifactIdentities(ledger).size;
  ledger.integrity_audit.artifact_reference_groups = {
    ...(ledger.integrity_audit.artifact_reference_groups ?? {}),
    ...knownGroups,
  };
  ledger.integrity_audit.last_updater_rehash = {
    script: "scripts/update-2015-2020-specialty-fleet-tranche.mjs",
    source_ids: Object.values(SOURCE_CONTRACTS).map(
      (retained) => retained.source_id,
    ),
    file_count: Object.keys(SOURCE_CONTRACTS).length,
  };
}

const trancheProgramIds = new Set(
  LATER_FLEET_RECORDS.map((record) => record.program_id),
);
const definitionIds = new Set(
  PROGRAM_DEFINITIONS.map((definition) => definition.program_id),
);
const lifecycleIds = new Set(
  LIFECYCLE_ASSERTIONS.map((assertion) => assertion.assertion_id),
);

export function applyLaterFleetSpecialtyTranche(inputLedger) {
  validateTrancheContracts();
  const ledger = structuredClone(inputLedger);
  ledger.app_publication_records = [
    ...(ledger.app_publication_records ?? []).filter(
      (record) => !trancheProgramIds.has(record.program_id),
    ),
    ...structuredClone(LATER_FLEET_RECORDS),
  ];
  ledger.program_definitions = [
    ...(ledger.program_definitions ?? []).filter(
      (definition) => !definitionIds.has(definition.program_id),
    ),
    ...structuredClone(PROGRAM_DEFINITIONS),
  ];
  ledger.program_lifecycle_assertions = [
    ...(ledger.program_lifecycle_assertions ?? []).filter(
      (assertion) => !lifecycleIds.has(assertion.assertion_id),
    ),
    ...structuredClone(LIFECYCLE_ASSERTIONS),
  ];

  const existingCandidates = new Map(
    (ledger.historic_gm_upfitter_candidates ?? []).map((candidate) => [
      candidate.source_id,
      candidate,
    ]),
  );
  for (const retained of Object.values(SOURCE_CONTRACTS)) {
    existingCandidates.set(
      retained.source_id,
      mergeSourceCandidate(existingCandidates.get(retained.source_id), retained),
    );
  }
  ledger.historic_gm_upfitter_candidates = [
    ...existingCandidates.values(),
  ];

  const reviewedPages = Object.values(SOURCE_CONTRACTS).map((retained) => {
    const pageLabel =
      retained.candidate_pages.length === 1 ? "page " : "pages ";
    return (
      retained.source_id +
      " PDF " +
      pageLabel +
      retained.candidate_pages.join(" and ")
    );
  });
  ledger.integrity_audit = ledger.integrity_audit ?? {};
  ledger.integrity_audit.promoted_pdf_pages_visually_rechecked = [
    ...new Set([
      ...(ledger.integrity_audit.promoted_pdf_pages_visually_rechecked ?? []),
      ...reviewedPages,
    ]),
  ];
  const currentBoundary = String(
    ledger.integrity_audit.publication_boundary ?? "",
  ).replace(
    /The \d+ app_publication_records/,
    "The " + ledger.app_publication_records.length + " app_publication_records",
  );
  ledger.integrity_audit.publication_boundary = currentBoundary.includes(
    publicationBoundarySentence,
  )
    ? currentBoundary
    : (currentBoundary.trim() + " " + publicationBoundarySentence).trim();
  ledger.generated_at = generatedAt;
  updateArtifactAudit(ledger);
  validateNoUnresolvedForestRouting(ledger.app_publication_records);
  return ledger;
}

async function readPdfPageCount(path) {
  const candidates = [];
  if (process.env.PDFINFO_BIN) candidates.push(process.env.PDFINFO_BIN);
  candidates.push("pdfinfo");
  for (const executable of candidates) {
    try {
      const result = await execFileAsync(executable, [path], {
        encoding: "utf8",
        windowsHide: true,
      });
      const match = /^Pages:\s+(\d+)\s*$/m.exec(result.stdout);
      if (match) return Number(match[1]);
    } catch {
      // Fall through to the next local page-count reader.
    }
  }
  const pythonCode =
    "from pypdf import PdfReader; import sys; print(len(PdfReader(sys.argv[1]).pages))";
  for (const executable of ["python", "python3"]) {
    try {
      const result = await execFileAsync(executable, ["-c", pythonCode, path], {
        encoding: "utf8",
        windowsHide: true,
      });
      const pages = Number(result.stdout.trim());
      if (Number.isInteger(pages) && pages > 0) return pages;
    } catch {
      // Fall through to the next local page-count reader.
    }
  }
  throw new Error("could not determine PDF page count for " + path);
}

async function verifyFile(fileUrl, retained, label) {
  const path = fileURLToPath(fileUrl);
  const [bytes, metadata, pageCount] = await Promise.all([
    readFile(fileUrl),
    stat(fileUrl),
    readPdfPageCount(path),
  ]);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (
    metadata.size !== retained.bytes ||
    digest !== retained.sha256 ||
    pageCount !== retained.pdf_page_count
  ) {
    throw new Error(
      label +
        " mismatch for " +
        retained.source_id +
        ": bytes=" +
        metadata.size +
        ", sha256=" +
        digest +
        ", pages=" +
        pageCount,
    );
  }
}

export async function verifyLocalSources() {
  for (const retained of Object.values(SOURCE_CONTRACTS)) {
    const fileUrl = new URL(retained.local_path.replaceAll("\\", "/"), root);
    await verifyFile(fileUrl, retained, "retained source");
  }
}

function yearCovered(model, year) {
  return model.model_year_ranges.some(
    (range) => year >= range.start && year <= range.end,
  );
}

function verifyCatalog(catalog) {
  const models = new Map(catalog.models.map((model) => [model.id, model]));
  const expected = [
    ["tahoe", "Tahoe", 2015],
    ["tahoe", "Tahoe", 2020],
    ["impala-limited", "Impala Limited", 2015],
    ["impala-limited", "Impala Limited", 2016],
    ["suburban", "Suburban", 2019],
    ["suburban", "Suburban", 2020],
  ];
  for (const [id, name, year] of expected) {
    const model = models.get(id);
    if (!model || model.name !== name || !yearCovered(model, year)) {
      throw new Error("catalog mapping is missing or ambiguous: " + id + ":" + year);
    }
  }
}

export async function main() {
  validateTrancheContracts();
  const [ledger, manifest, catalog] = await Promise.all([
    readFile(ledgerUrl, "utf8").then(JSON.parse),
    readFile(manifestUrl, "utf8").then(JSON.parse),
    readFile(catalogUrl, "utf8").then(JSON.parse),
  ]);
  verifyCatalog(catalog);
  await verifyLocalSources();

  const updatedLedger = applyLaterFleetSpecialtyTranche(ledger);
  const updatedManifest = applyReleaseManifest(manifest);
  validateManifestContracts(updatedManifest);

  await mkdir(stagingDirectoryUrl, { recursive: true });
  for (const retained of Object.values(SOURCE_CONTRACTS)) {
    const sourceUrl = new URL(
      retained.local_path.replaceAll("\\", "/"),
      root,
    );
    const stagedUrl = new URL(retained.asset_name, stagingDirectoryUrl);
    await copyFile(sourceUrl, stagedUrl);
    await verifyFile(stagedUrl, retained, "staged Release asset");
  }
  const checksumText = checksumTextFor(updatedManifest.entries);
  const checksumUrl = new URL(checksumAssetName, stagingDirectoryUrl);
  await writeFile(checksumUrl, checksumText, "utf8");
  const checksumEntry = updatedManifest.entries.find(
    (entry) => entry.asset_name === checksumAssetName,
  );
  const checksumBytes = await readFile(checksumUrl);
  const checksumDigest = createHash("sha256").update(checksumBytes).digest("hex");
  if (
    checksumBytes.byteLength !== checksumEntry.bytes ||
    checksumDigest !== checksumEntry.sha256
  ) {
    throw new Error("staged Release checksum does not match manifest metadata");
  }

  await Promise.all([
    writeFile(ledgerUrl, JSON.stringify(updatedLedger, null, 2) + "\n", "utf8"),
    writeFile(
      manifestUrl,
      JSON.stringify(updatedManifest, null, 2) + "\n",
      "utf8",
    ),
  ]);

  console.log(
    JSON.stringify({
      later_fleet_specialty_record_count: LATER_FLEET_RECORDS.length,
      exact_program_count: trancheProgramIds.size,
      source_count: Object.keys(SOURCE_CONTRACTS).length,
      staged_release_assets: Object.keys(SOURCE_CONTRACTS).length,
      checksum_covered_assets: updatedManifest.entries.length - 1,
      source_ids: Object.keys(SOURCE_CONTRACTS),
    }),
  );
}

const isMain =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) await main();
