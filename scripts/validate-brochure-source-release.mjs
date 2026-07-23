import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  access,
  readFile,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RELEASE_TAG = "brochure-source-archive-v1";
const REPOSITORY = "ipadmom/chevrolet-color-archive";
const RELEASE_URL = `https://github.com/${REPOSITORY}/releases/tag/${RELEASE_TAG}`;
const RELEASE_DOWNLOAD_BASE =
  `https://github.com/${REPOSITORY}/releases/download/${RELEASE_TAG}/`;
const CURRENT_ORDER_GUIDE_RELEASE_TAG = "current-order-guide-source-archive-v1";
const CURRENT_ORDER_GUIDE_RELEASE_DOWNLOAD_BASE =
  `https://github.com/${REPOSITORY}/releases/download/` +
  `${CURRENT_ORDER_GUIDE_RELEASE_TAG}/`;
const EXPECTED_ASSET_COUNT = 140;
const EXPECTED_PDF_COUNT = 116;
const EXPECTED_PDF_BYTES = 1_408_805_873;
const EXPECTED_PDF_PAGE_COUNT = 8_635;
const EXPECTED_MODERN_SOURCE_COUNT = 23;
const EXPECTED_MODERN_FLEET_GUIDE_COUNT = 19;
const EXPECTED_MODERN_BROCHURE_COUNT = 4;
const EXPECTED_MODERN_TABLE_COUNT = 66;
const EXPECTED_MODERN_ASSERTION_COUNT = 493;
const PUBLISHED_ORDER_GUIDE_PALETTE_SOURCE_IDS = new Set([
  "gm-online-order-guide-pdf-22745",
  "gm-online-order-guide-pdf-22775",
  "gm-online-order-guide-pdf-22821",
  "gm-online-order-guide-pdf-22878",
  "gm-online-order-guide-pdf-23208",
]);
const EXPECTED_PUBLISHED_RECORD_COUNT = 535;
const EXPECTED_PUBLISHED_SPECIALTY_RECORD_COUNT = 531;
const EXPECTED_QUALIFIED_HISTORICAL_RECORD_COUNT = 4;
const EXPECTED_VERIFIED_NOT_PUBLISHED_SPECIALTY_RECORD_COUNT = 8;
const EARLY_SUBURBAN_AUDIT_RELATIVE_PATH =
  "data/audits/suburban-1969-1976.json";
const BROCHURE_PALETTE_AUDIT_RELATIVE_PATH =
  "data/audits/suburban-brochure-palettes-1982-1989-1993.json";
const MODERN_SUBURBAN_AUDIT_RELATIVE_PATH =
  "data/audits/suburban-2000-2007.json";
const TAHOE_1995_TO_2000_AUDIT_RELATIVE_PATH =
  "data/audits/tahoe-1995-2000.json";
const TAHOE_2001_TO_2007_AUDIT_RELATIVE_PATH =
  "data/audits/tahoe-2001-2007.json";
const SPECIALTY_COLOR_SOURCE_RELATIVE_PATH =
  "data/sources/specialty-color-source-candidates.json";
const MODERN_COLOR_SOURCE_RELATIVE_PATH =
  "data/sources/modern-chevrolet-color-source-candidates.json";
const CURRENT_ORDER_GUIDE_MANIFEST_RELATIVE_PATH =
  "data/sources/current-order-guide-source-release-manifest.json";
const DEFAULT_MANIFEST_RELATIVE_PATH =
  "data/sources/brochure-source-release-manifest.json";
const DEFAULT_STAGING_RELATIVE_PATH =
  `tmp/release-staging/${RELEASE_TAG}`;

const controllingAssets = new Map([
  ["1969-chevrolet-suburban-vehicle-information-kit-gm.pdf", "controlling_vehicle_information_kit"],
  ["1972-chevrolet-suburban-vehicle-information-kit-gm.pdf", "controlling_vehicle_information_kit"],
  ["1973-chevrolet-suburban-vehicle-information-kit-gm.pdf", "controlling_vehicle_information_kit"],
  ["1974-chevrolet-suburban-vehicle-information-kit-gm.pdf", "controlling_vehicle_information_kit"],
  ["1975-chevrolet-suburban-vehicle-information-kit-gm.pdf", "controlling_vehicle_information_kit"],
  ["1976-chevrolet-suburban-vehicle-information-kit-gm.pdf", "controlling_vehicle_information_kit"],
  ["1982-chevrolet-suburban-brochure-xr793.pdf", "controlling_brochure_scan"],
  ["1989-chevrolet-suburban-brochure-xr793.pdf", "controlling_brochure_scan"],
  [
    "1993-chevrolet-blazer-suburban-brochure-image-14.jpg",
    "controlling_brochure_page",
  ],
  [
    "2002-chevrolet-suburban-brochure-auto-brochures.pdf",
    "controlling_brochure_scan",
  ],
  [
    "2003-chevrolet-suburban-brochure-auto-brochures.pdf",
    "controlling_brochure_scan",
  ],
  [
    "2004-chevrolet-suburban-service-color-table.png",
    "controlling_service_table_mirror",
  ],
  ["2000-chevrolet-suburban-vehicle-information-kit-gm.pdf", "controlling_vehicle_information_kit"],
  ["2001-chevrolet-suburban-vehicle-information-kit-gm.pdf", "controlling_vehicle_information_kit"],
  ["2005-chevrolet-suburban-vehicle-information-kit-gm.pdf", "controlling_vehicle_information_kit"],
  ["2007-chevrolet-suburban-vehicle-information-kit-gm.pdf", "controlling_vehicle_information_kit"],
]);

const tahoeGoverningAssets = new Map([
  ...[1995, 1996, 1997, 1998, 1999].map((year) => [
    `${year}-chevrolet-tahoe-vehicle-information-kit-gm.pdf`,
    {
      sourceId: `gm-heritage-${year}-chevrolet-tahoe`,
      role: "controlling_vehicle_information_kit",
    },
  ]),
  [
    "2000-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
    {
      sourceId: "gm-heritage-2000-chevrolet-tahoe",
      role: "controlling_variant_vehicle_information_kit",
    },
  ],
  [
    "2000-chevrolet-tahoe-z71-brochure-colors.jpg",
    {
      sourceId: "chevrolet-sales-brochure-2000-tahoe-z71-colors-scan",
      role: "qualified_original_brochure_scan",
    },
  ],
  [
    "2001-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
    {
      sourceId: "gm-heritage-2001-chevrolet-tahoe",
      role: "controlling_vehicle_information_kit",
    },
  ],
  [
    "2002-chevrolet-tahoe-brochure-motorologist.pdf",
    {
      sourceId: "chevrolet-sales-brochure-2002-tahoe",
      role: "controlling_sales_brochure",
    },
  ],
  [
    "2003-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
    {
      sourceId: "gm-heritage-2003-chevrolet-tahoe",
      role: "controlling_vehicle_information_kit",
    },
  ],
  [
    "2004-chevrolet-tahoe-spec-sheet.pdf",
    {
      sourceId: "chevrolet-spec-sheet-us-2004-tahoe",
      role: "controlling_us_specification_sheet",
    },
  ],
  [
    "2005-chevrolet-tahoe-spec-sheet.pdf",
    {
      sourceId: "chevrolet-spec-sheet-us-2005-tahoe",
      role: "controlling_us_specification_sheet",
    },
  ],
  [
    "2006-chevrolet-tahoe-spec-sheet.pdf",
    {
      sourceId: "chevrolet-spec-sheet-us-2006-tahoe",
      role: "controlling_us_specification_sheet",
    },
  ],
  [
    "2007-chevrolet-tahoe-vehicle-information-kit-gm.pdf",
    {
      sourceId: "gm-heritage-2007-chevrolet-tahoe",
      role: "controlling_vehicle_information_kit",
    },
  ],
]);

