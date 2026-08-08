import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactLedger = JSON.parse(
  await readFile(path.join(root, "data/sources/gm-heritage-chevrolet-artifacts.json"), "utf8"),
);
const releaseManifest = JSON.parse(
  await readFile(path.join(root, "data/sources/brochure-source-release-manifest.json"), "utf8"),
);

const slug = (value) => value
  .normalize("NFKD")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

function color(name, sourceColorCode, waNumber, extra = {}) {
  const normalizedWa = waNumber
    ?.split("/")
    .map((value) => value.startsWith("WA-") ? value : `WA-${value}`)
    .join("/");
  return {
    identity_key: slug(name),
    name,
    source_label: name,
    source_color_code: sourceColorCode,
    factory_code: sourceColorCode === "none" ? null : sourceColorCode,
    wa_number: normalizedWa,
    ...extra,
  };
}

function pair(primary, secondary, primaryCode, secondaryCode, primaryWa, secondaryWa, extra = {}) {
  const name = `${primary} / ${secondary}`;
  return color(name, `${primaryCode}/${secondaryCode}`, `${primaryWa}/${secondaryWa}`, extra);
}

const sourceIds = Array.from(
  { length: 6 },
  (_, index) => `gm-heritage-${2002 + index}-chevrolet-trailblazer`,
);

function releaseEntry(sourceId) {
  return (releaseManifest.entries ?? []).find((entry) =>
    entry.source_id === sourceId || entry.source_ids?.includes(sourceId),
  );
}

const sources = sourceIds.map((sourceId) => {
  const artifact = artifactLedger.entries.find((entry) => entry.source_id === sourceId);
  if (!artifact) throw new Error(`Missing artifact ${sourceId}`);
  const archived = releaseEntry(sourceId);
  return {
    source_id: sourceId,
    title: artifact.title,
    publisher: "General Motors",
    source_type: "official_vehicle_information_kit",
    content_type: "application/pdf",
    url: artifact.canonical_url,
    archive_url: archived?.archive_url ?? archived?.release_url ?? null,
    archive_status: archived ? "archived_in_public_release" : "retained_in_crawler_pending_public_release",
    crawler_archive_relpath: artifact.crawler_object_relpath,
    document_authority: "official_manufacturer_document",
    retrieval_host_type: "official_live",
    sha256: artifact.artifact_sha256,
    bytes: artifact.byte_length,
    pdf_page_count: artifact.pdf_page_count,
    retrieved_at: artifact.completed_at,
  };
});

