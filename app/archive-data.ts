import modelCatalog from "../data/catalog/chevrolet-us-nameplates.json";
import platformEraData from "../data/catalog/chevrolet-platform-eras.json";
import tahoe1995to2000Audit from "../data/audits/tahoe-1995-2000.json";
import tahoe2001to2007Audit from "../data/audits/tahoe-2001-2007.json";
import suburban1969to1976Audit from "../data/audits/suburban-1969-1976.json";
import suburban2000to2007Audit from "../data/audits/suburban-2000-2007.json";
import suburbanBrochurePaletteAudit from "../data/audits/suburban-brochure-palettes-1982-1989-1993.json";
import modernColorSourceData from "../data/sources/modern-chevrolet-color-source-candidates.json";
import specialtyColorSourceData from "../data/sources/specialty-color-source-candidates.json";

export type AvailabilityState =
  | "listed"
  | "restricted"
  | "available"
  | "available_through_authorized_upfitter"
  | "available_with_minimum_batch"
  | "available_with_possible_extended_lead"
  | "closed_after_2026-02-02";

export type Availability = {
  state: AvailabilityState;
  label: string;
  code: string;
  applicationType?: string;
  factoryCode?: string | null;
  factoryCodeStatus?: string;
  touchUpCode?: string;
  restriction?: string;
  sourceIds?: string[];
};

export type ArchiveColor = {
  id: string;
  name: string;
  swatch: string;
  rowCode: string;
  note?: string;
  availability: Record<string, Availability>;
};

export type YearSourceCitation = {
  name: string;
  chart: string;
  locator: string;
  revision: string;
  url: string;
  sourceId?: string;
  sourceType?: string;
  publisher?: string;
  carrier?: string;
  reuseLicense?: string;
  retrievalUrl?: string;
  sourceNotes?: string;
  contentType?: string;
  documentAuthority?: "official_manufacturer_document";
  retrievalHostType?: "official_live" | "archival_mirror";
  archiveUrl?: string;
  originalUrl?: string;
  officialUrl?: string;
  historicalOfficialUrl?: string;
  landingUrl?: string;
  evidenceClass?:
    | "qualified_palette_union"
    | "specialty_palette_subset"
    | "qualified_exact_program_palette";
  artifactSha256?: string;
  artifactBytes?: number;
  pdfPageCount?: number;
  retrievedAt?: string;
  availabilityScope?: string;
  limitations?: string[];
};

export type YearSource = YearSourceCitation & {
  supportingSources?: YearSourceCitation[];
};

export type Generation = {
  id: string;
  label: string;
  programId?: string;
  programLabel?: string;
  range: string;
  years: string[];
  listingCount: number;
  revisionNote: string;
  sources: Record<string, YearSource>;
  colors: ArchiveColor[];
  catalogSources?: string[];
  platformAliases?: string[];
  platformConfidence?: string;
  platformNotes?: string;
};

export type ArchiveModel = {
  id: string;
  name: string;
  vehicleClass: string;
  era: string;
  status: string;
  pendingCopy?: string;
  generations: Generation[];
};

const gmKit = (year: string) =>
  `https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/${year}-Chevrolet-Camaro.pdf`;

const gmCorvetteKit = (year: string) =>
  `https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/${year}-Chevrolet-Corvette.pdf`;

const gmChevelleKit = (year: string) =>
  `https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/${year}-Chevrolet-Chevelle.pdf`;

const gmSuburbanKit = (year: string) =>
  `https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/${year}-Chevrolet-Suburban.pdf`;

const firstGeneration: Generation = {
  id: "first-generation",
  label: "First generation",
  range: "1967–1969",
  years: ["1967", "1968", "1969"],
  listingCount: 48,
  revisionNote:
    "Each column reflects one dated GM chart. Later bulletins or market-specific material may add or change availability.",
  sources: {
    "1967": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1967 Camaro exterior color chart",
      locator: "PDF p. 16, printed BODY-3",
      revision: "September 1966",
      url: gmKit("1967"),
    },
    "1968": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1968 Camaro Exterior Color and Interior Trim Choices",
      locator: "PDF p. 34, printed 18-Camaro",
      revision: "Revised January 1968",
      url: gmKit("1968"),
    },
    "1969": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1969 Camaro exterior color chart",
      locator: "PDF p. 51, printed p. 50 / BODY-3",
      revision: "September 1968",
      url: gmKit("1969"),
    },
  },
  colors: [
    { id: "black-1967", name: "Black", swatch: "#1c2023", rowCode: "AA", availability: { "1967": { state: "listed", label: "Black", code: "AA" } } },
    { id: "white-1967", name: "White", swatch: "#eeeae0", rowCode: "CC", availability: { "1967": { state: "listed", label: "White", code: "CC" } } },
    { id: "medium-blue-1967", name: "Med. Blue", swatch: "#628bb0", rowCode: "DD", availability: { "1967": { state: "listed", label: "Med. Blue", code: "DD" } } },
    { id: "dark-blue-1967", name: "Dk. Blue", swatch: "#283c62", rowCode: "EE", availability: { "1967": { state: "listed", label: "Dk. Blue", code: "EE" } } },
    { id: "bright-blue-1967", name: "Brt. Blue", swatch: "#2878aa", rowCode: "FF", availability: { "1967": { state: "listed", label: "Brt. Blue", code: "FF" } } },
    { id: "gold-1967", name: "Gold", swatch: "#a88b4d", rowCode: "GG", availability: { "1967": { state: "listed", label: "Gold", code: "GG" } } },
    { id: "medium-green-1967", name: "Med. Green", swatch: "#68866f", rowCode: "HH", availability: { "1967": { state: "listed", label: "Med. Green", code: "HH" } } },
    { id: "medium-turquoise-1967", name: "Med. Turquoise", swatch: "#4c9397", rowCode: "KK", availability: { "1967": { state: "listed", label: "Med. Turquoise", code: "KK" } } },
    { id: "dark-turquoise-1967", name: "Dk. Turquoise", swatch: "#275d65", rowCode: "LL", availability: { "1967": { state: "listed", label: "Dk. Turquoise", code: "LL" } } },
    { id: "plum-1967", name: "Plum", swatch: "#67435c", rowCode: "MM", availability: { "1967": { state: "listed", label: "Plum", code: "MM" } } },
    { id: "maroon-1967", name: "Maroon", swatch: "#6a2935", rowCode: "NN", availability: { "1967": { state: "listed", label: "Maroon", code: "NN" } } },
    { id: "red-1967", name: "Red", swatch: "#ad2932", rowCode: "RR", availability: { "1967": { state: "listed", label: "Red", code: "RR" } } },
    { id: "fawn-1967", name: "Fawn", swatch: "#ad9a7b", rowCode: "SS", availability: { "1967": { state: "listed", label: "Fawn", code: "SS" } } },
    { id: "cream-1967", name: "Cream", swatch: "#e2d2a7", rowCode: "TT", availability: { "1967": { state: "listed", label: "Cream", code: "TT" } } },
    { id: "yellow-1967", name: "Yellow", swatch: "#dcb52e", rowCode: "YY", availability: { "1967": { state: "listed", label: "Yellow", code: "YY" } } },
    { id: "ermine-white-1968", name: "Ermine White", swatch: "#efece3", rowCode: "CC", availability: { "1968": { state: "listed", label: "Ermine White", code: "CC" } } },
    { id: "grotto-blue-1968", name: "Grotto Blue", swatch: "#668baa", rowCode: "DD", availability: { "1968": { state: "listed", label: "Grotto Blue", code: "DD" } } },
    { id: "island-teal-1968", name: "Island Teal", swatch: "#297b7d", rowCode: "FF", availability: { "1968": { state: "listed", label: "Island Teal", code: "FF" } } },
    { id: "ash-gold-1968", name: "Ash Gold", swatch: "#a69a67", rowCode: "GG", availability: { "1968": { state: "listed", label: "Ash Gold", code: "GG" } } },
    {
      id: "rally-green-family", name: "Rally Green / Rallye Green", swatch: "#317444", rowCode: "JJ / 79",
      note: "Year-specific chart spellings retained.",
      availability: {
        "1968": { state: "listed", label: "Rally Green", code: "JJ" },
        "1969": { state: "listed", label: "Rallye Green", code: "79" },
      },
    },
    { id: "tripoli-turquoise-1968", name: "Tripoli Turquoise", swatch: "#3a8d91", rowCode: "KK", availability: { "1968": { state: "listed", label: "Tripoli Turquoise", code: "KK" } } },
    { id: "teal-blue-1968", name: "Teal Blue", swatch: "#2f6671", rowCode: "LL", availability: { "1968": { state: "listed", label: "Teal Blue", code: "LL" } } },
    { id: "cordovan-maroon-1968", name: "Cordovan Maroon", swatch: "#673840", rowCode: "NN", availability: { "1968": { state: "listed", label: "Cordovan Maroon", code: "NN" } } },
    { id: "corvette-bronze-1968", name: "Corvette Bronze", swatch: "#9b654d", rowCode: "OO", availability: { "1968": { state: "listed", label: "Corvette Bronze", code: "OO" } } },
    { id: "seafrost-green-1968", name: "Seafrost Green", swatch: "#93aa8e", rowCode: "PP", availability: { "1968": { state: "listed", label: "Seafrost Green", code: "PP" } } },
    { id: "matador-red-1968", name: "Matador Red", swatch: "#a72f35", rowCode: "RR", availability: { "1968": { state: "listed", label: "Matador Red", code: "RR" } } },
    {
      id: "lemans-blue-family", name: "LeMans Blue / Le Mans Blue", swatch: "#315f88", rowCode: "UU / 71",
      note: "Year-specific chart spacing retained.",
      availability: {
        "1968": { state: "listed", label: "LeMans Blue", code: "UU" },
        "1969": { state: "listed", label: "Le Mans Blue", code: "71" },
      },
    },
    { id: "sequoia-green-1968", name: "Sequoia Green", swatch: "#365b43", rowCode: "VV", availability: { "1968": { state: "listed", label: "Sequoia Green", code: "VV" } } },
    {
      id: "butternut-yellow", name: "Butternut Yellow", swatch: "#d9b349", rowCode: "YY / 40",
      availability: {
        "1968": { state: "listed", label: "Butternut Yellow", code: "YY" },
        "1969": { state: "restricted", label: "Butternut Yellow", code: "40", restriction: "Special order" },
      },
    },
    { id: "british-green-1968", name: "British Green", swatch: "#294c37", rowCode: "ZZ", availability: { "1968": { state: "listed", label: "British Green", code: "ZZ" } } },
    { id: "tuxedo-black-1969", name: "Tuxedo Black", swatch: "#181b1e", rowCode: "10", availability: { "1969": { state: "restricted", label: "Tuxedo Black", code: "10", restriction: "Los Angeles special order; Norwood regular" } } },
    { id: "dover-white-1969", name: "Dover White", swatch: "#efeee8", rowCode: "50", availability: { "1969": { state: "listed", label: "Dover White", code: "50" } } },
    { id: "cortez-silver-1969", name: "Cortez Silver", swatch: "#aeb3b4", rowCode: "69", availability: { "1969": { state: "listed", label: "Cortez Silver", code: "69" } } },
    { id: "garnet-red-1969", name: "Garnet Red", swatch: "#8f2931", rowCode: "52", availability: { "1969": { state: "listed", label: "Garnet Red", code: "52" } } },
    { id: "burgundy-maroon-1969", name: "Burgundy Maroon", swatch: "#652c39", rowCode: "67", availability: { "1969": { state: "restricted", label: "Burgundy Maroon", code: "67", restriction: "Los Angeles special order" } } },
    { id: "olympic-gold-1969", name: "Olympic Gold", swatch: "#9c8247", rowCode: "65", availability: { "1969": { state: "listed", label: "Olympic Gold", code: "65" } } },
    { id: "champagne-1969", name: "Champagne", swatch: "#b3a27f", rowCode: "63", availability: { "1969": { state: "restricted", label: "Champagne", code: "63", restriction: "Norwood special order" } } },
    { id: "burnished-brown-1969", name: "Burnished Brown", swatch: "#725241", rowCode: "61", availability: { "1969": { state: "restricted", label: "Burnished Brown", code: "61", restriction: "Los Angeles special order" } } },
    { id: "frost-lime-1969", name: "Frost Lime", swatch: "#a8b47b", rowCode: "59", availability: { "1969": { state: "listed", label: "Frost Lime", code: "59" } } },
    { id: "fathom-green-1969", name: "Fathom Green", swatch: "#304d3f", rowCode: "57", availability: { "1969": { state: "listed", label: "Fathom Green", code: "57" } } },
    { id: "azure-turquoise-1969", name: "Azure Turquoise", swatch: "#3a7378", rowCode: "55", availability: { "1969": { state: "listed", label: "Azure Turquoise", code: "55" } } },
    { id: "glacier-blue-1969", name: "Glacier Blue", swatch: "#9eb9c5", rowCode: "53", availability: { "1969": { state: "listed", label: "Glacier Blue", code: "53" } } },
    { id: "dusk-blue-1969", name: "Dusk Blue", swatch: "#3f5873", rowCode: "51", availability: { "1969": { state: "restricted", label: "Dusk Blue", code: "51", restriction: "Los Angeles special order" } } },
    { id: "daytona-yellow-1969", name: "Daytona Yellow", swatch: "#e1b729", rowCode: "76", availability: { "1969": { state: "listed", label: "Daytona Yellow", code: "76" } } },
    { id: "hugger-orange", name: "Hugger Orange", swatch: "#d75a20", rowCode: "72", availability: { "1969": { state: "listed", label: "Hugger Orange", code: "72" } } },
  ],
};

const listedCorvetteColor = (label: string): Availability => ({
  state: "listed",
  label,
  code: "not stated",
});

const restrictedCorvette1959 = (label: string): Availability => ({
  state: "restricted",
  label,
  code: "not stated",
  restriction:
    "Historical table quantities cover 9,582 cars; five were non-standard and 83 export colors are unknown.",
});