const publishedColorResearchAssets = new Map([
  [
    "1981-chevrolet-g-van-vehicle-information-kit-gm.pdf",
    {
      sourceId: "gm-heritage-1981-chevrolet-g-van",
      role: "controlling_qualified_historical_vehicle_information_kit",
    },
  ],
  [
    "1981-chevrolet-motorhome-vehicle-information-kit-gm.pdf",
    {
      sourceId: "gm-heritage-1981-chevrolet-motorhome",
      role: "controlling_qualified_historical_vehicle_information_kit",
    },
  ],
  [
    "1983-chevrolet-truck-vehicle-information-kit-gm.pdf",
    {
      sourceId: "gm-1983-chevrolet-truck-color-trim",
      role: "controlling_specialty_vehicle_information_kit",
    },
  ],
  [
    "1980-chevrolet-truck-vehicle-information-kit-gm.pdf",
    {
      sourceId: "gm-1980-chevrolet-truck-color-trim",
      role: "controlling_specialty_vehicle_information_kit",
    },
  ],
  [
    "2005-new-jersey-tahoe-police-contract.pdf",
    {
      sourceId: "new-jersey-tahoe-police-contract-2005",
      role: "controlling_specialty_configuration_contract",
    },
  ],
  [
    "2006-new-jersey-tahoe-police-contract.pdf",
    {
      sourceId: "new-jersey-tahoe-police-contract-2006",
      role: "controlling_specialty_configuration_contract",
    },
  ],
  [
    "2011-chevrolet-municipal-vehicles-technical-manual-gm.pdf",
    {
      sourceId: "gm-2011-police-manual",
      role: "controlling_specialty_vehicle_manual",
    },
  ],
]);

