type VehicleProfileSvgProps = {
  accent?: string;
  label: string;
  modelId: string;
  vehicleClass: string;
  year?: string;
};

type BodyKind =
  | "bus"
  | "cabover"
  | "coupe"
  | "crossover"
  | "delivery"
  | "hatchback"
  | "heavy-truck"
  | "minivan"
  | "pickup"
  | "prewar"
  | "sedan"
  | "sports"
  | "suv"
  | "utility"
  | "van"
  | "wagon";

type ProfileSpec = {
  baseY: number;
  bodyY: number;
  frontX: number;
  hoodX: number;
  hoodY: number;
  kind: BodyKind;
  rearX: number;
  roofFrontX: number;
  roofRearX: number;
  roofY: number;
  wheelFrontX: number;
  wheelRearX: number;
};

const dark = "#38404b";
const glass = "#dce7ef";
const chrome = "#aeb7bf";

function numericYear(year?: string) {
  const parsed = Number(year);
  return Number.isFinite(parsed) ? parsed : 2026;
}
function inferBodyKind(modelId: string, vehicleClass: string): BodyKind {
  const type = vehicleClass.toLowerCase();
  if (type.includes("prewar")) return "prewar";
  if (type.includes("bus")) return "bus";
  if (type.includes("cab-over") || type.includes("cabover") || type.includes("low-cab")) {
    return "cabover";
  }
  if (type.includes("class 7") || type.includes("class 8") || type.includes("heavy-duty truck")) {
    return "heavy-truck";
  }
  if (type.includes("minivan")) return "minivan";
  if (type.includes("van") || type.includes("walk-in")) return "van";
  if (type.includes("delivery") || type.includes("panel")) return "delivery";
  if (type.includes("station wagon") || type.includes("wagon")) return "wagon";
  if (type.includes("hatchback") || modelId === "volt") return "hatchback";
  if (type.includes("crossover")) return "crossover";
  if (type.includes("suv")) return "suv";
  if (type.includes("pickup") || type.includes("truck family") || type.includes("chassis cab")) {
    return modelId === "avalanche" || modelId === "ssr" ? "utility" : "pickup";
  }
  if (type.includes("commercial truck") || type.includes("medium-duty")) return "heavy-truck";
  if (type.includes("sports") || modelId === "corvette") return "sports";
  if (type.includes("coupe") || modelId === "monte-carlo") return "coupe";
  if (modelId === "el-camino") return "utility";
  return "sedan";
}

function designEra(modelId: string, year: number) {
  if (modelId === "camaro") {
    if (year <= 1969) return "camaro-1";
    if (year <= 1981) return "camaro-2";
    if (year <= 1992) return "camaro-3";
    if (year <= 2002) return "camaro-4";
    if (year <= 2015) return "camaro-5";
    return "camaro-6";
  }
  if (modelId === "corvette") {
    if (year <= 1962) return "corvette-c1";
    if (year <= 1967) return "corvette-c2";
    if (year <= 1982) return "corvette-c3";
    if (year <= 1996) return "corvette-c4";
    if (year <= 2004) return "corvette-c5";
    if (year <= 2013) return "corvette-c6";
    if (year <= 2019) return "corvette-c7";
    return "corvette-c8";
  }
  if (modelId === "tahoe" || modelId === "suburban") {
    if (year <= 1999) return "gmt400";
    if (year <= 2006) return "gmt800";
    if (year <= 2014) return "gmt900";
    if (year <= 2020) return "k2xx";
    return "t1xx";
  }
  if (year < 1933) return "coachbuilt";
  if (year < 1949) return "streamline";
  if (year < 1960) return "fifties";
  if (year < 1974) return "sixties";
  if (year < 1990) return "square";
  if (year < 2005) return "aero";
  if (year < 2016) return "modern";
  return "current";
}