const earlyCorvetteTables: Generation = {
  id: "early-corvette-audited-tables",
  label: "C1 Corvette audited tables",
  range: "1954–1962",
  years: ["1954", "1955", "1956", "1957", "1958", "1959", "1960", "1961", "1962"],
  listingCount: 58,
  revisionNote:
    "The 1954 and 1955 tables use qualified estimates, so those rows are restricted. Direct Chevrolet color-combination charts support listed rows for 1957, 1958, and 1960–1962; the 1956 production table also reconciles exactly to production. The 1959 rows remain restricted because only the qualified historical table was located. The dedicated 1953 GM kit was reviewed but contains no exterior-color table, so 1953 remains unverified rather than unavailable.",
  sources: {
    "1954": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1954 Colors",
      locator: "PDF p. 4, printed p. 23",
      revision: "Undated historical table with explicit estimate warning",
      url: gmCorvetteKit("1954"),
    },
    "1955": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1955 Colors",
      locator: "PDF p. 3, printed p. 25",
      revision: "Undated historical table with explicit estimate warning",
      url: gmCorvetteKit("1955"),
    },
    "1956": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1956 Colors",
      locator: "PDF p. 4, printed p. 27",
      revision: "Undated historical table reconciled to Chevrolet production records",
      url: gmCorvetteKit("1956"),
    },
    "1957": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Exterior - Interior Color Combinations",
      locator: "PDF p. 33, printed CORVETTE SUPPLEMENT - 67",
      revision: "Dated October 29, 1956",
      url: gmCorvetteKit("1957"),
    },
    "1958": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Exterior - Interior Color Combinations",
      locator: "PDF p. 12, printed CORVETTE SUPPLEMENT - P49",
      revision: "Dated November 29, 1957",
      url: gmCorvetteKit("1958"),
    },
    "1959": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1959 Colors",
      locator: "PDF p. 5, printed p. 33",
      revision: "Undated historical table with non-standard and unknown export colors",
      url: gmCorvetteKit("1959"),
    },
    "1960": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Exterior - Interior Color Combinations",
      locator: "PDF p. 6, printed CORVETTE-5",
      revision: "October 1959; revised February 1960",
      url: gmCorvetteKit("1960"),
    },
    "1961": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Exterior - Interior Color Combinations",
      locator: "PDF p. 12, printed CORVETTE-5",
      revision: "Revised February 1961",
      url: gmCorvetteKit("1961"),
    },
    "1962": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Exterior - Interior Color Combinations",
      locator: "PDF p. 14, printed CORVETTE-5",
      revision: "October 1961",
      url: gmCorvetteKit("1962"),
    },
  },
  colors: [
    {
      id: "corvette-polo-white-early",
      name: "Polo White",
      swatch: "#eee9dc",
      rowCode: "not stated / 567",
      note: "The 1954 and 1956 tables do not state a code; the 1955 table states code 567.",
      availability: {
        "1954": {
          state: "restricted",
          label: "Polo White",
          code: "not stated",
          restriction:
            "Quantity estimated; source says exterior quantities are not from Chevrolet records.",
        },
        "1955": {
          state: "restricted",
          label: "Polo White",
          code: "567",
          restriction:
            "Quantity estimated; source says recorded color usage is incomplete and subject to question.",
        },
        "1956": {
          state: "listed",
          label: "Polo White",
          code: "not stated",
        },
        "1957": {
          state: "listed",
          label: "Polo White",
          code: "not stated",
        },
      },
    },
    {
      id: "corvette-pennant-blue-early",
      name: "Pennant Blue",
      swatch: "#5d809e",
      rowCode: "not stated / 570",
      note: "The 1954 table does not state a code; the 1955 table states code 570.",
      availability: {
        "1954": {
          state: "restricted",
          label: "Pennant Blue",
          code: "not stated",
          restriction:
            "Quantity estimated; source says exterior quantities are not from Chevrolet records.",
        },
        "1955": {
          state: "restricted",
          label: "Pennant Blue",
          code: "570",
          restriction:
            "Quantity estimated; source reports discontinuance in April 1955.",
        },
      },
    },
    {
      id: "corvette-sportsman-red-1954",
      name: "Sportsman Red",
      swatch: "#a72b32",
      rowCode: "not stated",
      availability: {
        "1954": {
          state: "restricted",
          label: "Sportsman Red",
          code: "not stated",
          restriction:
            "Quantity estimated; source says exterior quantities are not from Chevrolet records.",
        },
      },
    },
    {
      id: "corvette-black-1954",
      name: "Black",
      swatch: "#1b1d1e",
      rowCode: "not stated",
      availability: {
        "1954": {
          state: "restricted",
          label: "Black",
          code: "not stated",
          restriction:
            "Quantity estimated; source says exterior quantities are not from Chevrolet records.",
        },
      },
    },
    {
      id: "corvette-copper-1955",
      name: "Corvette Copper",
      swatch: "#9b6249",
      rowCode: "573",
      availability: {
        "1955": {
          state: "restricted",
          label: "Corvette Copper",
          code: "573",
          restriction:
            "Quantity estimated; source says this color is thought to have followed Pennant Blue.",
        },
      },
    },
    {
      id: "corvette-gypsy-red-1955",
      name: "Gypsy Red",
      swatch: "#aa3031",
      rowCode: "596",
      availability: {
        "1955": {
          state: "restricted",
          label: "Gypsy Red",
          code: "596",
          restriction:
            "Quantity estimated; source says this color is thought to have followed Pennant Blue.",
        },
      },
    },
    {
      id: "corvette-harvest-gold-1955",
      name: "Harvest Gold",
      swatch: "#b08c42",
      rowCode: "632",
      availability: {
        "1955": {
          state: "restricted",
          label: "Harvest Gold",
          code: "632",
          restriction:
            "Quantity estimated; source says recorded color usage is incomplete and subject to question.",
        },
      },
    },
    {
      id: "corvette-onyx-black-1956",
      name: "Onyx Black",
      swatch: "#191b1d",
      rowCode: "not stated",
      availability: {
        "1956": {
          state: "listed",
          label: "Onyx Black",
          code: "not stated",
        },
        "1957": {
          state: "listed",
          label: "Onyx Black",
          code: "not stated",
        },
      },
    },
    {
      id: "corvette-aztec-copper-1956",
      name: "Aztec Copper",
      swatch: "#9b654d",
      rowCode: "not stated",
      availability: {
        "1956": {
          state: "listed",
          label: "Aztec Copper",
          code: "not stated",
        },
        "1957": {
          state: "listed",
          label: "Aztec Copper",
          code: "not stated",
        },
      },
    },
    {
      id: "corvette-cascade-green-1956",
      name: "Cascade Green",
      swatch: "#57796b",
      rowCode: "not stated",
      availability: {
        "1956": {
          state: "listed",
          label: "Cascade Green",
          code: "not stated",
        },
        "1957": {
          state: "listed",
          label: "Cascade Green",
          code: "not stated",
        },
      },
    },
    {
      id: "corvette-arctic-blue-1956",
      name: "Arctic Blue",
      swatch: "#7ba0b4",
      rowCode: "not stated",
      availability: {
        "1956": {
          state: "listed",
          label: "Arctic Blue",
          code: "not stated",
        },
        "1957": {
          state: "listed",
          label: "Arctic Blue",
          code: "not stated",
        },
      },
    },
    {
      id: "corvette-venetian-red-1956",
      name: "Venetian Red",
      swatch: "#9e3034",
      rowCode: "not stated",
      availability: {
        "1956": {
          state: "listed",
          label: "Venetian Red",
          code: "not stated",
        },
        "1957": {
          state: "listed",
          label: "Venetian Red",
          code: "not stated",
        },
      },
    },
    {
      id: "corvette-charcoal-1958",
      name: "Charcoal",
      swatch: "#4f5555",
      rowCode: "not stated",
      availability: {
        "1958": listedCorvetteColor("Charcoal"),
      },
    },
    {
      id: "corvette-snowcrest-white",
      name: "Snowcrest White",
      swatch: "#f1eee5",
      rowCode: "not stated",
      availability: {
        "1958": listedCorvetteColor("Snowcrest White"),
        "1959": restrictedCorvette1959("Snowcrest White"),
      },
    },
    {
      id: "corvette-silver-blue-1958",
      name: "Silver Blue",
      swatch: "#7898a8",
      rowCode: "not stated",
      availability: {
        "1958": listedCorvetteColor("Silver Blue"),
      },
    },
    {
      id: "corvette-regal-turquoise-1958",
      name: "Regal Turquoise",
      swatch: "#3d8787",
      rowCode: "not stated",
      availability: {
        "1958": listedCorvetteColor("Regal Turquoise"),
      },
    },
    {
      id: "corvette-panama-yellow-1958",
      name: "Panama Yellow",
      swatch: "#d8b64f",
      rowCode: "not stated",
      availability: {
        "1958": listedCorvetteColor("Panama Yellow"),
      },
    },
    {
      id: "corvette-signet-red-1958",
      name: "Signet Red",
      swatch: "#a52d34",
      rowCode: "not stated",
      availability: {
        "1958": listedCorvetteColor("Signet Red"),
      },
    },
    {
      id: "corvette-black-1958",
      name: "Black",
      swatch: "#191b1d",
      rowCode: "not stated",
      availability: {
        "1958": listedCorvetteColor("Black"),
      },
    },
    {
      id: "corvette-silver-1958",
      name: "Silver",
      swatch: "#aeb3b4",
      rowCode: "not stated",
      availability: {
        "1958": listedCorvetteColor("Silver"),
      },
    },
    {
      id: "corvette-tuxedo-black-1959",
      name: "Tuxedo Black",
      swatch: "#17191b",
      rowCode: "not stated",
      availability: {
        "1959": restrictedCorvette1959("Tuxedo Black"),
        "1960": listedCorvetteColor("Tuxedo Black"),
        "1961": listedCorvetteColor("Tuxedo Black"),
        "1962": listedCorvetteColor("Tuxedo Black"),
      },
    },
    {
      id: "corvette-classic-cream-1959",
      name: "Classic Cream",
      swatch: "#e3d3a8",
      rowCode: "not stated",
      availability: {
        "1959": restrictedCorvette1959("Classic Cream"),
      },
    },
    {
      id: "corvette-frost-blue-1959",
      name: "Frost Blue",
      swatch: "#a3bdca",
      rowCode: "not stated",
      availability: {
        "1959": restrictedCorvette1959("Frost Blue"),
      },
    },
    {
      id: "corvette-crown-sapphire-1959",
      name: "Crown Sapphire",
      swatch: "#365878",
      rowCode: "not stated",
      availability: {
        "1959": restrictedCorvette1959("Crown Sapphire"),
      },
    },
    {
      id: "corvette-roman-red-1959",
      name: "Roman Red",
      swatch: "#a32e34",
      rowCode: "not stated",
      availability: {
        "1959": restrictedCorvette1959("Roman Red"),
        "1960": listedCorvetteColor("Roman Red"),
        "1961": listedCorvetteColor("Roman Red"),
        "1962": listedCorvetteColor("Roman Red"),
      },
    },
    {
      id: "corvette-inca-silver-1959",
      name: "Inca Silver",
      swatch: "#b6b7b2",
      rowCode: "not stated",
      availability: {
        "1959": restrictedCorvette1959("Inca Silver"),
      },
    },
    {
      id: "corvette-tasco-turquoise-1960",
      name: "Tasco Turquoise",
      swatch: "#367e81",
      rowCode: "not stated",
      availability: {
        "1960": listedCorvetteColor("Tasco Turquoise"),
      },
    },
    {
      id: "corvette-horizon-blue-1960",
      name: "Horizon Blue",
      swatch: "#648da9",
      rowCode: "not stated",
      availability: {
        "1960": listedCorvetteColor("Horizon Blue"),
      },
    },
    {
      id: "corvette-honduras-maroon-1960",
      name: "Honduras Maroon",
      swatch: "#6e2f3b",
      rowCode: "not stated",
      availability: {
        "1960": listedCorvetteColor("Honduras Maroon"),
        "1961": listedCorvetteColor("Honduras Maroon"),
        "1962": listedCorvetteColor("Honduras Maroon"),
      },
    },
    {
      id: "corvette-ermine-white-1960",
      name: "Ermine White",
      swatch: "#efeee7",
      rowCode: "not stated",
      availability: {
        "1960": listedCorvetteColor("Ermine White"),
        "1961": listedCorvetteColor("Ermine White"),
        "1962": listedCorvetteColor("Ermine White"),
      },
    },
    {
      id: "corvette-sateen-silver-1960",
      name: "Sateen Silver",
      swatch: "#a9aaa5",
      rowCode: "not stated",
      availability: {
        "1960": listedCorvetteColor("Sateen Silver"),
        "1961": listedCorvetteColor("Sateen Silver"),
        "1962": listedCorvetteColor("Sateen Silver"),
      },
    },
    {
      id: "corvette-cascade-green-1960",
      name: "Cascade Green",
      swatch: "#557b68",
      rowCode: "not stated",
      note:
        "The 1960 source describes a metallic paint distinct from the 1956–1957 color with the same name.",
      availability: {
        "1960": listedCorvetteColor("Cascade Green"),
      },
    },
    {
      id: "corvette-jewel-blue-1961",
      name: "Jewel Blue",
      swatch: "#2c5d81",
      rowCode: "not stated",
      availability: {
        "1961": listedCorvetteColor("Jewel Blue"),
      },
    },
    {
      id: "corvette-fawn-beige-1961",
      name: "Fawn Beige",
      swatch: "#ad9877",
      rowCode: "not stated",
      availability: {
        "1961": listedCorvetteColor("Fawn Beige"),
        "1962": listedCorvetteColor("Fawn Beige"),
      },
    },
    {
      id: "corvette-almond-beige-1962",
      name: "Almond Beige",
      swatch: "#c6ad82",
      rowCode: "not stated",
      availability: {
        "1962": listedCorvetteColor("Almond Beige"),
      },
    },
  ],
};

type AuditedSolidColor = {
  year: string;
  code: string;
  name: string;
  label?: string;
  restriction?: string;
  sourceIds?: string[];
};

const chevelleSolidInventory: AuditedSolidColor[] = [
  { year: "1964", code: "900", name: "Tuxedo Black" },
  { year: "1964", code: "905", name: "Meadow Green" },
  { year: "1964", code: "908", name: "Bahama Green" },
  { year: "1964", code: "912", name: "Silver Blue" },
  { year: "1964", code: "916", name: "Daytona Blue" },
  { year: "1964", code: "918", name: "Azure Aqua" },
  { year: "1964", code: "919", name: "Lagoon Aqua" },
  { year: "1964", code: "920", name: "Almond Fawn" },
  { year: "1964", code: "922", name: "Ember Red" },
  { year: "1964", code: "932", name: "Saddle Tan" },
  { year: "1964", code: "936", name: "Ermine White" },
  { year: "1964", code: "938", name: "Desert Beige" },
  { year: "1964", code: "940", name: "Satin Silver" },
  { year: "1964", code: "948", name: "Palomar Red" },
  { year: "1965", code: "AA", name: "Tuxedo Black" },
  { year: "1965", code: "CC", name: "Ermine White" },
  {
    year: "1965",
    code: "WW",
    name: "Glacier Gray",
    restriction: "Malibu S.S. only",
  },
  { year: "1965", code: "NN", name: "Madeira Maroon" },
  { year: "1965", code: "RR", name: "Regal Red" },
  { year: "1965", code: "SS", name: "Sierra Tan" },
  { year: "1965", code: "VV", name: "Cameo Beige" },
  {
    year: "1965",
    code: "YY",
    name: "Crocus Yellow",
    restriction: "Malibu S.S. only",
  },
  { year: "1965", code: "HH", name: "Willow Green" },
  { year: "1965", code: "JJ", name: "Cypress Green" },
  { year: "1965", code: "KK", name: "Artesian Turquoise" },
  { year: "1965", code: "LL", name: "Tahitian Turquoise" },
  { year: "1965", code: "DD", name: "Mist Blue" },
  { year: "1965", code: "EE", name: "Danube Blue" },
  {
    year: "1965",
    code: "PP",
    name: "Evening Orchid",
    restriction: "Malibu S.S. only",
  },
  { year: "1966", code: "AA", name: "Tuxedo Black" },
  { year: "1966", code: "CC", name: "Ermine White" },
  { year: "1966", code: "DD", name: "Mist Blue" },
  { year: "1966", code: "EE", name: "Danube Blue" },
  { year: "1966", code: "FF", name: "Marina Blue" },
  { year: "1966", code: "HH", name: "Willow Green" },
  { year: "1966", code: "KK", name: "Artesian Turquoise" },
  { year: "1966", code: "LL", name: "Tropic Turquoise" },
  { year: "1966", code: "MM", name: "Aztec Bronze" },
  { year: "1966", code: "NN", name: "Madeira Maroon" },
  { year: "1966", code: "RR", name: "Regal Red" },
  { year: "1966", code: "TT", name: "Sandalwood Tan" },
  { year: "1966", code: "VV", name: "Cameo Beige" },
  { year: "1966", code: "WW", name: "Chateau Slate" },
  { year: "1966", code: "YY", name: "Lemonwood Yellow" },
  { year: "1967", code: "AA", name: "Black" },
  { year: "1967", code: "CC", name: "White" },
  { year: "1967", code: "DD", name: "Med. Blue" },
  { year: "1967", code: "EE", name: "Dk. Blue" },
  { year: "1967", code: "FF", name: "Brt. Blue" },
  { year: "1967", code: "GG", name: "Gold" },
  { year: "1967", code: "HH", name: "Med. Green" },
  { year: "1967", code: "KK", name: "Med. Turquoise" },
  { year: "1967", code: "LL", name: "Dk. Turquoise" },
  { year: "1967", code: "MM", name: "Plum" },
  { year: "1967", code: "NN", name: "Maroon" },
  { year: "1967", code: "RR", name: "Red" },
  { year: "1967", code: "SS", name: "Fawn" },
  { year: "1967", code: "TT", name: "Cream" },
  { year: "1967", code: "YY", name: "Yellow" },
];

function archiveColorId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function interpretiveArchiveSwatch(name: string) {
  const value = name.toLowerCase();
  if (value.includes("black")) return "#1b1e20";
  if (value.includes("white")) return "#eeeae1";
  if (
    value.includes("silver") ||
    value.includes("gray") ||
    value.includes("slate") ||
    value.includes("charcoal")
  ) {
    return "#a8adae";
  }
  if (
    value.includes("orchid") ||
    value.includes("plum") ||
    value.includes("purple")
  ) {
    return "#76516d";
  }
  if (
    value.includes("maroon") ||
    value.includes("palomar") ||
    value.includes("rosewood")
  ) {
    return "#702f39";
  }
  if (value.includes("red")) return "#a73537";
  if (value.includes("orange")) return "#c5642e";
  if (
    value.includes("turquoise") ||
    value.includes("aqua") ||
    value.includes("teal")
  ) {
    return value.includes("dark") || value.includes("dk.")
      ? "#32676b"
      : "#579494";
  }
  if (value.includes("blue")) {
    if (value.includes("dark") || value.includes("dk.")) return "#314965";
    if (value.includes("bright") || value.includes("brt.") || value.includes("marina")) {
      return "#397da5";
    }
    return "#6f91aa";
  }
  if (value.includes("green") || value.includes("jade")) {
    return value.includes("bahama") || value.includes("cypress")
      ? "#3f674c"
      : "#718a6a";
  }
  if (
    value.includes("bronze") ||
    value.includes("copper") ||
    value.includes("brown") ||
    value.includes("persimmon")
  ) {
    return "#91664f";
  }
  if (value.includes("gold")) return "#ad9259";
  if (
    value.includes("yellow") ||
    value.includes("lemonwood") ||
    value.includes("crocus")
  ) {
    return "#d7b340";
  }
  if (
    value.includes("tan") ||
    value.includes("fawn") ||
    value.includes("beige") ||
    value.includes("cream") ||
    value.includes("sand") ||
    value.includes("saddle") ||
    value.includes("chamois")
  ) {
    return "#c1ad88";
  }
  return "#858a87";
}

function buildExactNameTimeline(
  modelId: string,
  rows: AuditedSolidColor[],
): ArchiveColor[] {
  const grouped = new Map<string, ArchiveColor>();
  const rowCodes = new Map<string, string[]>();
  for (const row of rows) {
    const availability: Availability = row.restriction
      ? {
          state: "restricted",
          label: row.label ?? row.name,
          code: row.code,
          restriction: row.restriction,
          ...(row.sourceIds?.length ? { sourceIds: row.sourceIds } : {}),
        }
      : {
          state: "listed",
          label: row.label ?? row.name,
          code: row.code,
          ...(row.sourceIds?.length ? { sourceIds: row.sourceIds } : {}),
        };
    const existing = grouped.get(row.name);
    if (existing) {
      existing.availability[row.year] = availability;
      const codes = rowCodes.get(row.name)!;
      if (!codes.includes(row.code)) {
        codes.push(row.code);
        existing.rowCode = codes.join("; ");
      }
      continue;
    }
    rowCodes.set(row.name, [row.code]);
    grouped.set(row.name, {
      id: `${modelId}-${archiveColorId(row.name)}-${row.year}`,
      name: row.name,
      swatch: interpretiveArchiveSwatch(row.name),
      rowCode: row.code,
      availability: { [row.year]: availability },
    });
  }
  return [...grouped.values()];
}

type TahoeAuditColor = {
  name: string;
  code: string | null;
  finish: string | null;
  wa_number?: string;
  restriction?: string;
  aliases?: string[];
  source_ids?: string[];
};

type TahoeAuditDocument = {
  source_id?: string;
  title: string;
  publisher: string;
  url: string;
  source_type?: string;
  carrier?: string;
  retrieval_url?: string;
  archive_url?: string;
  official_url?: string;
  landing_url?: string;
  content_type?: string;
  pages?: string[];
  pdf_page?: number;
  pdf_pages?: number[];
  printed_page?: number | string;
  printed_pages?: Array<number | string>;
  section?: string;
  publication_date?: string | null;
  publication_date_note?: string;
  publication_note?: string;
  document_authority?: string;
  retrieval_host_type?: string;
  sha256?: string;
  bytes?: number;
  pdf_page_count?: number;
  retrieved_at?: string;
  supporting_sources?: TahoeAuditDocument[];
};

type TahoeAuditProgramPalette = {
  program_id: string;
  program_label: string;
  platform_family: string;
  claim_scope: string;
  evidence_class?: "qualified_exact_program_palette";
  pdf_page?: number;
  pdf_pages?: number[];
  printed_page?: number;
  printed_pages?: number[];
  section?: string;
  source?: TahoeAuditDocument;
  colors: TahoeAuditColor[];
};

type TahoeAuditYear = {
  year: number;
  coverage_status?: string;
  status?: string;
  publication?: TahoeAuditDocument;
  source?: TahoeAuditDocument;
  exterior_colors: TahoeAuditColor[];
  program_palettes?: TahoeAuditProgramPalette[];
  two_tone_combinations?: unknown[];
};

function tahoeAuditIsVerified(item: TahoeAuditYear) {
  return (
    item.coverage_status === "verified_complete" || item.status === "verified"
  );
}

function tahoeDisplayName(color: TahoeAuditColor) {
  if (color.finish === "metallic" && !/metallic/i.test(color.name)) {
    return `${color.name} Metallic`;
  }
  return color.name;
}