const palettes2003 = [
  {
    program_id: "trailblazer-zy1",
    program_label: "TrailBlazer solid paint ZY1",
    variant: "TrailBlazer",
    application_type: "factory_regular_solid_paint",
    evidence_class: "exact_governing_palette",
    paint_scheme: "ZY1",
    claim_scope: "Complete TrailBlazer ZY1 exterior color chart.",
    source_ref: {
      source_id: sourceIds[1],
      pdf_pages: [137],
      printed_page_label: "TrailBlazer Color and Trim page 1",
      section: "TrailBlazer Interior and Exterior Color Availability Chart with ZY1 Paint",
      revision: "Published March 4, 2005; the date conflicts with the 2003 model year title and is preserved as printed",
    },
    colors: [
      color("Light Pewter Metallic", "11U", "382E"),
      color("Indigo Blue Metallic", "39U", "9792"),
      color("Black", "41U", "8555"),
      color("Dark Green Metallic", "47U", "9539"),
      color("Summit White", "50U", "8624"),
      color("Sandalwood Metallic", "58U", "711J"),
      color("Dark Gray Metallic", "62U", "805K"),
      color("Majestic Red Metallic", "86U", "379E", {
        restriction: "Extra charge; not available on LS.",
      }),
      color("Silver Green Metallic", "92U", "816K"),
    ],
  },
  {
    program_id: "trailblazer-zy7",
    program_label: "TrailBlazer special two tone paint ZY7",
    variant: "TrailBlazer",
    application_type: "factory_two_tone_paint",
    evidence_class: "qualified_exact_program_palette",
    paint_scheme: "ZY7",
    claim_scope: "Complete TrailBlazer ZY7 upper and lower paint combination chart.",
    source_ref: {
      source_id: sourceIds[1],
      pdf_pages: [138],
      printed_page_label: "TrailBlazer Color and Trim page 2",
      section: "TrailBlazer Interior and Exterior Color Availability Chart with ZY7 Paint",
      revision: "Published March 4, 2005; the date conflicts with the 2003 model year title and is preserved as printed",
    },
    colors: [
      pair("Indigo Blue Metallic", "Light Pewter Metallic", "39U", "11L", "9792", "382E"),
      pair("Indigo Blue Metallic", "Sandalwood Metallic", "39U", "58L", "9792", "711J"),
      pair("Black", "Light Pewter Metallic", "41U", "11L", "8555", "382E"),
      pair("Black", "Sandalwood Metallic", "41U", "58L", "8555", "711J"),
      pair("Dark Green Metallic", "Light Pewter Metallic", "47U", "11L", "9539", "382E"),
      pair("Dark Green Metallic", "Sandalwood Metallic", "47U", "58L", "9539", "711J"),
      pair("Summit White", "Light Pewter Metallic", "50U", "11L", "8624", "382E"),
      pair("Dark Gray Metallic", "Light Pewter Metallic", "62U", "11L", "805K", "382E"),
      pair("Majestic Red Metallic", "Light Pewter Metallic", "86U", "11L", "379E", "382E", {
        restriction: "Extra charge.",
      }),
      pair("Majestic Red Metallic", "Sandalwood Metallic", "86U", "58L", "379E", "711J", {
        restriction: "Extra charge.",
      }),
      pair("Silver Green Metallic", "Light Pewter Metallic", "92U", "11L", "816K", "382E"),
      pair("Silver Green Metallic", "Sandalwood Metallic", "92U", "58L", "816K", "711J"),
    ],
  },
  {
    program_id: "trailblazer-ext-zy1",
    program_label: "TrailBlazer EXT solid paint ZY1",
    variant: "TrailBlazer EXT",
    application_type: "factory_regular_solid_paint",
    evidence_class: "qualified_exact_program_palette",
    paint_scheme: "ZY1",
    claim_scope: "Complete TrailBlazer EXT ZY1 exterior color chart.",
    source_ref: {
      source_id: sourceIds[1],
      pdf_pages: [170],
      printed_page_label: "TrailBlazer EXT Color and Trim page 1",
      section: "TrailBlazer EXT Interior and Exterior Color Availability Chart with ZY1 Paint",
      revision: "Published March 4, 2005; the date conflicts with the 2003 model year title and is preserved as printed",
    },
    colors: [
      color("Light Pewter Metallic", "11U", "382E"),
      color("Indigo Blue Metallic", "39U", "9792"),
      color("Black", "41U", "8555"),
      color("Dark Green Metallic", "47U", "9539"),
      color("Summit White", "50U", "8624"),
      color("Sandalwood Metallic", "58U", "711J"),
      color("Dark Gray Metallic", "62U", "805K"),
      color("Majestic Red Metallic", "86U", "379E", { restriction: "Extra charge; not available on LS." }),
      color("Silver Green Metallic", "92U", "816K"),
    ],
  },
  {
    program_id: "trailblazer-ext-zy7-y92",
    program_label: "TrailBlazer EXT and North Face special two tone paint ZY7",
    variant: "TrailBlazer EXT and North Face",
    application_type: "factory_two_tone_paint",
    evidence_class: "qualified_exact_program_palette",
    paint_scheme: "ZY7 / Y92",
    claim_scope: "Complete TrailBlazer EXT LT and North Face two tone combination chart.",
    source_ref: {
      source_id: sourceIds[1],
      pdf_pages: [171],
      printed_page_label: "TrailBlazer EXT Color and Trim page 2",
      section: "TrailBlazer EXT Interior and Exterior Color Availability Chart with ZY7 Paint",
      revision: "Published March 4, 2005; the date conflicts with the 2003 model year title and is preserved as printed",
    },
    colors: [
      pair("Light Pewter Metallic", "Dark Gray Metallic", "11U", "62L", "382E", "805K"),
      pair("Black", "Light Pewter Metallic", "41U", "11L", "8555", "382E"),
      pair("Summit White", "Light Pewter Metallic", "50U", "11L", "8624", "382E"),
      pair("Summit White", "Dark Gray Metallic", "50U", "62L", "8624", "805K"),
      pair("Majestic Red Metallic", "Light Pewter Metallic", "86U", "11L", "379E", "382E", { restriction: "Extra charge." }),
      pair("Majestic Red Metallic", "Dark Gray Metallic", "86U", "62L", "379E", "805K", { restriction: "Extra charge." }),
      pair("Silver Green Metallic", "Light Pewter Metallic", "92U", "11L", "816K", "382E"),
    ],
  },
];