function profileSpec(kind: BodyKind, modelId: string, year: number): ProfileSpec {
  const longBody = modelId === "suburban" || modelId === "express" || modelId === "sportvan";
  const shortBody = modelId === "spark" || modelId === "spark-ev" || modelId === "metro";
  const crewCab = ["avalanche", "silverado-ev", "silverado-hd"].includes(modelId);

  const specs: Record<BodyKind, ProfileSpec> = {
    prewar: { kind, rearX: 28, frontX: 215, bodyY: 51, baseY: 70, hoodX: 166, hoodY: 43, roofRearX: 66, roofFrontX: 132, roofY: 23, wheelRearX: 61, wheelFrontX: 184 },
    sedan: { kind, rearX: 22, frontX: 218, bodyY: 49, baseY: 70, hoodX: 172, hoodY: 44, roofRearX: 67, roofFrontX: 146, roofY: 25, wheelRearX: 58, wheelFrontX: 184 },
    coupe: { kind, rearX: 21, frontX: 220, bodyY: 51, baseY: 70, hoodX: 174, hoodY: 43, roofRearX: 83, roofFrontX: 148, roofY: 28, wheelRearX: 57, wheelFrontX: 184 },
    sports: { kind, rearX: 22, frontX: 222, bodyY: 53, baseY: 70, hoodX: 177, hoodY: 45, roofRearX: 81, roofFrontX: 148, roofY: 31, wheelRearX: 58, wheelFrontX: 188 },
    wagon: { kind, rearX: 20, frontX: 220, bodyY: 47, baseY: 70, hoodX: 176, hoodY: 43, roofRearX: 42, roofFrontX: 149, roofY: 24, wheelRearX: 55, wheelFrontX: 187 },
    hatchback: { kind, rearX: 26, frontX: 218, bodyY: 49, baseY: 70, hoodX: 172, hoodY: 44, roofRearX: 56, roofFrontX: 148, roofY: 26, wheelRearX: 60, wheelFrontX: 183 },
    suv: { kind, rearX: longBody ? 13 : 24, frontX: 221, bodyY: 43, baseY: 70, hoodX: 178, hoodY: 40, roofRearX: longBody ? 25 : 39, roofFrontX: 157, roofY: 19, wheelRearX: longBody ? 50 : 61, wheelFrontX: 188 },
    crossover: { kind, rearX: 25, frontX: 218, bodyY: 45, baseY: 70, hoodX: 174, hoodY: 42, roofRearX: 49, roofFrontX: 153, roofY: 23, wheelRearX: 60, wheelFrontX: 183 },
    pickup: { kind, rearX: 17, frontX: 222, bodyY: 52, baseY: 70, hoodX: 179, hoodY: 43, roofRearX: crewCab ? 100 : 124, roofFrontX: 157, roofY: 25, wheelRearX: 55, wheelFrontX: 190 },
    utility: { kind, rearX: 18, frontX: 221, bodyY: 51, baseY: 70, hoodX: 177, hoodY: 43, roofRearX: 101, roofFrontX: 151, roofY: 27, wheelRearX: 56, wheelFrontX: 187 },
    van: { kind, rearX: longBody ? 13 : 24, frontX: 220, bodyY: 43, baseY: 70, hoodX: 195, hoodY: 40, roofRearX: longBody ? 21 : 31, roofFrontX: 177, roofY: 19, wheelRearX: longBody ? 48 : 58, wheelFrontX: 187 },
    minivan: { kind, rearX: 23, frontX: 219, bodyY: 45, baseY: 70, hoodX: 185, hoodY: 42, roofRearX: 39, roofFrontX: 163, roofY: 22, wheelRearX: 59, wheelFrontX: 184 },
    delivery: { kind, rearX: 20, frontX: 220, bodyY: 46, baseY: 70, hoodX: 177, hoodY: 42, roofRearX: 31, roofFrontX: 151, roofY: 20, wheelRearX: 56, wheelFrontX: 187 },
    cabover: { kind, rearX: 18, frontX: 220, bodyY: 50, baseY: 70, hoodX: 204, hoodY: 37, roofRearX: 142, roofFrontX: 205, roofY: 20, wheelRearX: 54, wheelFrontX: 190 },
    "heavy-truck": { kind, rearX: 15, frontX: 224, bodyY: 51, baseY: 70, hoodX: 185, hoodY: 40, roofRearX: 113, roofFrontX: 165, roofY: 20, wheelRearX: 49, wheelFrontX: 193 },
    bus: { kind, rearX: 13, frontX: 224, bodyY: 43, baseY: 70, hoodX: 209, hoodY: 38, roofRearX: 20, roofFrontX: 207, roofY: 17, wheelRearX: 47, wheelFrontX: 194 },
  };

  const selected = { ...specs[kind] };
  if (shortBody) {
    selected.rearX += 15;
    selected.wheelRearX += 12;
    selected.roofRearX += 12;
  }
  if (modelId === "camaro") {
    if (year >= 1982 && year <= 2002) selected.roofY += 5;
    if (year >= 2010) {
      selected.roofY += 2;
      selected.bodyY -= 2;
    }
  }
  if (modelId === "corvette") {
    selected.roofY += year >= 1984 ? 3 : 0;
    selected.hoodY += 2;
  }
  return selected;
}