function naturalList(values: Array<string | number>) {
  if (values.length < 2) return values.join("");
  if (values.length === 2) return values.join(" and ");
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function tahoeDocumentLocator(source: TahoeAuditDocument) {
  if (source.pages?.length) return source.pages.join("; ");
  const pdfPages = source.pdf_pages ??
    (source.pdf_page !== undefined ? [source.pdf_page] : []);
  const printedPages = source.printed_pages ??
    (source.printed_page !== undefined ? [source.printed_page] : []);
  const pdfPart = pdfPages.length
    ? `PDF ${pdfPages.length === 1 ? "p." : "pp."} ${naturalList(pdfPages)}`
    : null;
  const printedPart = printedPages.length
    ? `printed ${printedPages.length === 1 ? "p." : "pp."} ${naturalList(printedPages)}`
    : null;
  return [pdfPart, printedPart].filter(Boolean).join(", ") ||
    source.section ||
    "Source page";
}

function tahoeAuditCitation(
  source: TahoeAuditDocument,
  evidenceClass?: YearSourceCitation["evidenceClass"],
): YearSourceCitation {
  return {
    name: source.title,
    chart: source.section ?? `${source.title} exterior-color availability chart`,
    locator: tahoeDocumentLocator(source),
    revision:
      source.publication_date_note ??
      source.publication_note ??
      source.publication_date ??
      "Model-year publication; chart date not printed",
    url: source.url,
    sourceId: source.source_id,
    sourceType: source.source_type,
    publisher: source.publisher,
    carrier: source.carrier,
    retrievalUrl: source.retrieval_url,
    contentType: source.content_type,
    documentAuthority:
      source.document_authority === "official_manufacturer_document"
        ? "official_manufacturer_document"
        : undefined,
    retrievalHostType:
      source.retrieval_host_type === "official_live" ||
      source.retrieval_host_type === "archival_mirror"
        ? source.retrieval_host_type
        : undefined,
    archiveUrl: source.archive_url,
    originalUrl:
      source.archive_url && source.archive_url !== source.url
        ? source.url
        : undefined,
    officialUrl: source.official_url,
    landingUrl: source.landing_url,
    evidenceClass,
    artifactSha256: source.sha256,
    artifactBytes: source.bytes,
    pdfPageCount: source.pdf_page_count,
    retrievedAt: source.retrieved_at,
  };
}

function tahoeAuditSource(
  item: TahoeAuditYear,
  sourceOverride?: TahoeAuditDocument,
  evidenceClass?: YearSourceCitation["evidenceClass"],
): YearSource {
  const source = sourceOverride ?? item.source ?? item.publication;
  if (!source) {
    throw new Error(`Verified Tahoe year ${item.year} has no source`);
  }
  return {
    ...tahoeAuditCitation(source, evidenceClass),
    supportingSources: source.supporting_sources?.map((supportingSource) =>
      tahoeAuditCitation(supportingSource),
    ),
  };
}

function tahoeAuditColorCode(color: TahoeAuditColor) {
  return [color.code, color.wa_number].filter(Boolean).join(" / ") ||
    "Not printed";
}

function tahoeSourceIds(source: TahoeAuditDocument) {
  return [
    source.source_id,
    ...(source.supporting_sources?.map((item) => item.source_id) ?? []),
  ].filter((sourceId): sourceId is string => Boolean(sourceId));
}

function tahoeAuditRows(
  year: number,
  colors: TahoeAuditColor[],
  source: TahoeAuditDocument,
  programLabel?: string,
): AuditedSolidColor[] {
  const defaultSourceIds = tahoeSourceIds(source);
  return colors.map((color) => ({
    year: String(year),
    code: tahoeAuditColorCode(color),
    name: tahoeDisplayName(color),
    restriction: [
      programLabel ? `Program-specific palette: ${programLabel}.` : null,
      color.restriction,
    ]
      .filter(Boolean)
      .join(" ") || undefined,
    sourceIds: color.source_ids ?? defaultSourceIds,
  }));
}

function buildTahoeAuditGenerations(audits: TahoeAuditYear[]) {
  const verified = audits
    .filter(
      (item) => tahoeAuditIsVerified(item) && item.exterior_colors.length > 0,
    )
    .sort((left, right) => left.year - right.year);
  const groups: TahoeAuditYear[][] = [];
  const eraKey = (year: number) =>
    year <= 1999
      ? "gmt420"
      : year === 2000
        ? "mixed-2000"
        : year <= 2006
          ? "gmt820"
          : "gmt921";
  for (const item of verified) {
    const current = groups.at(-1);
    if (
      !current ||
      item.year !== current.at(-1)!.year + 1 ||
      eraKey(item.year) !== eraKey(current.at(-1)!.year)
    ) {
      groups.push([item]);
    } else {
      current.push(item);
    }
  }

  return groups.map((group): Generation => {
    const years = group.map((item) => String(item.year));
    const rows: AuditedSolidColor[] = group.flatMap((item) => {
      const source = item.source ?? item.publication;
      if (!source) throw new Error(`Verified Tahoe year ${item.year} has no source`);
      return tahoeAuditRows(item.year, item.exterior_colors, source);
    });
    const twoToneCount = group.reduce(
      (total, item) => total + (item.two_tone_combinations?.length ?? 0),
      0,
    );
    return {
      id: `tahoe-official-${years[0]}-${years.at(-1)}`,
      label: "Official color charts",
      range: compactYearRange(years),
      years,
      listingCount: rows.length,
      revisionNote:
        `${rows.length} solid-color listings are transcribed from complete reviewed model-year tables. ` +
        `${twoToneCount} two-tone rows remain a separate evidence class. Missing paint codes stay marked “Not printed.”`,
      sources: Object.fromEntries(
        group.map((item) => [String(item.year), tahoeAuditSource(item)]),
      ),
      colors: buildExactNameTimeline("tahoe", rows),
    };
  });
}

function buildTahoeProgramGenerations(audits: TahoeAuditYear[]) {
  return audits.flatMap((item): Generation[] =>
    (item.program_palettes ?? []).map((program) => {
      const baseSource = item.source ?? item.publication;
      if (!baseSource && !program.source) {
        throw new Error(`Tahoe ${item.year} ${program.program_id} has no source`);
      }
      const source = program.source ?? {
        ...baseSource!,
        pages: undefined,
        pdf_page: program.pdf_page,
        pdf_pages: program.pdf_pages,
        printed_page: program.printed_page,
        printed_pages: program.printed_pages,
        section: program.section ?? baseSource!.section,
      };
      const year = String(item.year);
      const rows = tahoeAuditRows(
        item.year,
        program.colors,
        source,
        program.program_label,
      );
      return {
        id: `tahoe-${year}-${program.program_id}`,
        label: program.platform_family,
        programId: program.program_id,
        programLabel: program.program_label,
        range: year,
        years: [year],
        listingCount: rows.length,
        revisionNote:
          `${rows.length} colors are published only for ${program.program_label}. ` +
          "The simultaneous GMT400 and GMT800 programs remain separate, and no all-Tahoe palette is inferred.",
        sources: {
          [year]: tahoeAuditSource(item, source, program.evidence_class),
        },
        colors: buildExactNameTimeline(
          `tahoe-${program.program_id}`,
          rows,
        ),
      };
    }),
  );
}

const tahoeAuditYears = [
  ...(tahoe1995to2000Audit.years as TahoeAuditYear[]),
  ...(tahoe2001to2007Audit.years as TahoeAuditYear[]),
];

const tahoeAuditGenerations = [
  ...buildTahoeAuditGenerations(tahoeAuditYears),
  ...buildTahoeProgramGenerations(tahoeAuditYears),
].sort((left, right) => Number(left.years[0]) - Number(right.years[0]));

const tahoeAuditVerifiedYearCount = new Set(
  tahoeAuditGenerations.flatMap((generation) => generation.years),
).size;

const camaro1970to1975Inventory: AuditedSolidColor[] = [
  { year: "1970", code: "10", name: "Classic White" },
  { year: "1970", code: "14", name: "Cortez Silver" },
  { year: "1970", code: "17", name: "Shadow Gray" },
  { year: "1970", code: "25", name: "Astro Blue" },
  { year: "1970", code: "26", name: "Mulsanne Blue" },
  { year: "1970", code: "43", name: "Citrus Green" },
  { year: "1970", code: "45", name: "Green Mist" },
  { year: "1970", code: "48", name: "Forest Green" },
  { year: "1970", code: "51", name: "Daytona Yellow" },
  { year: "1970", code: "53", name: "Camaro Gold" },
  { year: "1970", code: "58", name: "Autumn Gold" },
  { year: "1970", code: "63", name: "Desert Sand" },
  { year: "1970", code: "65", name: "Hugger Orange" },
  { year: "1970", code: "67", name: "Classic Copper" },
  { year: "1970", code: "75", name: "Cranberry Red" },
  { year: "1971", code: "11", name: "Antique White" },
  { year: "1971", code: "13", name: "Nevada Silver" },
  { year: "1971", code: "19", name: "Tuxedo Black" },
  { year: "1971", code: "24", name: "Ascot Blue" },
  { year: "1971", code: "26", name: "Mulsanne Blue" },
  { year: "1971", code: "42", name: "Cottonwood Green" },
  { year: "1971", code: "43", name: "Lime Green" },
  { year: "1971", code: "49", name: "Antique Green" },
  { year: "1971", code: "52", name: "Sunflower Yellow" },
  { year: "1971", code: "53", name: "Placer Gold" },
  { year: "1971", code: "61", name: "Sandalwood" },
  { year: "1971", code: "62", name: "Burnt Orange" },
  { year: "1971", code: "67", name: "Classic Copper" },
  { year: "1971", code: "75", name: "Cranberry Red" },
  { year: "1971", code: "78", name: "Rosewood Metallic" },
  { year: "1972", code: "11", name: "Antique White" },
  { year: "1972", code: "14", name: "Pewter Silver" },
  { year: "1972", code: "24", name: "Ascot Blue" },
  { year: "1972", code: "26", name: "Mulsanne Blue" },
  { year: "1972", code: "36", name: "Spring Green" },
  { year: "1972", code: "43", name: "Gulf Green" },
  { year: "1972", code: "48", name: "Sequoia Green" },
  { year: "1972", code: "50", name: "Covert Tan" },
  { year: "1972", code: "53", name: "Placer Gold" },
  { year: "1972", code: "56", name: "Cream Yellow" },
  { year: "1972", code: "57", name: "Golden Brown" },
  { year: "1972", code: "63", name: "Mohave Gold" },
  { year: "1972", code: "65", name: "Orange Flame" },
  { year: "1972", code: "68", name: "Midnight Bronze" },
  { year: "1972", code: "75", name: "Cranberry Red" },
  {
    year: "1973",
    code: "11",
    name: "Antique White",
    label: "Antique White C/O",
  },
  { year: "1973", code: "24", name: "Light Blue Metallic" },
  { year: "1973", code: "26", name: "Dark Blue Metallic" },
  { year: "1973", code: "29", name: "Midnight Blue Metallic" },
  { year: "1973", code: "42", name: "Dark Green Metallic" },
  { year: "1973", code: "44", name: "Light Green Metallic" },
  { year: "1973", code: "46", name: "Green Gold Metallic" },
  { year: "1973", code: "48", name: "Midnight Green" },
  { year: "1973", code: "51", name: "Light Yellow" },
  { year: "1973", code: "56", name: "Chamois" },
  { year: "1973", code: "60", name: "Light Copper Metallic" },
  { year: "1973", code: "64", name: "Silver Metallic" },
  { year: "1973", code: "68", name: "Dark Brown Metallic" },
  { year: "1973", code: "74", name: "Dark Red Metallic" },
  { year: "1973", code: "75", name: "Medium Red" },
  { year: "1973", code: "97", name: "Medium Orange Metallic" },
  {
    year: "1974",
    code: "11",
    name: "Antique White",
    label: "Antique White C/O",
  },
  {
    year: "1974",
    code: "26",
    name: "Bright Blue Metallic",
    label: "Bright Blue Metallic C/O",
  },
  {
    year: "1974",
    code: "29",
    name: "Midnight Blue Metallic",
    label: "Midnight Blue Metallic C/O",
  },
  { year: "1974", code: "36", name: "Aqua Blue Metallic" },
  { year: "1974", code: "40", name: "Lime Yellow" },
  { year: "1974", code: "46", name: "Bright Green Metallic" },
  {
    year: "1974",
    code: "49",
    name: "Medium Dark Green Metallic",
    label: "Med. Dark Green Metallic",
  },
  { year: "1974", code: "50", name: "Cream Beige" },
  { year: "1974", code: "51", name: "Bright Yellow" },
  { year: "1974", code: "53", name: "Light Gold Metallic" },
  { year: "1974", code: "55", name: "Sandstone" },
  { year: "1974", code: "59", name: "Golden Brown Metallic" },
  {
    year: "1974",
    code: "64",
    name: "Silver Metallic",
    label: "Silver Metallic C/O",
  },
  { year: "1974", code: "66", name: "Bronze Metallic" },
  { year: "1974", code: "74", name: "Medium Red Metallic" },
  {
    year: "1974",
    code: "75",
    name: "Medium Red",
    label: "Medium Red C/O",
  },
  { year: "1975", code: "11", name: "White", label: "White C/O" },
  { year: "1975", code: "13", name: "Silver Metallic" },
  { year: "1975", code: "15", name: "Light Graystone" },
  { year: "1975", code: "24", name: "Medium Blue" },
  { year: "1975", code: "26", name: "Bright Blue Metallic" },
  { year: "1975", code: "29", name: "Dark Blue Metallic" },
  {
    year: "1975",
    code: "44",
    name: "Medium Green",
    label: "Medium Green C/O",
  },
  { year: "1975", code: "49", name: "Dark Green Metallic" },
  {
    year: "1975",
    code: "50",
    name: "Cream-Beige",
    label: "Cream-Beige C/O",
  },
  {
    year: "1975",
    code: "51",
    name: "Bright Yellow",
    label: "Bright Yellow C/O",
  },
  { year: "1975", code: "55", name: "Sandstone" },
  {
    year: "1975",
    code: "58",
    name: "Dark Sandstone Metallic",
    label: "Dark Sandstone Met.",
  },
  {
    year: "1975",
    code: "63",
    name: "Light Saddle Metallic",
    label: "Light Saddle Met.",
  },
  {
    year: "1975",
    code: "64",
    name: "Persimmon Metallic",
    label: "Persimmon Met.",
  },
  {
    year: "1975",
    code: "74",
    name: "Red Metallic",
    label: "Red Metallic C/O",
  },
  { year: "1975", code: "75", name: "Red", label: "Red C/O" },
];

const camaro1976to1981Inventory: AuditedSolidColor[] = [
  { year: "1976", code: "19", name: "Black" },
  {
    year: "1976",
    code: "35",
    name: "Dark Blue Metallic",
    label: "Blue, Dark (Met)",
  },
  {
    year: "1976",
    code: "28",
    name: "Light Blue Metallic",
    label: "Blue, Light (Met)",
  },
  { year: "1976", code: "65", name: "Buckskin" },
  { year: "1976", code: "50", name: "Cream" },
  {
    year: "1976",
    code: "36",
    name: "Firethorn Metallic",
    label: "Firethorn (Met)",
  },
  {
    year: "1976",
    code: "49",
    name: "Dark Green Metallic",
    label: "Green, Dark (Met)",
  },
  {
    year: "1976",
    code: "40",
    name: "Lime Green Metallic",
    label: "Green, Lime (Met)",
  },
  {
    year: "1976",
    code: "37",
    name: "Mahogany Metallic",
    label: "Mahogany (Met)",
  },
  {
    year: "1976",
    code: "78",
    name: "Medium Orange",
    label: "Orange, Medium",
  },
  {
    year: "1976",
    code: "67",
    name: "Medium Saddle Metallic",
    label: "Saddle, Medium (Met)",
  },
  { year: "1976", code: "13", name: "Silver" },
  {
    year: "1976",
    code: "11",
    name: "Antique White",
    label: "White, Antique",
  },
  {
    year: "1976",
    code: "51",
    name: "Bright Yellow",
    label: "Yellow, Bright",
  },
  {
    year: "1977",
    code: "38",
    name: "Aqua Metallic",
    label: "Aqua (Met)",
  },
  { year: "1977", code: "19", name: "Black" },
  {
    year: "1977",
    code: "29",
    name: "Dark Blue Metallic",
    label: "Blue, Dark (Met)",
  },
  {
    year: "1977",
    code: "22",
    name: "Light Blue Metallic",
    label: "Blue, Light (Met)",
  },
  {
    year: "1977",
    code: "69",
    name: "Brown Metallic",
    label: "Brown (Met)",
  },
  {
    year: "1977",
    code: "63",
    name: "Buckskin Metallic",
    label: "Buckskin (Met)",
  },
  {
    year: "1977",
    code: "61",
    name: "Light Buckskin",
    label: "Buckskin, Light",
  },
  {
    year: "1977",
    code: "36",
    name: "Firethorn Metallic",
    label: "Firethorn (Met)",
  },
  {
    year: "1977",
    code: "44",
    name: "Medium Green Metallic",
    label: "Green, Medium (Met)",
  },
  {
    year: "1977",
    code: "78",
    name: "Orange Metallic",
    label: "Orange (Met)",
  },
  {
    year: "1977",
    code: "75",
    name: "Light Red",
    label: "Red, Light",
  },
  { year: "1977", code: "13", name: "Silver" },
  {
    year: "1977",
    code: "11",
    name: "Antique White",
    label: "White, Antique",
  },
  {
    year: "1977",
    code: "51",
    name: "Bright Yellow",
    label: "Yellow, Bright",
  },
  { year: "1978", code: "19", name: "Black" },
  {
    year: "1978",
    code: "24",
    name: "Bright Blue Metallic",
    label: "Blue, Bright (Met)",
  },
  {
    year: "1978",
    code: "48",
    name: "Dark Blue-Green Metallic",
    label: "Blue-Green, Dark (Met)",
  },
  {
    year: "1978",
    code: "22",
    name: "Light Blue Metallic",
    label: "Blue, Light (Met)",
  },
  {
    year: "1978",
    code: "63",
    name: "Camel Metallic",
    label: "Camel (Met)",
  },
  {
    year: "1978",
    code: "69",
    name: "Dark Camel Metallic",
    label: "Camel, Dark (Met)",
  },
  {
    year: "1978",
    code: "77",
    name: "Carmine Metallic",
    label: "Carmine (Met)",
  },
  {
    year: "1978",
    code: "75",
    name: "Light Red",
    label: "Red, Light",
  },
  {
    year: "1978",
    code: "67",
    name: "Saffron Metallic",
    label: "Saffron (Met)",
  },
  { year: "1978", code: "15", name: "Silver" },
  { year: "1978", code: "11", name: "White" },
  {
    year: "1978",
    code: "51",
    name: "Bright Yellow",
    label: "Yellow, Bright",
  },
  {
    year: "1978",
    code: "34",
    name: "Yellow Orange",
    label: "Yellow, Orange",
    restriction: "Z28 only",
  },
  { year: "1979", code: "61", name: "Beige" },
  { year: "1979", code: "19", name: "Black" },
  {
    year: "1979",
    code: "24",
    name: "Bright Blue Metallic",
    label: "Blue, Bright (Met)",
  },
  {
    year: "1979",
    code: "29",
    name: "Dark Blue Metallic",
    label: "Blue, Dark (Met)",
  },
  {
    year: "1979",
    code: "22",
    name: "Light Blue Metallic",
    label: "Blue, Light (Met)",
  },
  {
    year: "1979",
    code: "69",
    name: "Dark Brown Metallic",
    label: "Brown, Dark (Met)",
  },
  {
    year: "1979",
    code: "63",
    name: "Camel Metallic",
    label: "Camel (Met)",
  },
  {
    year: "1979",
    code: "77",
    name: "Carmine Metallic",
    label: "Carmine (Met)",
  },
  {
    year: "1979",
    code: "40",
    name: "Light Green",
    label: "Green, Light",
  },
  {
    year: "1979",
    code: "44",
    name: "Medium Green Metallic",
    label: "Green, Medium (Met)",
  },
  { year: "1979", code: "75", name: "Red" },
  { year: "1979", code: "15", name: "Silver" },
  { year: "1979", code: "11", name: "White" },
  {
    year: "1979",
    code: "51",
    name: "Bright Yellow",
    label: "Yellow, Bright",
  },
  { year: "1980", code: "19", name: "Black" },
  {
    year: "1980",
    code: "24",
    name: "Bright Blue Metallic",
    label: "Blue, Bright (Met)",
  },
  {
    year: "1980",
    code: "29",
    name: "Dark Blue Metallic",
    label: "Blue, Dark (Met)",
  },
  {
    year: "1980",
    code: "80",
    name: "Bronze Metallic",
    label: "Bronze (Met)",
  },
  {
    year: "1980",
    code: "67",
    name: "Dark Brown Metallic",
    label: "Brown, Dark (Met)",
  },
  {
    year: "1980",
    code: "84",
    name: "Charcoal Metallic",
    label: "Charcoal (Met)",
  },
  {
    year: "1980",
    code: "76",
    name: "Dark Claret Metallic",
    label: "Claret, Dark (Met)",
  },
  {
    year: "1980",
    code: "57",
    name: "Gold Metallic",
    label: "Gold (Met)",
  },
  {
    year: "1980",
    code: "40",
    name: "Lime Green Metallic",
    label: "Green, Lime (Met)",
  },
  { year: "1980", code: "72", name: "Red" },
  { year: "1980", code: "79", name: "Red Orange" },
  { year: "1980", code: "15", name: "Silver" },
  { year: "1980", code: "11", name: "White" },
  {
    year: "1980",
    code: "51",
    name: "Bright Yellow",
    label: "Yellow, Bright",
  },
  { year: "1981", code: "19", name: "Black" },
  {
    year: "1981",
    code: "20",
    name: "Bright Blue Metallic",
    label: "Blue, Bright (Metallic)",
  },
  {
    year: "1981",
    code: "29",
    name: "Dark Blue Metallic",
    label: "Blue, Dark (Metallic)",
  },
  {
    year: "1981",
    code: "21",
    name: "Light Blue Metallic",
    label: "Blue, Light (Metallic)",
  },
  {
    year: "1981",
    code: "67",
    name: "Dark Brown Metallic",
    label: "Brown, Dark (Metallic)",
  },
  {
    year: "1981",
    code: "84",
    name: "Charcoal Metallic",
    label: "Charcoal (Metallic)",
  },
  {
    year: "1981",
    code: "54",
    name: "Gold Metallic",
    label: "Gold (Metallic)",
  },
  {
    year: "1981",
    code: "77",
    name: "Maroon Metallic",
    label: "Maroon (Metallic)",
  },
  {
    year: "1981",
    code: "57",
    name: "Orange Metallic",
    label: "Orange (Metallic)",
  },
  { year: "1981", code: "75", name: "Red" },
  {
    year: "1981",
    code: "16",
    name: "Silver Metallic",
    label: "Silver (Metallic)",
  },
  { year: "1981", code: "11", name: "White" },
  {
    year: "1981",
    code: "51",
    name: "Bright Yellow",
    label: "Yellow, Bright",
  },
];

const camaro1982to1992Inventory: AuditedSolidColor[] = [
  { year: "1982", code: "11", name: "White" },
  {
    year: "1982",
    code: "16",
    name: "Silver Metallic",
    label: "Silver (Metallic)",
  },
  {
    year: "1982",
    code: "19",
    name: "Black",
    restriction: "Not available on Sport Coupe",
  },
  {
    year: "1982",
    code: "21",
    name: "Light Blue Metallic",
    label: "Light Blue (Metallic)",
    restriction: "Not available on Z28",
  },
  {
    year: "1982",
    code: "29",
    name: "Dark Blue Metallic",
    label: "Dark Blue (Metallic)",
  },
  {
    year: "1982",
    code: "45",
    name: "Light Jade Metallic",
    label: "Light Jade (Metallic)",
    restriction: "Not available on Z28",
  },
  {
    year: "1982",
    code: "49",
    name: "Dark Jade Metallic",
    label: "Dark Jade (Metallic)",
    restriction: "Berlinetta only",
  },
  {
    year: "1982",
    code: "55",
    name: "Gold Metallic",
    label: "Gold (Metallic)",
  },
  {
    year: "1982",
    code: "67",
    name: "Dark Gold Metallic",
    label: "Dark Gold (Metallic)",
    restriction: "Not available on Berlinetta",
  },
  { year: "1982", code: "75", name: "Red" },
  {
    year: "1982",
    code: "78",
    name: "Maroon Metallic",
    label: "Maroon (Metallic)",
    restriction: "Not available on Sport Coupe",
  },
  {
    year: "1982",
    code: "84",
    name: "Charcoal Metallic",
    label: "Charcoal (Metallic)",
  },
  { year: "1983", code: "59", name: "Beige" },
  { year: "1983", code: "19", name: "Black" },
  {
    year: "1983",
    code: "27",
    name: "Dark Blue Metallic",
    label: "Blue, Dark (Met)",
    restriction: "Not available on Berlinetta",
  },
  {
    year: "1983",
    code: "22",
    name: "Light Blue Metallic",
    label: "Blue, Light (Met)",
    restriction: "Not available on Z28",
  },
  {
    year: "1983",
    code: "67",
    name: "Dark Brown Metallic",
    label: "Brown, Dark (Met)",
    restriction: "Not available on Berlinetta",
  },
  {
    year: "1983",
    code: "62",
    name: "Light Brown Metallic",
    label: "Brown, Light (Met)",
    restriction: "Not available on Z28",
  },
  {
    year: "1983",
    code: "82",
    name: "Charcoal Metallic",
    label: "Charcoal (Met)",
  },
  {
    year: "1983",
    code: "65",
    name: "Dark Gold Metallic",
    label: "Gold, Dark (Met)",
  },
  { year: "1983", code: "75", name: "Red" },
  {
    year: "1983",
    code: "15",
    name: "Silver Metallic",
    label: "Silver (Met)",
  },
  { year: "1983", code: "11", name: "White" },
  { year: "1984", code: "59", name: "Beige" },
  { year: "1984", code: "19", name: "Black" },
  {
    year: "1984",
    code: "27",
    name: "Dark Blue Metallic",
    label: "Blue, Dark (Met)",
    restriction: "Not available on Berlinetta",
  },
  {
    year: "1984",
    code: "22",
    name: "Light Blue Metallic",
    label: "Blue, Light (Met)",
    restriction: "Not available on Z28",
  },
  {
    year: "1984",
    code: "67",
    name: "Dark Brown Metallic",
    label: "Brown, Dark (Met)",
    restriction: "Not available on Berlinetta",
  },
  {
    year: "1984",
    code: "62",
    name: "Light Brown Metallic",
    label: "Brown, Light (Met)",
    restriction: "Not available on Z28",
  },
  {
    year: "1984",
    code: "82",
    name: "Charcoal Metallic",
    label: "Charcoal (Met)",
  },
  {
    year: "1984",
    code: "65",
    name: "Dark Gold Metallic",
    label: "Gold, Dark (Met)",
  },
  { year: "1984", code: "75", name: "Red" },
  {
    year: "1984",
    code: "15",
    name: "Silver Metallic",
    label: "Silver (Met)",
  },
  { year: "1984", code: "11", name: "White" },
  { year: "1985", code: "11", name: "White" },
  { year: "1985", code: "12", name: "Silver Metallic" },
  {
    year: "1985",
    code: "15",
    name: "Medium Gray Metallic",
    restriction: "Not available with IROC-Z package",
  },
  { year: "1985", code: "19", name: "Black" },
  {
    year: "1985",
    code: "26",
    name: "Dark Blue",
    restriction: "Not available with IROC-Z package",
  },
  {
    year: "1985",
    code: "30",
    name: "Bright Blue Metallic",
    restriction: "Not available on Berlinetta",
  },
  { year: "1985", code: "50", name: "Yellow" },
  {
    year: "1985",
    code: "54",
    name: "Light Yellow",
    restriction: "Not available with IROC-Z package",
  },
  {
    year: "1985",
    code: "60",
    name: "Light Brown Metallic",
    restriction:
      "Factory specification listing; absent from revised Dealer Order Guide",
  },
  {
    year: "1985",
    code: "69",
    name: "Copper Metallic",
    restriction: "Not available with IROC-Z package",
  },
  { year: "1985", code: "75", name: "Red" },
  {
    year: "1985",
    code: "78",
    name: "Maroon",
    restriction: "Not available with IROC-Z package",
  },
  {
    year: "1986",
    code: "13",
    name: "Silver Metallic",
    restriction: "Not available with IROC-Z package",
  },
  {
    year: "1986",
    code: "23",
    name: "Bright Blue Metallic",
    restriction: "Not available on Berlinetta",
  },
  {
    year: "1986",
    code: "28",
    name: "Dark Blue Metallic",
    restriction: "Not available with IROC-Z package",
  },
  { year: "1986", code: "40", name: "White" },
  { year: "1986", code: "41", name: "Black" },
  { year: "1986", code: "51", name: "Yellow" },
  {
    year: "1986",
    code: "60",
    name: "Light Brown Metallic",
    restriction: "Initial chart only; absent from revised Dealer Order Guide",
  },
  {
    year: "1986",
    code: "66",
    name: "Copper Metallic",
    restriction: "Initial chart only; absent from revised Dealer Order Guide",
  },
  {
    year: "1986",
    code: "68",
    name: "Dark Brown Metallic",
    restriction: "Not available with IROC-Z package",
  },
  { year: "1986", code: "74", name: "Dark Red Metallic" },
  { year: "1986", code: "81", name: "Bright Red" },
  {
    year: "1986",
    code: "84",
    name: "Medium Gray Metallic",
    restriction: "Not available with IROC-Z package",
  },
  { year: "1987", code: "41", name: "Black" },
  {
    year: "1987",
    code: "23",
    name: "Bright Blue Metallic",
    restriction: "Not available on California RS",
  },
  {
    year: "1987",
    code: "28",
    name: "Dark Blue Metallic",
    restriction: "Not available on California RS",
  },
  {
    year: "1987",
    code: "68",
    name: "Dark Brown Metallic",
    restriction: "Not available on California RS",
  },
  {
    year: "1987",
    code: "84",
    name: "Medium Gray Metallic",
    restriction: "Not available on California RS",
  },
  { year: "1987", code: "81", name: "Bright Red" },
  {
    year: "1987",
    code: "74",
    name: "Dark Red Metallic",
    restriction: "Not available on California RS",
  },
  {
    year: "1987",
    code: "13",
    name: "Silver Metallic",
    restriction: "Not available on California RS",
  },
  { year: "1987", code: "40", name: "White" },
  {
    year: "1987",
    code: "51",
    name: "Yellow",
    restriction: "Not available on California RS",
  },
  { year: "1988", code: "41", name: "Black" },
  {
    year: "1988",
    code: "23",
    name: "Bright Blue Metallic",
    label: "Blue, Bright (Met)",
    restriction: "Not available on IROC-Z",
  },
  {
    year: "1988",
    code: "87",
    name: "Medium Gray Metallic",
    label: "Gray, Medium (Met)",
  },
  {
    year: "1988",
    code: "63",
    name: "Medium Orange Metallic",
    label: "Orange, Medium (Met)",
  },
  {
    year: "1988",
    code: "81",
    name: "Bright Red",
    label: "Red, Bright",
  },
  {
    year: "1988",
    code: "74",
    name: "Dark Red Metallic",
    label: "Red, Dark (Met)",
  },
  {
    year: "1988",
    code: "13",
    name: "Silver Metallic",
    label: "Silver (Met)",
    restriction: "Non-IROC-Z only",
  },
  { year: "1988", code: "40", name: "White" },
  {
    year: "1988",
    code: "51",
    name: "Yellow",
    restriction: "Not available on IROC-Z",
  },
  { year: "1989", code: "41", name: "Black" },
  {
    year: "1989",
    code: "98",
    name: "Bright Blue Metallic",
    label: "Blue, Bright (Met)",
  },
  {
    year: "1989",
    code: "23",
    name: "Light Blue Metallic",
    label: "Blue, Lt (Met)",
    restriction: "RS only",
  },
  {
    year: "1989",
    code: "87",
    name: "Medium Gray Metallic",
    label: "Gray, Med (Met)",
    restriction: "RS only",
  },
  {
    year: "1989",
    code: "81",
    name: "Bright Red",
    label: "Red, Bright",
  },
  {
    year: "1989",
    code: "74",
    name: "Dark Red Metallic",
    label: "Red, Dk (Met)",
  },
  { year: "1989", code: "40", name: "White" },
  { year: "1990", code: "41", name: "Black" },
  {
    year: "1990",
    code: "98",
    name: "Bright Blue Metallic",
    label: "Blue, Bright (Met)",
  },
  {
    year: "1990",
    code: "23",
    name: "Light Blue Metallic",
    label: "Blue, Lt (Met)",
    restriction: "RS only",
  },
  {
    year: "1990",
    code: "87",
    name: "Medium Gray Metallic",
    label: "Gray, Med (Met)",
    restriction: "RS only",
  },
  {
    year: "1990",
    code: "81",
    name: "Bright Red",
    label: "Red, Bright",
  },
  {
    year: "1990",
    code: "75",
    name: "Dark Red Metallic",
    label: "Red, Dk (Met)",
  },
  { year: "1990", code: "40", name: "White" },
  { year: "1991", code: "41", name: "Black" },
  {
    year: "1991",
    code: "23",
    name: "Light Blue Metallic",
    label: "Blue, Lt (Met)",
    restriction: "RS only",
  },
  {
    year: "1991",
    code: "98",
    name: "Ultra Blue Metallic",
    label: "Blue, Ultra (Met)",
  },
  {
    year: "1991",
    code: "87",
    name: "Medium Gray Metallic",
    label: "Gray, Med (Met)",
    restriction: "RS only",
  },
  {
    year: "1991",
    code: "81",
    name: "Bright Red",
    label: "Red, Bright",
  },
  {
    year: "1991",
    code: "75",
    name: "Dark Red Metallic",
    label: "Red, Dk (Met)",
  },
  {
    year: "1991",
    code: "37",
    name: "Dark Teal Metallic",
    label: "Teal, Dk (Met)",
    restriction: "RS only",
  },
  {
    year: "1991",
    code: "10",
    name: "Arctic White",
    label: "White, Arctic",
  },
  { year: "1992", code: "41", name: "Black" },
  {
    year: "1992",
    code: "80",
    name: "Medium Quasar Blue Metallic",
    label: "Blue, Med Quasar (Met)",
  },
  {
    year: "1992",
    code: "18",
    name: "Dark Green-Gray Metallic",
    label: "Green Dk, Gray (Met)",
    restriction: "NA on Z28",
  },
  {
    year: "1992",
    code: "45",
    name: "Polo Green II Metallic",
    label: "Green, Polo II (Met)",
    restriction: "NA on Z28",
  },
  {
    year: "1992",
    code: "84",
    name: "Purple Haze Metallic",
    label: "Purple Haze (Met)",
  },
  {
    year: "1992",
    code: "81",
    name: "Bright Red",
    label: "Red, Bright",
  },
  {
    year: "1992",
    code: "75",
    name: "Dark Red Metallic",
    label: "Red, Dk (Met)",
  },
  {
    year: "1992",
    code: "37",
    name: "Dark Teal Metallic",
    label: "Teal, Dk (Met)",
  },
  {
    year: "1992",
    code: "10",
    name: "Arctic White",
    label: "White, Arctic",
  },
];

const secondGenerationCamaro: Generation = {
  id: "second-generation-1970-1981",
  label: "Second generation",
  range: "1970–1981",
  years: [
    "1970",
    "1971",
    "1972",
    "1973",
    "1974",
    "1975",
    "1976",
    "1977",
    "1978",
    "1979",
    "1980",
    "1981",
  ],
  listingCount:
    camaro1970to1975Inventory.length + camaro1976to1981Inventory.length,
  revisionNote:
    "Every row comes from a completely reviewed Camaro exterior-color chart. The 1972 charts both omit black. The only color-level restriction is 1978 Yellow, Orange code 34, which the Z28 chart adds to the standard list. Carryover notes, ZP2 overrides, Rally Sport pairs, and stripe schemes do not create additional solid-color rows.",
  sources: {
    "1970": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1970 Camaro exterior color chart",
      locator: "PDF p. 17, printed BODY-3",
      revision: "February 1970",
      url: gmKit("1970"),
    },
    "1971": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1971 Camaro exterior color chart",
      locator: "PDF p. 48, printed BODY-3",
      revision: "September 1970",
      url: gmKit("1971"),
    },
    "1972": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1972 Camaro exterior color charts",
      locator: "PDF pp. 25–26, printed BODY-3 and 4-BODY",
      revision: "September 1971",
      url: gmKit("1972"),
    },
    "1973": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1973 Camaro exterior color charts",
      locator: "PDF pp. 30–31, printed 4-BODY and BODY-5",
      revision: "September 1972; BODY-5 revised January 1973",
      url: gmKit("1973"),
    },
    "1974": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1974 Camaro exterior color charts",
      locator: "PDF pp. 49–50, printed 4-BODY and BODY-5",
      revision: "September 1973",
      url: gmKit("1974"),
    },
    "1975": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1975 Camaro exterior color charts",
      locator: "PDF pp. 22–23, printed 4-BODY and BODY-5",
      revision: "September 1974",
      url: gmKit("1975"),
    },
    "1976": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1976 Camaro Dealer Order Guide exterior colors",
      locator: "PDF p. 72, printed Camaro Page 4",
      revision: "Revised February 18, 1976",
      url: gmKit("1976"),
    },
    "1977": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1977 Camaro Dealer Order Guide exterior colors",
      locator: "PDF p. 6, printed Camaro Page 4",
      revision: "Revised October 8, 1976",
      url: gmKit("1977"),
    },
    "1978": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1978 Camaro and Z28 Dealer Order Guide exterior colors",
      locator: "PDF pp. 30 and 34, printed Camaro Pages 2 and 6",
      revision: "Revised January 20, 1978",
      url: gmKit("1978"),
    },
    "1979": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1979 Camaro Dealer Order Guide exterior colors",
      locator: "PDF p. 62, printed Camaro Page 6",
      revision: "Revised February 5, 1979",
      url: gmKit("1979"),
    },
    "1980": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1980 Camaro Dealer Order Guide exterior colors",
      locator: "PDF p. 110, printed Camaro Page 6",
      revision: "Revised March 24, 1980",
      url: gmKit("1980"),
    },
    "1981": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1981 Camaro Dealer Order Guide exterior colors",
      locator: "PDF p. 44, printed Camaro Page 6",
      revision: "Revised March 16, 1981",
      url: gmKit("1981"),
    },
  },
  colors: buildExactNameTimeline("camaro-second-generation", [
    ...camaro1970to1975Inventory,
    ...camaro1976to1981Inventory,
  ]),
};

