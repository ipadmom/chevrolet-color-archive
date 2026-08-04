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
    sourceLiteralAnomalies: [
      "This combined Tahoe table prints Dark Blue Metallic 9V7 / WA-722J. Express prints Dark Blue Metallic 5IH / WA-722J, while Silverado medium duty prints Dark Ming Blue 5IH / WA-722J; the archive preserves all three source-scoped literals.",
    ],
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

const TAHOE_SUBURBAN_SEO_COLORS = [
  { label: "Victory Red", seoCode: "5T4", waCode: "WA-9260" },
  WOODLAND_GREEN,
  { label: "Wheatland Yellow", seoCode: "9W3", waCode: "WA-253A" },
];

const EXPRESS_SEO_COLORS = [
  { label: "Yellow", seoCode: "5ID", waCode: "WA-5456" },
  { label: "Blue", seoCode: "5IF", waCode: "WA-5665" },
  { label: "Green", seoCode: "5IL", waCode: "WA-7927" },
  { label: "Inca Gold", seoCode: "5IK", waCode: "WA-7952" },
  { label: "Silver Metallic", seoCode: "5IN", waCode: "WA-8867" },
  EXPRESS_WOODLAND_GREEN,
  { label: "Victory Red", seoCode: "5IP", waCode: "WA-9260" },
  { label: "Yellow", seoCode: "5IT", waCode: "WA-9414" },
  { label: "Tangier Orange", seoCode: "9W4", waCode: "WA-9417" },
  { label: "Yellow", seoCode: "5IZ", waCode: "WA-215D" },
  { label: "Dark Toreador Red", seoCode: "5I1", waCode: "WA-257C" },
  { label: "Yellow", seoCode: "5I2", waCode: "WA-259L" },
  { label: "Blue", seoCode: "5IQ", waCode: "WA-451N" },
  { label: "Yellow", seoCode: "5I6", waCode: "WA-478G" },
  { label: "Petro Blue", seoCode: "5I7", waCode: "WA-527Y" },
  {
    label: "Dark Blue Metallic",
    seoCode: "5IH",
    waCode: "WA-722J",
    sourceLiteralAnomalies: [
      "This Express table prints Dark Blue Metallic 5IH / WA-722J. The combined Tahoe table prints Dark Blue Metallic 9V7 / WA-722J, while Silverado medium duty prints Dark Ming Blue 5IH / WA-722J; the archive preserves all three source-scoped literals.",
    ],
  },
  { label: "Silver Birch Metallic", seoCode: "5IG", waCode: "WA-926L" },
  { label: "Wheatland Yellow", seoCode: "9W3", waCode: "WA-253A" },
];

