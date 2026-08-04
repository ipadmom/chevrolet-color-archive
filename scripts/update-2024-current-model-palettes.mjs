import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const dataUrl = new URL(
  "data/sources/modern-chevrolet-color-source-candidates.json",
  root,
);

const source = {
  source_id: "gm-fleet-guide-us-2024-v3",
  archive_url:
    "https://github.com/ipadmom/chevrolet-color-archive/releases/download/brochure-source-archive-v1/2024-gm-fleet-guide-v3-mirror.pdf",
  sha256: "7511f74a0edee3c396bbe2a42746f75d0d61871897686505f4899e65835c8851",
  bytes: 14_780_183,
  pdf_page_count: 114,
  archive_asset_name: "2024-gm-fleet-guide-v3-mirror.pdf",
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
}) {
  const pageLabel =
    pages.length === 1
      ? `PDF page ${pages[0]}, EXTERIOR COLORS.`
      : `PDF pages ${pages.slice(0, -1).join(", ")}, and ${pages.at(-1)}, EXTERIOR COLORS.`;
  return {
    table_id: `${source.source_id}:2024:${key}`,
    source_id: source.source_id,
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
    archive_url: source.archive_url,
    sha256: source.sha256,
    bytes: source.bytes,
    pdf_page_count: source.pdf_page_count,
    archive_asset_name: source.archive_asset_name,
  };
}

const premiumCost = ["Premium paint; additional cost."];
const premiumCharge = ["Premium paint; additional charge."];

export const TABLES_2024_CURRENT_MODELS = [
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
];

const data = JSON.parse(await readFile(dataUrl, "utf8"));
const tableIds = new Set(TABLES_2024_CURRENT_MODELS.map(({ table_id }) => table_id));
data.verified_palette_tables = [
  ...data.verified_palette_tables.filter(({ table_id }) => !tableIds.has(table_id)),
  ...TABLES_2024_CURRENT_MODELS,
];
data.summary.verified_palette_table_count = data.verified_palette_tables.length;

await writeFile(dataUrl, `${JSON.stringify(data, null, 2)}\n`, "utf8");