const thirdGenerationCamaro: Generation = {
  id: "third-generation-1982-1992",
  label: "Third generation",
  range: "1982–1992",
  years: [
    "1982",
    "1983",
    "1984",
    "1985",
    "1986",
    "1987",
    "1988",
    "1989",
    "1990",
    "1991",
    "1992",
  ],
  listingCount: camaro1982to1992Inventory.length,
  revisionNote:
    "Every row comes from a complete official GM inventory or the union of exclusive model charts. Restrictions preserve model and package coverage. The 1985 Light Brown and 1986 Light Brown and Copper rows remain flagged because early listings conflict with later revised guides. The 1987 charts confirm Sport Coupe and LT coverage and mark seven paints unavailable on California RS; Z28 and IROC-Z applications remain unresolved. Stripe, decal, accent, wheel, top, and Heritage-package tables do not create additional solid-color rows.",
  sources: {
    "1982": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1982 Camaro exterior colors and Dealer Order Guide model grids",
      locator:
        "PDF pp. 33, 36, and 38; printed Camaro Dealer Order Guide Pages 2 and 4",
      revision: "Exterior Colors overview; Dealer Order Guide revised January 11, 1982",
      url: gmKit("1982"),
    },
    "1983": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1983 Camaro Dealer Order Guide exterior-color grids",
      locator:
        "PDF pp. 36, 38, and 40, printed Camaro Pages 2, 4, and 6",
      revision: "Revised February 1, 1983",
      url: gmKit("1983"),
    },
    "1984": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1984 Camaro exterior colors and Dealer Order Guide model grids",
      locator:
        "PDF pp. 8, 10, 12, and 15; printed Camaro Pages 2, 4, and 6 plus Exterior Colors overview",
      revision: "Dealer Order Guide revised March 2, 1984",
      url: gmKit("1984"),
    },
    "1985": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1985 Camaro exterior colors and Dealer Order Guide package grids",
      locator:
        "PDF pp. 30, 34, 36, 38, and 40; printed Camaro/26 and Dealer Order Guide Pages 2, 4, 6, and 8",
      revision:
        "Exterior Colors specification; Dealer Order Guide revised January 28, 1985",
      url: gmKit("1985"),
    },
    "1986": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1986 Camaro exterior colors and Dealer Order Guide package grids",
      locator:
        "PDF pp. 31–34, 40, 42, and 44; printed Camaro/21–22 and Dealer Order Guide Pages 2, 4, and 6",
      revision:
        "Exterior Colors publication April 1985; Dealer Order Guide revised December 2, 1985",
      url: gmKit("1986"),
    },
    "1987": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1987 Camaro Color & Trim Selections and California RS chart",
      locator:
        "PDF pp. 45 and 17, printed Camaro/23 and unnumbered California RS chart",
      revision: "No date printed; California RS PUBLISHED field blank",
      url: gmKit("1987"),
    },
    "1988": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1988 Camaro IROC-Z and base-model color-and-trim grids",
      locator:
        "PDF pp. 34, 36, 38, and 40, printed Camaro Pages 2, 4, 6, and 8",
      revision: "Revised December 4, 1987",
      url: gmKit("1988"),
    },
    "1989": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1989 Camaro IROC-Z and RS color-and-trim grids",
      locator:
        "PDF pp. 34, 38, 40, and 42, printed Camaro Pages 2, 6, 8, and 10",
      revision: "Revised January 30, 1989",
      url: gmKit("1989"),
    },
    "1990": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1990 Camaro IROC-Z and RS color-and-trim grids",
      locator:
        "PDF pp. 36, 38, 40, and 42, printed Camaro Pages 2, 4, 6, and 8",
      revision: "Revised September 15, 1989",
      url: gmKit("1990"),
    },
    "1991": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1991 Camaro Z28 and RS color-and-trim grids",
      locator:
        "PDF pp. 26, 28, 30, and 32, printed Camaro Pages 2, 4, 6, and 8",
      revision: "Revised February 25, 1991",
      url: gmKit("1991"),
    },
    "1992": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "1992 Camaro Z28 and RS color-and-trim grids",
      locator:
        "PDF pp. 84, 86, 88, and 90, printed Camaro Pages 2, 4, 6, and 8",
      revision: "Revised September 13, 1991",
      url: gmKit("1992"),
    },
  },
  colors: buildExactNameTimeline(
    "camaro-third-generation",
    camaro1982to1992Inventory,
  ),
};