const SILVERADO_LIGHT_HD_SEO_COLORS = [
  { label: "Woodland Green", seoCode: "9V5", waCode: "WA-9015" },
  { label: "Doeskin Tan", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-9403" },
  { label: "Wheatland Yellow", seoCode: "9W3", waCode: "WA-253A" },
  { label: "Tangier Orange", seoCode: "9W4", waCode: "WA-9417" },
  { label: "Dark Toreador Red", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-334D" },
  { label: "Unripened Green Metallic", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-136X" },
  { label: "Indigo Blue", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-9792" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-5248" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-5445" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-5456" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-9414" },
  { label: "Orange", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-770H" },
  { label: "Blue", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-454N" },
  { label: "Light Autumnwood Metallic", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-228A" },
  { label: "Pewter", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-382E" },
  { label: "Blue", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-5405" },
  { label: "Blue", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-7154" },
  { label: "Orange", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-9419" },
  { label: "Arrival Blue Metallic", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-815K" },
  { label: "Green", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-7927" },
  {
    label: "Silver Ice Metallic",
    seoCode: "5IS",
    waCode: "WA-636R",
    sourceLiteralAnomalies: [
      "This retained Silverado HD table prints Silver Ice Metallic 5IS / WA-636R. A separately retained 2026 Silverado police and special-service source prints Silver Ice Metallic 5IS / WA-363R; neither literal is normalized to the other.",
    ],
  },
];

const SILVERADO_MEDIUM_DUTY_SEO_COLORS = [
  { label: "Woodland Green", seoCode: "9V5", waCode: "WA-9015" },
  { label: "Doeskin Tan", seoCode: "5I9", waCode: "WA-9403" },
  { label: "Wheatland Yellow", seoCode: "9W3", waCode: "WA-253A" },
  { label: "Tangier Orange", seoCode: "9W4", waCode: "WA-9417" },
  { label: "Dark Toreador Red", seoCode: "5I3", waCode: "WA-334D" },
  { label: "Indigo Blue", seoCode: "5IW", waCode: "WA-9792" },
  { label: "Yellow", seoCode: "5IA", waCode: "WA-5248" },
  { label: "Yellow", seoCode: "5IC", waCode: "WA-5445" },
  { label: "Yellow", seoCode: "5ID", waCode: "WA-5456" },
  { label: "Yellow", seoCode: "5IT", waCode: "WA-9414" },
  { label: "Orange", seoCode: "5JA", waCode: "WA-770H" },
  { label: "Blue", seoCode: "5JD", waCode: "WA-454N" },
  { label: "Unripened Green Metallic", seoCode: "5IR", waCode: "WA-136X" },
  {
    label: "Dark Ming Blue",
    seoCode: "5IH",
    waCode: "WA-722J",
    sourceLiteralAnomalies: [
      "This Silverado medium-duty table prints Dark Ming Blue 5IH / WA-722J. Express prints Dark Blue Metallic 5IH / WA-722J, while the combined Tahoe table prints Dark Blue Metallic 9V7 / WA-722J; the archive preserves all three source-scoped literals.",
    ],
  },
  { label: "Iridium Metallic", seoCode: "5IE", waCode: "WA-121V" },
  { label: "Pepperdust Metallic", seoCode: "5II", waCode: "WA-441B" },
  { label: "Yellow", seoCode: "5IZ", waCode: "WA-215D" },
  { label: "Cyber Gray Metallic", seoCode: "5IU", waCode: "WA-637R" },
  { label: "Subterranean Metallic", seoCode: "5I4", waCode: "WA-105V" },
  { label: "Baroque Red Metallic", seoCode: "5IY", waCode: "WA-142X" },
  { label: "Green", seoCode: "5IL", waCode: "WA-7927" },
  { label: "Inca Gold", seoCode: "5IK", waCode: "WA-7952" },
  { label: "Mosaic Black Metallic", seoCode: "9F5", waCode: "WA-384A" },
  { label: "Graphite Metallic", seoCode: "9V1", waCode: "WA-457B" },
  { label: "Havana Brown Metallic", seoCode: "9V4", waCode: "WA-439C" },
  { label: "Satin Steel Metallic", seoCode: "9W2", waCode: "WA-464C" },
  { label: "Smokey Quartz Metallic", seoCode: "9V8", waCode: "WA-634D" },
  { label: "Oxford Brown Metallic", seoCode: "9W1", waCode: "WA-334E" },
  { label: "Deep Ocean Blue Metallic", seoCode: "9W6", waCode: "WA-409Y" },
  { label: "Shadow Gray Metallic", seoCode: "9W9", waCode: "WA-626D" },
];

const COLORADO_2025_SEO_COLORS = [
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-5456" },
  { label: "Green", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-7927" },
  { label: "Inca Gold", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-7952" },
  { label: "Silver Metallic", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-8867" },
  { label: "Woodland Green", seoCode: "9V5", waCode: "WA-9015" },
  { label: "Victory Red", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-9260" },
  { label: "Doeskin Tan", seoCode: "9V9", waCode: "WA-9403" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-9414" },
  { label: "Tangier Orange", seoCode: "9W4", waCode: "WA-9417" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-215D" },
  { label: "Wheatland Yellow", seoCode: "9W3", waCode: "WA-253A" },
  { label: "Dark Toreador Red", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-257C" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-259L" },
  { label: "Blue", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-451N" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-478G" },
  { label: "Silver Birch Metallic", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-926L" },
  { label: "Laser Blue", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-218M" },
];

const COLORADO_2026_SEO_COLORS = [
  { label: "Dark Ming Blue", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-722J" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-5456" },
  { label: "Silver Metallic", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-8867" },
  { label: "Woodland Green", seoCode: "9V5", waCode: "WA-9015" },
  { label: "Victory Red", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-9260" },
  { label: "Doeskin Tan", seoCode: "9V9", waCode: "WA-9403" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-9414" },
  { label: "Tangier Orange", seoCode: "9W4", waCode: "WA-9417" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-215D" },
  { label: "Wheatland Yellow", seoCode: "9W3", waCode: "WA-253A" },
  { label: "Dark Toreador Red", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-257C" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-259L" },
  { label: "Yellow", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-478G" },
  { label: "Silver Birch Metallic", seoCode: null, sourceSeoCodeRaw: "none", waCode: "WA-926L" },
];

const BLAZER_EV_POLICE_COLORS_2025 = [
  {
    label: "Victory Red",
    seoCode: "5T4",
    waCode: "WA-9260",
    availabilityState: "available_with_possible_extended_lead",
    restrictions: [
      "The row carries footnote 1, which literally states: Planned for Q1 2025 production.",
    ],
  },
  {
    label: "MSP Goose Blue",
    seoCode: "9V2",
    waCode: "WA-5665",
    availabilityState: "footnoted_not_available_at_revision",
    sourceLiteralAnomalies: [
      "The row's availability column prints A while footnote 2 states that the color is not available at this time.",
      "This Order Guide prints MSP Goose Blue; the separate 2026 GM specification guide prints MSP Blue Goose for the same 9V2 / WA-5665 identity.",
    ],
    restrictions: [
      "The row carries footnote 2, which literally states: Not available at this time.",
    ],
  },
  {
    label: "Dark Blue Metallic",
    seoCode: "9V7",
    waCode: "WA-722J",
    availabilityState: "footnoted_not_available_at_revision",
    sourceLiteralAnomalies: [
      "The row's availability column prints A while footnote 2 states that the color is not available at this time.",
    ],
    restrictions: [
      "The row carries footnote 2, which literally states: Not available at this time.",
    ],
  },
  {
    label: "Silver Ice Metallic",
    seoCode: "9W5",
    waCode: "WA-636R",
    availabilityState: "footnoted_not_available_at_revision",
    sourceLiteralAnomalies: [
      "The row's availability column prints A while footnote 2 states that the color is not available at this time.",
    ],
    restrictions: [
      "The row carries footnote 2, which literally states: Not available at this time.",
    ],
  },
];

const BLAZER_EV_POLICE_COLORS_2026 = [
  { label: "Victory Red", seoCode: "5T4", waCode: "WA-9260" },
  {
    label: "MSP Goose Blue",
    seoCode: "9V2",
    waCode: "WA-5665",
    sourceLiteralAnomalies: [
      "This Order Guide prints MSP Goose Blue; the separate 2026 GM specification guide prints MSP Blue Goose for the same 9V2 / WA-5665 identity.",
    ],
  },
  { label: "Dark Blue Metallic", seoCode: "9V7", waCode: "WA-722J" },
  { label: "Silver Ice Metallic", seoCode: "9W5", waCode: "WA-636R" },
];

const REVIEWED_SOURCES = [
  {
    vehicleId: 22887,
    catalogModelId: "blazer-ev",
    sourceModelScope: "Blazer EV Police Package 9C1 and 9C3",
    programId: "gm-blazer-ev-police-package-9c1-9c3-seo-paint-2025-2026",
    programLabel: "Blazer EV Police Package 9C1 and 9C3 SEO paint",
    programCode: "9C1/9C3",
    rpoCode: "9C1/9C3",
    section: "COLOR AND TRIM - SEO",
    targetPage: 23,
    colors: BLAZER_EV_POLICE_COLORS_2025,
    availabilityState: "available_with_possible_extended_lead",
    minimumBatchUnits: null,
    restrictions: [
      "The table covers the listed 9C1 and 9C3 decor levels and marks each row A in the single Black interior column.",
      "The page states that the SEO colors may require extended lead time.",
      "The footnotes are controlling where they conflict with the A availability cells.",
      "The source does not establish 5W4 applicability.",
    ],
    reviewedAt: "2026-08-04T11:05:00Z",
    finding:
      "The Blazer EV Police Package 9C1 and 9C3 SEO table prints four A rows: Victory Red 5T4 / WA-9260, MSP Goose Blue 9V2 / WA-5665, Dark Blue Metallic 9V7 / WA-722J, and Silver Ice Metallic 9W5 / WA-636R. Victory Red carries a planned-Q1-2025 note. The other three carry a controlling not-available-at-this-time note. The page also warns that SEO colors may require extended lead time.",
  },
  {
    vehicleId: 23079,
    catalogModelId: "colorado",
    sourceModelScope: "Colorado WT",
    programId: "gm-colorado-wt-seo-paint-2025-2026",
    programLabel: "Colorado WT SEO paint",
    programCode: "WT",
    rpoCode: null,
    section: "COLOR AND TRIM - SEO PAINT",
    targetPage: 54,
    colors: COLORADO_2025_SEO_COLORS,
    availabilityState: "available_with_minimum_batch",
    minimumBatchUnits: 5,
    restrictions: [
      "The table is limited to the WT decor level and marks every row A in the single Jet Black interior column.",
      "GM will require five orders before sending the order to the plant.",
      "The footnote concerning PCU WT Convenience Package II is attached to the H2G interior trim row, not to an exterior-color row.",
      "The repeated source label Yellow is preserved as five distinct WA identities.",
    ],
    reviewedAt: "2026-08-04T11:05:00Z",
    finding:
      "The Colorado WT SEO Paint table confirms seventeen available rows in the single Jet Black column, including Woodland Green 9V5 / WA-9015. Thirteen color-code cells literally print none, four print SEO codes, and every row is subject to a five-order minimum. Five separate Yellow rows are distinguished by their WA touch-up numbers.",
  },
  {
    vehicleId: 23158,
    catalogModelId: "blazer-ev",
    sourceModelScope: "Blazer EV Police Package 9C1 and 9C3",
    programId: "gm-blazer-ev-police-package-9c1-9c3-seo-paint-2025-2026",
    programLabel: "Blazer EV Police Package 9C1 and 9C3 SEO paint",
    programCode: "9C1/9C3",
    rpoCode: "9C1/9C3",
    section: "COLOR AND TRIM - SEO",
    targetPage: 20,
    colors: BLAZER_EV_POLICE_COLORS_2026,
    availabilityState: "available_with_possible_extended_lead",
    minimumBatchUnits: null,
    restrictions: [
      "The table covers the listed 9C1 and 9C3 decor levels and marks each row A in the single Black interior column.",
      "The page states that the SEO colors may require extended lead time.",
      "The source does not establish 5W4 applicability.",
    ],
    reviewedAt: "2026-08-04T11:05:00Z",
    finding:
      "The Blazer EV Police Package 9C1 and 9C3 SEO table confirms four A rows: Victory Red 5T4 / WA-9260, MSP Goose Blue 9V2 / WA-5665, Dark Blue Metallic 9V7 / WA-722J, and Silver Ice Metallic 9W5 / WA-636R. The page prints no row-specific unavailability footnote and states that SEO colors may require extended lead time.",
  },
  {
    vehicleId: 23215,
    catalogModelId: "colorado",
    sourceModelScope: "Colorado WT",
    programId: "gm-colorado-wt-seo-paint-2025-2026",
    programLabel: "Colorado WT SEO paint",
    programCode: "WT",
    rpoCode: null,
    section: "COLOR AND TRIM - SEO PAINT",
    targetPage: 61,
    colors: COLORADO_2026_SEO_COLORS,
    availabilityState: "available_with_minimum_batch",
    minimumBatchUnits: 5,
    restrictions: [
      "The table is limited to the WT decor level and marks every row A in the single Jet Black interior column.",
      "GM will require five orders before sending the order to the plant.",
      "The footnote concerning PCU WT Convenience Package II is attached to the H2G interior trim row, not to an exterior-color row.",
      "The repeated source label Yellow is preserved as five distinct WA identities.",
    ],
    reviewedAt: "2026-08-04T11:05:00Z",
    finding:
      "The Colorado WT SEO Paint table confirms fourteen available rows in the single Jet Black column, including Woodland Green 9V5 / WA-9015. Ten color-code cells literally print none, four print SEO codes, and every row is subject to a five-order minimum. Five separate Yellow rows are distinguished by their WA touch-up numbers.",
  },
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
    reviewedAt: "2026-08-04T11:05:00Z",
    finding:
      "The Retail and Fleet SEO Solid Paint table confirms Woodland Green, code 9V5, touch-up paint number WA-9015, available with both listed interiors, with a five-order minimum. The same rendered page prints Wheatland Yellow as 9W3 / WA-253A; that row remains outside this bounded publication tranche.",
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

const TAHOE_SUBURBAN_SOURCE_IDS = new Set([22944, 23232, 23035, 23233]);
const EXPRESS_DUAL_INTERIOR_SOURCE_IDS = new Set([
  23014, 23276, 23015, 23277,
]);
const EXPRESS_PASSENGER_SOURCE_IDS = new Set([23016, 23278]);
const SILVERADO_HD_RETAIL_SOURCE_IDS = new Set([
  22903, 23195, 22904, 23196,
]);
const SILVERADO_HD_CC_SOURCE_IDS = new Set([22905, 23197]);
const SILVERADO_MEDIUM_DUTY_SOURCE_IDS = new Set([23022, 23260]);

for (const config of REVIEWED_SOURCES) {
  if (TAHOE_SUBURBAN_SOURCE_IDS.has(config.vehicleId)) {
    Object.assign(config, {
      colors: TAHOE_SUBURBAN_SEO_COLORS,
      interiorAvailability: {
        "Jet Black": "A",
        "Gideon / Very Dark Atmosphere": "A",
      },
      unboundPageNotes: [
        "1 - Interior color has lighter/darker two-tone effect.",
      ],
      restrictions: [
        "The table marks all three SEO Solid Paint rows available with both Jet Black and Gideon / Very Dark Atmosphere interior columns.",
        "GM will require five orders before sending the order to the plant.",
        "The numbered two-tone interior note is preserved as a page note and is not assigned to an exterior-color row.",
      ],
      finding:
        `The ${config.sourceModelScope} SEO Solid Paint table publishes all three A rows: Victory Red 5T4 / WA-9260, Woodland Green 9V5 / WA-9015, and Wheatland Yellow 9W3 / WA-253A. Both listed interior columns are available, and the page requires five orders before plant submission.`,
    });
  } else if (
    EXPRESS_DUAL_INTERIOR_SOURCE_IDS.has(config.vehicleId) ||
    EXPRESS_PASSENGER_SOURCE_IDS.has(config.vehicleId)
  ) {
    const passenger = EXPRESS_PASSENGER_SOURCE_IDS.has(config.vehicleId);
    Object.assign(config, {
      colors: EXPRESS_SEO_COLORS,
      interiorAvailability: passenger
        ? { "Medium Pewter": "A" }
        : { Neutral: "A", "Medium Pewter": "A" },
      unboundPageNotes: [],
      bodyComponentNote:
        "All extraneous body components formerly color-keyed to body color, will be flat Black.",
      restrictions: [
        passenger
          ? "The table marks all eighteen SEO Solid Paint rows available with the Medium Pewter interior column."
          : "The table marks all eighteen SEO Solid Paint rows available with both Neutral and Medium Pewter interior columns.",
        "GM will require five orders before sending the order to the plant.",
        "All extraneous body components formerly color-keyed to body color, will be flat Black.",
      ],
      finding:
        `The ${config.sourceModelScope} SEO Solid Paint table publishes all eighteen printed A rows without collapsing repeated labels. Every row carries the five-order minimum and the flat-Black extraneous-body-component rule.`,
    });
  } else if (
    SILVERADO_HD_RETAIL_SOURCE_IDS.has(config.vehicleId) ||
    SILVERADO_HD_CC_SOURCE_IDS.has(config.vehicleId)
  ) {
    const cabChassis = SILVERADO_HD_CC_SOURCE_IDS.has(config.vehicleId);
    Object.assign(config, {
      colors: SILVERADO_LIGHT_HD_SEO_COLORS,
      interiorAvailability: cabChassis
        ? { "Gideon / Very Dark Atmosphere": "A", "Jet Black": "A" }
        : { "Jet Black": "A", "Gideon / Very Dark Atmosphere": "A" },
      unboundPageNotes: cabChassis
        ? [
            "1 - Available on Crew Cab models. Requires (PCL) Convenience Package.",
          ]
        : [
            "1 - Requires Crew Cab or Double Cab model.",
            "2 - Standard on Regular Cab models. Included and only available with (PCL) Convenience Package on Crew Cab and Double Cab models.",
            "3 - Requires (CXH) Leather Package.",
          ],
      bodyComponentNote: null,
      possibleExtendedLeadTime: true,
      restrictions: [
        "The table marks all twenty-one SEO Paint rows available with both listed interior columns.",
        "Seventeen color-code cells literally print none; the archive preserves those cell states and does not import medium-duty SEO codes.",
        "GM will require five orders before sending the order to the plant and warns that the paint may require extended lead time.",
        "The numbered page notes are preserved without assigning them to a color row because the rendered color table prints no reliable row-level marker.",
        "Silver Ice Metallic is preserved exactly as 5IS / WA-636R and is not normalized to the separately retained 5IS / WA-363R police and special-service literal.",
      ],
      finding:
        `The ${config.sourceModelScope} SEO Paint table publishes all twenty-one printed A rows. Seventeen code cells literally print none. Every row carries the five-order minimum and possible extended lead-time warning; the 5IS / WA-636R literal and unbound numbered notes remain source-scoped.`,
    });
  } else if (SILVERADO_MEDIUM_DUTY_SOURCE_IDS.has(config.vehicleId)) {
    Object.assign(config, {
      colors: SILVERADO_MEDIUM_DUTY_SEO_COLORS,
      interiorAvailability: {
        "Jet Black": "A",
        "Dark Ash seats with Jet Black interior accents": "A",
      },
      unboundPageNotes: [
        "1 - Not available with (APL) Passenger Seat Delete.",
      ],
      bodyComponentNote: null,
      possibleExtendedLeadTime: false,
      restrictions: [
        "The table marks all thirty SEO Paint rows available with both Jet Black and Dark Ash seats with Jet Black interior accents columns.",
        "The page prints no five-order minimum and no extended lead-time warning.",
        "The APL Passenger Seat Delete note is preserved as an unbound page note because the rendered color table prints no reliable row-level marker.",
        "Dark Ming Blue 5IH / WA-722J remains separate from both Dark Blue Metallic 5IH / WA-722J on Express and Dark Blue Metallic 9V7 / WA-722J on the combined Tahoe program.",
      ],
      finding:
        `The ${config.sourceModelScope} SEO Paint table publishes all thirty printed A rows for both listed interior columns. The page has no five-order minimum or extended lead-time warning. Its APL Passenger Seat Delete note remains unbound, and Dark Ming Blue 5IH / WA-722J remains source-literal.`,
    });
  }
}

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
  const sourceSeoCodeRaw = color.sourceSeoCodeRaw ?? color.seoCode;
  const sourceSeoCodeCellState =
    color.sourceSeoCodeRaw === "none" ? "literal_none" : "printed";
  const availabilityState =
    color.availabilityState ??
    config.availabilityState ??
    (config.minimumBatchUnits == null
      ? "available"
      : "available_with_minimum_batch");
  return {
    record_id: `gm-eog-current-${entry.model_year}-${slug(config.sourceModelScope)}-${slug(color.label)}-${slug(sourceSeoCodeRaw)}-${slug(color.waCode)}`,
    publication_status: "published_specialty_subset",
    model_year: entry.model_year,
    catalog_model_ids: [config.catalogModelId],
    source_model_scope: [config.sourceModelScope],
    program_id: config.programId,
    program_label: config.programLabel,
    program_code: config.programCode ?? null,
    application_type: "special_equipment_option_paint",
    availability_state: availabilityState,
    label: color.label,
    source_label_raw: sourceLabelRaw,
    finish: "solid",
    paint_code: color.waCode,
    factory_paint_code: null,
    wa_code: color.waCode,
    source_wa_code_raw: color.waCode,
    source_wa_code_cell_state: "printed_with_prefix",
    seo_code: color.seoCode,
    source_seo_code_raw: sourceSeoCodeRaw,
    source_seo_code_cell_state: sourceSeoCodeCellState,
    rpo_code: config.rpoCode ?? null,
    code_display:
      color.seoCode == null
        ? color.waCode
        : `${color.waCode} / SEO ${color.seoCode}`,
    touch_up_paint_number: color.waCode,
    minimum_batch_units: config.minimumBatchUnits,
    interior_availability: structuredClone(
      config.interiorAvailability ?? null,
    ),
    unbound_page_notes: [...(config.unboundPageNotes ?? [])],
    body_component_note: config.bodyComponentNote ?? null,
    possible_extended_lead_time:
      config.possibleExtendedLeadTime ?? false,
    factory_installation_claim: null,
    installation_semantics:
      "Official GM Electronic Order Guide SEO paint listing; application site is not expressly stated.",
    restrictions: [
      `This row is limited to ${entry.model_year} Chevrolet Truck ${config.sourceModelScope}.`,
      `The table prints ${sourceLabelRaw}, color code ${sourceSeoCodeRaw}, and touch-up paint number ${color.waCode}.`,
      ...(sourceSeoCodeCellState === "literal_none"
        ? [
            "The color-code cell literally prints none; the archive preserves that cell state and does not invent an SEO code.",
          ]
        : []),
      ...config.restrictions,
      ...(color.restrictions ?? []),
      "No availability is inferred for another Chevrolet model, configuration, or year.",
    ],
    ...(color.sourceLiteralAnomalies
      ? { source_literal_anomalies: color.sourceLiteralAnomalies }
      : {}),
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

  if (records.length !== 357 || recordIds.size !== records.length) {
    throw new Error("current Order Guide tranche must contain 357 unique rows");
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
  const priorTrancheBoundary =
    "The retained 2025 and 2026 Tahoe, Suburban, Express, Silverado HD, Colorado, and Blazer EV Order Guide tranche publishes 69 exact configuration-color rows from twenty-four visually reviewed sources. It publishes the six-color combined Tahoe Police Package and Special Service palette for each year without splitting PPV from SSV; all exact Colorado WT SEO Paint rows; all four exact Blazer EV Police Package 9C1 and 9C3 SEO rows per year; and only Woodland Green from the reviewed retail, van, and HD tables. It preserves literal none Colorado code cells, the 2025 Blazer EV conflict between A availability cells and controlling not-available-at-this-time footnotes, the Express flat-Black body-component rule, the light-duty HD five-order and extended-lead-time note, the medium-duty absence of that note, and the printed 5IS / WA-636R conflict. Forest Service Green and Isuzu Woodland Green 46U remain separate identities.";
  const trancheBoundary =
    "The retained 2025 and 2026 Tahoe, Suburban, Express, Silverado HD, Colorado, and Blazer EV Order Guide tranche publishes 357 exact configuration-color rows from twenty-four visually reviewed sources. It publishes the six-color combined Tahoe Police Package and Special Service palette for each year without splitting PPV from SSV; all three Tahoe and Suburban retail/fleet rows per configuration; all eighteen Express rows per configuration; all twenty-one light-HD and all thirty medium-duty rows per configuration; all exact Colorado WT SEO Paint rows; and all four exact Blazer EV Police Package 9C1 and 9C3 SEO rows per year. It preserves literal none Colorado and light-HD code cells, the 2025 Blazer EV conflict between A availability cells and controlling not-available-at-this-time footnotes, exact interior applicability, unbound numbered notes, the Express flat-Black body-component rule, the light-HD five-order and extended-lead-time note, the medium-duty absence of those notes, all three WA-722J label/code variants, and the separate 5IS / WA-636R and 5IS / WA-363R literals. Forest Service Green and Isuzu Woodland Green 46U remain separate identities.";
  const withoutPriorTranche = currentBoundary.replace(priorTrancheBoundary, "");
  ledger.integrity_audit.publication_boundary = withoutPriorTranche.includes(
    trancheBoundary,
  )
    ? withoutPriorTranche.trim()
    : `${withoutPriorTranche.trim()} ${trancheBoundary}`;
  ledger.integrity_audit.audited_on = "2026-08-04";
  ledger.generated_at = "2026-08-04T11:05:00Z";
  updateArtifactAudit(ledger);

  for (const config of REVIEWED_SOURCES) {
    const entry = releaseEntryByVehicleId(releaseManifest, config.vehicleId);
    for (const page of entry.cited_pages) {
      if (page.pdf_page === config.targetPage) {
        page.visual_review_status = "visually_verified_exact_snapshot";
        page.visual_reviewed_at = config.reviewedAt ?? reviewedAt;
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
  reconciliation.audited_at = "2026-08-04T11:05:00Z";

  for (const modelId of [
    "tahoe",
    "suburban",
    "express",
    "silverado-hd",
    "colorado",
    "blazer-ev",
  ]) {
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
    year.published_specialty_identity_count = 18;
    year.published_configuration_row_count = 54;
    year.missing_specialty_identity_count = 0;
  }
  express.result =
    "Four regular names match. All eighteen exact SEO Solid Paint rows are published separately for Cargo, Cutaway, and Passenger in both years. Repeated labels remain separated by code and WA number, and every row retains its exact interior applicability, five-order minimum, and flat-Black body-component rule.";

  const suburban = reconciliation.records.find(
    (record) => record.model_id === "suburban",
  );
  for (const year of suburban.years) {
    year.published_specialty_identity_count = 3;
    year.omitted_specialty_colors = [];
  }
  suburban.result =
    "The regular names match. Victory Red 5T4 / WA-9260, Woodland Green 9V5 / WA-9015, and Wheatland Yellow 9W3 / WA-253A are published from each exact SEO Solid Paint page with both listed interiors and the five-order minimum.";

  const tahoe = reconciliation.records.find(
    (record) => record.model_id === "tahoe",
  );
  for (const year of tahoe.years) {
    year.published_retail_fleet_seo_identity_count = 3;
    year.omitted_retail_fleet_seo_identity_count = 0;
    year.published_police_ssv_seo_identity_count = 6;
    year.omitted_police_ssv_seo_identity_count = 0;
    year.omitted_police_ssv_standard_identity_count = 6;
  }
  tahoe.result =
    "The regular names match. All three Retail and Fleet SEO Solid Paint rows and all six exact combined Police Package and Special Service SEO Solid Paint rows are published for each year. The source does not split PPV from SSV. Standard police-program memberships outside these SEO tables remain separate evidence.";

  const silveradoHd = reconciliation.records.find(
    (record) => record.model_id === "silverado-hd",
  );
  for (const year of silveradoHd.years) {
    year.published_body_series_seo_identity_count = 48;
    year.published_configuration_row_count = 93;
    year.missing_body_series_seo_identity_count = 0;
  }
  silveradoHd.result =
    "The regular body-series unions match. All twenty-one light-HD SEO Paint rows are published separately for 2500 HD Retail and Fleet, 3500 HD CC, and 3500 HD Retail and Fleet, and all thirty medium-duty rows are published for 4500/5500/6500 HD, in both years. The archive preserves 93 exact configuration rows and 48 distinct source identities per year without importing medium-duty codes into literal-none light-HD cells.";

  const colorado = reconciliation.records.find(
    (record) => record.model_id === "colorado",
  );
  for (const year of colorado.years) {
    const exactRows = records.filter(
      (record) =>
        record.catalog_model_ids.includes("colorado") &&
        record.model_year === year.model_year,
    );
    year.published_wt_seo_identity_count = exactRows.length;
    year.omitted_wt_seo_identity_count = 0;
    year.literal_none_color_code_count = exactRows.filter(
      (record) => record.source_seo_code_cell_state === "literal_none",
    ).length;
  }
  colorado.result =
    "The regular identity unions match. All exact Colorado WT SEO Paint rows are published from the retained 2025 and 2026 pages, including the repeated Yellow labels as distinct WA identities and every literal none color-code cell. Retail option and package availability remains incomplete.";

  const blazerEv = reconciliation.records.find(
    (record) => record.model_id === "blazer-ev",
  );
  for (const year of blazerEv.years) {
    year.published_police_seo_identity_count = 4;
    year.omitted_police_seo_identity_count = 0;
    year.omitted_police_standard_identity_count = 6;
    year.published_police_seo_availability_states = Object.fromEntries(
      [...new Set(
        records
          .filter(
            (record) =>
              record.catalog_model_ids.includes("blazer-ev") &&
              record.model_year === year.model_year,
          )
          .map((record) => record.availability_state),
      )].map((state) => [
        state,
        records.filter(
          (record) =>
            record.catalog_model_ids.includes("blazer-ev") &&
            record.model_year === year.model_year &&
            record.availability_state === state,
        ).length,
      ]),
    );
  }
  blazerEv.result =
    "All four exact Blazer EV Police Package 9C1 and 9C3 SEO rows are published for both years. The 2025 source conflict is preserved: three rows print A but carry a controlling not-available-at-this-time footnote. Six standard police-program color memberships per year remain outside this specialty table.";

  const upsertSpecialtyFinding = (modelId) => {
    let finding = reconciliation.specialty_findings.find(
      (candidate) => candidate.model_id === modelId,
    );
    if (!finding) {
      finding = { model_id: modelId, model_years: [2025, 2026] };
      reconciliation.specialty_findings.push(finding);
    }
    return finding;
  };

  const tahoeFinding = upsertSpecialtyFinding("tahoe");
  Object.assign(tahoeFinding, {
    program_scope:
      "Tahoe Retail and Fleet plus combined Police Package and Special Service Order Guide entries",
    vehicle_ids: [22944, 22974, 23232, 23213],
    publication_status: "retained_pages_visually_verified_and_published",
    qualification:
      "All three Retail and Fleet rows are published per year. The six police and special-service rows are published only for the combined entry; no PPV-only or SSV-only applicability is inferred.",
    finding:
      "Each Retail and Fleet page publishes Victory Red 5T4 / WA-9260, Woodland Green 9V5 / WA-9015, and Wheatland Yellow 9W3 / WA-253A. Each combined Police Package and Special Service page publishes six rows. Interior applicability, the five-order minimum, and the combined-program boundary remain exact.",
    source_pages: [
      { vehicle_id: 22944, model_year: 2025, pdf_page: 83, printed_page: 83 },
      { vehicle_id: 22974, model_year: 2025, pdf_page: 29, printed_page: 29 },
      { vehicle_id: 23232, model_year: 2026, pdf_page: 90, printed_page: 90 },
      { vehicle_id: 23213, model_year: 2026, pdf_page: 29, printed_page: 29 },
    ],
  });

  Object.assign(upsertSpecialtyFinding("suburban"), {
    program_scope: "Suburban SEO Solid Paint Order Guide entries",
    vehicle_ids: [23035, 23233],
    publication_status: "retained_pages_visually_verified_and_published",
    qualification:
      "All three rows are published only for the exact Suburban source heading and model year.",
    finding:
      "Each page publishes Victory Red 5T4 / WA-9260, Woodland Green 9V5 / WA-9015, and Wheatland Yellow 9W3 / WA-253A with both listed interior columns and a five-order minimum.",
    source_pages: [
      { vehicle_id: 23035, model_year: 2025, pdf_page: 64, printed_page: 64 },
      { vehicle_id: 23233, model_year: 2026, pdf_page: 68, printed_page: 68 },
    ],
  });

  Object.assign(upsertSpecialtyFinding("express"), {
    program_scope:
      "Express Cargo, Cutaway, and Passenger SEO Solid Paint Order Guide entries",
    vehicle_ids: [23014, 23015, 23016, 23276, 23277, 23278],
    publication_status: "retained_pages_visually_verified_and_published",
    qualification:
      "All eighteen printed rows are published independently for Cargo, Cutaway, and Passenger in each model year; duplicate labels are not collapsed across configurations or WA identities.",
    finding:
      "The six pages produce 108 exact configuration-color records. Every row preserves its interior columns, five-order minimum, and flat-Black extraneous-body-component rule.",
    source_pages: [
      { vehicle_id: 23014, model_year: 2025, pdf_page: 35, printed_page: 35 },
      { vehicle_id: 23015, model_year: 2025, pdf_page: 49, printed_page: 49 },
      { vehicle_id: 23016, model_year: 2025, pdf_page: 28, printed_page: 28 },
      { vehicle_id: 23276, model_year: 2026, pdf_page: 37, printed_page: 37 },
      { vehicle_id: 23277, model_year: 2026, pdf_page: 51, printed_page: 51 },
      { vehicle_id: 23278, model_year: 2026, pdf_page: 30, printed_page: 30 },
    ],
  });

  Object.assign(upsertSpecialtyFinding("silverado-hd"), {
    program_scope:
      "Silverado 2500 HD Retail and Fleet, 3500 HD CC, 3500 HD Retail and Fleet, and 4500/5500/6500 HD SEO Paint Order Guide entries",
    vehicle_ids: [22903, 22905, 22904, 23022, 23195, 23197, 23196, 23260],
    publication_status: "retained_pages_visually_verified_and_published",
    qualification:
      "All source rows are published separately by configuration and year. Literal none light-HD code cells, medium-duty codes, interior applicability, and unbound numbered notes remain source-scoped.",
    finding:
      "The eight pages produce 186 exact configuration-color records, 93 per year, representing 48 distinct source identities per year. The 5IS / WA-636R versus 5IS / WA-363R conflict and all three WA-722J variants remain explicit.",
    source_pages: [
      { vehicle_id: 22903, model_year: 2025, pdf_page: 106, printed_page: 106 },
      { vehicle_id: 22905, model_year: 2025, pdf_page: 31, printed_page: 31 },
      { vehicle_id: 22904, model_year: 2025, pdf_page: 85, printed_page: 85 },
      { vehicle_id: 23022, model_year: 2025, pdf_page: 122, printed_page: 122 },
      { vehicle_id: 23195, model_year: 2026, pdf_page: 102, printed_page: 102 },
      { vehicle_id: 23197, model_year: 2026, pdf_page: 30, printed_page: 30 },
      { vehicle_id: 23196, model_year: 2026, pdf_page: 84, printed_page: 84 },
      { vehicle_id: 23260, model_year: 2026, pdf_page: 119, printed_page: 119 },
    ],
  });

  const blazerFinding = reconciliation.specialty_findings.find(
    (finding) => finding.model_id === "blazer-ev",
  );
  Object.assign(blazerFinding, {
    program_scope: "Blazer EV Police Package 9C1 and 9C3 Order Guide entries",
    vehicle_ids: [22887, 23158],
    seo_color_count_per_year: 4,
    publication_status: "retained_pages_visually_verified_and_published",
    qualification:
      "The exact four-row SEO table is published for 9C1 and 9C3 only. The 2025 A cells and controlling row footnotes are both preserved; no 5W4 applicability is inferred from these pages.",
    finding:
      "Both retained police-package tables print Victory Red 5T4 / WA-9260, MSP Goose Blue 9V2 / WA-5665, Dark Blue Metallic 9V7 / WA-722J, and Silver Ice Metallic 9W5 / WA-636R. In 2025, Victory Red carries a planned-Q1-2025 note, and the other three rows are footnoted not available at the reviewed revision despite their A cells. The 2026 page has no row-specific unavailability footnotes.",
    source_pages: [
      { vehicle_id: 22887, model_year: 2025, pdf_page: 23, printed_page: 23 },
      { vehicle_id: 23158, model_year: 2026, pdf_page: 20, printed_page: 20 },
    ],
  });

  let coloradoFinding = reconciliation.specialty_findings.find(
    (finding) => finding.model_id === "colorado",
  );
  if (!coloradoFinding) {
    coloradoFinding = { model_id: "colorado", model_years: [2025, 2026] };
    reconciliation.specialty_findings.push(coloradoFinding);
  }
  Object.assign(coloradoFinding, {
    program_scope: "Colorado WT SEO Paint Order Guide entries",
    vehicle_ids: [23079, 23215],
    publication_status: "retained_pages_visually_verified_and_published",
    qualification:
      "Every row is limited to Colorado WT for its printed model year. Literal none code cells are normalized to null while the exact source literal remains recorded.",
    finding:
      "The 2025 table publishes seventeen A rows and the 2026 table publishes fourteen A rows. Both require five orders before plant submission. The archive keeps each repeated Yellow label separate by WA identity and does not apply the interior-only PCU footnote to paint availability.",
    source_pages: [
      { vehicle_id: 23079, model_year: 2025, pdf_page: 54, printed_page: 54 },
      { vehicle_id: 23215, model_year: 2026, pdf_page: 61, printed_page: 61 },
    ],
  });

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
