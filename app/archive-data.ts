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

export const models: ArchiveModel[] = [
  { id: "camaro", name: "Camaro", era: "1967 onward", status: "3 official charts verified", generations: [firstGeneration] },
  {
    id: "bel-air", name: "Bel Air", era: "Historic passenger car", status: "Source inventory in progress",
    pendingCopy: "Generation boundaries and official chart locators are being audited. No matrix is published until a full year chart has been reviewed.",
    generations: [],
  },
  {
    id: "corvette", name: "Corvette", era: "1953 onward", status: "Source inventory in progress",
    pendingCopy: "Official model-year sources are being normalized before availability claims are added.",
    generations: [],
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