const firstChevelleGeneration: Generation = {
  id: "first-generation-chevelle-audited-solids",
  label: "First-generation Chevelle audited solids",
  range: "1964–1967",
  years: ["1964", "1965", "1966", "1967"],
  listingCount: chevelleSolidInventory.length,
  revisionNote:
    "The matrix publishes solid colors from the controlling dedicated Chevelle charts. Three 1965 colors are restricted to Malibu S.S. The 1964 Goldwood Yellow row has no compatible interior mark and remains unverified. Two-tone combinations are audited separately and are not treated as additional solid colors.",
  sources: {
    "1964": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Chevelle exterior color and interior trim combinations",
      locator: "PDF pp. 26–27, printed BODY-3 and 4-BODY",
      revision: "October 1963",
      url: gmChevelleKit("1964"),
    },
    "1965": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Chevelle exterior color and interior trim combinations",
      locator: "PDF pp. 35–36, printed Section II, pp. 21–22",
      revision: "March 1, 1965",
      url: gmChevelleKit("1965"),
    },
    "1966": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Chevelle exterior color and interior trim combinations",
      locator: "PDF pp. 40–41, printed BODY-3–4",
      revision: "Revised December 1965",
      url: gmChevelleKit("1966"),
    },
    "1967": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Chevelle exterior color and interior trim combinations",
      locator: "PDF pp. 48–52, printed BODY-3–7",
      revision: "September 1966",
      url: gmChevelleKit("1967"),
    },
  },
  colors: buildExactNameTimeline("chevelle", chevelleSolidInventory),
};

const suburban1977To1981SolidInventory: AuditedSolidColor[] = [
  { year: "1977", code: "86", name: "Black, Midnight" },
  { year: "1977", code: "20", name: "Blue, Lite (Light)" },
  { year: "1977", code: "23", name: "Blue, Hawaiian (Medium)" },
  { year: "1977", code: "25", name: "Blue, Mariner (Dark) (M)" },
  { year: "1977", code: "81", name: "Brown, Cordova (Dark) (M)" },
  { year: "1977", code: "65", name: "Buckskin" },
  { year: "1977", code: "43", name: "Green, Seamist (Light) (M)" },
  { year: "1977", code: "76", name: "Mahogany" },
  { year: "1977", code: "70", name: "Red, Cardinal (Medium)" },
  { year: "1977", code: "71", name: "Red, Metallic (Dark) (M)" },
  { year: "1977", code: "68", name: "Russet Metallic (M)" },
  { year: "1977", code: "17", name: "Silver, Saratoga (M)" },
  { year: "1977", code: "60", name: "Tan, Santa Fe" },
  { year: "1977", code: "12", name: "White, Frost" },
  { year: "1977", code: "53", name: "Yellow, Colonial" },
  { year: "1978", code: "86", name: "Black, Midnight" },
  { year: "1978", code: "20", name: "Blue, Lite (Light)" },
  { year: "1978", code: "23", name: "Blue, Hawaiian (Medium)" },
  { year: "1978", code: "25", name: "Blue, Mariner (Dark) (M)" },
  { year: "1978", code: "81", name: "Brown, Cordova (Dark) (M)" },
  { year: "1978", code: "65", name: "Buckskin" },
  { year: "1978", code: "43", name: "Green, Seamist (Light) (M)" },
  { year: "1978", code: "76", name: "Mahogany" },
  { year: "1978", code: "70", name: "Red, Cardinal (Medium)" },
  { year: "1978", code: "71", name: "Red, Metallic (Dark) (M)" },
  { year: "1978", code: "68", name: "Russet Metallic (M)" },
  { year: "1978", code: "17", name: "Silver, Saratoga (M)" },
  { year: "1978", code: "60", name: "Tan, Santa Fe" },
  { year: "1978", code: "12", name: "White, Frost" },
  { year: "1978", code: "53", name: "Yellow, Colonial" },
  { year: "1979", code: "12", name: "Frost White" },
  { year: "1979", code: "17", name: "Mystic Silver" },
  { year: "1979", code: "18", name: "Charcoal (Metallic)" },
  { year: "1979", code: "23", name: "Hawaiian Blue" },
  { year: "1979", code: "25", name: "Mariner Blue (Metallic)" },
  { year: "1979", code: "26", name: "Deep Blue" },
  { year: "1979", code: "43", name: "Shamrock Green (Metallic)" },
  { year: "1979", code: "46", name: "Holly Green" },
  { year: "1979", code: "53", name: "Colonial Yellow" },
  { year: "1979", code: "60", name: "Santa Fe Tan" },
  { year: "1979", code: "65", name: "Light Camel (Metallic)" },
  { year: "1979", code: "71", name: "Dark Carmine Red" },
  { year: "1979", code: "73", name: "Cardinal Red" },
  { year: "1979", code: "81", name: "Cordova Brown (Metallic)" },
  { year: "1979", code: "86", name: "Midnight Black" },
  { year: "1980", code: "12", name: "Frost White" },
  { year: "1980", code: "17", name: "Mystic Silver (Metallic)" },
  { year: "1980", code: "18", name: "Charcoal (Metallic)" },
  { year: "1980", code: "23", name: "Medium Blue" },
  { year: "1980", code: "25", name: "Light Blue Metallic" },
  { year: "1980", code: "30", name: "Nordic Blue Metallic" },
  { year: "1980", code: "43", name: "Emerald Green" },
  { year: "1980", code: "60", name: "Santa Fe Tan" },
  { year: "1980", code: "62", name: "Dark Camel Metallic" },
  { year: "1980", code: "65", name: "Camel Metallic" },
  { year: "1980", code: "70", name: "Carmine Red" },
  { year: "1980", code: "71", name: "Dark Carmine Red" },
  { year: "1980", code: "73", name: "Cardinal Red" },
  { year: "1980", code: "86", name: "Midnight Black" },
  { year: "1980", code: "95", name: "Burnt Orange Metallic" },
  { year: "1981", code: "12", name: "Frost White" },
  { year: "1981", code: "17", name: "Light Silver Metallic" },
  { year: "1981", code: "18", name: "Charcoal Metallic" },
  { year: "1981", code: "23", name: "Medium Blue" },
  { year: "1981", code: "25", name: "Light Blue Metallic" },
  { year: "1981", code: "30", name: "Nordic Blue Metallic" },
  { year: "1981", code: "43", name: "Emerald Green" },
  { year: "1981", code: "53", name: "Colonial Yellow" },
  { year: "1981", code: "60", name: "Santa Fe Tan" },
  { year: "1981", code: "65", name: "Dark Chestnut Metallic" },
  { year: "1981", code: "70", name: "Carmine Red" },
  { year: "1981", code: "71", name: "Dark Carmine Red" },
  { year: "1981", code: "73", name: "Cardinal Red" },
  { year: "1981", code: "86", name: "Midnight Black" },
  { year: "1981", code: "95", name: "Burnt Orange Metallic" },
];

const suburban1977To1981: Generation = {
  id: "suburban-1977-1981-audited-solid-colors",
  label: "1977–1981 audited charts",
  range: "1977–1981",
  years: ["1977", "1978", "1979", "1980", "1981"],
  listingCount: suburban1977To1981SolidInventory.length,
  revisionNote:
    "The solid-color timeline publishes only each chart's boldface primary colors. Secondary-color rows and the two-tone or decor-package charts remain a separate evidence class.",
  sources: {
    "1977": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Suburban Interior and Exterior Color Availability Chart",
      locator: "PDF p. 6, printed Suburban Page 6",
      revision: "August 9, 1976",
      url: gmSuburbanKit("1977"),
    },
    "1978": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Suburban Interior and Exterior Color Availability Chart",
      locator: "PDF p. 30, printed Suburban Page H",
      revision: "December 23, 1977",
      url: gmSuburbanKit("1978"),
    },
    "1979": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Suburban Interior and Exterior Color Availability Chart",
      locator: "PDF p. 32, printed Suburban Page H",
      revision: "August 18, 1978",
      url: gmSuburbanKit("1979"),
    },
    "1980": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Suburban Interior and Exterior Color Availability Chart",
      locator: "PDF p. 28, printed Suburban Page H",
      revision: "August 3, 1979",
      url: gmSuburbanKit("1980"),
    },
    "1981": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "Suburban Interior and Exterior Color Availability Chart",
      locator: "PDF p. 26, printed Suburban Page H",
      revision: "August 8, 1980",
      url: gmSuburbanKit("1981"),
    },
  },
  colors: buildExactNameTimeline("suburban", suburban1977To1981SolidInventory),
};

const suburban1983SolidInventory: AuditedSolidColor[] = [
  { year: "1983", code: "59", name: "Almond" },
  { year: "1983", code: "19", name: "Black, Midnight" },
  { year: "1983", code: "21", name: "Blue, Light (Metallic)" },
  { year: "1983", code: "29", name: "Blue, Midnight" },
  { year: "1983", code: "63", name: "Bronze, Light (Metallic)" },
  { year: "1983", code: "68", name: "Mahogany (Metallic)" },
  { year: "1983", code: "70", name: "Red, Carmine" },
  { year: "1983", code: "17", name: "Silver (Metallic)" },
  { year: "1983", code: "12", name: "White, Frost" },
  { year: "1983", code: "53", name: "Yellow, Colonial" },
];

const suburban1983: Generation = {
  id: "suburban-1983-audited-solid-colors",
  label: "1983 audited chart",
  range: "1983",
  years: ["1983"],
  listingCount: suburban1983SolidInventory.length,
  revisionNote:
    "The solid-color timeline publishes only the chart's boldface primary colors. The eight ZY5 paint combinations remain a separate paint-scheme evidence class.",
  sources: {
    "1983": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "C/K Suburban Interior and Exterior Color Availability Chart",
      locator: "PDF p. 27, printed C/K Suburban Page H",
      revision: "February 1983",
      url: gmSuburbanKit("1983"),
    },
  },
  colors: buildExactNameTimeline("suburban", suburban1983SolidInventory),
};

const suburban1984To1985SolidInventory: AuditedSolidColor[] = [
  ...["1984", "1985"].flatMap((year) => [
    { year, code: "19", name: "Black, Midnight" },
    { year, code: "21", name: "Blue, Light (Metallic)" },
    { year, code: "29", name: "Blue, Midnight" },
    { year, code: "66", name: "Bronze, Indian (Metallic)" },
    { year, code: "72", name: "Red, Apple" },
    { year, code: "64", name: "Sand, Desert (Metallic)" },
    { year, code: "17", name: "Silver (Metallic)" },
    { year, code: "61", name: "Tan, Doeskin" },
    { year, code: "12", name: "White, Frost" },
    { year, code: "53", name: "Yellow, Colonial" },
  ]),
];

const suburban1984To1985: Generation = {
  id: "suburban-1984-1985-audited-solid-colors",
  label: "1984–1985 audited charts",
  range: "1984–1985",
  years: ["1984", "1985"],
  listingCount: suburban1984To1985SolidInventory.length,
  revisionNote:
    "The solid-color timeline publishes only each chart's ten primary colors. Each year's 23 ZY5 paint combinations remain a separate paint-scheme evidence class.",
  sources: {
    "1984": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "C/K Suburban Interior and Exterior Color Availability Chart",
      locator: "PDF p. 31, printed C/K Suburban Page H",
      revision: "February 1984",
      url: gmSuburbanKit("1984"),
    },
    "1985": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "C/K Suburban Interior and Exterior Color Availability Chart",
      locator: "PDF p. 31, printed C/K Suburban Page H",
      revision: "August 1984",
      url: gmSuburbanKit("1985"),
    },
  },
  colors: buildExactNameTimeline("suburban", suburban1984To1985SolidInventory),
};

const suburban1986SolidInventory: AuditedSolidColor[] = [
  { year: "1986", code: "19", name: "Black, Midnight" },
  { year: "1986", code: "21", name: "Blue, Light (Metallic)" },
  { year: "1986", code: "29", name: "Blue, Midnight" },
  { year: "1986", code: "66", name: "Bronze, Indian (Metallic)" },
  { year: "1986", code: "55", name: "Copper, Canyon (Metallic)" },
  { year: "1986", code: "67", name: "Gold, Nevada (Metallic)" },
  { year: "1986", code: "90", name: "Gray, Steel (Metallic)" },
  { year: "1986", code: "72", name: "Red, Apple" },
  { year: "1986", code: "61", name: "Tan, Doeskin" },
  { year: "1986", code: "12", name: "White, Frost" },
];

const suburban1986: Generation = {
  id: "suburban-1986-audited-solid-colors",
  label: "1986 audited chart",
  range: "1986",
  years: ["1986"],
  listingCount: suburban1986SolidInventory.length,
  revisionNote:
    "The solid-color timeline publishes only the chart's ten primary colors. The 23 ZY5 combinations remain a separate paint-scheme evidence class.",
  sources: {
    "1986": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "C/K Suburban Interior and Exterior Color Availability Chart",
      locator: "PDF p. 32, printed C/K Suburban Page H",
      revision: "September 1985",
      url: gmSuburbanKit("1986"),
      sourceId: "gm-heritage-1986-chevrolet-suburban",
      artifactSha256: "3992e771d8ed8f0c20db0c28332303c124e47e6833ec7ae790f3df7add526be3",
      artifactBytes: 4864826,
      pdfPageCount: 34,
      supportingSources: [
        {
          name: "GM Heritage Vehicle Information Kit",
          chart: "Complete duplicate of the 1986 C/K Suburban color chart",
          locator: "1985 kit PDF p. 67, printed C/K Suburban Page H",
          revision: "September 1985",
          url: gmSuburbanKit("1985"),
          sourceId: "gm-heritage-1985-chevrolet-suburban",
          artifactSha256: "3c04a11f01549d4280b6fe379cdfdb720ec3e6d1a0dc2eb64ca33436a40194d8",
          artifactBytes: 2341838,
          pdfPageCount: 69,
        },
      ],
    },
  },
  colors: buildExactNameTimeline("suburban", suburban1986SolidInventory),
};

const suburban1987SolidInventory: AuditedSolidColor[] = [
  { year: "1987", code: "19", name: "Black, Midnight" },
  { year: "1987", code: "21", name: "Blue, Light (Metallic)" },
  { year: "1987", code: "29", name: "Blue, Midnight" },
  { year: "1987", code: "66", name: "Bronze, Indian (Metallic)" },
  { year: "1987", code: "55", name: "Copper, Canyon (Metallic)" },
  { year: "1987", code: "67", name: "Gold, Nevada (Metallic)" },
  { year: "1987", code: "90", name: "Gray, Steel (Metallic)" },
  { year: "1987", code: "72", name: "Red, Apple" },
  { year: "1987", code: "61", name: "Tan, Doeskin" },
  { year: "1987", code: "12", name: "White, Frost" },
];

const suburban1987: Generation = {
  id: "suburban-1987-audited-solid-colors",
  label: "1987 audited chart",
  range: "1987",
  years: ["1987"],
  listingCount: suburban1987SolidInventory.length,
  revisionNote:
    "The solid-color timeline publishes only the chart's ten primary colors. The independently reviewed 23 ZY5 combinations remain a separate paint-scheme evidence class.",
  sources: {
    "1987": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "R/V Suburban Interior and Exterior Color Availability Chart",
      locator: "PDF p. 39, printed R/V Suburban Page H",
      revision: "February 1987",
      url: gmSuburbanKit("1987"),
    },
  },
  colors: buildExactNameTimeline("suburban", suburban1987SolidInventory),
};

const suburban1988SolidInventory: AuditedSolidColor[] = [
  { year: "1988", code: "19", name: "Black, Midnight" },
  { year: "1988", code: "24", name: "Blue, Aspen (Metallic)" },
  { year: "1988", code: "29", name: "Blue, Midnight" },
  { year: "1988", code: "39", name: "Brown, Woodlands (Metallic)" },
  { year: "1988", code: "44", name: "Emerald (Metallic)" },
  { year: "1988", code: "67", name: "Gold, Nevada (Metallic)" },
  { year: "1988", code: "90", name: "Gray, Steel (Metallic)" },
  { year: "1988", code: "72", name: "Red, Apple" },
  { year: "1988", code: "61", name: "Tan, Doeskin" },
  { year: "1988", code: "12", name: "White, Frost" },
];

const suburban1988: Generation = {
  id: "suburban-1988-audited-solid-colors",
  label: "1988 audited chart",
  range: "1988",
  years: ["1988"],
  listingCount: suburban1988SolidInventory.length,
  revisionNote:
    "The solid-color timeline publishes only the chart's ten primary colors. The ZY1 and ZY3 chart and the separately revised ZY5 exterior-decor chart remain paint-scheme evidence.",
  sources: {
    "1988": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "R/V Suburban Interior and Exterior Color Availability Chart",
      locator: "PDF p. 29, printed R/V Suburban Page H; ZY5 chart at PDF p. 30, printed Page I",
      revision: "September 1987; ZY5 revision February 1988",
      url: gmSuburbanKit("1988"),
    },
  },
  colors: buildExactNameTimeline("suburban", suburban1988SolidInventory),
};