const regular2005 = [
  color("Sandstone Metallic", "15U", "929L"),
  color("Graystone Metallic", "16U", "213M"),
  color("Superior Blue Metallic", "22U", "703J"),
  color("Emerald Jewel Metallic", "38U", "215M"),
  color("Black", "41U", "8555"),
  color("Medium Red Metallic", "44U", "408G"),
  color("Summit White", "50U", "8624"),
  color("Dark Gray Metallic", "62U", "805K"),
  color("Silverstone Metallic", "67U", "994L"),
  color("Majestic Red Metallic", "86U", "379E", { restriction: "Extra charge; not available on LS." }),
];

const pair2005 = [
  pair("Superior Blue Metallic", "Silverstone Metallic", "22U", "67L", "703J", "994L"),
  pair("Emerald Jewel Metallic", "Sandstone Metallic", "38U", "15L", "215M", "929L"),
  pair("Emerald Jewel Metallic", "Silverstone Metallic", "38U", "67L", "215M", "994L"),
  pair("Black", "Sandstone Metallic", "41U", "15L", "8555", "929L"),
  pair("Black", "Silverstone Metallic", "41U", "67L", "8555", "994L"),
  pair("Medium Red Metallic", "Sandstone Metallic", "44U", "15L", "408G", "929L"),
  pair("Medium Red Metallic", "Silverstone Metallic", "44U", "67L", "408G", "994L"),
  pair("Summit White", "Silverstone Metallic", "50U", "67L", "8624", "994L"),
  pair("Dark Gray Metallic", "Silverstone Metallic", "62U", "67L", "805K", "994L"),
  pair("Majestic Red Metallic", "Sandstone Metallic", "86U", "15L", "379E", "929L", { restriction: "Extra charge." }),
  pair("Majestic Red Metallic", "Silverstone Metallic", "86U", "67L", "379E", "994L", { restriction: "Extra charge." }),
];

