export type DetailedWheelStyle =
  | "commercial"
  | "ev"
  | "sport"
  | "steel"
  | "suv"
  | "truck";

export type DetailedVehicleProfileSpec = {
  bodyFrontX: number;
  bodyPath: string;
  bodyRearX: number;
  bodyStyle:
    | "cabover"
    | "crossover"
    | "ev-crossover"
    | "ev-pickup"
    | "mid-engine-sports"
    | "one-box-van"
    | "pickup"
    | "suv"
    | "van";
  detailPaths?: string[];
  darkFillPaths?: string[];
  doorLines?: number[];
  endYear: number;
  frontLampPath: string;
  frontWheelRadius?: number;
  frontWheelX: number;
  glassPaths: string[];
  grillePaths?: string[];
  handlePoints?: Array<[number, number]>;
  lightFillPaths?: string[];
  kind:
    | "cabover"
    | "crossover"
    | "heavy-truck"
    | "pickup"
    | "sports"
    | "suv"
    | "van";
  mirror?: [number, number];
  mirrorStyle?: "standard" | "tow";
  profileId: string;
  rearLampPath: string;
  rearDualWheel?: boolean;
  rearWheelRadius?: number;
  rearTandemWheelX?: number;
  rearWheelX: number;
  referenceUrl: string;
  representativeVariant: string;
  representativeYear: number;
  rockerPath?: string;
  roofRailPaths?: string[];
  signaturePaths?: string[];
  startYear: number;
  targetWheelbaseRatio: number;
  wheelRadius?: number;
  wheelStyle: DetailedWheelStyle;
};

const chevrolet = "https://www.chevrolet.com";

export const latestVehicleProfileSpecs: Record<
  string,
  DetailedVehicleProfileSpec