const suburban1990SolidInventory: AuditedSolidColor[] = [
  { year: "1990", code: "20", name: "Onyx Black" },
  { year: "1990", code: "27", name: "Smoke Blue Met." },
  { year: "1990", code: "33", name: "Mojave Beige" },
  { year: "1990", code: "36", name: "Wintergreen Met." },
  { year: "1990", code: "50", name: "Summit White" },
  { year: "1990", code: "74", name: "Fire Red" },
  { year: "1990", code: "83", name: "Gray Met." },
  { year: "1990", code: "96", name: "Quicksilver Met." },
  { year: "1990", code: "98", name: "Midnight Blue Met." },
];

const suburban1990: Generation = {
  id: "suburban-1990-audited-solid-colors",
  label: "1990 audited chart",
  range: "1990",
  years: ["1990"],
  listingCount: suburban1990SolidInventory.length,
  revisionNote:
    "The public timeline publishes only the nine same-code ZY1 rows. ZY2, ZY3, and ZY4 combinations remain separate paint-scheme evidence, and code 34 Sunset Gold Met. is not promoted from its source-labeled color-code-2-only role.",
  sources: {
    "1990": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "R/V Suburban Color Combinations, Solid Color (ZY1)",
      locator:
        "PDF p. 20, printed p. 19; ZY2 at PDF p. 21, ZY4 at PDF p. 24, and ZY3 at PDF p. 25",
      revision: "No revision date printed",
      url: gmSuburbanKit("1990"),
      sourceId: "gm-heritage-1990-chevrolet-suburban",
      artifactSha256: "46b985c6943036e27efd890122a3d3ffc5d0ba625d19305a978da5d3fec57df9",
      artifactBytes: 1130037,
      pdfPageCount: 27,
    },
  },
  colors: buildExactNameTimeline("suburban", suburban1990SolidInventory),
};

const suburban1991SolidInventory: AuditedSolidColor[] = [
  { year: "1991", code: "22", name: "Brilliant Blue Met." },
  { year: "1991", code: "27", name: "Smoke Blue Met." },
  { year: "1991", code: "33", name: "Mojave Beige" },
  { year: "1991", code: "41", name: "Onyx Black" },
  { year: "1991", code: "50", name: "Summit White" },
  { year: "1991", code: "74", name: "Fire Red" },
  { year: "1991", code: "96", name: "Quicksilver Met." },
  { year: "1991", code: "97", name: "Slate Met." },
  { year: "1991", code: "98", name: "Midnight Blue Met." },
];

const suburban1991: Generation = {
  id: "suburban-1991-audited-solid-colors",
  label: "1991 audited chart",
  range: "1991",
  years: ["1991"],
  listingCount: suburban1991SolidInventory.length,
  revisionNote:
    "The public timeline publishes only the nine same-code ZY1 rows. ZY2, ZY3, and ZY4 combinations remain separate paint-scheme evidence; the ZY2 source's anomalous 76 Fire Red entry remains documented without changing the ZY1 code 74 row.",
  sources: {
    "1991": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "R/V Suburban Color Combinations, Solid Color (ZY1)",
      locator:
        "PDF p. 20, printed p. 19; ZY2, ZY3, and ZY4 at PDF pp. 21-23",
      revision: "October 1990",
      url: gmSuburbanKit("1991"),
      sourceId: "gm-heritage-1991-chevrolet-suburban",
      artifactSha256: "24f2a80e283d48d02a137e0c71114e76d31466515130aa8b21a93d1ac1a0ff7f",
      artifactBytes: 1229801,
      pdfPageCount: 29,
    },
  },
  colors: buildExactNameTimeline("suburban", suburban1991SolidInventory),
};

const suburban1992SolidInventory: AuditedSolidColor[] = [
  { year: "1992", code: "22", name: "Brilliant Blue Met." },
  { year: "1992", code: "27", name: "Smoke Blue Met." },
  { year: "1992", code: "36", name: "Teal Blue Met." },
  { year: "1992", code: "41", name: "Onyx Black" },
  { year: "1992", code: "50", name: "Summit White" },
  { year: "1992", code: "57", name: "Sand Beige Met." },
  { year: "1992", code: "74", name: "Victory Red" },
  { year: "1992", code: "76", name: "Burnt Red Met." },
  { year: "1992", code: "96", name: "Quicksilver Met." },
  { year: "1992", code: "97", name: "Slate Met." },
];

const suburban1992: Generation = {
  id: "suburban-1992-audited-solid-colors",
  label: "1992 audited chart",
  range: "1992",
  years: ["1992"],
  listingCount: suburban1992SolidInventory.length,
  revisionNote:
    "The ZY1 chart prints 22 same-code rows because optional D85 stripe and interior recommendations repeat primary paints. The timeline publishes the ten distinct primary exterior colors once each; ZY2, ZY3, and ZY4 rows remain separate schemes.",
  sources: {
    "1992": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "C/K Suburban Color Combinations, Solid Color (ZY1)",
      locator:
        "PDF p. 20, printed p. 19; ZY2, ZY3, and ZY4 at PDF pp. 21-23",
      revision: "No revision date printed",
      url: gmSuburbanKit("1992"),
      sourceId: "gm-heritage-1992-chevrolet-suburban",
      artifactSha256: "c91ee8f67a3e33f5e6485572f1347e90d12de287dcf8720e0529599032a05b78",
      artifactBytes: 746842,
      pdfPageCount: 23,
    },
  },
  colors: buildExactNameTimeline("suburban", suburban1992SolidInventory),
};

const suburban1994SolidInventory: AuditedSolidColor[] = [
  { year: "1994", code: "56", name: "Autumnwood, Dk (Met)" },
  { year: "1994", code: "55", name: "Autumnwood, Lt (Met)" },
  { year: "1994", code: "41", name: "Black, Onyx" },
  { year: "1994", code: "30", name: "Blue, Atlantic (Met)" },
  { year: "1994", code: "39", name: "Blue, Indigo (Met)" },
  { year: "1994", code: "36", name: "Blue, Teal (Met)" },
  { year: "1994", code: "96", name: "Quicksilver (Met)" },
  { year: "1994", code: "76", name: "Red, Burnt (Met)" },
  { year: "1994", code: "74", name: "Red, Victory" },
  { year: "1994", code: "50", name: "White, Summit" },
];

const suburban1994: Generation = {
  id: "suburban-1994-audited-solid-colors",
  label: "1994 audited chart",
  range: "1994",
  years: ["1994"],
  listingCount: suburban1994SolidInventory.length,
  revisionNote:
    "The public timeline publishes the ten same-code rows from the combined ZY1/ZY2 chart. ZY2 and ZY4 combinations remain separate schemes. The handwritten 50-55 note below the ZY4 table is retained as an unofficial annotation and does not replace printed factory rows.",
  sources: {
    "1994": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "C/K 1500 and C/K 2500 Suburban Interior and Exterior Color Availability Chart with ZY1 and ZY2 Paint",
      locator:
        "PDF p. 19, printed Order Guide p. 14; ZY4 at PDF p. 20, printed Order Guide p. 15",
      revision: "Revised 1-10-94",
      url: gmSuburbanKit("1994"),
      sourceId: "gm-heritage-1994-chevrolet-suburban",
      artifactSha256: "895ef9992d0f5172084047683acfa8d543acea6bf37464df24fee50d9e3385df",
      artifactBytes: 1078053,
      pdfPageCount: 28,
    },
  },
  colors: buildExactNameTimeline("suburban", suburban1994SolidInventory),
};

const suburban1995To1999SolidInventory: AuditedSolidColor[] = [
  { year: "1995", code: "55U", name: "AUTUMNWOOD, LT (Met)" },
  { year: "1995", code: "41U", name: "BLACK, ONYX" },
  { year: "1995", code: "30U", name: "BLUE, ATLANTIC (Met)" },
  { year: "1995", code: "39U", name: "BLUE, INDIGO (Met)" },
  { year: "1995", code: "36U", name: "BLUE, TEAL (Met)" },
  { year: "1995", code: "43U", name: "GREEN, EMERALD (Met)" },
  { year: "1995", code: "96U", name: "QUICKSILVER (Met)" },
  { year: "1995", code: "76U", name: "RED, BURNT (Met)" },
  { year: "1995", code: "74U", name: "RED, VICTORY" },
  { year: "1995", code: "50U", name: "WHITE, SUMMIT" },
  { year: "1996", code: "55U", name: "AUTUMNWOOD, LT (Met)" },
  { year: "1996", code: "41U", name: "BLACK, ONYX" },
  { year: "1996", code: "30U", name: "BLUE, ATLANTIC (Met)" },
  { year: "1996", code: "39U", name: "BLUE, INDIGO (Met)" },
  { year: "1996", code: "43U", name: "GREEN, EMERALD (Met)" },
  { year: "1996", code: "96U", name: "QUICKSILVER (Met)" },
  { year: "1996", code: "77U", name: "RED, CHERRY (Met)" },
  { year: "1996", code: "59U", name: "CHERRY ICE (Met)" },
  { year: "1996", code: "74U", name: "RED, VICTORY" },
  { year: "1996", code: "50U", name: "WHITE, SUMMIT" },
  { year: "1997", code: "65U", name: "BEIGE, MYSTIQUE MED (Met)" },
  { year: "1997", code: "41U", name: "BLACK, ONYX" },
  { year: "1997", code: "39U", name: "BLUE, INDIGO (Met)" },
  { year: "1997", code: "59U", name: "CHERRY ICE (Met)" },
  { year: "1997", code: "43U", name: "GREEN, EMERALD (Met)" },
  { year: "1997", code: "96U", name: "QUICKSILVER (Met)" },
  { year: "1997", code: "77U", name: "RED, CHERRY (Met)" },
  { year: "1997", code: "74U", name: "RED, VICTORY" },
  { year: "1997", code: "50U", name: "WHITE, SUMMIT" },
  { year: "1998", code: "65U", name: "BEIGE, MYSTIQUE MED (Met)" },
  { year: "1998", code: "41U", name: "BLACK, ONYX" },
  { year: "1998", code: "69U", name: "COPPER, DK (Met)" },
  { year: "1998", code: "43U", name: "GREEN EMERALD (Met)" },
  { year: "1998", code: "39U", name: "INDIGO, BLUE (Met)" },
  { year: "1998", code: "11U", name: "PEWTER, LT (Met)" },
  { year: "1998", code: "51U", name: "RED, CARMINE DK, (Met)" },
  { year: "1998", code: "74U", name: "RED, VICTORY" },
  { year: "1998", code: "50U", name: "WHITE, SUMMIT" },
  { year: "1999", code: "41U", name: "BLACK, ONYX" },
  { year: "1999", code: "39U", name: "BLUE, INDIGO (Met)" },
  { year: "1999", code: "69U", name: "COPPER, DK (Met)" },
  { year: "1999", code: "60U", name: "GOLD, SUNSET(Met)" },
  { year: "1999", code: "14U", name: "GRAY, CHARCOAL MED (Met)" },
  { year: "1999", code: "68U", name: "GREEN, MEADOW (Met)" },
  { year: "1999", code: "11U", name: "PEWTER, LT (Met)" },
  { year: "1999", code: "51U", name: "RED, CARMINE DK, (Met)" },
  { year: "1999", code: "74U", name: "RED, VICTORY" },
  { year: "1999", code: "50U", name: "WHITE, SUMMIT" },
];

const suburban1995To1999: Generation = {
  id: "suburban-1995-1999-audited-solid-colors",
  label: "1995–1999 audited charts",
  range: "1995–1999",
  years: ["1995", "1996", "1997", "1998", "1999"],
  listingCount: suburban1995To1999SolidInventory.length,
  revisionNote:
    "Only the complete Suburban ZY1 tables publish standalone availability. Exact printed names and upper-role U codes are retained. Lower-role L codes, restriction markers, duplicate stripe variants, and interior compatibility remain ordered paint-scheme evidence. The 1998 and 1999 Suburban order guides explicitly list only ZY1 and ZY2, so no ZY4 rows are inferred.",
  sources: {
    "1995": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "C/K 1500 and C/K 2500 Suburban Interior and Exterior Color Availability Chart with ZY1 Paint",
      locator:
        "PDF p. 20, printed order-guide p. 14; ZY2 on the same page and ZY4 at PDF p. 21, printed p. 15",
      revision: "Revised 4-10-95",
      url: gmSuburbanKit("1995"),
      sourceId: "gm-heritage-1995-chevrolet-suburban",
      artifactSha256: "19161144f0aecfd285c1d4e51e549a8e39c70e7b3d42a139c240404fcef4fe9b",
      artifactBytes: 962051,
      pdfPageCount: 28,
    },
    "1996": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "C/K Suburban Interior and Exterior Color Availability Chart with ZY1 Paint",
      locator:
        "PDF p. 22, printed order-guide p. 14; ZY2 on the same page and ZY4 at PDF p. 23, printed p. 15",
      revision: "Revised 1-29-96",
      url: gmSuburbanKit("1996"),
      sourceId: "gm-heritage-1996-chevrolet-suburban",
      artifactSha256: "c7f1f9a1537331b0f4b5ba6bb96baf3d9bfe3919b4cb3e5241e2cf704ecdb217",
      artifactBytes: 770378,
      pdfPageCount: 24,
    },
    "1997": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "C/K Suburban Interior and Exterior Color Availability Chart with ZY1 Paint",
      locator:
        "PDF p. 22, printed order-guide p. 14; ZY2 on the same page and ZY4 at PDF p. 23, printed p. 15",
      revision: "Revised 12-16-96",
      url: gmSuburbanKit("1997"),
      sourceId: "gm-heritage-1997-chevrolet-suburban",
      artifactSha256: "1d28da68523c509ffce68ce2e96ef5566894dd886caf761071afce6b5b240a1d",
      artifactBytes: 948044,
      pdfPageCount: 33,
    },
    "1998": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "C/K Suburban ZY1 Paint Interior and Exterior Color Availability Chart",
      locator:
        "PDF p. 55, printed order-guide p. 13; ZY2 at PDF p. 56, printed p. 14; option list at PDF p. 53, printed p. 11 lists only ZY1 and ZY2",
      revision: "Revised 9-2-97",
      url: gmSuburbanKit("1998"),
      sourceId: "gm-heritage-1998-chevrolet-suburban",
      artifactSha256: "7975a9871c0b41551bc5802aa1c833c25e31de238abce8d424def565261c3449",
      artifactBytes: 2294103,
      pdfPageCount: 56,
    },
    "1999": {
      name: "GM Heritage Vehicle Information Kit",
      chart: "C/K Suburban Exterior Colors with ZY1 Paint",
      locator:
        "PDF p. 38, printed order-guide p. 13; ZY2 at PDF p. 39, printed p. 14; option list at PDF p. 36, printed p. 11 lists only ZY1 and ZY2",
      revision: "Published 4-1-98",
      url: gmSuburbanKit("1999"),
      sourceId: "gm-heritage-1999-chevrolet-suburban",
      artifactSha256: "684a88324706a990ad05687faee61b1d45f2e7af3ce7f291df4f47c3c3800598",
      artifactBytes: 1747598,
      pdfPageCount: 47,
    },
  },
  colors: buildExactNameTimeline("suburban", suburban1995To1999SolidInventory),
};

type SuburbanBrochurePaletteSource = {
  source_id: string;
  title: string;
  source_type: string;
  publisher: string;
  carrier?: string;
  retrieval_url: string;
  landing_url?: string;
  archive_url: string;
  pdf_pages?: number[];
  page_locator?: string;
  image_locator?: string;
  revision: string;
  artifact_sha256: string;
  artifact_bytes: number;
  pdf_page_count?: number;
  reuse_license: string;
};

type SuburbanBrochurePaletteColor = {
  order: number;
  name: string;
  matrix_name?: string;
  factory_code: string | null;
  factory_code_status: string;
};

type SuburbanBrochurePaletteYear = {
  year: number;
  audit_status: string;
  source: SuburbanBrochurePaletteSource;
  colors: SuburbanBrochurePaletteColor[];
  limitations: string[];
};

function buildSuburbanBrochurePaletteGenerations() {
  return (
    suburbanBrochurePaletteAudit.years as SuburbanBrochurePaletteYear[]
  ).map((record): Generation => {
    const year = String(record.year);
    return {
      id: `suburban-${year}-verified-brochure-palette`,
      label: `${year} verified brochure palette`,
      range: year,
      years: [year],
      listingCount: record.colors.length,
      revisionNote:
        record.audit_status === "verified_complete_with_carrier_qualification"
          ? "The complete model-specific GM brochure palette is published with an explicit marketplace-carrier qualification. No adjacent model or year is used."
          : "The complete model-specific GM sales-brochure palette is published exactly as printed. No adjacent model or year is used.",
      sources: {
        [year]: {
          name: record.source.title,
          chart: "Complete regular Chevrolet Suburban exterior-color palette",
          locator:
            record.source.page_locator ??
            record.source.image_locator ??
            "Exact brochure color panel",
          revision: record.source.revision,
          url: record.source.archive_url,
          sourceId: record.source.source_id,
          sourceType: record.source.source_type,
          publisher: record.source.publisher,
          ...(record.source.carrier ? { carrier: record.source.carrier } : {}),
          reuseLicense: record.source.reuse_license,
          retrievalUrl: record.source.retrieval_url,
          sourceNotes: [
            record.source.carrier ? `Carrier: ${record.source.carrier}.` : null,
            `Reuse license: ${record.source.reuse_license}`,
          ]
            .filter(Boolean)
            .join(" "),
          contentType: record.source.pdf_page_count
            ? "application/pdf"
            : "image/jpeg",
          documentAuthority: "official_manufacturer_document",
          retrievalHostType: "archival_mirror",
          archiveUrl: record.source.archive_url,
          ...(record.source.landing_url
            ? { landingUrl: record.source.landing_url }
            : {}),
          artifactSha256: record.source.artifact_sha256,
          artifactBytes: record.source.artifact_bytes,
          ...(record.source.pdf_page_count
            ? { pdfPageCount: record.source.pdf_page_count }
            : {}),
          availabilityScope:
            "Complete regular sales-brochure palette for this exact Suburban model year.",
          limitations: record.limitations,
        },
      },
      colors: record.colors.map((color) => {
        const code = color.factory_code ?? "not printed";
        return {
          id: `suburban-${archiveColorId(color.name)}-${year}-brochure`,
          name: color.name,
          swatch: interpretiveArchiveSwatch(color.name),
          rowCode: code,
          note: [
            color.matrix_name ? `Source matrix heading: ${color.matrix_name}.` : null,
            "Interpretive screen swatch only; it is not sampled factory paint evidence.",
          ]
            .filter(Boolean)
            .join(" "),
          availability: {
            [year]: {
              state: "listed",
              label: color.name,
              code,
              sourceIds: [record.source.source_id],
            },
          },
        };
      }),
    };
  });
}

const suburbanBrochurePaletteGenerations =
  buildSuburbanBrochurePaletteGenerations();

type SuburbanEarlySource = {
  source_id: string;
  title: string;
  url: string;
  archive_url?: string;
  pdf_pages: number[];
  page_locator: string;
  revision: string;
  artifact_sha256: string;
  artifact_bytes: number;
  pdf_page_count: number;
};