function standardProgram({ year, page, extPage, revision, regular, pairs, specialty }) {
  const sourceId = `gm-heritage-${year}-chevrolet-trailblazer`;
  const programs = [
    {
      program_id: "trailblazer-zy1",
      program_label: "TrailBlazer solid paint ZY1",
      variant: "TrailBlazer",
      application_type: "factory_regular_solid_paint",
      evidence_class: "exact_governing_palette",
      paint_scheme: "ZY1",
      claim_scope: "Complete TrailBlazer ZY1 exterior color chart.",
      source_ref: {
        source_id: sourceId,
        pdf_pages: [page],
        printed_page_label: "TrailBlazer Color and Trim page 1",
        section: "TrailBlazer Interior and Exterior Color Availability Chart with ZY1 Paint",
        revision,
      },
      colors: regular,
    },
    {
      program_id: "trailblazer-zy7",
      program_label: "TrailBlazer special two tone paint ZY7",
      variant: "TrailBlazer",
      application_type: "factory_two_tone_paint",
      evidence_class: "qualified_exact_program_palette",
      paint_scheme: "ZY7",
      claim_scope: "Complete TrailBlazer ZY7 upper and lower paint combination chart.",
      source_ref: {
        source_id: sourceId,
        pdf_pages: [page + 1],
        printed_page_label: "TrailBlazer Color and Trim page 2",
        section: "TrailBlazer Interior and Exterior Color Availability Chart with ZY7 Paint",
        revision,
      },
      colors: pairs,
    },
    {
      program_id: "trailblazer-seo-solid",
      program_label: "TrailBlazer special equipment solid paint",
      variant: "TrailBlazer LS fleet program",
      application_type: "special_equipment_option_paint",
      evidence_class: "qualified_exact_program_palette",
      paint_scheme: "SEO solid paint",
      claim_scope: "Complete TrailBlazer special equipment solid paint list and printed ordering restrictions.",
      program_restriction: year === 2005
        ? "Fleet program. Special paint requires TGK; see the adjacent SEO options chart."
        : year === 2006
          ? "Available only on base LS 1SA; requires TGK and substitutes dark gray or black front and rear fascias for color keyed fascias."
          : "Available only on LS; requires TGK where printed, and all non sheet metal parts are gloss Black.",
      source_ref: {
        source_id: sourceId,
        pdf_pages: [page + 2, ...(year === 2005 ? [page + 3] : [page + 3])],
        printed_page_label: "TrailBlazer Color and Trim SEO pages",
        section: "SEO Solid Paint and SEO Options",
        revision,
      },
      colors: specialty,
    },
    {
      program_id: "trailblazer-ext-zy1",
      program_label: "TrailBlazer EXT solid paint ZY1",
      variant: "TrailBlazer EXT",
      application_type: "factory_regular_solid_paint",
      evidence_class: "qualified_exact_program_palette",
      paint_scheme: "ZY1",
      claim_scope: "Complete TrailBlazer EXT ZY1 exterior color chart.",
      source_ref: {
        source_id: sourceId,
        pdf_pages: [extPage],
        printed_page_label: "TrailBlazer EXT Color and Trim page 1",
        section: "TrailBlazer EXT Interior and Exterior Color Availability Chart with ZY1 Paint",
        revision,
      },
      colors: regular,
    },
  ];
  return programs;
}

const regular2006 = [
  color("Sandstone Metallic", "15U", "929L"),
  color("Graystone Metallic", "16U", "213M"),
  color("Superior Blue Metallic", "22U", "703J"),
  color("Emerald Jewel Metallic", "38U", "215M"),
  color("Black", "41U", "8555"),
  color("Bordeaux Red Metallic", "49U", "204M"),
  color("Summit White", "50U", "8624"),
  color("Dark Gray Metallic", "62U", "805K"),
  color("Silverstone Metallic", "67U", "994L"),
  color("Red Jewel Tintcoat", "80U", "301N", {
    restriction: "Extra charge; not available on LS. Only Black, Summit White, and Silverstone Metallic are otherwise printed as available on SS.",
  }),
];

const pair2006 = [
  pair("Superior Blue Metallic", "Silverstone Metallic", "22U", "67L", "703J", "994L"),
  pair("Emerald Jewel Metallic", "Sandstone Metallic", "38U", "15L", "215M", "929L"),
  pair("Black", "Sandstone Metallic", "41U", "15L", "8555", "929L"),
  pair("Black", "Silverstone Metallic", "41U", "67L", "8555", "994L"),
  pair("Bordeaux Red Metallic", "Sandstone Metallic", "49U", "15L", "204M", "929L"),
  pair("Bordeaux Red Metallic", "Silverstone Metallic", "49U", "67L", "204M", "994L"),
  pair("Summit White", "Silverstone Metallic", "50U", "67L", "8624", "994L"),
  pair("Dark Gray Metallic", "Silverstone Metallic", "62U", "67L", "805K", "994L"),
  pair("Red Jewel Tintcoat", "Sandstone Metallic", "80U", "15L", "301N", "929L", { restriction: "Extra charge." }),
  pair("Red Jewel Tintcoat", "Silverstone Metallic", "80U", "67L", "301N", "994L", { restriction: "Extra charge." }),
];