const specialtyResearchAssets = new Map([
  [
    "1979-chevrolet-blazer-vehicle-information-kit-gm.pdf",
    {
      sourceId: "gm-heritage-1979-chevrolet-blazer",
      role: "controlling_specialty_vehicle_information_kit",
    },
  ],
  [
    "1993-chevrolet-s-10-vehicle-information-kit-gm.pdf",
    {
      sourceId: "gm-heritage-1993-chevrolet-s-10",
      role: "controlling_specialty_vehicle_information_kit",
    },
  ],
  [
    "1993-chevrolet-truck-vehicle-information-kit-gm.pdf",
    {
      sourceId: "gm-heritage-1993-chevrolet-truck",
      role: "controlling_specialty_vehicle_information_kit",
    },
  ],
  [
    "2012-chevrolet-municipal-vehicles-specifications-manual-gm.pdf",
    {
      sourceId: "gm-2012-municipal-manual",
      role: "controlling_specialty_vehicle_manual",
    },
  ],
  [
    "2013-chevrolet-municipal-vehicles-guide-gm.pdf",
    {
      sourceId: "gm-2013-municipal-guide",
      role: "controlling_specialty_vehicle_manual",
    },
  ],
  [
    "2014-chevrolet-police-vehicles-technical-guide-gm.pdf",
    {
      sourceId: "gm-2014-police-guide",
      role: "controlling_specialty_vehicle_manual",
    },
  ],
  [
    "2015-chevrolet-caprice-ppv-9c1-specification-guide-gm.pdf",
    {
      sourceId: "gm-2015-caprice-9c1-specification-guide",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2016-chevrolet-caprice-ppv-9c1-specification-guide-gm.pdf",
    {
      sourceId: "gm-2016-caprice-9c1-specification-guide",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2017-chevrolet-caprice-ppv-9c1-specification-guide-gm.pdf",
    {
      sourceId: "gm-2017-caprice-9c1-specification-guide",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2015-chevrolet-tahoe-5w4-specification-guide-gm.pdf",
    {
      sourceId: "gm-2015-tahoe-5w4",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2016-chevrolet-tahoe-9c1-2wd-specification-guide-gm.pdf",
    {
      sourceId: "gm-2016-tahoe-9c1",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2016-chevrolet-tahoe-5w4-specification-guide-gm.pdf",
    {
      sourceId: "gm-2016-tahoe-5w4",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2017-chevrolet-tahoe-9c1-4wd-specification-guide-gm.pdf",
    {
      sourceId: "gm-2017-tahoe-9c1-4wd",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2018-chevrolet-tahoe-9c1-4wd-specification-guide-gm.pdf",
    {
      sourceId: "gm-2018-tahoe-9c1-4wd",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2019-chevrolet-tahoe-5w4-specification-guide-gm.pdf",
    {
      sourceId: "gm-2019-tahoe-5w4",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2020-chevrolet-tahoe-5w4-specification-guide-gm.pdf",
    {
      sourceId: "gm-2020-tahoe-5w4",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2015-chevrolet-impala-limited-9c1-9c3-specification-guide-gm.pdf",
    {
      sourceId: "gm-2015-impala-limited-9c1-9c3",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2016-chevrolet-impala-limited-9c1-9c3-specification-guide-gm.pdf",
    {
      sourceId: "gm-2016-impala-limited-9c1-9c3",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2019-chevrolet-suburban-1fl-3500hd-specification-guide-gm.pdf",
    {
      sourceId: "gm-2019-suburban-1fl-3500hd",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2020-chevrolet-suburban-1fl-specification-guide-gm.pdf",
    {
      sourceId: "gm-2020-suburban-1fl",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2023-chevrolet-bolt-euv-ssv-specification-guide-gm.pdf",
    {
      sourceId: "gm-2023-bolt-euv-5w4",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2024-chevrolet-blazer-ev-9c1-specification-guide-gm.pdf",
    {
      sourceId: "gm-2024-blazer-ev-9c1-9c3",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2025-chevrolet-blazer-ev-9c1-specification-guide-gm.pdf",
    {
      sourceId: "gm-2025-blazer-ev-9c1-9c3-5w4",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2025-chevrolet-blazer-ev-police-order-guide-gm.pdf",
    {
      sourceId: "gm-order-guide-2025-blazer-ev-police-22887",
      role: "supporting_specialty_vehicle_order_guide_snapshot",
    },
  ],
  [
    "2026-chevrolet-blazer-ev-9c1-9c3-5w4-specification-guide-gm.pdf",
    {
      sourceId: "gm-2026-blazer-ev-9c1-9c3-5w4",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2026-chevrolet-blazer-ev-police-order-guide-gm.pdf",
    {
      sourceId: "gm-order-guide-2026-blazer-ev-police-23158",
      role: "supporting_specialty_vehicle_order_guide_snapshot",
    },
  ],
  [
    "2026-chevrolet-silverado-9c1-specification-guide-gm.pdf",
    {
      sourceId: "gm-2026-silverado-9c1-041426",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
  [
    "2026-chevrolet-silverado-5w4-ssv-specification-guide-gm.pdf",
    {
      sourceId: "gm-2026-silverado-5w4-041426",
      role: "controlling_specialty_vehicle_specification_guide",
    },
  ],
]);

const modernPaletteAssets = new Map([
  [
    "2008-gm-fleet-guide-v2-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2008-v2",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2009-gm-fleet-guide-v2-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2009-v2",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2010-gm-fleet-guide-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2010",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2011-gm-fleet-guide-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2011",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2012-gm-car-truck-guide-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2012",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2013-gm-car-truck-guide-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2013",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2014-gm-fleet-car-truck-guide-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2014",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2015-gm-fleet-car-truck-guide-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2015",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2016-gm-fleet-guide-november-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2016-november",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2017-gm-fleet-guide-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2017",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2018-gm-fleet-guide-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2018",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2019-gm-fleet-guide-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2019",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2020-gm-fleet-guide-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2020",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2021-gm-fleet-guide-v3-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2021-v3",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2022-gm-fleet-guide-v6-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2022-v6",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2023-gm-fleet-guide-v3-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2023-v3",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2024-gm-fleet-guide-v3-mirror.pdf",
    {
      sourceId: "gm-fleet-guide-us-2024-v3",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2025-gm-fleet-guide-r2024-12-11.pdf",
    {
      sourceId: "gm-fleet-guide-us-2025-r2024-12-11",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2026-gm-fleet-guide-r2026-04-01.pdf",
    {
      sourceId: "gm-fleet-guide-us-2026-r2026-04-01",
      role: "controlling_qualified_palette_fleet_guide",
    },
  ],
  [
    "2022-chevrolet-tahoe-ebrochure.pdf",
    {
      sourceId: "chevrolet-ebrochure-us-2022-tahoe",
      role: "controlling_qualified_palette_brochure",
    },
  ],
  [
    "2023-chevrolet-colorado-ebrochure.pdf",
    {
      sourceId: "chevrolet-ebrochure-us-2023-colorado",
      role: "controlling_qualified_palette_brochure",
    },
  ],
  [
    "2023-chevrolet-silverado-hd-commercial-ebrochure.pdf",
    {
      sourceId: "chevrolet-ebrochure-us-2023-silverado-hd-commercial",
      role: "controlling_qualified_palette_brochure",
    },
  ],
  [
    "2023-chevrolet-commercial-silverado-4500hd-5500hd-6500hd-ebrochure.pdf",
    {
      sourceId: "chevrolet-ebrochure-us-2023-silverado-4500-6500-hd",
      role: "controlling_qualified_palette_brochure",
    },
  ],
]);

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertUnique(values, label) {
  invariant(
    new Set(values).size === values.length,
    `${label} values must be unique`,
  );
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertManifestContract(manifest) {
  invariant(manifest.schema_version === 1, "manifest schema_version must be 1");
  invariant(manifest.visibility === "public", "manifest visibility must be public");
  invariant(
    manifest.classification === "archive-internal",
    "manifest classification must be archive-internal",
  );
  invariant(manifest.repository === REPOSITORY, `repository must be ${REPOSITORY}`);
  invariant(manifest.release_tag === RELEASE_TAG, `release_tag must be ${RELEASE_TAG}`);
  invariant(manifest.release_url === RELEASE_URL, `release_url must be ${RELEASE_URL}`);
  invariant(
    Array.isArray(manifest.entries),
    "manifest entries must be an array",
  );
  invariant(
    manifest.entries.length === EXPECTED_ASSET_COUNT,
    `manifest must contain exactly ${EXPECTED_ASSET_COUNT} assets`,
  );

  const assetNames = manifest.entries.map(({ asset_name: assetName }) => assetName);
  const archiveUrls = manifest.entries.map(({ archive_url: archiveUrl }) => archiveUrl);
  const sha256Digests = manifest.entries.map(({ sha256: digest }) => digest);
  const sourceIds = manifest.entries
    .map(({ source_id: sourceId }) => sourceId)
    .filter((sourceId) => sourceId !== undefined && sourceId !== null);
  assertUnique(assetNames, "asset_name");
  assertUnique(archiveUrls, "archive_url");
  assertUnique(sha256Digests, "sha256");
  assertUnique(sourceIds, "source_id");

  for (const entry of manifest.entries) {
    invariant(
      typeof entry.asset_name === "string" &&
        entry.asset_name.length > 0 &&
        path.basename(entry.asset_name) === entry.asset_name,
      "every asset_name must be a nonempty basename",
    );
    invariant(
      entry.archive_url === `${RELEASE_DOWNLOAD_BASE}${entry.asset_name}`,
      `archive_url does not match the pinned ipadmom Release asset: ${entry.asset_name}`,
    );
    invariant(
      /^[a-f0-9]{64}$/.test(entry.sha256),
      `invalid SHA-256 metadata: ${entry.asset_name}`,
    );
    invariant(
      Number.isSafeInteger(entry.bytes) && entry.bytes > 0,
      `invalid byte-size metadata: ${entry.asset_name}`,
    );
    invariant(
      typeof entry.role === "string" && entry.role.length > 0,
      `missing role: ${entry.asset_name}`,
    );
    if (path.extname(entry.asset_name).toLowerCase() === ".pdf") {
      invariant(
        Number.isSafeInteger(entry.pdf_page_count) && entry.pdf_page_count > 0,
        `invalid PDF page-count metadata: ${entry.asset_name}`,
      );
    }
    invariant(
      entry.original_source_url === null ||
        (typeof entry.original_source_url === "string" &&
          /^https?:\/\//.test(entry.original_source_url)),
      `invalid original_source_url: ${entry.asset_name}`,
    );
    for (const key of ["retrieval_url", "parent_source_url"]) {
      invariant(
        entry[key] === undefined ||
          (typeof entry[key] === "string" && /^https:\/\//.test(entry[key])),
        `invalid ${key}: ${entry.asset_name}`,
      );
    }
  }

  const entriesByName = new Map(
    manifest.entries.map((entry) => [entry.asset_name, entry]),
  );
  for (const [assetName, expectedRole] of controllingAssets) {
    const entry = entriesByName.get(assetName);
    invariant(entry, `missing controlling asset: ${assetName}`);
    invariant(
      entry.role === expectedRole,
      `${assetName} must have role ${expectedRole}`,
    );
  }
  for (const [assetName, { sourceId, role }] of tahoeGoverningAssets) {
    const entry = entriesByName.get(assetName);
    invariant(entry, `missing Tahoe governing asset: ${assetName}`);
    invariant(
      entry.source_id === sourceId,
      `${assetName} must have source_id ${sourceId}`,
    );
    invariant(
      entry.role === role,
      `${assetName} must have role ${role}`,
    );
  }
  for (const [assetName, { sourceId, role }] of publishedColorResearchAssets) {
    const entry = entriesByName.get(assetName);
    invariant(entry, `missing published color-research asset: ${assetName}`);
    invariant(
      entry.source_id === sourceId,
      `${assetName} must have source_id ${sourceId}`,
    );
    invariant(
      entry.role === role,
      `${assetName} must have role ${role}`,
    );
  }
  for (const [assetName, { sourceId, role }] of specialtyResearchAssets) {
    const entry = entriesByName.get(assetName);
    invariant(entry, `missing specialty research asset: ${assetName}`);
    invariant(
      entry.source_id === sourceId,
      `${assetName} must have source_id ${sourceId}`,
    );
    invariant(
      entry.role === role,
      `${assetName} must have role ${role}`,
    );
  }
  for (const [assetName, { sourceId, role }] of modernPaletteAssets) {
    const entry = entriesByName.get(assetName);
    invariant(entry, `missing modern palette asset: ${assetName}`);
    invariant(
      entry.source_id === sourceId,
      `${assetName} must have source_id ${sourceId}`,
    );
    invariant(
      entry.role === role,
      `${assetName} must have role ${role}`,
    );
  }

  const pdfEntries = manifest.entries.filter(
    ({ asset_name: assetName }) => path.extname(assetName).toLowerCase() === ".pdf",
  );
  invariant(
    pdfEntries.length === EXPECTED_PDF_COUNT,
    `manifest must contain exactly ${EXPECTED_PDF_COUNT} PDFs`,
  );
  invariant(
    pdfEntries.reduce((total, entry) => total + entry.bytes, 0) ===
      EXPECTED_PDF_BYTES,
    `manifest PDFs must total exactly ${EXPECTED_PDF_BYTES} bytes`,
  );
  invariant(
    pdfEntries.reduce((total, entry) => total + entry.pdf_page_count, 0) ===
      EXPECTED_PDF_PAGE_COUNT,
    `manifest PDFs must total exactly ${EXPECTED_PDF_PAGE_COUNT} pages`,
  );

  const expectedCarrierImageNames = Array.from(
    { length: 16 },
    (_, index) =>
      `1993-chevrolet-blazer-suburban-brochure-image-${String(index + 1).padStart(2, "0")}.jpg`,
  );
  const carrierImageNames = assetNames
    .filter((assetName) =>
      /^1993-chevrolet-blazer-suburban-brochure-image-\d{2}\.jpg$/.test(
        assetName,
      ),
    )
    .sort();
  invariant(
    JSON.stringify(carrierImageNames) === JSON.stringify(expectedCarrierImageNames),
    "manifest must preserve the complete 16-image 1993 carrier set",
  );

  return entriesByName;
}

function collectArchiveUrls(value, urls) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectArchiveUrls(item, urls);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (
      key === "archive_url" &&
      typeof item === "string" &&
      item.startsWith(RELEASE_DOWNLOAD_BASE)
    ) {
      urls.push(item);
    }
    collectArchiveUrls(item, urls);
  }
}

async function collectAppReleaseUrls(appRoot, repositoryRoot) {
  const urls = [];
  const importedJsonPaths = new Set();
  const pending = [appRoot];
  const sourceExtension = /\.(?:[cm]?[jt]sx?|json)$/;
  const releaseUrlPattern = new RegExp(
    `https://github\\.com/ipadmom/chevrolet-color-archive/releases/download/${RELEASE_TAG}/[^"'\\s)]+`,
    "g",
  );

  while (pending.length > 0) {
    const directory = pending.pop();
    const children = await readdir(directory, { withFileTypes: true });
    for (const child of children) {
      const childPath = path.join(directory, child.name);
      if (child.isDirectory()) {
        pending.push(childPath);
      } else if (sourceExtension.test(child.name)) {
        const source = await readFile(childPath, "utf8");
        urls.push(...(source.match(releaseUrlPattern) ?? []));
        const jsonImportPattern = /from\s+["']([^"']+\.json)["']/g;
        for (const match of source.matchAll(jsonImportPattern)) {
          const importedPath = path.resolve(path.dirname(childPath), match[1]);
          const relativePath = path.relative(repositoryRoot, importedPath);
          invariant(
            relativePath &&
              !relativePath.startsWith("..") &&
              !path.isAbsolute(relativePath),
            `app JSON import escapes the repository: ${match[1]}`,
          );
          importedJsonPaths.add(importedPath);
        }
      }
    }
  }

  for (const importedJsonPath of importedJsonPaths) {
    const jsonText = await readFile(importedJsonPath, "utf8");
    if (jsonText.includes(RELEASE_TAG)) {
      collectArchiveUrls(JSON.parse(jsonText), urls);
    }
  }

  return urls;
}

async function validateAppCitationClosure(repositoryRoot, manifestEntriesByName) {
  const archiveDataPath = path.join(repositoryRoot, "app", "archive-data.ts");
  const earlyAuditPath = path.join(
    repositoryRoot,
    EARLY_SUBURBAN_AUDIT_RELATIVE_PATH,
  );
  const brochureAuditPath = path.join(
    repositoryRoot,
    BROCHURE_PALETTE_AUDIT_RELATIVE_PATH,
  );
  const modernAuditPath = path.join(
    repositoryRoot,
    MODERN_SUBURBAN_AUDIT_RELATIVE_PATH,
  );
  const tahoe1995To2000AuditPath = path.join(
    repositoryRoot,
    TAHOE_1995_TO_2000_AUDIT_RELATIVE_PATH,
  );
  const tahoe2001To2007AuditPath = path.join(
    repositoryRoot,
    TAHOE_2001_TO_2007_AUDIT_RELATIVE_PATH,
  );
  const specialtyColorSourcePath = path.join(
    repositoryRoot,
    SPECIALTY_COLOR_SOURCE_RELATIVE_PATH,
  );
  const modernColorSourcePath = path.join(
    repositoryRoot,
    MODERN_COLOR_SOURCE_RELATIVE_PATH,
  );
  const currentOrderGuideManifestPath = path.join(
    repositoryRoot,
    CURRENT_ORDER_GUIDE_MANIFEST_RELATIVE_PATH,
  );
  const [
    archiveDataSource,
    earlyAuditText,
    brochureAuditText,
    modernAuditText,
    tahoe1995To2000AuditText,
    tahoe2001To2007AuditText,
    specialtyColorSourceText,
    modernColorSourceText,
    currentOrderGuideManifestText,
    importedAppUrls,
  ] =
    await Promise.all([
      readFile(archiveDataPath, "utf8"),
      readFile(earlyAuditPath, "utf8"),
      readFile(brochureAuditPath, "utf8"),
      readFile(modernAuditPath, "utf8"),
      readFile(tahoe1995To2000AuditPath, "utf8"),
      readFile(tahoe2001To2007AuditPath, "utf8"),
      readFile(specialtyColorSourcePath, "utf8"),
      readFile(modernColorSourcePath, "utf8"),
      readFile(currentOrderGuideManifestPath, "utf8"),
      collectAppReleaseUrls(path.join(repositoryRoot, "app"), repositoryRoot),
    ]);

  invariant(
    archiveDataSource.includes(
      'import suburbanBrochurePaletteAudit from "../data/audits/suburban-brochure-palettes-1982-1989-1993.json";',
    ),
    "app/archive-data.ts must import the audited brochure palette data",
  );
  invariant(
    archiveDataSource.includes(
      'import suburban2000to2007Audit from "../data/audits/suburban-2000-2007.json";',
    ),
    "app/archive-data.ts must import the audited 2000-2007 Suburban data",
  );
  invariant(
    archiveDataSource.includes(
      'import tahoe1995to2000Audit from "../data/audits/tahoe-1995-2000.json";',
    ),
    "app/archive-data.ts must import the audited 1995-2000 Tahoe data",
  );
  invariant(
    archiveDataSource.includes(
      'import tahoe2001to2007Audit from "../data/audits/tahoe-2001-2007.json";',
    ),
    "app/archive-data.ts must import the audited 2001-2007 Tahoe data",
  );
  invariant(
    archiveDataSource.includes(
      'import modernColorSourceData from "../data/sources/modern-chevrolet-color-source-candidates.json";',
    ),
    "app/archive-data.ts must import the audited modern Chevrolet palette data",
  );
  invariant(
    archiveDataSource.includes(
      'import specialtyColorSourceData from "../data/sources/specialty-color-source-candidates.json";',
    ),
    "app/archive-data.ts must import the published specialty-paint data",
  );
  invariant(
    /url:\s*record\.source\.archive_url/.test(archiveDataSource),
    "app/archive-data.ts must expose the retained archive_url as the source citation",
  );
  invariant(
    /archiveUrl:\s*source\.archive_url/.test(archiveDataSource),
    "app/archive-data.ts must expose retained Tahoe archive_url values",
  );
  invariant(
    /archiveUrl:\s*record\.source\.archive_url/.test(archiveDataSource),
    "app/archive-data.ts must expose retained specialty-paint archive_url values",
  );

  const audit = JSON.parse(brochureAuditText);
  invariant(Array.isArray(audit.years), "brochure palette audit years must be an array");
  invariant(
    JSON.stringify(audit.years.map(({ year }) => year)) ===
      JSON.stringify([1982, 1989, 1993]),
    "app-fed brochure palette audit must contain exactly 1982, 1989, and 1993",
  );

  const earlyAudit = JSON.parse(earlyAuditText);
  invariant(
    JSON.stringify(earlyAudit.explicit_no_chart_years.map(({ year }) => year)) ===
      JSON.stringify([1963, 1970, 1971]),
    "early Suburban audit must retain exactly the three reviewed-no-chart years",
  );
  const earlyAppFedCitations = [
    ...earlyAudit.explicit_no_chart_years,
    ...earlyAudit.supplemental_sources.filter(({ archive_url: archiveUrl }) =>
      Boolean(archiveUrl),
    ),
  ].map((source) => ({ year: source.year, source }));

  const modernAudit = JSON.parse(modernAuditText);
  const modernAppFedCitations = modernAudit.years
    .filter(({ year }) => [2002, 2003, 2004].includes(year))
    .map(({ year, source, regular_colors: regularColors }) => {
      invariant(source, `${year} modern Suburban citation has no source`);
      invariant(
        regularColors.length === 8,
        `${year} modern Suburban citation must govern exactly eight colors`,
      );
      invariant(
        source.archive_url === source.url,
        `${year} app citation must use the retained Release asset as its primary URL`,
      );
      return { year, source };
    });
  invariant(
    modernAppFedCitations.length === 3,
    "modern app-fed citations must contain exactly 2002, 2003, and 2004",
  );
  const suburbanAppFedCitations = [
    ...earlyAppFedCitations,
    ...audit.years.map(({ year, source }) => ({ year, source })),
    ...modernAppFedCitations,
  ];

  const tahoe1995To2000Audit = JSON.parse(tahoe1995To2000AuditText);
  const tahoe2001To2007Audit = JSON.parse(tahoe2001To2007AuditText);
  invariant(
    Array.isArray(tahoe1995To2000Audit.years),
    "1995-2000 Tahoe audit years must be an array",
  );
  invariant(
    Array.isArray(tahoe2001To2007Audit.years),
    "2001-2007 Tahoe audit years must be an array",
  );

  const tahoeLegacyYears = tahoe1995To2000Audit.years.filter(
    ({ year }) => year >= 1995 && year <= 1999,
  );
  invariant(
    JSON.stringify(tahoeLegacyYears.map(({ year }) => year)) ===
      JSON.stringify([1995, 1996, 1997, 1998, 1999]),
    "Tahoe app-fed Release audit must contain exactly 1995 through 1999",
  );
  const tahoeLegacyCitations = tahoeLegacyYears.map(
    ({ year, coverage_status: coverageStatus, publication, exterior_colors: exteriorColors }) => {
      invariant(
        coverageStatus === "verified_complete",
        `Tahoe ${year} must remain verified complete`,
      );
      invariant(publication, `Tahoe ${year} has no governing publication`);
      invariant(
        Array.isArray(exteriorColors) && exteriorColors.length > 0,
        `Tahoe ${year} must govern at least one app color row`,
      );
      return { year, context: `Tahoe ${year}`, source: publication };
    },
  );

  const tahoe2000 = tahoe1995To2000Audit.years.find(({ year }) => year === 2000);
  invariant(tahoe2000, "Tahoe audit must contain model year 2000");
  invariant(
    tahoe2000.coverage_status === "verified_program_specific",
    "Tahoe 2000 must remain a verified program-specific audit",
  );
  invariant(
    tahoe2000.publication,
    "Tahoe 2000 must retain its governing publication",
  );
  invariant(
    Array.isArray(tahoe2000.program_palettes),
    "Tahoe 2000 program_palettes must be an array",
  );
  const expectedTahoe2000ProgramIds = [
    "gmt800-base-ls",
    "gmt800-lt",
    "gmt400-limited",
    "gmt400-z71",
  ];
  invariant(
    JSON.stringify(tahoe2000.program_palettes.map(({ program_id: id }) => id)) ===
      JSON.stringify(expectedTahoe2000ProgramIds),
    "Tahoe 2000 app data must retain all four audited program palettes",
  );
  const tahoeProgramCitations = tahoe2000.program_palettes.map((program) => {
    const source = program.source ?? tahoe2000.publication;
    invariant(
      source,
      `Tahoe 2000 ${program.program_id} has no governing source`,
    );
    invariant(
      Array.isArray(program.colors) && program.colors.length > 0,
      `Tahoe 2000 ${program.program_id} must govern at least one app color row`,
    );
    return {
      year: 2000,
      context: `Tahoe 2000 ${program.program_id}`,
      source,
    };
  });

  const tahoeRegularYears = tahoe2001To2007Audit.years.filter(
    ({ year }) => year >= 2001 && year <= 2007,
  );
  invariant(
    JSON.stringify(tahoeRegularYears.map(({ year }) => year)) ===
      JSON.stringify([2001, 2002, 2003, 2004, 2005, 2006, 2007]),
    "Tahoe app-fed Release audit must contain exactly 2001 through 2007",
  );
  const tahoeRegularCitations = tahoeRegularYears.map(
    ({ year, status, source, exterior_colors: exteriorColors }) => {
      invariant(status === "verified", `Tahoe ${year} must remain verified`);
      invariant(source, `Tahoe ${year} has no governing source`);
      invariant(
        Array.isArray(exteriorColors) && exteriorColors.length > 0,
        `Tahoe ${year} must govern at least one app color row`,
      );
      return { year, context: `Tahoe ${year}`, source };
    },
  );
  const tahoeAppFedCitations = [
    ...tahoeLegacyCitations,
    ...tahoeProgramCitations,
    ...tahoeRegularCitations,
  ];
  invariant(
    tahoeAppFedCitations.length === 16,
    "Tahoe app-fed citations must contain five 1995-1999 years, four 2000 programs, and seven 2001-2007 years",
  );
  const expectedTahoeGoverningSourceIds = [...tahoeGoverningAssets.values()]
    .map(({ sourceId }) => sourceId)
    .sort();
  const actualTahoeGoverningSourceIds = [
    ...new Set(tahoeAppFedCitations.map(({ source }) => source.source_id)),
  ].sort();
  invariant(
    JSON.stringify(actualTahoeGoverningSourceIds) ===
      JSON.stringify(expectedTahoeGoverningSourceIds),
    "Tahoe 1995-2007 app rows must resolve to all 14 retained governing assets",
  );

  const appFedCitations = [
    ...suburbanAppFedCitations,
    ...tahoeAppFedCitations,
  ];
  const allAppReleaseUrls = new Set([
    ...importedAppUrls,
    ...appFedCitations.map(({ source }) => source.archive_url),
  ]);
  const manifestEntriesByUrl = new Map(
    [...manifestEntriesByName.values()].map((entry) => [entry.archive_url, entry]),
  );
  const currentOrderGuideManifest = JSON.parse(currentOrderGuideManifestText);
  invariant(
    currentOrderGuideManifest.release_tag === CURRENT_ORDER_GUIDE_RELEASE_TAG,
    "current Order Guide source manifest has the wrong release tag",
  );
  invariant(
    Array.isArray(currentOrderGuideManifest.entries) &&
      currentOrderGuideManifest.entries.length ===
        currentOrderGuideManifest.entry_count,
    "current Order Guide source manifest entry count is stale",
  );
  const currentOrderGuideEntriesByUrl = new Map(
    currentOrderGuideManifest.entries.map((entry) => [
      entry.archive_url,
      entry,
    ]),
  );
  const allReleaseEntriesByUrl = new Map([
    ...manifestEntriesByUrl,
    ...currentOrderGuideEntriesByUrl,
  ]);

  const modernColorSource = JSON.parse(modernColorSourceText);
  invariant(
    Array.isArray(modernColorSource.sources),
    "modern Chevrolet source ledger sources must be an array",
  );
  invariant(
    Array.isArray(modernColorSource.verified_palette_tables),
    "modern Chevrolet verified_palette_tables must be an array",
  );
  const retainedModernSources = modernColorSource.sources.filter(
    ({ local_file_path: localFilePath }) => Boolean(localFilePath),
  );
  invariant(
    retainedModernSources.length === EXPECTED_MODERN_SOURCE_COUNT,
    `modern source ledger must retain exactly ${EXPECTED_MODERN_SOURCE_COUNT} PDFs`,
  );
  assertUnique(
    retainedModernSources.map(({ source_id: sourceId }) => sourceId),
    "modern retained source_id",
  );
  invariant(
    retainedModernSources.filter(
      ({ source_type: sourceType }) => sourceType === "fleet_guide_pdf",
    ).length === EXPECTED_MODERN_FLEET_GUIDE_COUNT,
    `modern source ledger must retain exactly ${EXPECTED_MODERN_FLEET_GUIDE_COUNT} Fleet Guides`,
  );
  invariant(
    retainedModernSources.filter(({ source_type: sourceType }) =>
      ["consumer_brochure_pdf", "commercial_brochure_pdf"].includes(sourceType),
    ).length === EXPECTED_MODERN_BROCHURE_COUNT,
    `modern source ledger must retain exactly ${EXPECTED_MODERN_BROCHURE_COUNT} eBrochures`,
  );

  const expectedModernBySourceId = new Map(
    [...modernPaletteAssets].map(([assetName, metadata]) => [
      metadata.sourceId,
      { assetName, role: metadata.role },
    ]),
  );
  const actualModernSourceIds = retainedModernSources
    .map(({ source_id: sourceId }) => sourceId)
    .sort();
  const expectedModernSourceIds = [...expectedModernBySourceId.keys()].sort();
  invariant(
    JSON.stringify(actualModernSourceIds) ===
      JSON.stringify(expectedModernSourceIds),
    "modern retained-source set must match the exact 23 audited PDFs",
  );

  const modernSourcesById = new Map();
  for (const source of retainedModernSources) {
    const expected = expectedModernBySourceId.get(source.source_id);
    invariant(expected, `unexpected modern retained source: ${source.source_id}`);
    const expectedArchiveUrl = `${RELEASE_DOWNLOAD_BASE}${expected.assetName}`;
    invariant(
      source.archive_asset_name === expected.assetName &&
        source.archive_url === expectedArchiveUrl,
      `${source.source_id} is not pinned to its named retained Release asset`,
    );
    const entry = manifestEntriesByName.get(expected.assetName);
    invariant(entry, `missing modern manifest entry: ${expected.assetName}`);
    invariant(
      entry.archive_url === expectedArchiveUrl && entry.role === expected.role,
      `${source.source_id} Release role or URL does not match the manifest`,
    );
    invariant(
      source.source_id === entry.source_id,
      `${source.source_id} source_id does not match the Release manifest`,
    );
    invariant(
      source.sha256 === entry.sha256,
      `${source.source_id} SHA-256 does not match the Release manifest`,
    );
    invariant(
      source.bytes === entry.bytes,
      `${source.source_id} byte size does not match the Release manifest`,
    );
    invariant(
      source.page_count === entry.pdf_page_count &&
        source.pdf_page_count === entry.pdf_page_count,
      `${source.source_id} page count does not match the Release manifest`,
    );
    modernSourcesById.set(source.source_id, source);
    allAppReleaseUrls.add(source.archive_url);
  }

  const currentOrderGuideEntriesBySourceId = new Map(
    currentOrderGuideManifest.entries.map((entry) => [entry.source_id, entry]),
  );
  const retainedOrderGuidePaletteSources = modernColorSource.sources.filter(
    ({ source_id: sourceId }) =>
      PUBLISHED_ORDER_GUIDE_PALETTE_SOURCE_IDS.has(sourceId),
  );
  invariant(
    retainedOrderGuidePaletteSources.length ===
      PUBLISHED_ORDER_GUIDE_PALETTE_SOURCE_IDS.size,
    "modern source ledger must retain all five published Order Guide palettes",
  );
  for (const source of retainedOrderGuidePaletteSources) {
    const entry = currentOrderGuideEntriesBySourceId.get(source.source_id);
    invariant(
      entry,
      `missing current Order Guide manifest entry: ${source.source_id}`,
    );
    invariant(
      source.archive_asset_name === entry.asset_name &&
        source.archive_url === entry.archive_url &&
        source.sha256 === entry.sha256 &&
        source.bytes === entry.bytes &&
        source.page_count === entry.pdf_page_count,
      `${source.source_id} does not match its retained Order Guide artifact`,
    );
    invariant(
      entry.artifact_status === "retained_exact_snapshot" &&
        entry.review_status === "cited_pages_visually_reviewed",
      `${source.source_id} is not retained and visually reviewed`,
    );
    modernSourcesById.set(source.source_id, source);
    allAppReleaseUrls.add(source.archive_url);
  }

  const modernPaletteTables = modernColorSource.verified_palette_tables;
  invariant(
    modernPaletteTables.length === EXPECTED_MODERN_TABLE_COUNT,
    `modern source ledger must contain exactly ${EXPECTED_MODERN_TABLE_COUNT} verified palette tables`,
  );
  assertUnique(
    modernPaletteTables.map(({ table_id: tableId }) => tableId),
    "modern table_id",
  );
  let modernPaletteAssertionCount = 0;
  const tableSourceIds = new Set();
  for (const table of modernPaletteTables) {
    invariant(
      table.ingestion_status === "ready_palette_union",
      `${table.table_id} must remain a ready_palette_union table`,
    );
    invariant(
      Array.isArray(table.catalog_model_ids) && table.catalog_model_ids.length > 0,
      `${table.table_id} must name at least one catalog model`,
    );
    invariant(
      Array.isArray(table.colors) && table.colors.length > 0,
      `${table.table_id} must contain at least one verified color`,
    );
    const source = modernSourcesById.get(table.source_id);
    invariant(source, `${table.table_id} uses an unretained source`);
    invariant(
      table.archive_asset_name === source.archive_asset_name &&
        table.archive_url === source.archive_url &&
        table.sha256 === source.sha256 &&
        table.bytes === source.bytes &&
        table.pdf_page_count === source.page_count,
      `${table.table_id} retained metadata does not match its source PDF`,
    );
    invariant(
      Array.isArray(table.pdf_pages) &&
        table.pdf_pages.every(
          (pageNumber) =>
            Number.isSafeInteger(pageNumber) &&
            pageNumber > 0 &&
            pageNumber <= source.page_count,
        ),
      `${table.table_id} contains an invalid PDF page locator`,
    );
    modernPaletteAssertionCount += table.colors.length;
    tableSourceIds.add(table.source_id);
    allAppReleaseUrls.add(table.archive_url);
  }
  invariant(
    modernPaletteAssertionCount === EXPECTED_MODERN_ASSERTION_COUNT,
    `modern tables must retain exactly ${EXPECTED_MODERN_ASSERTION_COUNT} color assertions`,
  );
  invariant(
    JSON.stringify([...tableSourceIds].sort()) ===
      JSON.stringify(
        [
          ...expectedModernSourceIds,
          ...PUBLISHED_ORDER_GUIDE_PALETTE_SOURCE_IDS,
        ].sort(),
      ),
    "modern palette tables must use all retained palette sources across both Releases",
  );

  const specialtyColorSource = JSON.parse(specialtyColorSourceText);
  const publishedRecords = specialtyColorSource.app_publication_records.filter(
    (record) =>
      record.publication_status === "published_specialty_subset" ||
      record.publication_status === "published_qualified_historical_subset",
  );
  const publishedSpecialtyRecords =
    specialtyColorSource.app_publication_records.filter(
      (record) => record.publication_status === "published_specialty_subset",
    );
  invariant(
    publishedRecords.length === EXPECTED_PUBLISHED_RECORD_COUNT,
    `source audit must retain exactly ${EXPECTED_PUBLISHED_RECORD_COUNT} published rows`,
  );
  invariant(
    publishedSpecialtyRecords.length === EXPECTED_PUBLISHED_SPECIALTY_RECORD_COUNT,
    `specialty source audit must retain exactly ${EXPECTED_PUBLISHED_SPECIALTY_RECORD_COUNT} published rows`,
  );
  const qualifiedHistoricalRecords =
    specialtyColorSource.app_publication_records.filter(
      (record) =>
        record.publication_status === "published_qualified_historical_subset",
    );
  invariant(
    qualifiedHistoricalRecords.length === EXPECTED_QUALIFIED_HISTORICAL_RECORD_COUNT,
    `source audit must retain exactly ${EXPECTED_QUALIFIED_HISTORICAL_RECORD_COUNT} qualified historical rows`,
  );
  assertUnique(
    publishedRecords.map(({ record_id: recordId }) => recordId),
    "published record_id",
  );
  const expectedPublishedSpecialtySourceIds = [
    "gm-heritage-1979-chevrolet-blazer",
    "gm-heritage-1981-chevrolet-g-van",
    "gm-heritage-1981-chevrolet-motorhome",
    "gm-1980-chevrolet-truck-color-trim",
    "gm-1983-chevrolet-truck-color-trim",
    "gm-heritage-1993-chevrolet-s-10",
    "gm-heritage-1993-chevrolet-truck",
    "gm-heritage-2003-chevrolet-tahoe",
    "new-jersey-tahoe-police-contract-2005",
    "new-jersey-tahoe-police-contract-2006",
    "gm-2011-police-manual",
    "gm-2012-municipal-manual",
    "gm-2013-municipal-guide",
    "gm-2014-police-guide",
    "gm-2015-caprice-9c1-specification-guide",
    "gm-2015-tahoe-5w4",
    "gm-2015-impala-limited-9c1-9c3",
    "gm-2016-caprice-9c1-specification-guide",
    "gm-2016-tahoe-9c1",
    "gm-2016-tahoe-5w4",
    "gm-2016-impala-limited-9c1-9c3",
    "gm-2017-caprice-9c1-specification-guide",
    "gm-2017-tahoe-9c1-4wd",
    "gm-2018-tahoe-9c1-4wd",
    "gm-2019-tahoe-5w4",
    "gm-2019-suburban-1fl-3500hd",
    "gm-2020-tahoe-5w4",
    "gm-2020-suburban-1fl",
    "gm-2023-bolt-euv-5w4",
    "gm-2026-blazer-ev-9c1-9c3-5w4",
    "gm-2026-silverado-9c1-041426",
    "gm-2026-silverado-5w4-041426",
    "gm-online-order-guide-pdf-22917",
    "gm-online-order-guide-pdf-23168",
  ].sort();
  const actualPublishedSpecialtySourceIds = [
    ...new Set(
      publishedRecords.map(({ source }) => source.source_id),
    ),
  ].sort();
  invariant(
    JSON.stringify(actualPublishedSpecialtySourceIds) ===
      JSON.stringify(expectedPublishedSpecialtySourceIds),
    "published rows must resolve to the 34 audited governing sources",
  );
  const verifiedNotPublishedSpecialtyRecords =
    specialtyColorSource.verified_not_published;
  invariant(
    Array.isArray(verifiedNotPublishedSpecialtyRecords) &&
    verifiedNotPublishedSpecialtyRecords.length ===
      EXPECTED_VERIFIED_NOT_PUBLISHED_SPECIALTY_RECORD_COUNT,
    `specialty source audit must retain exactly ${EXPECTED_VERIFIED_NOT_PUBLISHED_SPECIALTY_RECORD_COUNT} verified-not-published rows`,
  );
  assertUnique(
    verifiedNotPublishedSpecialtyRecords.map(({ record_id: recordId }) => recordId),
    "verified-not-published specialty record_id",
  );
  const expectedVerifiedNotPublishedSourceIds = [
    "gm-2024-blazer-ev-9c1-9c3",
    "gm-2025-blazer-ev-9c1-9c3-5w4",
  ].sort();
  const retainedVerifiedNotPublishedSpecialtyRecords =
    verifiedNotPublishedSpecialtyRecords.filter(
      ({ source }) => typeof source?.source_id === "string",
    );
  invariant(
    retainedVerifiedNotPublishedSpecialtyRecords.length === 8,
    "specialty source audit must retain exactly eight nonrouting Blazer EV source snapshots",
  );
  const actualVerifiedNotPublishedSourceIds = [
    ...new Set(
      retainedVerifiedNotPublishedSpecialtyRecords.map(
        ({ source }) => source.source_id,
      ),
    ),
  ].sort();
  invariant(
    JSON.stringify(actualVerifiedNotPublishedSourceIds) ===
      JSON.stringify(expectedVerifiedNotPublishedSourceIds),
    "verified-not-published specialty rows must resolve to the 2024 and 2025 Blazer EV guides",
  );
  const tahoeSpecialtyRecords = specialtyColorSource.app_publication_records.filter(
    (record) =>
      record.publication_status === "published_specialty_subset" &&
      record.catalog_model_ids.includes("tahoe"),
  );
  invariant(
    tahoeSpecialtyRecords.length === 91,
    "Tahoe specialty source audit must retain exactly 91 published rows",
  );
  const expectedTahoeSpecialtySourceIds = [
    "gm-heritage-2003-chevrolet-tahoe",
    "new-jersey-tahoe-police-contract-2005",
    "new-jersey-tahoe-police-contract-2006",
    "gm-2011-police-manual",
    "gm-2012-municipal-manual",
    "gm-2013-municipal-guide",
    "gm-2014-police-guide",
    "gm-2015-tahoe-5w4",
    "gm-2016-tahoe-9c1",
    "gm-2016-tahoe-5w4",
    "gm-2017-tahoe-9c1-4wd",
    "gm-2018-tahoe-9c1-4wd",
    "gm-2019-tahoe-5w4",
    "gm-2020-tahoe-5w4",
  ].sort();
  const actualTahoeSpecialtySourceIds = [
    ...new Set(tahoeSpecialtyRecords.map(({ source }) => source.source_id)),
  ].sort();
  invariant(
    JSON.stringify(actualTahoeSpecialtySourceIds) ===
      JSON.stringify(expectedTahoeSpecialtySourceIds),
    "Tahoe specialty rows must resolve to the 14 retained governing sources",
  );
  for (const record of publishedRecords) {
    const { source } = record;
    invariant(
      typeof source.archive_url === "string" &&
        (source.archive_url.startsWith(RELEASE_DOWNLOAD_BASE) ||
          source.archive_url.startsWith(
            CURRENT_ORDER_GUIDE_RELEASE_DOWNLOAD_BASE,
          )),
      `${record.record_id} is not pinned to an audited source Release`,
    );
    const entry = allReleaseEntriesByUrl.get(source.archive_url);
    invariant(entry, `missing manifest entry for ${record.record_id}`);
    invariant(
      source.source_id === entry.source_id,
      `${record.record_id} source_id does not match the Release manifest`,
    );
    invariant(
      source.sha256 === entry.sha256,
      `${record.record_id} SHA-256 does not match the Release manifest`,
    );
    invariant(
      source.bytes === entry.bytes,
      `${record.record_id} byte size does not match the Release manifest`,
    );
    invariant(
      source.pdf_page_count === entry.pdf_page_count,
      `${record.record_id} page count does not match the Release manifest`,
    );
    allAppReleaseUrls.add(source.archive_url);
  }
  for (const record of retainedVerifiedNotPublishedSpecialtyRecords) {
    const { source } = record;
    invariant(
      typeof source.archive_url === "string" &&
        source.archive_url.startsWith(RELEASE_DOWNLOAD_BASE),
      `${record.record_id} is not pinned to ${RELEASE_TAG}`,
    );
    const entry = manifestEntriesByUrl.get(source.archive_url);
    invariant(entry, `missing manifest entry for ${record.record_id}`);
    invariant(
      source.source_id === entry.source_id,
      `${record.record_id} source_id does not match the Release manifest`,
    );
    invariant(
      source.sha256 === entry.sha256,
      `${record.record_id} SHA-256 does not match the Release manifest`,
    );
    invariant(
      source.bytes === entry.bytes,
      `${record.record_id} byte size does not match the Release manifest`,
    );
    invariant(
      source.pdf_page_count === entry.pdf_page_count,
      `${record.record_id} page count does not match the Release manifest`,
    );
    allAppReleaseUrls.add(source.archive_url);
  }

  for (const url of allAppReleaseUrls) {
    invariant(
      typeof url === "string" &&
        (url.startsWith(RELEASE_DOWNLOAD_BASE) ||
          url.startsWith(CURRENT_ORDER_GUIDE_RELEASE_DOWNLOAD_BASE)),
      `app-fed citation is not pinned to an audited source Release: ${url}`,
    );
    invariant(
      allReleaseEntriesByUrl.has(url),
      `app citation is absent from the source Release manifests: ${url}`,
    );
  }

  for (const { year, source } of suburbanAppFedCitations) {
    const entry = manifestEntriesByUrl.get(source.archive_url);
    invariant(entry, `missing manifest entry for ${year} app citation`);
    invariant(
      source.artifact_sha256 === entry.sha256,
      `${year} app citation SHA-256 does not match the Release manifest`,
    );
    invariant(
      source.artifact_bytes === entry.bytes,
      `${year} app citation byte size does not match the Release manifest`,
    );
  }

  for (const { context, source } of tahoeAppFedCitations) {
    invariant(
      typeof source.archive_url === "string" &&
        source.archive_url.startsWith(RELEASE_DOWNLOAD_BASE),
      `${context} is not pinned to ${RELEASE_TAG}`,
    );
    const entry = manifestEntriesByUrl.get(source.archive_url);
    invariant(entry, `missing manifest entry for ${context}`);
    invariant(
      source.source_id === entry.source_id,
      `${context} source_id does not match the Release manifest`,
    );
    invariant(
      source.sha256 === entry.sha256,
      `${context} SHA-256 does not match the Release manifest`,
    );
    invariant(
      source.bytes === entry.bytes,
      `${context} byte size does not match the Release manifest`,
    );
    invariant(
      source.pdf_page_count === entry.pdf_page_count,
      `${context} page count does not match the Release manifest`,
    );
  }

  return {
    appFedCitationCount: appFedCitations.length,
    appReleaseUrlCount: allAppReleaseUrls.size,
    modernPaletteSourceCount: retainedModernSources.length,
    modernPaletteTableCount: modernPaletteTables.length,
    modernPaletteAssertionCount,
    publishedRecordCount: publishedRecords.length,
    publishedSpecialtyRecordCount: publishedSpecialtyRecords.length,
    publishedQualifiedHistoricalRecordCount: qualifiedHistoricalRecords.length,
    verifiedNotPublishedSpecialtyRecordCount:
      verifiedNotPublishedSpecialtyRecords.length,
  };
}

async function stagingExists(stagingDirectory) {
  try {
    await access(stagingDirectory, fsConstants.R_OK);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function validateLocalStaging(stagingDirectory, manifestEntriesByName) {
  const children = await readdir(stagingDirectory, { withFileTypes: true });
  invariant(
    children.every((child) => child.isFile()),
    "brochure Release staging directory may contain files only",
  );
  const stagedAssetNames = children.map(({ name }) => name).sort();
  const manifestAssetNames = [...manifestEntriesByName.keys()].sort();
  invariant(
    JSON.stringify(stagedAssetNames) === JSON.stringify(manifestAssetNames),
    "local brochure Release staging files must exactly match the manifest",
  );

  for (const [assetName, entry] of manifestEntriesByName) {
    const bytes = await readFile(path.join(stagingDirectory, assetName));
    invariant(
      bytes.length === entry.bytes,
      `local staged byte size does not match manifest: ${assetName}`,
    );
    invariant(
      sha256(bytes) === entry.sha256,
      `local staged SHA-256 does not match manifest: ${assetName}`,
    );
  }

  const checksumAssetName = "source-sha256-manifest.txt";
  const checksumText = await readFile(
    path.join(stagingDirectory, checksumAssetName),
    "utf8",
  );
  const checksumLines = checksumText.trimEnd().split("\n");
  const expectedChecksumLines = [...manifestEntriesByName.values()]
    .filter(({ asset_name: assetName }) => assetName !== checksumAssetName)
    .sort((left, right) => left.asset_name.localeCompare(right.asset_name))
    .map(({ asset_name: assetName, sha256: digest }) => `${digest}  ${assetName}`);
  invariant(
    JSON.stringify(checksumLines) === JSON.stringify(expectedChecksumLines),
    "source-sha256-manifest.txt must cover every non-self Release asset by its flat asset name",
  );
}

async function validateRemoteRelease(manifest) {
  const response = await fetch(
    `https://api.github.com/repos/${REPOSITORY}/releases/tags/${RELEASE_TAG}`,
    { headers: { Accept: "application/vnd.github+json", "User-Agent": REPOSITORY } },
  );
  invariant(response.ok, `GitHub Release API returned HTTP ${response.status}`);
  const release = await response.json();
  const remoteByName = new Map(release.assets.map((asset) => [asset.name, asset]));
  invariant(
    remoteByName.size === manifest.entries.length,
    "remote Release asset count does not match the manifest",
  );
  for (const entry of manifest.entries) {
    const remote = remoteByName.get(entry.asset_name);
    invariant(remote, `remote Release is missing ${entry.asset_name}`);
    invariant(remote.size === entry.bytes, `remote byte size mismatch: ${entry.asset_name}`);
    invariant(
      remote.digest === `sha256:${entry.sha256}`,
      `remote SHA-256 mismatch: ${entry.asset_name}`,
    );
  }
}

export async function validateBrochureSourceRelease({
  repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url))),
  manifestPath = path.join(repositoryRoot, DEFAULT_MANIFEST_RELATIVE_PATH),
  stagingDirectory = path.join(repositoryRoot, DEFAULT_STAGING_RELATIVE_PATH),
  requireStaging = false,
  verifyRemote = false,
} = {}) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const manifestEntriesByName = assertManifestContract(manifest);
  const appCitationReport = await validateAppCitationClosure(
    repositoryRoot,
    manifestEntriesByName,
  );
  const hasStaging = await stagingExists(stagingDirectory);
  invariant(
    hasStaging || !requireStaging,
    `required local Release staging directory is missing: ${stagingDirectory}`,
  );
  if (hasStaging) {
    await validateLocalStaging(stagingDirectory, manifestEntriesByName);
  }
  if (verifyRemote) {
    await validateRemoteRelease(manifest);
  }

  return {
    ok: true,
    repository: REPOSITORY,
    release_tag: RELEASE_TAG,
    asset_count: manifest.entries.length,
    controlling_asset_count:
      controllingAssets.size + tahoeGoverningAssets.size,
    app_fed_citation_count: appCitationReport.appFedCitationCount,
    app_release_url_count: appCitationReport.appReleaseUrlCount,
    modern_palette_source_count: appCitationReport.modernPaletteSourceCount,
    modern_palette_table_count: appCitationReport.modernPaletteTableCount,
    modern_palette_assertion_count:
      appCitationReport.modernPaletteAssertionCount,
    published_specialty_record_count:
      appCitationReport.publishedSpecialtyRecordCount,
    published_record_count: appCitationReport.publishedRecordCount,
    published_qualified_historical_record_count:
      appCitationReport.publishedQualifiedHistoricalRecordCount,
    verified_not_published_specialty_record_count:
      appCitationReport.verifiedNotPublishedSpecialtyRecordCount,
    local_staging: hasStaging ? "verified" : "not-present",
    local_staging_verified_asset_count: hasStaging ? manifest.entries.length : 0,
    remote_release: verifyRemote ? "verified" : "not-checked",
  };
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--require-staging") {
      options.requireStaging = true;
    } else if (argument === "--verify-remote") {
      options.verifyRemote = true;
    } else if (argument === "--root") {
      index += 1;
      invariant(argv[index], "--root requires a path");
      options.repositoryRoot = path.resolve(argv[index]);
    } else if (argument === "--manifest") {
      index += 1;
      invariant(argv[index], "--manifest requires a path");
      options.manifestPath = path.resolve(argv[index]);
    } else if (argument === "--staging") {
      index += 1;
      invariant(argv[index], "--staging requires a path");
      options.stagingDirectory = path.resolve(argv[index]);
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return options;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const report = await validateBrochureSourceRelease(
      parseArguments(process.argv.slice(2)),
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