type SuburbanEarlyColor = {
  order: number;
  name: string;
  factory_code: string;
  factory_code_status: "printed";
  conventional_two_tone_code?: string | null;
  special_two_tone_code?: string | null;
  two_tone_secondary?: string | null;
};

type SuburbanEarlyYear = {
  year: number;
  audit_status: string;
  source: SuburbanEarlySource;
  colors: SuburbanEarlyColor[];
  limitations: string[];
};

function buildSuburbanEarlyVerifiedGenerations() {
  return (suburban1969to1976Audit.years as SuburbanEarlyYear[]).map(
    (record): Generation => {
      const year = String(record.year);
      return {
        id: `suburban-${year}-verified-official-solid-palette`,
        label: `${year} verified official solid palette`,
        range: year,
        years: [year],
        listingCount: record.colors.length,
        revisionNote:
          "The complete model-specific solid-color chart is transcribed from the official GM kit. Two-tone codes and pairings remain scheme context; adjacent years and general truck charts are not inferred.",
        sources: {
          [year]: {
            name: record.source.title,
            chart: "Complete Chevrolet Suburban solid exterior-color palette",
            locator: record.source.page_locator,
            revision: record.source.revision,
            url: record.source.url,
            sourceId: record.source.source_id,
            sourceType: "vehicle_information_kit",
            publisher: "General Motors",
            contentType: "application/pdf",
            documentAuthority: "official_manufacturer_document",
            retrievalHostType: "official_live",
            ...(record.source.archive_url
              ? { archiveUrl: record.source.archive_url }
              : {}),
            officialUrl: record.source.url,
            artifactSha256: record.source.artifact_sha256,
            artifactBytes: record.source.artifact_bytes,
            pdfPageCount: record.source.pdf_page_count,
            availabilityScope:
              "Complete solid exterior-color palette for this exact Chevrolet Suburban model year.",
            limitations: record.limitations,
          },
        },
        colors: record.colors.map((color) => {
          const schemeNote = [
            color.conventional_two_tone_code
              ? `Conventional two-tone code ${color.conventional_two_tone_code}.`
              : null,
            color.special_two_tone_code
              ? `Special two-tone code ${color.special_two_tone_code}.`
              : null,
            color.two_tone_secondary
              ? `Source-printed two-tone secondary: ${color.two_tone_secondary}.`
              : null,
          ]
            .filter(Boolean)
            .join(" ");
          return {
            id: `suburban-${archiveColorId(color.name)}-${year}-official-solid`,
            name: color.name,
            swatch: interpretiveArchiveSwatch(color.name),
            rowCode: color.factory_code,
            note: [
              schemeNote || null,
              "Interpretive screen swatch only; it is not sampled factory paint evidence.",
            ]
              .filter(Boolean)
              .join(" "),
            availability: {
              [year]: {
                state: "listed",
                label: color.name,
                code: color.factory_code,
                factoryCode: color.factory_code,
                factoryCodeStatus: color.factory_code_status,
                sourceIds: [record.source.source_id],
              },
            },
          };
        }),
      };
    },
  );
}

const suburbanEarlyVerifiedGenerations =
  buildSuburbanEarlyVerifiedGenerations();

type SuburbanEarlyNoChartYear = {
  year: number;
  source_id: string;
  title: string;
  url: string;
  finding: string;
  artifact_sha256: string;
  artifact_bytes: number;
  pdf_page_count: number;
  archive_url: string;
};

type SuburbanEarlySupplementalSource = {
  year: number;
  source_id: string;
  title: string;
  source_type: string;
  publisher: string;
  carrier?: string;
  url: string;
  retrieval_url?: string;
  archive_url?: string;
  artifact_sha256?: string;
  artifact_bytes?: number;
  pdf_page_count?: number;
  evidence_limit: string;
};

function suburbanEarlySupplementalCitation(
  source: SuburbanEarlySupplementalSource,
): YearSourceCitation {
  const isGmSource = source.source_id.startsWith("gm-heritage-");
  const isServiceNews = source.source_id.startsWith("chevrolet-service-news-");
  return {
    name: source.title,
    chart: "Comparison evidence only; not Suburban availability",
    locator: source.evidence_limit,
    revision: isServiceNews
      ? "Chevrolet Service News source retained from an archived carrier"
      : "Complete comparison source reviewed",
    url: source.url,
    sourceId: source.source_id,
    sourceType: source.source_type,
    publisher: source.publisher,
    ...(source.carrier ? { carrier: source.carrier } : {}),
    ...(source.retrieval_url ? { retrievalUrl: source.retrieval_url } : {}),
    ...(source.archive_url ? { archiveUrl: source.archive_url } : {}),
    ...(isGmSource ? { officialUrl: source.url } : {}),
    ...(source.artifact_sha256
      ? { artifactSha256: source.artifact_sha256 }
      : {}),
    ...(source.artifact_bytes ? { artifactBytes: source.artifact_bytes } : {}),
    ...(source.pdf_page_count ? { pdfPageCount: source.pdf_page_count } : {}),
    limitations: [source.evidence_limit],
  };
}

function buildSuburbanEarlyNoChartGenerations() {
  const supplements =
    suburban1969to1976Audit.supplemental_sources as SuburbanEarlySupplementalSource[];
  return (
    suburban1969to1976Audit.explicit_no_chart_years as SuburbanEarlyNoChartYear[]
  ).map((record): Generation => {
    const year = String(record.year);
    const supportingSources = supplements
      .filter((source) => source.year === record.year)
      .map(suburbanEarlySupplementalCitation);
    return {
      id: `suburban-${year}-reviewed-no-color-table`,
      label: `${year} official kit reviewed, no color table found`,
      range: year,
      years: [year],
      listingCount: 0,
      revisionNote:
        "The complete official Suburban kit was reviewed, but its referenced exterior-color chart is absent. This is a documented no-chart result, not evidence that no colors were offered. Adjacent-year, Blazer, Corvair 95, and general truck palettes are not inferred.",
      sources: {
        [year]: {
          name: record.title,
          chart: "Official kit reviewed; no exterior-color table found",
          locator: `Entire ${record.pdf_page_count}-page PDF reviewed`,
          revision: "Complete retained artifact reviewed July 2026",
          url: record.url,
          sourceId: record.source_id,
          sourceType: "vehicle_information_kit",
          publisher: "General Motors",
          contentType: "application/pdf",
          documentAuthority: "official_manufacturer_document",
          retrievalHostType: "official_live",
          archiveUrl: record.archive_url,
          officialUrl: record.url,
          artifactSha256: record.artifact_sha256,
          artifactBytes: record.artifact_bytes,
          pdfPageCount: record.pdf_page_count,
          availabilityScope:
            "No Suburban color rows are published because the model-specific chart was not present in the reviewed official kit.",
          limitations: [record.finding],
          ...(supportingSources.length ? { supportingSources } : {}),
        },
      },
      colors: [],
    };
  });
}

const suburbanEarlyNoChartGenerations =
  buildSuburbanEarlyNoChartGenerations();

type Suburban2000To2007Source = {
  source_id: string;
  title: string;
  url: string;
  source_type?: string;
  publisher?: string;
  carrier?: string;
  retrieval_url?: string;
  landing_url?: string;
  archive_url?: string;
  reuse_license?: string;
  document_authority?: "official_manufacturer_document";
  retrieval_host_type?: "official_live" | "archival_mirror";
  pdf_pages?: number[];
  image_locator?: string;
  page_locator: string;
  revision: string;
  artifact_sha256: string;
  artifact_bytes: number;
  pdf_page_count?: number;
  content_type?: string;
  supporting_sources?: Suburban2000To2007SupportingSource[];
};

type Suburban2000To2007SupportingSource = {
  source_id: string;
  title: string;
  url: string;
  source_type?: string;
  publisher?: string;
  carrier?: string;
  retrieval_url?: string;
  landing_url?: string;
  archive_url?: string;
  reuse_license?: string;
  document_authority?: "official_manufacturer_document";
  retrieval_host_type?: "official_live" | "archival_mirror";
  page_locator: string;
  revision: string;
  artifact_sha256?: string;
  artifact_bytes?: number;
  pdf_page_count?: number;
  content_type?: string;
};

type Suburban2000To2007Color = {
  order: number;
  source_literal_name?: string;
  name: string;
  factory_code: string | null;
  factory_code_status: string;
  touch_up_code?: string;
  availability_note?: string;
};

type Suburban2000To2007Year = {
  year: number;
  audit_status: string;
  source: Suburban2000To2007Source | null;
  regular_page_locator?: string;
  specialty_page_locator?: string;
  regular_colors: Suburban2000To2007Color[];
  supplemental_colors: Suburban2000To2007Color[];
  specialty_colors: Suburban2000To2007Color[];
  specialty_scope?: string;
  limitations: string[];
};

function suburban2000To2007Source(
  record: Suburban2000To2007Year,
  evidenceClass?: "specialty_palette_subset",
): YearSource {
  if (!record.source) {
    throw new Error(`Suburban ${record.year} has rows but no source`);
  }
  const supportingSources = (record.source.supporting_sources ?? []).map(
    (source): YearSourceCitation => ({
      name: source.title,
      chart: "Supporting color evidence",
      locator: source.page_locator,
      revision: source.revision,
      url: source.url,
      sourceId: source.source_id,
      ...(source.source_type ? { sourceType: source.source_type } : {}),
      ...(source.publisher ? { publisher: source.publisher } : {}),
      ...(source.carrier ? { carrier: source.carrier } : {}),
      ...(source.reuse_license ? { reuseLicense: source.reuse_license } : {}),
      ...(source.retrieval_url ? { retrievalUrl: source.retrieval_url } : {}),
      ...(source.content_type ? { contentType: source.content_type } : {}),
      ...(source.document_authority
        ? { documentAuthority: source.document_authority }
        : {}),
      ...(source.retrieval_host_type
        ? { retrievalHostType: source.retrieval_host_type }
        : {}),
      ...(source.archive_url ? { archiveUrl: source.archive_url } : {}),
      ...(source.archive_url !== undefined && source.archive_url !== source.url
        ? { officialUrl: source.url }
        : {}),
      ...(source.landing_url ? { landingUrl: source.landing_url } : {}),
      ...(source.artifact_sha256
        ? { artifactSha256: source.artifact_sha256 }
        : {}),
      ...(source.artifact_bytes ? { artifactBytes: source.artifact_bytes } : {}),
      ...(source.pdf_page_count ? { pdfPageCount: source.pdf_page_count } : {}),
    }),
  );
  return {
    name: record.source.title,
    chart: evidenceClass
      ? "COLOR AND TRIM - SEO SOLID PAINT"
      : "Complete regular Suburban exterior-color palette",
    locator:
      (evidenceClass ? record.specialty_page_locator : record.regular_page_locator) ??
      record.source.page_locator,
    revision: record.source.revision,
    url: record.source.url,
    sourceId: record.source.source_id,
    ...(record.source.source_type
      ? { sourceType: record.source.source_type }
      : {}),
    ...(record.source.publisher ? { publisher: record.source.publisher } : {}),
    ...(record.source.carrier ? { carrier: record.source.carrier } : {}),
    ...(record.source.reuse_license
      ? { reuseLicense: record.source.reuse_license }
      : {}),
    ...(record.source.retrieval_url
      ? { retrievalUrl: record.source.retrieval_url }
      : {}),
    ...(record.source.content_type
      ? { contentType: record.source.content_type }
      : {}),
    ...(record.source.document_authority
      ? { documentAuthority: record.source.document_authority }
      : {}),
    ...(record.source.retrieval_host_type
      ? { retrievalHostType: record.source.retrieval_host_type }
      : {}),
    ...(record.source.archive_url
      ? { archiveUrl: record.source.archive_url }
      : {}),
    ...(record.source.archive_url !== undefined &&
    record.source.archive_url !== record.source.url
      ? { officialUrl: record.source.url }
      : {}),
    ...(record.source.landing_url
      ? { landingUrl: record.source.landing_url }
      : {}),
    ...(evidenceClass ? { evidenceClass } : {}),
    artifactSha256: record.source.artifact_sha256,
    artifactBytes: record.source.artifact_bytes,
    ...(record.source.pdf_page_count
      ? { pdfPageCount: record.source.pdf_page_count }
      : {}),
    ...(supportingSources.length ? { supportingSources } : {}),
    limitations: record.limitations,
  };
}

function suburban2000To2007DisplayCode(color: Suburban2000To2007Color) {
  return [color.factory_code ?? "not printed", color.touch_up_code]
    .filter(Boolean)
    .join(" / ");
}

function buildSuburban2000To2007Generations() {
  const generations: Generation[] = [];
  const records = suburban2000to2007Audit.years as Suburban2000To2007Year[];
  for (const record of records) {
    const year = String(record.year);
    if (record.regular_colors.length) {
      generations.push({
        id: `suburban-${year}-audited-regular-colors`,
        label: `${year} audited regular palette`,
        range: year,
        years: [year],
        listingCount: record.regular_colors.length,
        revisionNote:
          record.source?.retrieval_host_type === "archival_mirror"
            ? "A complete official-manufacturer Suburban palette is published with explicit archival-mirror provenance. Package and equipment subsets remain per-color restrictions; adjacent-year colors are not inferred."
            : "A complete official Suburban palette is published. Package and equipment subsets remain per-color restrictions; adjacent-year colors are not inferred.",
        sources: { [year]: suburban2000To2007Source(record) },
        colors: record.regular_colors.map((color) => {
          const displayCode = suburban2000To2007DisplayCode(color);
          const unrestricted = color.availability_note === "No restriction stated.";
          return {
            id: `suburban-${archiveColorId(color.name)}-${year}-regular`,
            name: color.name,
            swatch: interpretiveArchiveSwatch(color.name),
            rowCode: displayCode,
            note: [
              color.source_literal_name && color.source_literal_name !== color.name
                ? `Source literal: ${color.source_literal_name}.`
                : null,
              "Interpretive screen swatch only; it is not sampled factory paint evidence.",
            ]
              .filter(Boolean)
              .join(" "),
            availability: {
              [year]: {
                state: unrestricted ? "listed" : "restricted",
                label: color.name,
                code: displayCode,
                factoryCode: color.factory_code,
                factoryCodeStatus: color.factory_code_status,
                ...(color.touch_up_code ? { touchUpCode: color.touch_up_code } : {}),
                ...(!unrestricted && color.availability_note
                  ? { restriction: color.availability_note }
                  : {}),
                sourceIds: [record.source!.source_id],
              },
            },
          };
        }),
      });
    }
    if (record.specialty_colors.length) {
      generations.push({
        id: `suburban-${year}-seo-solid-paint-subset`,
        label: `${year} SEO solid-paint subset`,
        range: year,
        years: [year],
        listingCount: record.specialty_colors.length,
        revisionNote:
          "This is a complete source-printed Special Equipment Option solid-paint list, not the regular retail palette. Literal none codes and WA touch-up numbers are preserved.",
        sources: {
          [year]: suburban2000To2007Source(record, "specialty_palette_subset"),
        },
        colors: record.specialty_colors.map((color) => {
          const displayCode = suburban2000To2007DisplayCode(color);
          return {
            id: `suburban-${archiveColorId(color.name)}-${year}-seo-${color.order}`,
            name: color.name,
            swatch: interpretiveArchiveSwatch(color.name),
            rowCode: displayCode,
            note: [
              color.source_literal_name && color.source_literal_name !== color.name
                ? `Source literal: ${color.source_literal_name}.`
                : null,
              "Interpretive screen swatch only; it is not sampled factory paint evidence.",
            ]
              .filter(Boolean)
              .join(" "),
            availability: {
              [year]: {
                state: "restricted",
                label: color.name,
                code: displayCode,
                factoryCode: color.factory_code,
                factoryCodeStatus: color.factory_code_status,
                ...(color.touch_up_code ? { touchUpCode: color.touch_up_code } : {}),
                restriction: record.specialty_scope,
                sourceIds: [record.source!.source_id],
              },
            },
          };
        }),
      });
    }
  }
  return generations;
}

const suburban2000To2007Generations = buildSuburban2000To2007Generations();

type ModernPaletteSource = {
  source_id: string;
  title: string;
  source_type: string;
  direct_official_url: string | null;
  historical_official_url?: string | null;
  retrieval_url: string;
  archive_asset_name?: string;
  archive_url?: string;
  landing_url: string | null;
  revision_or_document_date: string | null;
  retrieved_at: string | null;
  page_count: number | null;
  sha256: string | null;
  bytes: number | null;
};

type ModernPaletteTable = {
  table_id: string;
  source_id: string;
  model_year: number;
  catalog_model_ids: string[];
  source_model_label: string;
  pdf_pages: number[];
  page_locator: string;
  colors: string[];
  availability_scope: string;
  ingestion_status: string;
  limitations: string[];
  color_restrictions?: Record<string, string[]>;
  factory_codes?: Record<string, string>;
};

const publishedModernPaletteSourceIds = new Set([
  "gm-fleet-guide-us-2008-v2",
  "gm-fleet-guide-us-2009-v2",
  "gm-fleet-guide-us-2010",
  "gm-fleet-guide-us-2011",
  "gm-fleet-guide-us-2012",
  "gm-fleet-guide-us-2013",
  "gm-fleet-guide-us-2014",
  "gm-fleet-guide-us-2015",
  "gm-fleet-guide-us-2016-november",
  "gm-fleet-guide-us-2017",
  "gm-fleet-guide-us-2018",
  "gm-fleet-guide-us-2019",
  "gm-fleet-guide-us-2020",
  "gm-fleet-guide-us-2021-v3",
  "gm-fleet-guide-us-2022-v6",
  "gm-fleet-guide-us-2023-v3",
  "gm-fleet-guide-us-2024-v3",
  "gm-fleet-guide-us-2025-r2024-12-11",
  "gm-fleet-guide-us-2026-r2026-04-01",
  "chevrolet-ebrochure-us-2022-tahoe",
  "chevrolet-ebrochure-us-2023-colorado",
  "chevrolet-ebrochure-us-2023-silverado-hd-commercial",
  "chevrolet-ebrochure-us-2023-silverado-4500-6500-hd",
]);

const modernPaletteSources = new Map(
  (modernColorSourceData.sources as ModernPaletteSource[])
    .filter((source) => publishedModernPaletteSourceIds.has(source.source_id))
    .map((source) => [source.source_id, source]),
);