const regular2007 = [
  color("Sandstone Metallic", "15U", "929L"),
  color("Graystone Metallic", "16U", "213M"),
  color("Moondust Metallic", "32U", "407P"),
  color("Imperial Blue Metallic", "37U", "403P", { restriction: "Available on SS." }),
  color("Black", "41U", "8555", { restriction: "Available on SS." }),
  color("Bordeaux Red Metallic", "49U", "204M"),
  color("Summit White", "50U", "8624", { restriction: "Available on SS." }),
  color("Graphite Metallic", "54U", "323N"),
  color("Silverstone Metallic", "67U", "994L", { restriction: "Available on SS." }),
  color("Red Jewel Tintcoat", "80U", "301N", { restriction: "Extra charge; available on SS beginning August 2006." }),
];

const pair2007 = [
  pair("Imperial Blue Metallic", "Silverstone Metallic", "37U", "67L", "403P", "994L"),
  pair("Black", "Sandstone Metallic", "41U", "15L", "8555", "929L"),
  pair("Black", "Silverstone Metallic", "41U", "67L", "8555", "994L"),
  pair("Bordeaux Red Metallic", "Sandstone Metallic", "49U", "15L", "204M", "929L"),
  pair("Bordeaux Red Metallic", "Silverstone Metallic", "49U", "67L", "204M", "994L"),
  pair("Summit White", "Silverstone Metallic", "50U", "67L", "8624", "994L"),
  pair("Graphite Metallic", "Silverstone Metallic", "54U", "67L", "323N", "994L"),
  pair("Red Jewel Tintcoat", "Sandstone Metallic", "80U", "15L", "301N", "929L"),
  pair("Red Jewel Tintcoat", "Silverstone Metallic", "80U", "67L", "301N", "994L"),
].map((entry) => ({ ...entry, restriction: "Available with YC6 TrailBlazer LT Package 2 only." }));