function bodyPath(spec: ProfileSpec) {
  const rearShoulder = spec.kind === "wagon" || spec.kind === "suv" || spec.kind === "van" || spec.kind === "delivery" || spec.kind === "bus";
  const roofBackY = rearShoulder ? spec.roofY + 1 : spec.bodyY - 5;
  return [
    `M ${spec.rearX} ${spec.baseY}`,
    `L ${spec.rearX + 1} ${spec.bodyY + 4}`,
    rearShoulder
      ? `L ${spec.roofRearX} ${roofBackY}`
      : `Q ${spec.roofRearX - 13} ${spec.bodyY - 5} ${spec.roofRearX} ${spec.roofY + 6}`,
    `Q ${spec.roofRearX + 12} ${spec.roofY} ${spec.roofRearX + 25} ${spec.roofY}`,
    `L ${spec.roofFrontX - 12} ${spec.roofY}`,
    `Q ${spec.roofFrontX - 2} ${spec.roofY + 2} ${spec.roofFrontX + 7} ${spec.bodyY - 5}`,
    `L ${spec.hoodX} ${spec.hoodY}`,
    `Q ${spec.frontX - 8} ${spec.hoodY + 1} ${spec.frontX} ${spec.bodyY + 6}`,
    `L ${spec.frontX - 2} ${spec.baseY}`,
    "Z",
  ].join(" ");
}

function windowPath(spec: ProfileSpec) {
  const back = spec.roofRearX + 8;
  const front = spec.roofFrontX - 8;
  const split = Math.round((back + front) / 2);
  return {
    front: `M ${split + 2} ${spec.roofY + 5} L ${front} ${spec.roofY + 6} L ${spec.roofFrontX + 1} ${spec.bodyY - 7} L ${split + 2} ${spec.bodyY - 7} Z`,
    rear: `M ${back} ${spec.roofY + 6} Q ${back - 3} ${spec.roofY + 8} ${back - 6} ${spec.bodyY - 7} L ${split - 2} ${spec.bodyY - 7} L ${split - 2} ${spec.roofY + 5} Z`,
  };
}

function wheel(cx: number, key: string) {
  return (
    <g key={key}>
      <circle cx={cx} cy="70" fill="#f8f8f8" r="12.5" stroke={dark} strokeWidth="3" />
      <circle cx={cx} cy="70" fill={chrome} r="5.25" stroke={dark} strokeWidth="1.4" />
      <circle cx={cx} cy="70" fill={dark} r="1.4" />
    </g>
  );
}