function buildModernPaletteGenerations() {
  type PaletteCitation = {
    source: ModernPaletteSource;
    sourceLabels: Set<string>;
    pageLocators: Set<string>;
    availabilityScopes: Set<string>;
    limitations: Set<string>;
  };

  type PaletteColor = {
    sourceIds: Set<string>;
    availabilityScopes: Set<string>;
    restrictions: Set<string>;
    factoryCodes: Set<string>;
  };

  type PaletteAggregate = {
    modelId: string;
    modelYear: number;
    citations: Map<string, PaletteCitation>;
    colors: Map<string, PaletteColor>;
  };

  const aggregates = new Map<string, PaletteAggregate>();
  for (const table of modernColorSourceData.verified_palette_tables as ModernPaletteTable[]) {
    if (!publishedModernPaletteSourceIds.has(table.source_id)) continue;
    if (table.ingestion_status !== "ready_palette_union") {
      throw new Error(`Published modern table is not ingestion-ready: ${table.table_id}`);
    }
    const source = modernPaletteSources.get(table.source_id);
    if (!source) throw new Error(`Missing retained modern source ${table.source_id}`);
    for (const modelId of table.catalog_model_ids) {
      const key = `${modelId}:${table.model_year}`;
      const existing = aggregates.get(key);
      const aggregate =
        existing ??
        {
          modelId,
          modelYear: table.model_year,
          citations: new Map<string, PaletteCitation>(),
          colors: new Map<string, PaletteColor>(),
        };

      const citation = aggregate.citations.get(source.source_id) ?? {
        source,
        sourceLabels: new Set<string>(),
        pageLocators: new Set<string>(),
        availabilityScopes: new Set<string>(),
        limitations: new Set<string>(),
      };
      citation.sourceLabels.add(table.source_model_label);
      citation.pageLocators.add(table.page_locator);
      citation.availabilityScopes.add(table.availability_scope);
      table.limitations.forEach((limitation) => citation.limitations.add(limitation));
      aggregate.citations.set(source.source_id, citation);

      for (const color of table.colors) {
        const colorEntry = aggregate.colors.get(color) ?? {
          sourceIds: new Set<string>(),
          availabilityScopes: new Set<string>(),
          restrictions: new Set<string>(),
          factoryCodes: new Set<string>(),
        };
        colorEntry.sourceIds.add(source.source_id);
        colorEntry.availabilityScopes.add(table.availability_scope);
        (table.color_restrictions?.[color] ?? []).forEach((restriction) =>
          colorEntry.restrictions.add(restriction),
        );
        const factoryCode = table.factory_codes?.[color];
        if (factoryCode) colorEntry.factoryCodes.add(factoryCode);
        aggregate.colors.set(color, colorEntry);
      }
      aggregates.set(key, aggregate);
    }
  }

  const byModel = new Map<string, Generation[]>();
  for (const aggregate of aggregates.values()) {
    const year = String(aggregate.modelYear);
    const colors = [...aggregate.colors.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
    const citations: YearSourceCitation[] = [...aggregate.citations.values()].map(
      (citation) => {
        const { source } = citation;
        const retrievedDate = source.retrieved_at?.slice(0, 10);
        return {
          name: source.title,
          chart: `EXTERIOR COLORS palette union for ${[...citation.sourceLabels].join("; ")}`,
          locator: [...citation.pageLocators].join(" "),
          revision:
            source.revision_or_document_date ??
            `Document date not printed${retrievedDate ? `; retrieved ${retrievedDate}` : ""}`,
          url: source.retrieval_url,
          ...(source.archive_url ? { archiveUrl: source.archive_url } : {}),
          ...(source.archive_url ? { originalUrl: source.retrieval_url } : {}),
          sourceId: source.source_id,
          sourceType: source.source_type,
          ...(source.direct_official_url
            ? { officialUrl: source.direct_official_url }
            : {}),
          ...(source.historical_official_url
            ? { historicalOfficialUrl: source.historical_official_url }
            : {}),
          ...(source.landing_url ? { landingUrl: source.landing_url } : {}),
          evidenceClass: "qualified_palette_union",
          ...(source.sha256 ? { artifactSha256: source.sha256 } : {}),
          ...(source.bytes ? { artifactBytes: source.bytes } : {}),
          ...(source.page_count ? { pdfPageCount: source.page_count } : {}),
          ...(source.retrieved_at ? { retrievedAt: source.retrieved_at } : {}),
          availabilityScope: [...citation.availabilityScopes].join(" "),
          limitations: [...citation.limitations],
        };
      },
    );
    const primarySource = citations[0];
    if (!primarySource) throw new Error(`No modern source citation for ${aggregate.modelId} ${year}`);
    const fleetGuideOnly = [...aggregate.citations.values()].every(
      ({ source }) => source.source_type === "fleet_guide_pdf",
    );
    const sourceKind = fleetGuideOnly ? "GM Fleet Guide" : "official Chevrolet brochure";
    const idSuffix = fleetGuideOnly ? "gm-fleet-guide" : "official-brochure";
    const generation: Generation = {
      id: `${idSuffix}-qualified-${year}`,
      label: `${year} ${sourceKind} palette`,
      range: year,
      years: [year],
      listingCount: colors.length,
      revisionNote:
        `This ${sourceKind} palette was visually checked against every cited page. It is a qualified union across the cited trims or body series, not a complete option-code chart. Exact printed restrictions are retained; further applicability and paint codes require the governing Online Order Guide.`,
      sources: {
        [year]: {
          ...primarySource,
          ...(citations.length > 1 ? { supportingSources: citations.slice(1) } : {}),
        },
      },
      colors: colors.map(([color, colorEntry]) => {
        if (colorEntry.factoryCodes.size > 1) {
          throw new Error(
            `Conflicting factory codes for ${aggregate.modelId} ${year} ${color}: ${[
              ...colorEntry.factoryCodes,
            ].join(", ")}`,
          );
        }
        const factoryCode = [...colorEntry.factoryCodes][0] ?? "not printed";
        return {
          id: `${aggregate.modelId}-${archiveColorId(color)}-${year}-${idSuffix}`,
          name: color,
          swatch: interpretiveArchiveSwatch(color),
          rowCode: factoryCode,
          note: "Interpretive screen swatch only; it is not sampled factory paint evidence.",
          availability: {
            [year]: {
              state: "restricted" as const,
              label: color,
              code: factoryCode,
              restriction: [
                ...colorEntry.availabilityScopes,
                ...colorEntry.restrictions,
              ].join(" "),
              sourceIds: [...colorEntry.sourceIds],
            },
          },
        };
      }),
    };
    byModel.set(aggregate.modelId, [
      ...(byModel.get(aggregate.modelId) ?? []),
      generation,
    ]);
  }
  return byModel;
}

const modernPaletteGenerationsByModel = buildModernPaletteGenerations();

type SpecialtyPublicationSource = {
  source_id: string;
  title: string;
  publisher?: string;
  carrier?: string;
  source_type: string;
  url: string;
  archive_url?: string;
  pdf_page?: number;
  pdf_pages?: number[];
  section: string;
  revision: string;
  retrieved_at: string | null;
  bytes: number;
  sha256: string;
  pdf_page_count: number;
};

type SpecialtyPublicationRecord = {
  record_id: string;
  publication_status: string;
  model_year: number;
  catalog_model_ids: string[];
  source_model_scope: string[];
  label: string;
  source_label_raw?: string;
  finish: string;
  paint_code: string;
  rpo_code?: string;
  seo_code?: string;
  code_display?: string;
  program_id?: string;
  program_label?: string;
  application_type?: string;
  availability_state?: AvailabilityState;
  touch_up_paint_number: string | null;
  restrictions: string[];
  refinish_numbers?: Record<string, string>;
  source: SpecialtyPublicationSource;
};

function specialtyPdfLocator(source: SpecialtyPublicationSource) {
  const pages = source.pdf_pages ?? (source.pdf_page ? [source.pdf_page] : []);
  const pageLabel = pages.length === 1 ? "p." : "pp.";
  return `PDF ${pageLabel} ${pages.join(", ")}, ${source.section}.`;
}

function buildSpecialtyColorGenerations() {
  const byModel = new Map<string, Generation[]>();
  const records = specialtyColorSourceData.app_publication_records as SpecialtyPublicationRecord[];

  for (const record of records) {
    if (record.publication_status !== "published_specialty_subset") continue;
    const year = String(record.model_year);
    for (const modelId of record.catalog_model_ids) {
      const printedPaintCode =
        record.paint_code.trim().toLowerCase() === "not printed"
          ? null
          : record.paint_code;
      const code =
        record.code_display ??
        [
          printedPaintCode,
          record.rpo_code ? `RPO ${record.rpo_code}` : null,
          record.seo_code ? `SEO ${record.seo_code}` : null,
        ]
          .filter(Boolean)
          .join(" / ");
      const refinishNote = record.refinish_numbers
        ? ` Refinish references printed by GM: ${Object.entries(record.refinish_numbers)
            .map(([maker, value]) => `${maker.replaceAll("_", " ")} ${value}`)
            .join("; ")}.`
        : "";
      const applicationNote =
        record.application_type?.startsWith("authorized_upfitter")
          ? " The cited program applied this paint after vehicle assembly through the named authorized upfitter; it is not represented as an assembly-plant factory finish."
          : "";
      const sourceLabelNote =
        record.source_label_raw && record.source_label_raw !== record.label
          ? ` The cited table prints the label as “${record.source_label_raw}”.`
          : "";
      const generation: Generation = {
        id: `specialty-${modelId}-${record.record_id}`,
        label: `${year} Chevrolet specialty paint subset`,
        programId: record.program_id,
        programLabel: record.program_label,
        range: year,
        years: [year],
        listingCount: 1,
        revisionNote:
          `This is an exact specialty-paint subset for ${record.source_model_scope.join("; ")}. ` +
          "It is not a complete model-year exterior-color palette, and adjacent years are not inferred." +
          applicationNote,
        sources: {
          [year]: {
            name: record.source.title,
            chart: `Specialty paint subset for ${record.source_model_scope.join("; ")}`,
            locator: specialtyPdfLocator(record.source),
            revision: record.source.revision,
            url: record.source.url,
            sourceId: record.source.source_id,
            sourceType: record.source.source_type,
            publisher: record.source.publisher,
            carrier: record.source.carrier,
            archiveUrl: record.source.archive_url,
            originalUrl:
              record.source.archive_url &&
              record.source.archive_url !== record.source.url
                ? record.source.url
                : undefined,
            evidenceClass: "specialty_palette_subset",
            artifactSha256: record.source.sha256,
            artifactBytes: record.source.bytes,
            pdfPageCount: record.source.pdf_page_count,
            retrievedAt: record.source.retrieved_at ?? undefined,
          },
        },
        colors: [
          {
            id: `${modelId}-${archiveColorId(record.label)}-${year}-${archiveColorId(record.record_id)}`,
            name: record.label,
            swatch: interpretiveArchiveSwatch(record.label),
            rowCode: code,
            note:
              "Interpretive screen swatch only; it is not sampled factory paint evidence." +
              refinishNote +
              sourceLabelNote,
            availability: {
              [year]: {
                state: record.availability_state ?? "restricted",
                label: record.label,
                code,
                applicationType:
                  record.application_type ?? "specialty_program_unspecified",
                factoryCode: printedPaintCode,
                factoryCodeStatus: printedPaintCode ? "printed" : "not printed",
                restriction: record.restrictions.join(" "),
                sourceIds: [record.source.source_id],
              },
            },
          },
        ],
      };
      byModel.set(modelId, [...(byModel.get(modelId) ?? []), generation]);
    }
  }

  return byModel;
}

const specialtyColorGenerationsByModel = buildSpecialtyColorGenerations();

const auditedModels: ArchiveModel[] = [
  {
    id: "camaro", name: "Camaro", vehicleClass: "sports coupe", era: "1967–1992 audited", status: "26 official charts verified",
    generations: [firstGeneration, secondGenerationCamaro, thirdGenerationCamaro],
  },
  {
    id: "chevelle", name: "Chevelle", vehicleClass: "midsize car", era: "1964–1967 audited", status: "4 official charts verified",
    generations: [firstChevelleGeneration],
  },
  {
    id: "bel-air", name: "Bel Air", vehicleClass: "full-size car", era: "Historic passenger car", status: "Source inventory in progress",
    pendingCopy: "Generation boundaries and official chart locators are being audited. No matrix is published until a full year chart has been reviewed.",
    generations: [],
  },
  {
    id: "corvette", name: "Corvette", vehicleClass: "sports car", era: "1953–1962 source series", status: "9 official tables audited",
    pendingCopy: "The dedicated 1953 GM kit contains no exterior-color table. That year remains unverified while additional official documentation is sought.",
    generations: [earlyCorvetteTables],
  },
  {
    id: "colorado", name: "Colorado", vehicleClass: "midsize pickup", era: "Modern truck", status: "Source inventory in progress",
    pendingCopy: "Order guides need market-specific validation. Missing records remain unverified.",
    generations: [],
  },
  {
    id: "suburban", name: "Suburban", vehicleClass: "full-size SUV", era: "1935–present catalog expansion", status: "36 complete model-year color palettes verified (1969, 1972–2005, and 2007)",
    pendingCopy: "All model years remain visible while official color charts are reviewed year by year.",
    generations: [
      ...suburbanEarlyNoChartGenerations,
      ...suburbanEarlyVerifiedGenerations,
      suburban1977To1981,
      ...suburbanBrochurePaletteGenerations,
      suburban1983,
      suburban1984To1985,
      suburban1986,
      suburban1987,
      suburban1988,
      suburban1990,
      suburban1991,
      suburban1992,
      suburban1994,
      suburban1995To1999,
      ...suburban2000To2007Generations,
    ],
  },
  {
    id: "tahoe", name: "Tahoe", vehicleClass: "full-size SUV", era: "1995–present catalog expansion",
    status: `${tahoeAuditVerifiedYearCount} model years have complete source-linked palettes or exact program audits (1995–2007)`,
    pendingCopy: "All model years remain visible while source tables are reviewed year by year. Program-specific, specialty-paint, and two-tone evidence remains separate from ordinary retail palettes.",
    generations: tahoeAuditGenerations,
  },
];

type CatalogRange = {
  start: number;
  end: number;
  confidence: string;
  evidence_urls: string[];
};

type CatalogModel = {
  id: string;
  name: string;
  vehicle_class: string;
  model_year_ranges: CatalogRange[];
  aliases: string[];
  current: boolean;
  notes: string;
};

type PlatformEraBand = {
  start: number;
  end: number;
  label: string;
  aliases: string[];
  evidence_urls: string[];
  confidence: string;
  notes: string;
};

type PlatformEraCatalog = Record<string, PlatformEraBand[]>;

const platformEras = platformEraData as PlatformEraCatalog;

function numericYears(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) =>
    String(start + index),
  );
}

function compactYearRange(years: string[]) {
  const first = years[0];
  const last = years.at(-1) ?? first;
  return first === last ? first : `${first}–${last}`;
}

function platformEraForYear(modelId: string, year: string) {
  const numeric = Number(year);
  return platformEras[modelId]?.find(
    (band) => numeric >= band.start && numeric <= band.end,
  );
}

function platformYearGroups(modelId: string, years: string[]) {
  const groups: { band?: PlatformEraBand; years: string[] }[] = [];
  for (const year of years) {
    const band = platformEraForYear(modelId, year);
    const current = groups.at(-1);
    const previous = current?.years.at(-1);
    const sameBand = current?.band === band;
    const canExtendUnknown = Boolean(band) || (current?.years.length ?? 0) < 10;
    if (
      !current ||
      !sameBand ||
      !canExtendUnknown ||
      Number(year) !== Number(previous) + 1
    ) {
      groups.push({ band, years: [year] });
    } else {
      current.years.push(year);
    }
  }
  return groups;
}

function applyPlatformEra(modelId: string, generation: Generation): Generation {
  const matchingBands = [
    ...new Set(
      generation.years
        .map((year) => platformEraForYear(modelId, year))
        .filter((band): band is PlatformEraBand => Boolean(band)),
    ),
  ];
  if (
    matchingBands.length !== 1 ||
    !generation.years.every((year) => platformEraForYear(modelId, year) === matchingBands[0])
  ) {
    return generation;
  }

  const band = matchingBands[0];
  return {
    ...generation,
    label: band.label,
    catalogSources: [
      ...new Set([...(generation.catalogSources ?? []), ...band.evidence_urls]),
    ],
    platformAliases: band.aliases,
    platformConfidence: band.confidence,
    platformNotes: band.notes,
  };
}

function catalogEra(model: CatalogModel) {
  return model.model_year_ranges
    .map((range) =>
      range.start === range.end ? String(range.start) : `${range.start}–${range.end}`,
    )
    .join(", ");
}

function catalogGenerations(
  model: CatalogModel,
  reviewedYears: Set<string>,
): Generation[] {
  return model.model_year_ranges.flatMap((range) => {
    const pendingYears = numericYears(range.start, range.end).filter(
      (year) => !reviewedYears.has(year),
    );
    return platformYearGroups(model.id, pendingYears).map(({ band, years }) => ({
      id: `catalog-${model.id}-${years[0]}-${years.at(-1)}`,
      label: band?.label ?? "Base / era not yet confirmed",
      range: compactYearRange(years),
      years,
      listingCount: 0,
      revisionNote:
        "This model-year block is catalogued, but its exterior-color charts remain in the research queue. Adjacent-year colors are never inferred.",
      sources: {},
      colors: [],
      catalogSources: [
        ...new Set([...range.evidence_urls, ...(band?.evidence_urls ?? [])]),
      ],
      platformAliases: band?.aliases,
      platformConfidence: band?.confidence,
      platformNotes: band?.notes,
    }));
  });
}

function mergeCatalogModel(model: CatalogModel): ArchiveModel {
  const audited = auditedModels.find((item) => item.id === model.id);
  const auditedGenerations = [
    ...(audited?.generations ?? []),
    ...(specialtyColorGenerationsByModel.get(model.id) ?? []),
    ...(modernPaletteGenerationsByModel.get(model.id) ?? []),
  ].map((generation) => applyPlatformEra(model.id, generation));
  const reviewedYears = new Set(
    auditedGenerations.flatMap((generation) => Object.keys(generation.sources)),
  );
  const generations = [
    ...auditedGenerations,
    ...catalogGenerations(model, reviewedYears),
  ].sort((left, right) => Number(left.years[0]) - Number(right.years[0]));
  const catalogYears = new Set(
    model.model_year_ranges.flatMap((range) => numericYears(range.start, range.end)),
  );
  const listingCount = auditedGenerations.reduce(
    (total, generation) => total + generation.listingCount,
    0,
  );
  const qualifiedPaletteYears = new Set(
    auditedGenerations.flatMap((generation) =>
      Object.entries(generation.sources)
        .filter(([, source]) => source.evidenceClass === "qualified_palette_union")
        .map(([year]) => year),
    ),
  );
  const reviewStatus = `${reviewedYears.size} of ${catalogYears.size} model years source-linked`;
  const paletteStatus = qualifiedPaletteYears.size
    ? `; ${qualifiedPaletteYears.size} qualified GM Fleet Guide palette ${qualifiedPaletteYears.size === 1 ? "year" : "years"}`
    : "";

  return {
    id: model.id,
    name: model.name,
    vehicleClass: model.vehicle_class,
    era: catalogEra(model),
    status: listingCount
      ? `${audited?.status ?? `${listingCount} source-linked listings`}; ${reviewStatus}${paletteStatus}`
      : `${catalogYears.size} model years catalogued; color charts in research queue`,
    pendingCopy:
      audited?.pendingCopy ??
      `${model.vehicle_class}. ${model.notes} Model-year presence is catalogued separately from color availability.`,
    generations,
  };
}

const mergedCatalogModels = (modelCatalog.models as CatalogModel[]).map(
  mergeCatalogModel,
);
const catalogIds = new Set(mergedCatalogModels.map((model) => model.id));
const uncataloguedAuditedModels = auditedModels.filter(
  (model) => !catalogIds.has(model.id),
);
const camaroModel = mergedCatalogModels.find((model) => model.id === "camaro");

export const models: ArchiveModel[] = [
  ...(camaroModel ? [camaroModel] : []),
  ...mergedCatalogModels
    .filter((model) => model.id !== "camaro")
    .sort((left, right) => left.name.localeCompare(right.name)),
  ...uncataloguedAuditedModels,
];

export const defaultModelId = "camaro";
export const defaultYear = "1969";
export const defaultColorId = "hugger-orange";
