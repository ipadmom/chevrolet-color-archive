import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const dataUrl = new URL(
  "data/sources/modern-chevrolet-color-source-candidates.json",
  root,
);

const source2024 = {
  source_id: "gm-fleet-guide-us-2024-v3",
  archive_url:
    "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2024-gm-fleet-guide-v3-mirror.pdf",
  sha256: "7511f74a0edee3c396bbe2a42746f75d0d61871897686505f4899e65835c8851",
  bytes: 14_780_183,
  pdf_page_count: 114,
  archive_asset_name: "2024-gm-fleet-guide-v3-mirror.pdf",
};

const source2023Advance2024 = {
  source_id: "gm-fleet-guide-us-2023-v3",
  archive_url:
    "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2023-gm-fleet-guide-v3-mirror.pdf",
  sha256: "697423b1c274d8fe30f9e58fc5dc9ecf365d119f7f1155f54dc4c3fd9d8484ef",
  bytes: 17_883_996,
  pdf_page_count: 121,
  archive_asset_name: "2023-gm-fleet-guide-v3-mirror.pdf",
};

const source2025V1Advance2024 = {
  source_id: "gm-fleet-guide-us-2025-v1-r2024-05-29",
  archive_url:
    "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2025-gm-envolve-fleet-guide-v1-r2024-05-29.pdf",
  sha256: "6f968d048948ad05e20a27a8c1961ea32bf183d7159c1bd2ffa9d22b689e6867",
  bytes: 42_424_265,
  pdf_page_count: 104,
  archive_asset_name: "2025-gm-envolve-fleet-guide-v1-r2024-05-29.pdf",
};

const source2025V1Advance2024Record = {
  source_id: source2025V1Advance2024.source_id,
  title: "2025 GM Envolve Fleet Guide, first retained revision",
  publisher: "General Motors / GM Envolve",
  document_authority: "official_manufacturer_document_archival_mirror",
  source_type: "fleet_guide_pdf",
  annual_model_year_coverage_anchor: false,
  direct_official_url: null,
  retrieval_url:
    "https://xr793.com/wp-content/uploads/2024/06/2025-GM-Envolve-Fleet-Guide.pdf",
  independent_exact_hash_mirror_url:
    "https://manuals.plus/m/6f968d048948ad05e20a27a8c1961ea32bf183d7159c1bd2ffa9d22b689e6867",
  landing_url: "https://www.gmfleet.com/resources/guides-and-manuals",
  market: "United States",
  model_year_scope: [2024, 2025],
  model_scope:
    "The guide is primarily a 2025 full-line guide, but PDF pages 12 and 41 are explicitly labeled 2024 Chevrolet Equinox EV and 2024 Chevrolet Traverse.",
  revision_or_document_date: "2024-05-29",
  retrieved_at: "2026-08-04T11:35:53Z",
  page_count: source2025V1Advance2024.pdf_page_count,
  page_locator:
    "PDF page 12, 2024 Chevrolet Equinox EV exterior colors; PDF page 41, All-New 2024 Chevrolet Traverse exterior colors.",
  color_table_candidate_pdf_pages: [12, 41],
  local_file_path:
    "tmp/modern-color-sources/2025-gm-envolve-fleet-guide-v1-r2024-05-29.pdf",
  sha256: source2025V1Advance2024.sha256,
  bytes: source2025V1Advance2024.bytes,
  content_type: "application/pdf",
  limitations: [
    "This is a GM-authored United States Fleet Guide retained from an archival mirror, not a byte copy retrieved from direct official hosting.",
    "Both cited pages state that exterior colors vary by trim level.",
    "The governing 2024 U.S. Order Guide is not retained, so exact trim restrictions remain unresolved.",
    "The cited pages print color names and premium-paint footnotes but no factory paint or RPO codes.",
  ],
  archive_url: source2025V1Advance2024.archive_url,
  pdf_page_count: source2025V1Advance2024.pdf_page_count,
  archive_asset_name: source2025V1Advance2024.archive_asset_name,
};

function table({
  key,
  modelIds,
  sourceLabel,
  pages,
  colors,
  scope,
  restrictions = {},
  limitations = [],
  sourceMetadata = source2024,
}) {
  const pageLabel =
    pages.length === 1
      ? `PDF page ${pages[0]}, EXTERIOR COLORS.`
      : `PDF pages ${pages.slice(0, -1).join(", ")}, and ${pages.at(-1)}, EXTERIOR COLORS.`;
  return {
    table_id: `${sourceMetadata.source_id}:2024:${key}`,
    source_id: sourceMetadata.source_id,
    market: "United States",
    model_year: 2024,
    catalog_model_ids: modelIds,
    source_model_label: sourceLabel,
    pdf_pages: pages,
    page_locator: pageLabel,
    colors,
    availability_scope: scope,
    ingestion_status: "ready_palette_union",
    limitations: [
      "The page prints no factory paint codes.",
      ...limitations,
    ],
    ...(Object.keys(restrictions).length
      ? { color_restrictions: restrictions }
      : {}),
    archive_url: sourceMetadata.archive_url,
    sha256: sourceMetadata.sha256,
    bytes: sourceMetadata.bytes,
    pdf_page_count: sourceMetadata.pdf_page_count,
    archive_asset_name: sourceMetadata.archive_asset_name,
  };
}