export function VehicleProfileSvg({
  accent = "#737f95",
  label,
  modelId,
  vehicleClass,
  year,
}: VehicleProfileSvgProps) {
  const modelYear = numericYear(year);
  const kind = inferBodyKind(modelId, vehicleClass);
  const era = designEra(modelId, modelYear);
  const spec = profileSpec(kind, modelId, modelYear);
  const windows = windowPath(spec);
  const prewar = kind === "prewar";
  const pickup = kind === "pickup" || kind === "utility" || kind === "heavy-truck" || kind === "cabover";
  const boxBody = kind === "bus" || kind === "van" || kind === "delivery";
  const roundHeadlamp = modelYear < 1980 || prewar;
  const fiftiesFin = modelYear >= 1955 && modelYear <= 1960 && ["bel-air", "impala", "biscayne", "delray", "two-ten", "one-fifty"].includes(modelId);

  return (
    <svg
      aria-label={`${label} stylized side profile`}
      className="vehicle-profile vehicle-profile-svg"
      data-body-kind={kind}
      data-design-era={era}
      data-profile-model={modelId}
      role="img"
      viewBox="0 0 240 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{`${label} stylized side profile`}</title>
      <rect fill="#f7f7f7" height="96" width="240" />
      <path d="M 8 82 H 232" stroke="#d5d8dc" strokeWidth="1" />
      {prewar ? (
        <>
          <path d="M 39 55 Q 49 42 63 55 M 166 54 Q 182 39 198 55" fill="none" stroke={accent} strokeWidth="10" />
          <path d="M 34 56 H 74 L 80 67 H 25 Z" fill={accent} stroke={dark} strokeWidth="1.5" />
          <path d="M 160 55 H 205 L 215 67 H 151 Z" fill={accent} stroke={dark} strokeWidth="1.5" />
        </>
      ) : null}
      <path d={bodyPath(spec)} fill={accent} stroke={dark} strokeLinejoin="round" strokeWidth="1.8" />
      {fiftiesFin ? <path d={`M ${spec.rearX + 2} ${spec.bodyY + 4} L ${spec.rearX + 7} ${spec.bodyY - 11} L ${spec.rearX + 23} ${spec.bodyY + 2} Z`} fill={accent} stroke={dark} strokeWidth="1.3" /> : null}
      {pickup ? (
        <>
          <path d={`M ${spec.rearX + 4} ${spec.bodyY + 1} H ${spec.roofRearX - 5}`} fill="none" stroke={dark} strokeWidth="2" />
          <path d={`M ${spec.roofRearX - 3} ${spec.bodyY + 2} V ${spec.baseY - 4}`} fill="none" stroke={dark} strokeWidth="1.2" />
        </>
      ) : null}
      {boxBody ? (
        <path d={`M ${spec.roofRearX + 5} ${spec.roofY + 5} H ${spec.roofFrontX - 15} V ${spec.bodyY - 7} H ${spec.roofRearX + 5} Z`} fill={glass} stroke={dark} strokeWidth="1.25" />
      ) : (
        <>
          <path d={windows.rear} fill={glass} stroke={dark} strokeLinejoin="round" strokeWidth="1.25" />
          <path d={windows.front} fill={glass} stroke={dark} strokeLinejoin="round" strokeWidth="1.25" />
        </>
      )}
      {kind === "suv" || kind === "wagon" || kind === "crossover" || kind === "minivan" ? (
        <path d={`M ${spec.roofRearX + 4} ${spec.roofY + 5} H ${spec.roofRearX + 28} L ${spec.roofRearX + 28} ${spec.bodyY - 7} H ${spec.roofRearX + 4} Z`} fill={glass} stroke={dark} strokeWidth="1.25" />
      ) : null}
      {modelId === "suburban" ? <path d={`M ${spec.roofRearX + 56} ${spec.bodyY - 5} V ${spec.baseY - 4}`} stroke={dark} strokeWidth="1" /> : null}
      {modelId === "avalanche" ? <path d={`M ${spec.roofRearX - 4} ${spec.roofY + 3} L ${spec.roofRearX - 25} ${spec.bodyY + 2}`} stroke={dark} strokeWidth="4" /> : null}
      {modelId === "ssr" ? <path d={`M ${spec.rearX + 7} ${spec.bodyY} Q ${spec.rearX + 35} ${spec.bodyY - 9} ${spec.roofRearX - 2} ${spec.bodyY}`} fill="none" stroke={dark} strokeWidth="1.4" /> : null}
      {modelId === "corvette" && modelYear <= 1962 ? <path d="M 83 33 Q 103 25 125 33" fill="none" stroke={dark} strokeWidth="2" /> : null}
      {modelId === "camaro" && modelYear >= 1982 && modelYear <= 1992 ? <path d="M 29 54 L 78 46" stroke={dark} strokeWidth="1.4" /> : null}
      <path d={`M ${spec.hoodX + 2} ${spec.hoodY + 4} H ${spec.frontX - 7}`} stroke={dark} strokeWidth="1.1" />
      <path d={`M ${spec.rearX + 3} ${spec.baseY - 4} H ${spec.frontX - 3}`} stroke={dark} strokeWidth="1" opacity="0.7" />
      <path d={`M ${spec.roofFrontX + 3} ${spec.bodyY - 5} V ${spec.baseY - 4}`} stroke={dark} strokeWidth="1" />
      <path d={`M ${spec.roofRearX + 27} ${spec.bodyY - 6} V ${spec.baseY - 4}`} stroke={dark} strokeWidth="1" opacity="0.75" />
      {roundHeadlamp ? (
        <circle cx={spec.frontX - 4} cy={spec.bodyY + 8} fill="#fff4bd" r="3" stroke={dark} strokeWidth="1" />
      ) : (
        <rect fill="#fff4bd" height="4" rx="1" stroke={dark} strokeWidth="0.8" width={modelYear >= 2016 ? 13 : 8} x={spec.frontX - (modelYear >= 2016 ? 14 : 9)} y={spec.bodyY + 5} />
      )}
      <rect fill="#c9483e" height="5" rx="1" width="3" x={spec.rearX + 2} y={spec.bodyY + 7} />
      {modelYear < 1980 ? <path d={`M ${spec.frontX - 8} ${spec.baseY - 2} H ${spec.frontX + 4} M ${spec.rearX - 3} ${spec.baseY - 2} H ${spec.rearX + 8}`} stroke={chrome} strokeWidth="3" /> : null}
      {wheel(spec.wheelRearX, "rear")}
      {wheel(spec.wheelFrontX, "front")}
      <text fill="#596270" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="700" textAnchor="middle" x="120" y="91">
        {era.toUpperCase().replaceAll("-", " ")}
      </text>
    </svg>
  );
}