const years = [
  {
    year: 2002,
    coverage_status: "reviewed_official_kit_no_governing_color_chart",
    complete_regular_palette: false,
    availability_scope: "The complete retained official TrailBlazer kit was reviewed; it contains technical and restoration information but no governing exterior color chart.",
    limitations: [
      "No exact exterior color palette is published from this source.",
      "No color is projected from 2003 or from a secondary summary.",
    ],
    program_presence_audit: [
      { program_type: "trailblazer_regular_paint", status: "not_located_in_complete_reviewed_kit" },
      { program_type: "trailblazer_two_tone_paint", status: "not_located_in_complete_reviewed_kit" },
      { program_type: "trailblazer_special_equipment_paint", status: "not_located_in_complete_reviewed_kit" },
    ],
    reviewed_source_refs: [{ source_id: sourceIds[0], pdf_pages: [1, 84] }],
    palettes: [],
  },
  {
    year: 2003,
    coverage_status: "verified_complete_regular_and_variant_programs",
    complete_regular_palette: true,
    availability_scope: "Complete regular TrailBlazer ZY1 chart plus separate TrailBlazer ZY7, TrailBlazer EXT ZY1, and EXT or North Face ZY7 programs.",
    limitations: [
      "The source prints a March 4, 2005 publication date inside a 2003 model year kit. The anomaly is preserved exactly and does not alter the model year scope.",
      "No SEO paint table was located on the reviewed TrailBlazer SEO options page.",
    ],
    program_presence_audit: [
      { program_type: "trailblazer_regular_zy1", status: "located_and_transcribed", pdf_pages: [137] },
      { program_type: "trailblazer_two_tone_zy7", status: "located_and_transcribed", pdf_pages: [138] },
      { program_type: "trailblazer_seo_paint", status: "reviewed_no_paint_table", pdf_pages: [139] },
      { program_type: "trailblazer_ext_regular_zy1", status: "located_and_transcribed", pdf_pages: [170] },
      { program_type: "trailblazer_ext_two_tone_zy7_y92", status: "located_and_transcribed", pdf_pages: [171] },
    ],
    palettes: palettes2003,
  },
  {
    year: 2004,
    coverage_status: "reviewed_official_kit_no_governing_color_chart",
    complete_regular_palette: false,
    availability_scope: "The complete retained official TrailBlazer kit was reviewed; no governing color and trim table or exact exterior paint chart was located.",
    limitations: [
      "No exact exterior color palette is published from this source.",
      "Secondary refinish lists and trim pages were not promoted to a complete factory palette.",
    ],
    program_presence_audit: [
      { program_type: "trailblazer_regular_paint", status: "not_located_in_complete_reviewed_kit" },
      { program_type: "trailblazer_two_tone_paint", status: "not_located_in_complete_reviewed_kit" },
      { program_type: "trailblazer_special_equipment_paint", status: "not_located_in_complete_reviewed_kit" },
    ],
    reviewed_source_refs: [{ source_id: sourceIds[2], pdf_pages: [1, 110] }],
    palettes: [],
  },
  {
    year: 2005,
    coverage_status: "verified_complete_regular_and_specialty_programs",
    complete_regular_palette: true,
    availability_scope: "Complete regular ZY1 chart plus separate ZY7, SEO solid paint, and EXT ZY1 programs.",
    limitations: [
      "The EXT chart states that no separate two tone data were available; no EXT two tone palette is inferred.",
      "The SEO restriction is preserved separately from the regular palette.",
    ],
    program_presence_audit: [
      { program_type: "trailblazer_regular_zy1", status: "located_and_transcribed", pdf_pages: [134] },
      { program_type: "trailblazer_two_tone_zy7", status: "located_and_transcribed", pdf_pages: [135] },
      { program_type: "trailblazer_seo_solid", status: "located_and_transcribed", pdf_pages: [136, 137] },
      { program_type: "trailblazer_ext_regular_zy1", status: "located_and_transcribed", pdf_pages: [173] },
      { program_type: "trailblazer_ext_two_tone", status: "source_explicitly_no_data", pdf_pages: [174] },
    ],
    palettes: standardProgram({
      year: 2005,
      page: 134,
      extPage: 173,
      revision: "Published February 4, 2005",
      regular: regular2005,
      pairs: pair2005,
      specialty: [
        color("Woodland Green", "9V5", "9015", { seo_code: "9V5" }),
        color("Doeskin Tan", "9V9", "9403", { seo_code: "9V9" }),
        color("Tangier Orange", "9W4", "9417", { seo_code: "9W4" }),
        color("Yellow", "none", "9418"),
        color("Indigo Blue", "none", "9792"),
      ],
    }),
  },
  {
    year: 2006,
    coverage_status: "verified_complete_regular_and_specialty_programs",
    complete_regular_palette: true,
    availability_scope: "Complete regular ZY1 chart plus separate ZY7, SEO solid paint, and EXT ZY1 programs.",
    limitations: [
      "The EXT chart states that no further color data were available; no EXT two tone palette is inferred.",
      "SS restrictions are retained on the regular colors and are not treated as a separate complete SS palette.",
    ],
    program_presence_audit: [
      { program_type: "trailblazer_regular_zy1", status: "located_and_transcribed", pdf_pages: [149] },
      { program_type: "trailblazer_two_tone_zy7", status: "located_and_transcribed", pdf_pages: [150] },
      { program_type: "trailblazer_seo_solid", status: "located_and_transcribed", pdf_pages: [151, 152] },
      { program_type: "trailblazer_ext_regular_zy1", status: "located_and_transcribed", pdf_pages: [186] },
      { program_type: "trailblazer_ext_two_tone", status: "source_explicitly_no_further_data", pdf_pages: [187] },
    ],
    palettes: standardProgram({
      year: 2006,
      page: 149,
      extPage: 186,
      revision: "Published July 29, 2005",
      regular: regular2006,
      pairs: pair2006,
      specialty: [
        color("Doeskin Tan", "9V9", "9403", { seo_code: "9V9" }),
        color("Tangier Orange", "9W4", "9417", { seo_code: "9W4" }),
        color("Wheatland Yellow", "9W3", "9418", { seo_code: "9W3" }),
        color("Woodland Green", "9V5", "9015", { seo_code: "9V5" }),
      ],
    }),
  },
  {
    year: 2007,
    coverage_status: "verified_complete_regular_and_specialty_programs",
    complete_regular_palette: true,
    availability_scope: "Complete regular ZY1 chart plus separate ZY7 and SEO solid paint programs.",
    limitations: [
      "The two tone combinations are restricted to YC6 TrailBlazer LT Package 2.",
      "The SEO chart prints no numeric color code for Yellow or Indigo Blue; no code is inferred.",
    ],
    program_presence_audit: [
      { program_type: "trailblazer_regular_zy1", status: "located_and_transcribed", pdf_pages: [149] },
      { program_type: "trailblazer_two_tone_zy7", status: "located_and_transcribed", pdf_pages: [150] },
      { program_type: "trailblazer_seo_solid", status: "located_and_transcribed", pdf_pages: [151, 152] },
    ],
    palettes: standardProgram({
      year: 2007,
      page: 149,
      extPage: 149,
      revision: "Published July 28, 2006",
      regular: regular2007,
      pairs: pair2007,
      specialty: [
        color("Woodland Green", "9V5", "9015", { seo_code: "9V5" }),
        color("Doeskin Tan", "9V9", "9403", { seo_code: "9V9" }),
        color("Yellow", "none", "9418"),
        color("Indigo Blue", "none", "9792"),
      ],
    }).filter((program) => program.program_id !== "trailblazer-ext-zy1"),
  },
];