> = {
  blazer: {
    profileId: "blazer-c1uc-2026",
    representativeYear: 2026,
    representativeVariant: "RS five-door crossover",
    referenceUrl: `${chevrolet}/suvs/blazer`,
    startYear: 2023,
    endYear: 2026,
    kind: "crossover",
    bodyStyle: "crossover",
    bodyRearX: 28,
    bodyFrontX: 220,
    targetWheelbaseRatio: 0.588,
    bodyPath:
      "M 28 70 L 28 56 Q 30 51 39 48 L 49 34 Q 54 27 65 26 L 137 26 Q 149 28 160 42 L 185 44 L 213 47 Q 221 52 220 61 L 219 70 Z",
    glassPaths: [
      "M 54 35 Q 58 31 67 30 L 80 30 L 80 43 L 47 44 Z",
      "M 84 30 L 114 30 L 117 43 L 84 43 Z",
      "M 118 30 L 136 30 Q 146 32 154 42 L 121 42 Z",
    ],
    rearWheelX: 64,
    frontWheelX: 177,
    wheelStyle: "suv",
    doorLines: [79, 118, 158],
    handlePoints: [
      [87, 48],
      [128, 48],
    ],
    mirror: [157, 40],
    darkFillPaths: [
      "M 39 46 L 51 33 L 48 45 L 35 50 Z",
      "M 182 53 L 219 55 L 218 63 L 178 61 Z",
    ],
    roofRailPaths: ["M 59 18 H 100", "M 111 18 H 139"],
    frontLampPath: "M 194 45 L 216 49 L 211 53 L 190 50 Z",
    rearLampPath: "M 24 48 L 32 47 L 34 58 L 24 60 Z",
    rockerPath: "M 28 64 H 214",
    signaturePaths: [
      "M 40 49 Q 99 45 176 48",
      "M 166 53 Q 190 50 217 55",
      "M 167 60 H 218",
    ],
  },
  "blazer-ev": {
    profileId: "blazer-ev-bev3-2026",
    representativeYear: 2026,
    representativeVariant: "RS five-door EV crossover",
    referenceUrl: `${chevrolet}/electric/blazer-ev`,
    startYear: 2024,
    endYear: 2026,
    kind: "crossover",
    bodyStyle: "ev-crossover",
    bodyRearX: 20,
    bodyFrontX: 222,
    targetWheelbaseRatio: 0.634,
    bodyPath:
      "M 20 70 L 22 56 Q 24 51 38 47 L 51 31 Q 58 24 73 22 L 135 22 Q 151 25 166 40 L 194 43 Q 214 45 222 54 L 220 70 Z",
    glassPaths: [
      "M 55 32 Q 61 27 73 26 L 89 26 L 87 42 L 45 43 Z",
      "M 93 26 L 120 26 L 124 41 L 91 42 Z",
      "M 124 26 L 134 26 Q 146 28 158 40 L 128 40 Z",
    ],
    rearWheelX: 59,
    frontWheelX: 187,
    wheelStyle: "ev",
    wheelRadius: 12,
    doorLines: [89, 126, 164],
    handlePoints: [
      [99, 47],
      [137, 47],
    ],
    mirror: [164, 40],
    darkFillPaths: [
      "M 42 49 L 55 32 L 51 49 L 38 56 Z",
      "M 29 61 Q 118 66 216 61 L 216 67 Q 119 72 28 66 Z",
    ],
    lightFillPaths: ["M 184 43 Q 208 44 220 49 L 218 52 Q 206 49 185 48 Z"],
    roofRailPaths: ["M 68 19 H 99", "M 109 19 H 136"],
    frontLampPath: "M 186 43 Q 208 44 220 50 L 213 53 L 188 49 Z",
    rearLampPath: "M 23 51 L 41 48 L 40 53 L 22 58 Z",
    rockerPath: "M 29 64 Q 111 67 215 63",
    signaturePaths: [
      "M 43 47 Q 111 43 181 46",
      "M 170 52 H 219",
      "M 180 57 Q 201 54 220 59",
    ],
  },
  "brightdrop-400": {
    profileId: "brightdrop-400-bv1-2026",
    representativeYear: 2026,
    representativeVariant: "400 short-wheelbase delivery van",
    referenceUrl: `${chevrolet}/commercial/brightdrop`,
    startYear: 2025,
    endYear: 2026,
    kind: "van",
    bodyStyle: "one-box-van",
    bodyRearX: 44,
    bodyFrontX: 220,
    targetWheelbaseRatio: 0.641,
    bodyPath:
      "M 44 70 L 44 27 Q 45 18 55 17 L 178 17 Q 190 18 197 29 L 218 48 Q 222 52 220 70 Z",
    glassPaths: [
      "M 169 22 L 181 22 Q 189 24 194 32 L 205 45 L 169 45 Z",
      "M 209 47 L 218 51 L 217 58 L 209 58 Z",
    ],
    rearWheelX: 72,
    frontWheelX: 185,
    wheelStyle: "commercial",
    doorLines: [122, 166],
    handlePoints: [
      [132, 47],
      [176, 50],
    ],
    mirror: [207, 44],
    frontLampPath: "M 211 51 L 220 53 L 219 59 L 210 58 Z",
    rearLampPath: "M 44 37 H 49 V 56 H 44 Z",
    rockerPath: "M 49 65 H 216",
    signaturePaths: [
      "M 55 24 H 158",
      "M 121 28 V 63",
      "M 165 46 V 64",
      "M 52 58 H 114",
    ],
  },
  "brightdrop-600": {
    profileId: "brightdrop-600-bv1-2026",
    representativeYear: 2026,
    representativeVariant: "600 long-wheelbase delivery van",
    referenceUrl: `${chevrolet}/commercial/brightdrop`,
    startYear: 2025,
    endYear: 2026,
    kind: "van",
    bodyStyle: "one-box-van",
    bodyRearX: 8,
    bodyFrontX: 220,
    targetWheelbaseRatio: 0.631,
    bodyPath:
      "M 8 70 L 8 26 Q 9 17 20 16 L 176 16 Q 189 17 197 29 L 219 49 Q 222 53 220 70 Z",
    glassPaths: [
      "M 168 21 L 180 21 Q 189 23 194 32 L 206 45 L 168 45 Z",
      "M 210 47 L 219 51 L 218 58 L 210 58 Z",
    ],
    rearWheelX: 51,
    frontWheelX: 185,
    wheelStyle: "commercial",
    doorLines: [111, 165],
    handlePoints: [
      [121, 47],
      [176, 50],
    ],
    mirror: [208, 44],
    frontLampPath: "M 212 51 L 220 53 L 219 59 L 211 58 Z",
    rearLampPath: "M 8 36 H 13 V 56 H 8 Z",
    rockerPath: "M 13 65 H 216",
    signaturePaths: [
      "M 20 23 H 157",
      "M 110 27 V 63",
      "M 164 46 V 64",
      "M 16 58 H 103",
    ],
  },
  colorado: {
    profileId: "colorado-31xx2-2026",
    representativeYear: 2026,
    representativeVariant: "Crew Cab short bed",
    referenceUrl: `${chevrolet}/trucks/colorado`,
    startYear: 2023,
    endYear: 2026,
    kind: "pickup",
    bodyStyle: "pickup",
    bodyRearX: 15,
    bodyFrontX: 221,
    targetWheelbaseRatio: 0.616,
    bodyPath:
      "M 15 70 L 15 50 L 83 50 L 87 33 Q 91 24 103 23 L 145 23 Q 157 25 165 42 L 184 41 L 214 44 Q 221 49 221 58 L 220 70 Z",
    glassPaths: [
      "M 95 31 Q 99 27 106 27 L 122 27 L 122 42 L 91 42 Z",
      "M 126 27 L 143 27 Q 152 29 158 41 L 126 41 Z",
    ],
    rearWheelX: 57,
    frontWheelX: 184,
    wheelStyle: "truck",
    doorLines: [87, 124, 164],
    handlePoints: [
      [101, 48],
      [137, 48],
    ],
    mirror: [164, 41],
    darkFillPaths: [
      "M 178 44 L 220 47 L 219 61 L 177 60 Z",
      "M 87 61 H 220 L 218 66 H 85 Z",
    ],
    grillePaths: ["M 181 52 H 218", "M 180 56 H 218"],
    frontLampPath: "M 190 43 L 216 46 L 214 52 L 188 50 Z",
    rearLampPath: "M 15 51 H 21 V 61 H 15 Z",
    rockerPath: "M 88 64 H 215",
    signaturePaths: [
      "M 19 47 H 82",
      "M 24 55 H 78",
      "M 82 50 V 66",
      "M 176 53 H 219",
      "M 176 58 H 219",
    ],
  },
  corvette: {
    profileId: "corvette-c8-2026",
    representativeYear: 2026,
    representativeVariant: "C8 Stingray coupe",
    referenceUrl: `${chevrolet}/performance/corvette`,
    startYear: 2020,
    endYear: 2026,
    kind: "sports",
    bodyStyle: "mid-engine-sports",
    bodyRearX: 17,
    bodyFrontX: 221,
    targetWheelbaseRatio: 0.588,
    bodyPath:
      "M 17 70 L 21 59 Q 26 54 48 49 L 78 47 L 93 39 Q 101 33 114 33 L 132 34 Q 143 37 153 47 L 185 51 L 216 58 Q 221 61 221 70 Z",
    glassPaths: [
      "M 97 40 Q 103 37 114 37 L 121 37 L 121 47 L 88 47 Z",
      "M 125 37 L 131 38 Q 141 40 148 47 L 125 47 Z",
    ],
    rearWheelX: 62,
    frontWheelX: 182,
    wheelStyle: "sport",
    rearWheelRadius: 13.5,
    frontWheelRadius: 12.5,
    doorLines: [78, 119, 154],
    handlePoints: [[126, 50]],
    mirror: [154, 44],
    darkFillPaths: [
      "M 75 49 L 93 48 L 84 64 L 64 61 Z",
      "M 153 50 L 176 54 L 166 66 L 143 63 Z",
    ],
    frontLampPath: "M 186 48 Q 208 51 218 55 L 205 57 L 184 53 Z",
    rearLampPath: "M 21 55 L 43 52 L 42 57 L 20 61 Z",
    rockerPath: "M 25 65 Q 111 69 216 64",
    signaturePaths: [
      "M 52 50 L 78 47 L 68 62 L 46 60 Z",
      "M 78 47 L 85 55 L 72 65",
      "M 153 49 Q 174 49 197 53",
      "M 151 54 L 176 57 L 165 65 L 143 63 Z",
    ],
  },
  equinox: {
    profileId: "equinox-d2uc2-2026",
    representativeYear: 2026,
    representativeVariant: "ACTIV five-door crossover",
    referenceUrl: `${chevrolet}/suvs/equinox`,
    startYear: 2025,
    endYear: 2026,
    kind: "crossover",
    bodyStyle: "crossover",
    bodyRearX: 22,
    bodyFrontX: 220,
    targetWheelbaseRatio: 0.587,
    bodyPath:
      "M 22 70 L 22 51 L 37 45 L 44 29 Q 49 22 60 21 L 142 21 Q 154 24 164 39 L 186 40 L 215 45 Q 221 50 220 60 L 219 70 Z",
    glassPaths: [
      "M 48 30 Q 52 25 62 25 L 78 25 L 78 40 L 42 40 Z",
      "M 82 25 L 116 25 L 118 40 L 82 40 Z",
      "M 120 25 L 140 25 Q 151 28 157 39 L 122 39 Z",
    ],
    rearWheelX: 64,
    frontWheelX: 180,
    wheelStyle: "suv",
    doorLines: [79, 119, 162],
    handlePoints: [
      [90, 47],
      [130, 47],
    ],
    mirror: [162, 39],
    darkFillPaths: [
      "M 38 45 L 48 29 L 44 46 L 32 52 Z",
      "M 178 52 L 219 54 L 218 62 L 176 61 Z",
    ],
    roofRailPaths: ["M 59 18 H 97", "M 109 18 H 143"],
    frontLampPath: "M 190 41 L 218 47 L 211 51 L 188 48 Z",
    rearLampPath: "M 23 46 L 39 43 L 39 51 L 22 56 Z",
    rockerPath: "M 27 64 H 214",
    signaturePaths: [
      "M 38 44 Q 109 41 182 44",
      "M 181 51 H 219",
      "M 178 57 H 219",
    ],
  },
  "equinox-ev": {
    profileId: "equinox-ev-bev3-2026",
    representativeYear: 2026,
    representativeVariant: "LT five-door EV crossover",
    referenceUrl: `${chevrolet}/electric/equinox-ev`,
    startYear: 2024,
    endYear: 2026,
    kind: "crossover",
    bodyStyle: "ev-crossover",
    bodyRearX: 20,
    bodyFrontX: 222,
    targetWheelbaseRatio: 0.61,
    bodyPath:
      "M 20 70 L 22 57 Q 25 51 42 47 L 53 31 Q 60 24 75 22 L 139 22 Q 153 25 167 41 L 196 44 Q 215 47 222 55 L 220 70 Z",
    glassPaths: [
      "M 57 32 Q 64 27 76 26 L 91 26 L 89 42 L 47 43 Z",
      "M 95 26 L 123 26 L 126 41 L 93 42 Z",
      "M 127 26 L 138 26 Q 150 29 160 40 L 130 40 Z",
    ],
    rearWheelX: 63,
    frontWheelX: 186,
    wheelStyle: "ev",
    doorLines: [91, 128, 166],
    handlePoints: [
      [101, 47],
      [139, 47],
    ],
    mirror: [166, 40],
    darkFillPaths: [
      "M 43 48 L 57 31 L 52 49 L 38 56 Z",
      "M 30 61 Q 118 66 216 61 L 216 67 Q 118 72 29 66 Z",
    ],
    lightFillPaths: ["M 187 44 Q 210 45 220 50 L 218 53 Q 204 49 187 49 Z"],
    roofRailPaths: ["M 74 19 H 105", "M 114 19 H 139"],
    frontLampPath: "M 188 44 Q 211 46 220 51 L 211 54 L 187 50 Z",
    rearLampPath: "M 23 52 L 42 48 L 41 54 L 22 59 Z",
    rockerPath: "M 29 64 Q 118 68 216 63",
    signaturePaths: [
      "M 44 47 Q 113 43 183 47",
      "M 173 52 H 219",
      "M 181 58 Q 201 55 220 60",
    ],
  },
  express: {
    profileId: "express-gmt610-2026",
    representativeYear: 2026,
    representativeVariant: "Cargo 2500 regular-wheelbase van",
    referenceUrl: `${chevrolet}/commercial/express/vans`,
    startYear: 2003,
    endYear: 2026,
    kind: "van",
    bodyStyle: "van",
    bodyRearX: 13,
    bodyFrontX: 220,
    targetWheelbaseRatio: 0.603,
    bodyPath:
      "M 13 70 L 14 25 Q 16 18 26 18 L 166 18 Q 178 20 185 38 L 207 40 L 219 49 L 220 70 Z",
    glassPaths: [
      "M 151 23 L 165 23 Q 174 26 180 39 L 151 39 Z",
      "M 184 42 L 205 43 L 214 49 L 184 49 Z",
    ],
    rearWheelX: 54,
    frontWheelX: 179,
    wheelStyle: "steel",
    doorLines: [104, 149, 183],
    handlePoints: [
      [114, 47],
      [157, 47],
      [190, 52],
    ],
    mirror: [207, 41],
    darkFillPaths: [
      "M 203 47 L 220 49 L 219 63 L 202 61 Z",
      "M 18 62 H 219 L 217 68 H 18 Z",
    ],
    lightFillPaths: ["M 207 44 L 218 49 L 217 53 L 207 51 Z"],
    grillePaths: ["M 204 54 H 218", "M 204 58 H 218"],
    frontLampPath: "M 207 43 L 219 49 L 218 55 L 207 52 Z",
    rearLampPath: "M 14 39 H 20 V 58 H 14 Z",
    rockerPath: "M 19 65 H 216",
    signaturePaths: [
      "M 25 24 H 145",
      "M 103 28 V 63",
      "M 149 23 V 64",
      "M 23 55 H 97",
    ],
  },
  "low-cab-forward": {
    profileId: "low-cab-forward-isuzu-n-2026",
    representativeYear: 2026,
    representativeVariant: "6500XD regular cab chassis",
    referenceUrl: `${chevrolet}/commercial/low-cab-forward-cab-over-truck`,
    startYear: 2016,
    endYear: 2026,
    kind: "cabover",
    bodyStyle: "cabover",
    bodyRearX: 14,
    bodyFrontX: 222,
    targetWheelbaseRatio: 0.554,
    bodyPath:
      "M 14 70 L 14 61 L 130 61 L 130 30 Q 132 19 145 17 L 198 17 Q 209 20 217 39 L 222 46 L 220 70 Z",
    glassPaths: [
      "M 137 26 Q 141 22 149 22 L 170 22 L 170 44 L 134 44 Z",
      "M 174 22 L 196 22 Q 204 25 211 41 L 174 41 Z",
    ],
    rearWheelX: 73,
    frontWheelX: 188,
    wheelStyle: "commercial",
    rearWheelRadius: 12,
    frontWheelRadius: 11.5,
    rearDualWheel: true,
    doorLines: [131, 171],
    handlePoints: [
      [145, 49],
      [180, 48],
    ],
    mirror: [215, 37],
    mirrorStyle: "tow",
    darkFillPaths: [
      "M 207 42 L 221 47 L 220 64 L 205 63 Z",
      "M 14 58 H 129 V 65 H 14 Z",
    ],
    grillePaths: ["M 207 50 H 220", "M 207 55 H 220", "M 207 60 H 220"],
    frontLampPath: "M 212 44 L 221 48 L 219 55 L 211 54 Z",
    rearLampPath: "M 15 57 H 22 V 62 H 15 Z",
    rockerPath: "M 14 61 H 128",
    signaturePaths: [
      "M 22 57 H 126",
      "M 130 46 H 218",
      "M 208 55 H 220",
      "M 197 19 V 62",
    ],
  },
  silverado: {
    profileId: "silverado-t1xx-2026",
    representativeYear: 2026,
    representativeVariant: "1500 Crew Cab short bed",
    referenceUrl: `${chevrolet}/trucks/silverado/1500`,
    startYear: 2019,
    endYear: 2026,
    kind: "pickup",
    bodyStyle: "pickup",
    bodyRearX: 17,
    bodyFrontX: 221,
    targetWheelbaseRatio: 0.636,
    bodyPath:
      "M 17 70 L 17 50 L 86 50 L 91 32 Q 96 22 108 22 L 146 22 Q 158 24 167 41 L 183 32 L 218 36 Q 223 43 221 58 L 220 70 Z",
    glassPaths: [
      "M 99 30 Q 103 26 110 26 L 125 26 L 125 41 L 95 41 Z",
      "M 129 26 L 144 26 Q 153 28 160 40 L 129 40 Z",
    ],
    rearWheelX: 58,
    frontWheelX: 188,
    wheelStyle: "truck",
    doorLines: [87, 127, 167],
    handlePoints: [
      [102, 47],
      [140, 47],
    ],
    mirror: [167, 40],
    darkFillPaths: [
      "M 181 34 L 218 37 L 219 57 L 180 55 Z",
      "M 87 61 H 219 L 217 67 H 85 Z",
    ],
    lightFillPaths: ["M 184 37 L 217 39 L 216 45 L 182 43 Z"],
    grillePaths: ["M 181 47 H 218", "M 181 51 H 218", "M 181 55 H 218"],
    frontLampPath: "M 184 37 L 217 39 L 216 45 L 182 43 Z",
    rearLampPath: "M 17 50 H 24 V 62 H 17 Z",
    rockerPath: "M 87 64 H 216",
    signaturePaths: [
      "M 22 47 H 85",
      "M 28 55 H 81",
      "M 86 50 V 66",
      "M 176 48 H 220",
      "M 176 58 H 220",
    ],
  },
  "silverado-ev": {
    profileId: "silverado-ev-bt1xx-2026",
    representativeYear: 2026,
    representativeVariant: "RST Crew Cab",
    referenceUrl: `${chevrolet}/electric/silverado-ev`,
    startYear: 2024,
    endYear: 2026,
    kind: "pickup",
    bodyStyle: "ev-pickup",
    bodyRearX: 14,
    bodyFrontX: 222,
    targetWheelbaseRatio: 0.625,
    bodyPath:
      "M 14 70 L 14 49 L 77 49 L 92 35 L 99 29 Q 104 23 115 22 L 151 22 Q 162 25 169 40 L 194 42 Q 216 45 222 53 L 220 70 Z",
    glassPaths: [
      "M 103 31 Q 108 26 116 26 L 131 26 L 130 41 L 95 41 Z",
      "M 135 26 L 149 26 Q 158 28 164 40 L 134 40 Z",
    ],
    rearWheelX: 58,
    frontWheelX: 188,
    wheelStyle: "ev",
    wheelRadius: 12,
    doorLines: [93, 133, 169],
    handlePoints: [
      [108, 47],
      [145, 47],
    ],
    mirror: [169, 40],
    darkFillPaths: [
      "M 76 49 L 99 29 L 94 49 L 80 58 Z",
      "M 92 61 H 218 L 216 67 H 90 Z",
      "M 180 48 L 220 50 L 219 62 L 178 61 Z",
    ],
    lightFillPaths: ["M 179 41 Q 204 42 220 48 L 218 51 Q 199 47 179 47 Z"],
    frontLampPath: "M 181 41 L 216 46 L 218 50 L 183 48 Z",
    rearLampPath: "M 14 49 H 21 V 60 H 14 Z",
    rockerPath: "M 92 64 H 216",
    signaturePaths: [
      "M 19 46 H 77",
      "M 77 49 L 96 35",
      "M 80 54 H 90",
      "M 176 51 H 220",
      "M 174 57 H 220",
    ],
  },
  "silverado-hd": {
    profileId: "silverado-hd-t1xx-2026",
    representativeYear: 2026,
    representativeVariant: "2500HD Crew Cab standard bed",
    referenceUrl: `${chevrolet}/trucks/silverado/2500hd-3500hd`,
    startYear: 2020,
    endYear: 2026,
    kind: "pickup",
    bodyStyle: "pickup",
    bodyRearX: 4,
    bodyFrontX: 222,
    targetWheelbaseRatio: 0.636,
    bodyPath:
      "M 4 70 L 4 47 L 78 47 L 83 30 Q 88 20 102 20 L 144 20 Q 157 23 166 39 L 180 27 L 219 31 Q 224 39 222 58 L 220 70 Z",
    glassPaths: [
      "M 91 28 Q 96 24 105 24 L 122 24 L 122 39 L 87 39 Z",
      "M 126 24 L 142 24 Q 152 27 159 38 L 126 38 Z",
    ],
    rearWheelX: 52,
    frontWheelX: 191,
    wheelStyle: "truck",
    rearWheelRadius: 12.5,
    frontWheelRadius: 13,
    doorLines: [79, 123, 166],
    handlePoints: [
      [94, 45],
      [137, 46],
    ],
    mirror: [166, 37],
    mirrorStyle: "tow",
    darkFillPaths: [
      "M 178 29 L 219 32 L 220 59 L 177 57 Z",
      "M 79 60 H 220 L 218 68 H 77 Z",
      "M 168 29 L 179 26 L 181 31 L 170 34 Z",
    ],
    lightFillPaths: [
      "M 181 32 L 218 34 L 217 42 L 179 40 Z",
      "M 180 44 L 218 45 L 217 51 L 179 50 Z",
    ],
    grillePaths: [
      "M 179 41 H 219",
      "M 178 47 H 219",
      "M 178 53 H 219",
      "M 178 57 H 219",
    ],
    frontLampPath: "M 181 32 L 218 34 L 217 42 L 179 40 Z",
    rearLampPath: "M 4 47 H 13 V 61 H 4 Z",
    rockerPath: "M 80 64 H 218",
    signaturePaths: [
      "M 9 44 H 77",
      "M 15 52 H 73",
      "M 78 47 V 66",
      "M 169 44 H 221",
      "M 168 52 H 221",
      "M 177 61 H 219",
    ],
  },
  suburban: {
    profileId: "suburban-gmtt1yc-refresh-2026",
    representativeYear: 2026,
    representativeVariant: "High Country four-door SUV",
    referenceUrl: `${chevrolet}/suvs/suburban`,
    startYear: 2025,
    endYear: 2026,
    kind: "suv",
    bodyStyle: "suv",
    bodyRearX: 5,
    bodyFrontX: 221,
    targetWheelbaseRatio: 0.593,
    bodyPath:
      "M 5 70 L 6 45 L 20 40 L 26 24 Q 31 18 43 18 L 151 18 Q 163 21 173 37 L 190 37 L 219 41 Q 223 47 221 59 L 220 70 Z",
    glassPaths: [
      "M 30 26 Q 34 22 45 22 L 65 22 L 65 39 L 24 39 Z",
      "M 69 22 L 99 22 L 99 39 L 69 39 Z",
      "M 103 22 L 131 22 L 134 39 L 103 39 Z",
      "M 136 22 L 149 22 Q 159 24 166 37 L 138 37 Z",
    ],
    rearWheelX: 48,
    frontWheelX: 176,
    wheelStyle: "suv",
    wheelRadius: 12,
    doorLines: [65, 101, 136, 172],
    handlePoints: [
      [78, 46],
      [113, 46],
    ],
    mirror: [172, 37],
    darkFillPaths: [
      "M 181 38 L 220 42 L 219 59 L 179 57 Z",
      "M 15 60 H 219 L 217 67 H 14 Z",
    ],
    lightFillPaths: ["M 183 39 L 217 42 L 216 48 L 181 46 Z"],
    roofRailPaths: ["M 44 15 H 88", "M 99 15 H 150"],
    frontLampPath: "M 184 38 L 217 42 L 215 50 L 183 47 Z",
    rearLampPath: "M 12 42 L 22 40 L 22 57 L 12 60 Z",
    rockerPath: "M 17 64 H 216",
    signaturePaths: [
      "M 20 42 Q 95 39 181 41",
      "M 176 50 H 220",
      "M 174 56 H 220",
      "M 18 59 H 165",
    ],
  },
  tahoe: {
    profileId: "tahoe-gmtt1uc-refresh-2026",
    representativeYear: 2026,
    representativeVariant: "High Country four-door SUV",
    referenceUrl: `${chevrolet}/suvs/tahoe`,
    startYear: 2025,
    endYear: 2026,
    kind: "suv",
    bodyStyle: "suv",
    bodyRearX: 22,
    bodyFrontX: 221,
    targetWheelbaseRatio: 0.572,
    bodyPath:
      "M 22 70 L 22 45 L 34 40 L 39 24 Q 44 18 55 18 L 151 18 Q 163 21 173 37 L 190 37 L 219 41 Q 223 47 221 59 L 220 70 Z",
    glassPaths: [
      "M 44 26 Q 48 22 57 22 L 74 22 L 74 39 L 39 39 Z",
      "M 78 22 L 109 22 L 109 39 L 78 39 Z",
      "M 113 22 L 135 22 L 138 39 L 113 39 Z",
      "M 140 22 L 149 22 Q 159 24 166 37 L 142 37 Z",
    ],
    rearWheelX: 64,
    frontWheelX: 178,
    wheelStyle: "suv",
    wheelRadius: 12,
    doorLines: [75, 111, 140, 172],
    handlePoints: [
      [87, 46],
      [122, 46],
    ],
    mirror: [172, 37],
    darkFillPaths: [
      "M 181 38 L 220 42 L 219 59 L 179 57 Z",
      "M 28 60 H 219 L 217 67 H 27 Z",
    ],
    lightFillPaths: ["M 183 39 L 217 42 L 216 48 L 181 46 Z"],
    roofRailPaths: ["M 54 15 H 94", "M 105 15 H 150"],
    frontLampPath: "M 184 38 L 217 42 L 215 50 L 183 47 Z",
    rearLampPath: "M 22 42 L 32 40 L 32 57 L 22 60 Z",
    rockerPath: "M 27 64 H 216",
    signaturePaths: [
      "M 34 42 Q 103 39 181 41",
      "M 176 50 H 220",
      "M 174 56 H 220",
      "M 37 59 H 165",
    ],
  },
  trailblazer: {
    profileId: "trailblazer-vssf-refresh-2026",
    representativeYear: 2026,
    representativeVariant: "ACTIV five-door crossover",
    referenceUrl: `${chevrolet}/suvs/trailblazer`,
    startYear: 2024,
    endYear: 2026,
    kind: "crossover",
    bodyStyle: "crossover",
    bodyRearX: 30,
    bodyFrontX: 217,
    targetWheelbaseRatio: 0.597,
    bodyPath:
      "M 30 70 L 30 51 L 43 45 L 49 28 Q 54 21 67 20 L 137 20 Q 150 23 160 39 L 184 41 L 211 46 Q 218 51 217 61 L 216 70 Z",
    glassPaths: [
      "M 54 29 Q 59 24 68 24 L 83 24 L 83 40 L 47 40 Z",
      "M 87 24 L 116 24 L 118 40 L 87 40 Z",
      "M 120 24 L 136 24 Q 146 27 154 39 L 122 39 Z",
    ],
    rearWheelX: 66,
    frontWheelX: 178,
    wheelStyle: "suv",
    doorLines: [84, 119, 158],
    handlePoints: [
      [94, 48],
      [129, 48],
    ],
    mirror: [160, 40],
    darkFillPaths: [
      "M 43 45 L 53 29 L 49 46 L 36 52 Z",
      "M 176 52 L 217 54 L 216 62 L 174 61 Z",
    ],
    roofRailPaths: ["M 68 20 H 100", "M 109 20 H 138"],
    frontLampPath: "M 188 43 L 215 47 L 210 51 L 186 49 Z",
    rearLampPath: "M 31 48 L 44 45 L 44 53 L 30 58 Z",
    rockerPath: "M 35 64 H 211",
    signaturePaths: [
      "M 45 46 Q 108 43 180 46",
      "M 176 52 H 216",
      "M 179 58 H 216",
    ],
  },
  traverse: {
    profileId: "traverse-c1yc2-2026",
    representativeYear: 2026,
    representativeVariant: "Z71 three-row crossover",
    referenceUrl: `${chevrolet}/suvs/traverse`,
    startYear: 2024,
    endYear: 2026,
    kind: "crossover",
    bodyStyle: "crossover",
    bodyRearX: 18,
    bodyFrontX: 221,
    targetWheelbaseRatio: 0.591,
    bodyPath:
      "M 18 70 L 19 48 L 31 43 L 38 27 Q 43 20 55 19 L 146 19 Q 159 22 169 38 L 190 39 L 217 44 Q 222 49 221 60 L 220 70 Z",
    glassPaths: [
      "M 43 28 Q 47 23 57 23 L 73 23 L 73 40 L 37 40 Z",
      "M 77 23 L 108 23 L 108 40 L 77 40 Z",
      "M 112 23 L 139 23 L 142 40 L 112 40 Z",
      "M 143 23 Q 155 25 163 38 L 146 38 Z",
    ],
    rearWheelX: 59,
    frontWheelX: 179,
    wheelStyle: "suv",
    wheelRadius: 12,
    doorLines: [74, 110, 144, 170],
    handlePoints: [
      [85, 46],
      [120, 46],
      [151, 46],
    ],
    mirror: [170, 38],
    darkFillPaths: [
      "M 30 43 L 43 27 L 38 44 L 25 51 Z",
      "M 173 51 L 220 53 L 219 62 L 171 61 Z",
    ],
    lightFillPaths: ["M 183 39 L 217 44 L 214 49 L 182 46 Z"],
    roofRailPaths: ["M 54 16 H 94", "M 104 16 H 147"],
    frontLampPath: "M 184 39 L 217 44 L 213 50 L 182 47 Z",
    rearLampPath: "M 20 43 L 33 41 L 33 55 L 19 59 Z",
    rockerPath: "M 24 64 H 215",
    signaturePaths: [
      "M 32 43 Q 102 40 181 42",
      "M 175 51 H 220",
      "M 173 57 H 220",
      "M 35 59 H 166",
    ],
  },
  trax: {
    profileId: "trax-vssf-2026",
    representativeYear: 2026,
    representativeVariant: "2RS five-door crossover",
    referenceUrl: `${chevrolet}/suvs/trax`,
    startYear: 2024,
    endYear: 2026,
    kind: "crossover",
    bodyStyle: "crossover",
    bodyRearX: 28,
    bodyFrontX: 219,
    targetWheelbaseRatio: 0.595,
    bodyPath:
      "M 28 70 L 29 56 Q 32 51 45 48 L 58 35 Q 64 28 77 27 L 137 27 Q 151 29 163 42 L 188 44 L 213 49 Q 219 54 217 70 Z",
    glassPaths: [
      "M 62 36 Q 67 32 78 31 L 91 31 L 89 44 L 53 45 Z",
      "M 95 31 L 120 31 L 123 43 L 93 44 Z",
      "M 123 31 L 136 31 Q 147 33 156 42 L 127 42 Z",
    ],
    rearWheelX: 66,
    frontWheelX: 180,
    wheelStyle: "suv",
    doorLines: [90, 124, 161],
    handlePoints: [
      [100, 49],
      [135, 48],
    ],
    mirror: [163, 41],
    darkFillPaths: [
      "M 45 48 L 59 35 L 54 49 L 40 55 Z",
      "M 35 61 Q 117 66 212 61 L 211 67 Q 118 71 34 66 Z",
    ],
    frontLampPath: "M 188 44 L 215 49 L 209 53 L 186 50 Z",
    rearLampPath: "M 30 51 L 46 48 L 45 54 L 29 59 Z",
    rockerPath: "M 35 64 Q 117 67 211 63",
    signaturePaths: [
      "M 47 47 Q 110 44 182 47",
      "M 176 53 H 216",
      "M 181 59 H 216",
    ],
  },
};

export function detailedProfileFor(modelId: string, year: number) {
  const spec = latestVehicleProfileSpecs[modelId];
  if (!spec || year < spec.startYear || year > spec.endYear) return undefined;
  return spec;
}
