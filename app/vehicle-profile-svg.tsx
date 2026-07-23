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
  | "forward-control"
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

type PickupCabStyle = "crew" | "extended" | "regular";

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

const dark = "#3d3931";
const glass = "#efe8d7";
const chrome = "#aaa294";

function numericYear(year?: string) {
  const parsed = Number(year);
  return Number.isFinite(parsed) ? parsed : 2026;
}

function pickupCabStyle(modelId: string, year: number): PickupCabStyle {
  if (modelId === "silverado-ev") return "crew";
  if (
    ["silverado", "silverado-hd", "colorado"].includes(modelId) &&
    year >= 2004
  ) {
    return "crew";
  }
  if (
    modelId === "s10" &&
    year >= 2001
  ) {
    return "crew";
  }
  if (
    (modelId === "ck-series" && year >= 1988) ||
    (modelId === "s10" && year >= 1996)
  ) {
    return "extended";
  }
  return "regular";
}

function inferBodyKind(modelId: string, vehicleClass: string): BodyKind {
  const type = vehicleClass.toLowerCase();
  if (type.includes("prewar")) return "prewar";
  if (type.includes("bus")) return "bus";
  if (modelId === "rampside" || modelId === "loadside") return "forward-control";
  if (modelId === "el-camino" || modelId === "avalanche" || modelId === "ssr") {
    return "utility";
  }
  if (modelId === "3600" || modelId === "3800" || modelId === "apache") {
    return "pickup";
  }
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
  if (type.includes("pickup") || type.includes("truck family") || type.includes("chassis cab")) return "pickup";
  if (type.includes("commercial truck") || type.includes("medium-duty")) return "heavy-truck";
  if (type.includes("sports") || modelId === "corvette") return "sports";
  if (type.includes("coupe") || modelId === "monte-carlo") return "coupe";
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
  if (modelId === "caprice-ppv") return "zeta-wm-wn";
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
  const cabStyle = pickupCabStyle(modelId, year);
  const pickupRoofRearX =
    cabStyle === "crew" ? 88 : cabStyle === "extended" ? 104 : 122;

  const specs: Record<BodyKind, ProfileSpec> = {
    prewar: { kind, rearX: 28, frontX: 215, bodyY: 51, baseY: 70, hoodX: 166, hoodY: 43, roofRearX: 66, roofFrontX: 132, roofY: 23, wheelRearX: 61, wheelFrontX: 184 },
    sedan: { kind, rearX: 22, frontX: 218, bodyY: 49, baseY: 70, hoodX: 172, hoodY: 44, roofRearX: 67, roofFrontX: 146, roofY: 25, wheelRearX: 58, wheelFrontX: 184 },
    coupe: { kind, rearX: 21, frontX: 220, bodyY: 51, baseY: 70, hoodX: 174, hoodY: 43, roofRearX: 83, roofFrontX: 148, roofY: 28, wheelRearX: 57, wheelFrontX: 184 },
    sports: { kind, rearX: 22, frontX: 222, bodyY: 53, baseY: 70, hoodX: 177, hoodY: 45, roofRearX: 81, roofFrontX: 148, roofY: 31, wheelRearX: 58, wheelFrontX: 188 },
    wagon: { kind, rearX: 20, frontX: 220, bodyY: 47, baseY: 70, hoodX: 176, hoodY: 43, roofRearX: 42, roofFrontX: 149, roofY: 24, wheelRearX: 55, wheelFrontX: 187 },
    hatchback: { kind, rearX: 26, frontX: 218, bodyY: 49, baseY: 70, hoodX: 172, hoodY: 44, roofRearX: 56, roofFrontX: 148, roofY: 26, wheelRearX: 60, wheelFrontX: 183 },
    suv: { kind, rearX: longBody ? 13 : 24, frontX: 221, bodyY: 43, baseY: 70, hoodX: 178, hoodY: 40, roofRearX: longBody ? 25 : 39, roofFrontX: 157, roofY: 19, wheelRearX: longBody ? 50 : 61, wheelFrontX: 188 },
    crossover: { kind, rearX: 25, frontX: 218, bodyY: 45, baseY: 70, hoodX: 174, hoodY: 42, roofRearX: 49, roofFrontX: 153, roofY: 23, wheelRearX: 60, wheelFrontX: 183 },
    pickup: { kind, rearX: 17, frontX: 222, bodyY: 51, baseY: 70, hoodX: 180, hoodY: 42, roofRearX: pickupRoofRearX, roofFrontX: 159, roofY: year >= 2007 ? 22 : 25, wheelRearX: 55, wheelFrontX: 190 },
    utility: { kind, rearX: 18, frontX: 221, bodyY: 51, baseY: 70, hoodX: 177, hoodY: 43, roofRearX: 101, roofFrontX: 151, roofY: 27, wheelRearX: 56, wheelFrontX: 187 },
    van: { kind, rearX: longBody ? 13 : 24, frontX: 220, bodyY: 43, baseY: 70, hoodX: 195, hoodY: 40, roofRearX: longBody ? 21 : 31, roofFrontX: 177, roofY: 19, wheelRearX: longBody ? 48 : 58, wheelFrontX: 187 },
    minivan: { kind, rearX: 23, frontX: 219, bodyY: 45, baseY: 70, hoodX: 185, hoodY: 42, roofRearX: 39, roofFrontX: 163, roofY: 22, wheelRearX: 59, wheelFrontX: 184 },
    delivery: { kind, rearX: 20, frontX: 220, bodyY: 46, baseY: 70, hoodX: 177, hoodY: 42, roofRearX: 31, roofFrontX: 151, roofY: 20, wheelRearX: 56, wheelFrontX: 187 },
    "forward-control": { kind, rearX: 17, frontX: 220, bodyY: 49, baseY: 70, hoodX: 206, hoodY: 38, roofRearX: 137, roofFrontX: 204, roofY: 21, wheelRearX: 54, wheelFrontX: 190 },
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
  if (modelId === "caprice-ppv") {
    Object.assign(selected, {
      rearX: 17,
      frontX: 223,
      bodyY: 49,
      hoodX: 177,
      hoodY: 44,
      roofRearX: 61,
      roofFrontX: 151,
      roofY: 24,
      wheelRearX: 58,
      wheelFrontX: 189,
    });
  }
  return selected;
}

function passengerBodyPath(spec: ProfileSpec) {
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

function pickupBodyPath(spec: ProfileSpec) {
  const cabBackX = spec.roofRearX - 4;
  return [
    `M ${spec.rearX} ${spec.baseY}`,
    `L ${spec.rearX} ${spec.bodyY + 3}`,
    `L ${cabBackX - 2} ${spec.bodyY + 3}`,
    `L ${cabBackX - 2} ${spec.roofY + 8}`,
    `Q ${cabBackX + 4} ${spec.roofY} ${cabBackX + 14} ${spec.roofY}`,
    `L ${spec.roofFrontX - 12} ${spec.roofY}`,
    `Q ${spec.roofFrontX - 2} ${spec.roofY + 2} ${spec.roofFrontX + 7} ${spec.bodyY - 5}`,
    `L ${spec.hoodX} ${spec.hoodY}`,
    `L ${spec.frontX - 7} ${spec.hoodY + 1}`,
    `Q ${spec.frontX} ${spec.bodyY + 1} ${spec.frontX - 1} ${spec.bodyY + 8}`,
    `L ${spec.frontX - 2} ${spec.baseY}`,
    "Z",
  ].join(" ");
}

function heavyTruckBodyPath(spec: ProfileSpec) {
  const cabBackX = spec.roofRearX - 5;
  const frameY = spec.baseY - 9;
  return [
    `M ${spec.rearX} ${spec.baseY}`,
    `L ${spec.rearX} ${frameY}`,
    `L ${cabBackX - 6} ${frameY}`,
    `L ${cabBackX - 6} ${spec.roofY + 8}`,
    `Q ${cabBackX} ${spec.roofY} ${cabBackX + 11} ${spec.roofY}`,
    `L ${spec.roofFrontX - 9} ${spec.roofY}`,
    `Q ${spec.roofFrontX} ${spec.roofY + 2} ${spec.roofFrontX + 7} ${spec.bodyY - 7}`,
    `L ${spec.hoodX} ${spec.hoodY}`,
    `L ${spec.frontX - 5} ${spec.hoodY + 1}`,
    `L ${spec.frontX} ${spec.bodyY + 8}`,
    `L ${spec.frontX - 2} ${spec.baseY}`,
    "Z",
  ].join(" ");
}

function caboverBodyPath(spec: ProfileSpec) {
  const cabBackX = spec.roofRearX - 5;
  const frameY = spec.baseY - 9;
  return [
    `M ${spec.rearX} ${spec.baseY}`,
    `L ${spec.rearX} ${frameY}`,
    `L ${cabBackX - 6} ${frameY}`,
    `L ${cabBackX - 6} ${spec.roofY + 7}`,
    `Q ${cabBackX} ${spec.roofY} ${cabBackX + 10} ${spec.roofY}`,
    `L ${spec.roofFrontX - 4} ${spec.roofY}`,
    `Q ${spec.roofFrontX + 4} ${spec.roofY + 3} ${spec.frontX - 2} ${spec.bodyY + 5}`,
    `L ${spec.frontX - 2} ${spec.baseY}`,
    "Z",
  ].join(" ");
}

function forwardControlBodyPath(spec: ProfileSpec) {
  const cabBackX = spec.roofRearX - 5;
  return [
    `M ${spec.rearX} ${spec.baseY}`,
    `L ${spec.rearX} ${spec.bodyY + 3}`,
    `L ${cabBackX - 5} ${spec.bodyY + 3}`,
    `L ${cabBackX - 5} ${spec.roofY + 7}`,
    `Q ${cabBackX} ${spec.roofY} ${cabBackX + 10} ${spec.roofY}`,
    `L ${spec.roofFrontX - 4} ${spec.roofY}`,
    `Q ${spec.roofFrontX + 4} ${spec.roofY + 3} ${spec.frontX - 2} ${spec.bodyY + 5}`,
    `L ${spec.frontX - 2} ${spec.baseY}`,
    "Z",
  ].join(" ");
}

function bodyPath(spec: ProfileSpec) {
  if (spec.kind === "pickup") return pickupBodyPath(spec);
  if (spec.kind === "heavy-truck") return heavyTruckBodyPath(spec);
  if (spec.kind === "cabover") return caboverBodyPath(spec);
  if (spec.kind === "forward-control") return forwardControlBodyPath(spec);
  return passengerBodyPath(spec);
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

function singleCabWindowPath(spec: ProfileSpec) {
  const back = spec.roofRearX + 7;
  const front = spec.roofFrontX - 8;
  return [
    `M ${back} ${spec.roofY + 6}`,
    `L ${front} ${spec.roofY + 6}`,
    `L ${spec.roofFrontX + 1} ${spec.bodyY - 7}`,
    `L ${back} ${spec.bodyY - 7}`,
    "Z",
  ].join(" ");
}

function wheel(cx: number, key: string) {
  return (
    <g key={key}>
      <circle cx={cx} cy="70" fill="#fdfbf5" r="12.5" stroke={dark} strokeWidth="3" />
      <circle cx={cx} cy="70" fill={chrome} r="5.25" stroke={dark} strokeWidth="1.4" />
      <circle cx={cx} cy="70" fill={dark} r="1.4" />
    </g>
  );
}

export function VehicleProfileSvg({
  accent = "var(--ia-gold)",
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
  const cabWindow = singleCabWindowPath(spec);
  const cabStyle = pickupCabStyle(modelId, modelYear);
  const prewar = kind === "prewar";
  const commercialTruck = kind === "heavy-truck" || kind === "cabover";
  const boxBody = kind === "bus" || kind === "van" || kind === "delivery";
  const roundHeadlamp = modelYear < 1980 || prewar;
  const fiftiesFin = modelYear >= 1955 && modelYear <= 1960 && ["bel-air", "impala", "biscayne", "delray", "two-ten", "one-fifty"].includes(modelId);

  return (
    <svg
      aria-label={`${label} stylized side profile`}
      className="vehicle-profile vehicle-profile-svg"
      data-body-kind={kind}
      data-cab-style={kind === "pickup" ? cabStyle : undefined}
      data-design-era={era}
      data-profile-model={modelId}
      role="img"
      viewBox="0 0 240 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{`${label} stylized side profile`}</title>
      <rect fill="#fbf7ef" height="96" width="240" />
      <path d="M 8 82 H 232" stroke="#ded3bd" strokeWidth="1" />
      {prewar ? (
        <>
          <path d="M 39 55 Q 49 42 63 55 M 166 54 Q 182 39 198 55" fill="none" stroke={accent} strokeWidth="10" />
          <path d="M 34 56 H 74 L 80 67 H 25 Z" fill={accent} stroke={dark} strokeWidth="1.5" />
          <path d="M 160 55 H 205 L 215 67 H 151 Z" fill={accent} stroke={dark} strokeWidth="1.5" />
        </>
      ) : null}
      <path d={bodyPath(spec)} fill={accent} stroke={dark} strokeLinejoin="round" strokeWidth="1.8" />
      {fiftiesFin ? <path d={`M ${spec.rearX + 2} ${spec.bodyY + 4} L ${spec.rearX + 7} ${spec.bodyY - 11} L ${spec.rearX + 23} ${spec.bodyY + 2} Z`} fill={accent} stroke={dark} strokeWidth="1.3" /> : null}
      {kind === "pickup" ? (
        <>
          <path d={`M ${spec.rearX + 3} ${spec.bodyY + 3} H ${spec.roofRearX - 8}`} fill="none" stroke={dark} strokeWidth="2" />
          <path d={`M ${spec.rearX + 10} ${spec.bodyY + 5} V ${spec.baseY - 4}`} fill="none" stroke={dark} strokeWidth="1.2" />
          <path d={`M ${spec.roofRearX - 6} ${spec.bodyY + 3} V ${spec.baseY - 4}`} fill="none" stroke={dark} strokeWidth="1.5" />
        </>
      ) : null}
      {kind === "utility" ? (
        <>
          <path d={`M ${spec.rearX + 4} ${spec.bodyY + 1} H ${spec.roofRearX - 5}`} fill="none" stroke={dark} strokeWidth="2" />
          <path d={`M ${spec.roofRearX - 3} ${spec.bodyY + 2} V ${spec.baseY - 4}`} fill="none" stroke={dark} strokeWidth="1.2" />
        </>
      ) : null}
      {kind === "forward-control" ? (
        <>
          <path d={`M ${spec.rearX + 3} ${spec.bodyY + 3} H ${spec.roofRearX - 11}`} fill="none" stroke={dark} strokeWidth="2" />
          <path d={`M ${spec.rearX + 10} ${spec.bodyY + 5} V ${spec.baseY - 4}`} fill="none" stroke={dark} strokeWidth="1.2" />
          <path d={`M ${spec.roofRearX - 10} ${spec.bodyY + 3} V ${spec.baseY - 4}`} fill="none" stroke={dark} strokeWidth="1.5" />
        </>
      ) : null}
      {kind === "heavy-truck" ? (
        <>
          <path d={`M ${spec.rearX + 2} ${spec.baseY - 11} H ${spec.roofRearX - 11}`} stroke={dark} strokeWidth="2.2" />
          <path d={`M ${spec.roofRearX - 10} ${spec.roofY + 8} V ${spec.baseY - 4}`} stroke={dark} strokeWidth="1.5" />
          <path d={`M ${spec.frontX - 7} ${spec.hoodY + 4} V ${spec.baseY - 6}`} stroke={dark} strokeWidth="2" />
        </>
      ) : null}
      {kind === "cabover" ? (
        <>
          <path d={`M ${spec.rearX + 2} ${spec.baseY - 11} H ${spec.roofRearX - 11}`} stroke={dark} strokeWidth="2.2" />
          <path d={`M ${spec.roofRearX - 10} ${spec.roofY + 8} V ${spec.baseY - 4}`} stroke={dark} strokeWidth="1.5" />
          <path d={`M ${spec.frontX - 6} ${spec.bodyY - 2} V ${spec.baseY - 6}`} stroke={dark} strokeWidth="2" />
        </>
      ) : null}
      {boxBody ? (
        <path d={`M ${spec.roofRearX + 5} ${spec.roofY + 5} H ${spec.roofFrontX - 15} V ${spec.bodyY - 7} H ${spec.roofRearX + 5} Z`} fill={glass} stroke={dark} strokeWidth="1.25" />
      ) : commercialTruck || kind === "forward-control" || (kind === "pickup" && cabStyle === "regular") ? (
        <path d={cabWindow} fill={glass} stroke={dark} strokeLinejoin="round" strokeWidth="1.25" />
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
      {modelId === "caprice-ppv" ? (
        <>
          <path d="M 27 51 Q 43 46 64 45" fill="none" stroke={dark} strokeWidth="1.15" />
          <path d="M 166 48 L 170 48 L 169 54 L 165 54 Z" fill={dark} />
          <path d="M 73 62 H 166" stroke={dark} strokeWidth="0.9" opacity="0.65" />
        </>
      ) : null}
      {!commercialTruck ? <path d={`M ${spec.hoodX + 2} ${spec.hoodY + 4} H ${spec.frontX - 7}`} stroke={dark} strokeWidth="1.1" /> : null}
      <path d={`M ${spec.rearX + 3} ${spec.baseY - 4} H ${spec.frontX - 3}`} stroke={dark} strokeWidth="1" opacity="0.7" />
      {!commercialTruck && kind !== "forward-control" ? (
        <>
          <path d={`M ${spec.roofFrontX + 3} ${spec.bodyY - 5} V ${spec.baseY - 4}`} stroke={dark} strokeWidth="1" />
          <path d={`M ${spec.roofRearX + 27} ${spec.bodyY - 6} V ${spec.baseY - 4}`} stroke={dark} strokeWidth="1" opacity="0.75" />
        </>
      ) : (
        <path d={`M ${spec.roofRearX + 24} ${spec.roofY + 5} V ${spec.baseY - 4}`} stroke={dark} strokeWidth="1.1" opacity="0.8" />
      )}
      {roundHeadlamp ? (
        <circle cx={spec.frontX - 4} cy={spec.bodyY + 8} fill="#fff4bd" r="3" stroke={dark} strokeWidth="1" />
      ) : (
        <rect fill="#fff4bd" height="4" rx="1" stroke={dark} strokeWidth="0.8" width={modelYear >= 2016 ? 13 : 8} x={spec.frontX - (modelYear >= 2016 ? 14 : 9)} y={spec.bodyY + 5} />
      )}
      <rect fill="#c9483e" height="5" rx="1" width="3" x={spec.rearX + 2} y={spec.bodyY + 7} />
      {modelYear < 1980 ? <path d={`M ${spec.frontX - 8} ${spec.baseY - 2} H ${spec.frontX + 4} M ${spec.rearX - 3} ${spec.baseY - 2} H ${spec.rearX + 8}`} stroke={chrome} strokeWidth="3" /> : null}
      {wheel(spec.wheelRearX, "rear")}
      {kind === "heavy-truck" ? wheel(spec.wheelRearX + 19, "rear-tandem") : null}
      {wheel(spec.wheelFrontX, "front")}
      <text fill="#665d4e" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="700" textAnchor="middle" x="120" y="91">
        {era.toUpperCase().replaceAll("-", " ")}
      </text>
    </svg>
  );
}