const audit = {
  schema_version: 1,
  make: "Chevrolet",
  market: "United States",
  visibility: "public",
  audit_as_of: "2026-08-07",
  dataset_kind: "current_nameplate_historical_variant_color_tables",
  scope: "Direct visual transcription of every exterior paint table printed for Chevrolet TrailBlazer model years 2002 through 2007 in retained official General Motors vehicle information kits. Regular solid paint, two tone paint, TrailBlazer EXT, SS restrictions, and special equipment paint remain separate. No color is projected across a model year or program.",
  method: {
    review_type: "complete_document_visual_review",
    render_and_ocr: "Every PDF page was rendered and reviewed in contact sheets. Candidate chart pages were rendered at higher resolution and OCR was used only to locate text; values were visually checked against the page image.",
    source_integrity: "Every retained PDF matched the SHA-256, byte count, and page count in the crawler artifact ledger.",
    code_policy: "Source paint codes and WA numbers are preserved exactly without projecting codes across years. Combined two tone records preserve both upper and lower codes.",
    absence_policy: "No chart located documents the result of a complete review of the retained official kit. It does not prove that no other dealer, fleet, or brochure source ever listed a color.",
    naming_policy: "The source label Woodland Green is preserved. It is not renamed Forest Service Green without a source that prints that name.",
  },
  sources,
  models: [{ model_id: "trailblazer", model_name: "TrailBlazer", years }],
};

const target = path.join(root, "data/audits/current-trailblazer-2002-2007.json");
await writeFile(target, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(`Wrote ${path.relative(root, target)} with ${years.length} model years.`);