const premiumCost = ["Premium paint; additional cost."];
const premiumCharge = ["Premium paint; additional charge."];

export const TABLES_2024_CURRENT_MODELS = [
  table({
    sourceMetadata: source2025V1Advance2024,
    key: "equinox-ev",
    modelIds: ["equinox-ev"],
    sourceLabel: "Chevrolet Equinox EV",
    pages: [12],
    colors: [
      "Black",
      "Galaxy Gray Metallic",
      "Iridescent Pearl Tricoat",
      "Radiant Red Tintcoat",
      "Red Hot",
      "Riptide Blue Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide palette union from a page explicitly labeled 2024 Chevrolet Equinox EV. Exterior colors vary by trim level, and the governing 2024 U.S. Order Guide is not retained.",
    restrictions: {
      "Iridescent Pearl Tricoat": premiumCharge,
      "Radiant Red Tintcoat": premiumCharge,
    },
    limitations: [
      "The page states that exterior colors vary by trim level.",
      "The governing 2024 U.S. Order Guide is not retained; exact trim restrictions remain unresolved.",
    ],
  }),
  table({
    sourceMetadata: source2025V1Advance2024,
    key: "traverse",
    modelIds: ["traverse"],
    sourceLabel: "Chevrolet Traverse",
    pages: [41],
    colors: [
      "Harvest Bronze Metallic",
      "Iridescent Pearl Tricoat",
      "Lakeshore Blue Metallic",
      "Mosaic Black Metallic",
      "Radiant Red Tintcoat",
      "Stardust Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide palette union from a page explicitly labeled All-New 2024 Chevrolet Traverse. Exterior colors vary by trim level, and the governing 2024 U.S. Order Guide is not retained.",
    restrictions: {
      "Iridescent Pearl Tricoat": premiumCharge,
      "Radiant Red Tintcoat": premiumCharge,
    },
    limitations: [
      "The page states that exterior colors vary by trim level.",
      "The governing 2024 U.S. Order Guide is not retained; exact trim restrictions remain unresolved.",
    ],
  }),
  table({
    key: "blazer-ev",
    modelIds: ["blazer-ev"],
    sourceLabel: "Chevrolet Blazer EV",
    pages: [17],
    colors: [
      "Black",
      "Galaxy Gray Metallic",
      "Iridescent Pearl Tricoat",
      "Radiant Red Tintcoat",
      "Red Hot",
      "Riptide Blue Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide model-page palette union for regular Blazer EV; exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: {
      "Iridescent Pearl Tricoat": premiumCharge,
      "Radiant Red Tintcoat": premiumCharge,
    },
  }),
  table({
    key: "silverado-ev",
    modelIds: ["silverado-ev"],
    sourceLabel: "Chevrolet Silverado EV",
    pages: [20],
    colors: ["Black", "Summit White"],
    scope:
      "Visually verified GM Fleet Guide palette for 2024 Silverado EV WT 3WT and 4WT; exact option restrictions require the governing Order Guide.",
    restrictions: {
      Black: ["Late model year availability."],
    },
  }),
  table({
    key: "corvette",
    modelIds: ["corvette"],
    sourceLabel: "Chevrolet Corvette Stingray, Z06, and E-Ray",
    pages: [32],
    colors: [
      "Accelerate Yellow Metallic",
      "Amplify Orange Tintcoat",
      "Arctic White",
      "Black",
      "Cacti Green",
      "Carbon Flash Metallic",
      "Ceramic Matrix Gray Metallic",
      "Hypersonic Gray Metallic",
      "Rapid Blue",
      "Red Mist Metallic Tintcoat",
      "Riptide Blue Metallic",
      "Sea Wolf Gray Tricoat",
      "Silver Flare Metallic",
      "Torch Red",
    ],
    scope:
      "Visually verified GM Fleet Guide model-page palette union for Corvette Stingray, Z06, and E-Ray; exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: Object.fromEntries(
      [
        "Accelerate Yellow Metallic",
        "Amplify Orange Tintcoat",
        "Rapid Blue",
        "Red Mist Metallic Tintcoat",
        "Sea Wolf Gray Tricoat",
      ].map((color) => [color, premiumCost]),
    ),
  }),
  table({
    key: "trax",
    modelIds: ["trax"],
    sourceLabel: "Chevrolet Trax",
    pages: [36],
    colors: [
      "Blue Glow Metallic",
      "Cacti Green",
      "Cayenne Orange Metallic",
      "Crimson Metallic",
      "Fountain Blue",
      "Harvest Bronze Metallic",
      "Mosaic Black Metallic",
      "Nitro Yellow Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide model-page palette union for Trax; exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: {
      "Cacti Green": ["Late model year availability."],
      "Cayenne Orange Metallic": premiumCost,
      "Fountain Blue": premiumCost,
      "Nitro Yellow Metallic": premiumCost,
    },
  }),
  table({
    key: "trailblazer",
    modelIds: ["trailblazer"],
    sourceLabel: "Chevrolet Trailblazer",
    pages: [37],
    colors: [
      "Cacti Green",
      "Copper Harbor Metallic",
      "Crimson Metallic",
      "Fountain Blue",
      "Iridescent Pearl Tricoat",
      "Mosaic Black Metallic",
      "Nitro Yellow Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide model-page palette union for Trailblazer; exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: {
      "Fountain Blue": premiumCost,
      "Iridescent Pearl Tricoat": premiumCost,
      "Nitro Yellow Metallic": premiumCost,
    },
  }),
  table({
    key: "equinox",
    modelIds: ["equinox"],
    sourceLabel: "Chevrolet Equinox",
    pages: [40],
    colors: [
      "Harvest Bronze Metallic",
      "Iridescent Pearl Tricoat",
      "Lakeshore Blue Metallic",
      "Mosaic Black Metallic",
      "Radiant Red Tintcoat",
      "Riptide Blue Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide model-page palette union for Equinox; exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: {
      "Iridescent Pearl Tricoat": premiumCost,
      "Radiant Red Tintcoat": premiumCost,
    },
  }),
  table({
    key: "blazer",
    modelIds: ["blazer"],
    sourceLabel: "Chevrolet Blazer",
    pages: [47],
    colors: [
      "Black",
      "Copper Bronze Metallic",
      "Iridescent Pearl Tricoat",
      "Nitro Yellow Metallic",
      "Radiant Red Tintcoat",
      "Red Hot",
      "Riptide Blue Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide model-page palette union for Blazer; exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: {
      "Iridescent Pearl Tricoat": premiumCost,
      "Nitro Yellow Metallic": premiumCost,
      "Radiant Red Tintcoat": premiumCost,
    },
  }),
  table({
    key: "tahoe",
    modelIds: ["tahoe"],
    sourceLabel: "Chevrolet Tahoe",
    pages: [53],
    colors: [
      "Black",
      "Dark Ash Metallic",
      "Empire Beige Metallic",
      "Iridescent Pearl Tricoat",
      "Midnight Blue Metallic",
      "Radiant Red Tintcoat",
      "Silver Sage Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide model-page palette union for regular Tahoe; exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: {
      "Iridescent Pearl Tricoat": premiumCost,
      "Radiant Red Tintcoat": premiumCost,
    },
  }),
  table({
    key: "colorado",
    modelIds: ["colorado"],
    sourceLabel: "Chevrolet Colorado",
    pages: [61],
    colors: [
      "Black",
      "Glacier Blue Metallic",
      "Harvest Bronze Metallic",
      "Nitro Yellow Metallic",
      "Radiant Red Tintcoat",
      "Sand Dune Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide model-page palette union for Colorado; exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: {
      "Glacier Blue Metallic": premiumCost,
      "Nitro Yellow Metallic": premiumCost,
      "Radiant Red Tintcoat": premiumCost,
    },
  }),
  table({
    key: "silverado-1500",
    modelIds: ["silverado"],
    sourceLabel: "Chevrolet Silverado 1500",
    pages: [66],
    colors: [
      "Black",
      "Dark Ash Metallic",
      "Glacier Blue Metallic",
      "Harvest Bronze Metallic",
      "Iridescent Pearl Tricoat",
      "Lakeshore Blue Metallic",
      "Radiant Red Tintcoat",
      "Red Hot",
      "Slate Gray Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide model-page palette union for regular Silverado 1500; exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: {
      "Glacier Blue Metallic": premiumCost,
      "Iridescent Pearl Tricoat": premiumCost,
      "Radiant Red Tintcoat": premiumCost,
    },
  }),
  table({
    key: "silverado-hd",
    modelIds: ["silverado-hd"],
    sourceLabel: "Chevrolet Silverado 2500 HD and 3500 HD",
    pages: [70],
    colors: [
      "Auburn Metallic",
      "Black",
      "Dark Ash Metallic",
      "Iridescent Pearl Tricoat",
      "Lakeshore Blue Metallic",
      "Red Hot",
      "Slate Gray Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide body-series palette for Silverado 2500 HD and 3500 HD; exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: {
      "Iridescent Pearl Tricoat": premiumCost,
    },
  }),
  table({
    key: "silverado-3500-chassis-cab",
    modelIds: ["silverado-hd"],
    sourceLabel: "Chevrolet Silverado 3500 HD Chassis Cab",
    pages: [76],
    colors: [
      "Auburn Metallic",
      "Black",
      "Dark Ash Metallic",
      "Iridescent Pearl Tricoat",
      "Lakeshore Blue Metallic",
      "Radiant Red Tintcoat",
      "Red Hot",
      "Slate Gray Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide body-series palette for Silverado 3500 HD Chassis Cab; exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: {
      "Iridescent Pearl Tricoat": premiumCost,
      "Radiant Red Tintcoat": premiumCost,
    },
  }),
  table({
    key: "silverado-4500-6500-hd",
    modelIds: ["silverado-hd"],
    sourceLabel: "Chevrolet Silverado 4500 HD, 5500 HD, and 6500 HD Chassis Cab",
    pages: [77],
    colors: [
      "Auburn Metallic",
      "Black",
      "Dark Ash Metallic",
      "Glacier Blue Metallic",
      "Greenstone Metallic",
      "Lakeshore Blue Metallic",
      "Northsky Blue Metallic",
      "Red Hot",
      "Silver Ice Metallic",
      "Slate Gray Metallic",
      "Sterling Gray Metallic",
      "Summit White",
    ],
    scope:
      "Visually verified GM Fleet Guide body-series palette for Silverado 4500 HD, 5500 HD, and 6500 HD Chassis Cab; exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: {
      "Glacier Blue Metallic": premiumCost,
    },
  }),
  table({
    key: "express",
    modelIds: ["express"],
    sourceLabel: "Chevrolet Express Passenger, Cargo, and Cutaway",
    pages: [87, 89, 91],
    colors: ["Black", "Red Hot", "Silver Ice Metallic", "Summit White"],
    scope:
      "Visually verified GM Fleet Guide palette union shared by the listed Express Passenger, Cargo, and Cutaway configurations; exact option restrictions require the governing Order Guide.",
  }),
  table({
    sourceMetadata: source2023Advance2024,
    key: "low-cab-forward",
    modelIds: ["low-cab-forward"],
    sourceLabel:
      "Chevrolet Low Cab Forward and Low Cab Forward 6500 XD/7500 XD",
    pages: [77, 78],
    colors: [
      "Arc White",
      "Cardinal Red",
      "Dark Blue",
      "Ebony Black",
      "Wheatland Yellow",
      "Woodland Green",
    ],
    scope:
      "Visually verified 2024 GM Fleet Guide palette union. PDF page 77 lists six colors for 3500 HG through 5500 XD; PDF page 78 lists Arc White only for 6500 XD and 7500 XD. Exterior colors vary by trim level and exact restrictions require the governing Order Guide.",
    restrictions: Object.fromEntries(
      [
        "Cardinal Red",
        "Dark Blue",
        "Ebony Black",
        "Wheatland Yellow",
        "Woodland Green",
      ].map((color) => [
        color,
        [
          "Shown on the 2024 3500 HG through 5500 XD Low Cab Forward page; the separate 6500 XD/7500 XD page lists Arc White only.",
        ],
      ]),
    ),
  }),
];

const data = JSON.parse(await readFile(dataUrl, "utf8"));
data.sources = [
  ...data.sources.filter(
    ({ source_id }) => source_id !== source2025V1Advance2024Record.source_id,
  ),
  source2025V1Advance2024Record,
];
const tableIds = new Set(TABLES_2024_CURRENT_MODELS.map(({ table_id }) => table_id));
data.verified_palette_tables = [
  ...data.verified_palette_tables.filter(({ table_id }) => !tableIds.has(table_id)),
  ...TABLES_2024_CURRENT_MODELS,
];
data.summary.verified_palette_table_count = data.verified_palette_tables.length;
data.summary.source_count = data.sources.length;
const retainedFleetGuides = data.sources.filter(
  ({ source_type, local_file_path }) =>
    source_type === "fleet_guide_pdf" && Boolean(local_file_path),
);
data.summary.fleet_guide_document_count = retainedFleetGuides.length;
data.summary.downloaded_complete_pdf_count = retainedFleetGuides.length;
data.summary.downloaded_complete_pdf_bytes = retainedFleetGuides.reduce(
  (total, { bytes }) => total + bytes,
  0,
);

await writeFile(dataUrl, `${JSON.stringify(data, null, 2)}\n`, "utf8");
