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

export const models: ArchiveModel[] = [
  { id: "camaro", name: "Camaro", era: "1967–1969 audited", status: "3 official charts verified", generations: [firstGeneration] },
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
