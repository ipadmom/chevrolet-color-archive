export type AvailabilityState = "listed" | "restricted";

export type Availability = {
  state: AvailabilityState;
  label: string;
  code: string;
  restriction?: string;
};

export type ArchiveColor = {
  id: string;
  name: string;
  swatch: string;
  rowCode: string;
  note?: string;
  availability: Record<string, Availability>;
};

export type YearSource = {
  name: string;
  chart: string;
  locator: string;
  revision: string;
  url: string;
};

export type Generation = {
  id: string;
  label: string;
  range: string;
  years: string[];
  listingCount: number;
  revisionNote: string;
  sources: Record<string, YearSource>;
  colors: ArchiveColor[];
};

export type ArchiveModel = {
  id: string;
  name: string;
  era: string;
  status: string;
  pendingCopy?: string;
  generations: Generation[];
};

export type PhotoCandidate = {
  id: string;
  colorId: string;
  year: string;
  src: string;
  alt: string;
  credit: string;
  license: string;
  status: "candidate" | "reviewed";
};

const gmKit = (year: string) =>
  `https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/${year}-Chevrolet-Camaro.pdf`;

const gmCorvetteKit = (year: string) =>
  `https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/${year}-Chevrolet-Corvette.pdf`;

const gmChevelleKit = (year: string) =>
  `https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/${year}-Chevrolet-Chevelle.pdf`;

export const staticPhotoCandidates: PhotoCandidate[] = [
  {
    id: "commons-1969-camaro-ss396",
    colorId: "hugger-orange",
    year: "1969",
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/1969_Chevrolet_Camaro_SS396_(21176690299).jpg",
    alt: "Orange 1969 Chevrolet Camaro SS396 photographed outdoors",
    credit: "Wikimedia Commons contributor",
    license: "CC BY 2.0, attribution verification pending",
    status: "candidate",
  },
];

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
  if (value.includes("silver") || value.includes("gray") || value.includes("slate")) {
    return "#a8adae";
  }
  if (value.includes("orchid") || value.includes("plum")) return "#76516d";
  if (
    value.includes("maroon") ||
    value.includes("palomar") ||
    value.includes("rosewood")
  ) {
    return "#702f39";
  }
  if (value.includes("red")) return "#a73537";
  if (value.includes("orange")) return "#c5642e";
  if (value.includes("turquoise") || value.includes("aqua")) {
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
  if (value.includes("green")) {
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
  for (const row of rows) {
    const availability: Availability = row.restriction
      ? {
          state: "restricted",
          label: row.label ?? row.name,
          code: row.code,
          restriction: row.restriction,
        }
      : {
          state: "listed",
          label: row.label ?? row.name,
          code: row.code,
        };
    const existing = grouped.get(row.name);
    if (existing) {
      existing.availability[row.year] = availability;
      const codes = existing.rowCode.split(" / ");
      if (!codes.includes(row.code)) existing.rowCode += ` / ${row.code}`;
      continue;
    }
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

const camaro1970to1975: Generation = {
  id: "second-generation-1970-1975",
  label: "Second generation, audited 1970–1975 block",
  range: "1970–1975",
  years: ["1970", "1971", "1972", "1973", "1974", "1975"],
  listingCount: camaro1970to1975Inventory.length,
  revisionNote:
    "Every row comes from a completely reviewed Camaro exterior-color chart. The 1972 engineering and price-schedule charts both omit black. Carryover and ZP2 trim notes do not create color-level restrictions, and the 1975 chart says two-tone paint was unavailable.",
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
  },
  colors: buildExactNameTimeline("camaro-1970-1975", camaro1970to1975Inventory),
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

export const models: ArchiveModel[] = [
  {
    id: "camaro", name: "Camaro", era: "1967–1975 audited", status: "9 official charts verified",
    generations: [firstGeneration, camaro1970to1975],
  },
  {
    id: "chevelle", name: "Chevelle", era: "1964–1967 audited", status: "4 official charts verified",
    generations: [firstChevelleGeneration],
  },
  {
    id: "bel-air", name: "Bel Air", era: "Historic passenger car", status: "Source inventory in progress",
    pendingCopy: "Generation boundaries and official chart locators are being audited. No matrix is published until a full year chart has been reviewed.",
    generations: [],
  },
  {
    id: "corvette", name: "Corvette", era: "1953–1962 source series", status: "9 official tables audited",
    pendingCopy: "The dedicated 1953 GM kit contains no exterior-color table. That year remains unverified while additional official documentation is sought.",
    generations: [earlyCorvetteTables],
  },
  {
    id: "colorado", name: "Colorado", era: "Modern truck", status: "Source inventory in progress",
    pendingCopy: "Order guides need market-specific validation. Missing records remain unverified.",
    generations: [],
  },
];

export const defaultModelId = "camaro";
export const defaultYear = "1969";
export const defaultColorId = "hugger-orange";
