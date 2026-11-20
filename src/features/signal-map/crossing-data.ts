export type Coordinate = [longitude: number, latitude: number];
export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};
export type DataMode = "DEMO" | "LIVE";
export type SignalColor = "RED" | "GREEN";
export type SignalStatus = SignalColor | "UNKNOWN" | "STALE" | "UNAVAILABLE";
export type Crossing = {
  id: string;
  name: string;
  intersection: string;
  location: Coordinate;
};
export type SignalReading = {
  status: Exclude<SignalStatus, "STALE">;
  observedAt: number | null;
  validUntil: number | null;
  transition?: { at: number; next: SignalColor; verified: true };
};
export type VisibleCrossing = Crossing & {
  reading: SignalReading;
  demoOffset?: number;
};
export interface CrossingDataProvider {
  load(bounds: Bounds, signal: AbortSignal): Promise<VisibleCrossing[]>;
}

export const center: Coordinate = [126.9145365, 37.4818456];
export const homeZoom = 17.65;
const unknown: SignalReading = {
  status: "UNKNOWN",
  observedAt: null,
  validUntil: null,
};

// The initial camera uses OSM node 13980825011. Positions and phases below
// are for UI inspection and have no T-DATA crossing or controller association.
const crossings: (Crossing & { offset: number })[] = [
  {
    id: "north",
    name: "북측 횡단보도",
    intersection: "난곡사거리",
    location: [126.9146, 37.4820474],
    offset: 36,
  },
  {
    id: "east",
    name: "동측 횡단보도",
    intersection: "난곡사거리",
    location: [126.91485, 37.48188],
    offset: 50,
  },
  {
    id: "south",
    name: "남측 횡단보도",
    intersection: "난곡사거리",
    location: [126.914586, 37.481628],
    offset: 8,
  },
  {
    id: "west",
    name: "서측 횡단보도",
    intersection: "난곡사거리",
    location: [126.91423, 37.48177],
    offset: 22,
  },
  {
    id: "west-2",
    name: "남부순환로 횡단보도",
    intersection: "난곡사거리 서쪽",
    location: [126.9124529, 37.481237],
    offset: 38,
  },
  {
    id: "east-2",
    name: "남부순환로 횡단보도",
    intersection: "난곡사거리 동쪽",
    location: [126.9162612, 37.4819407],
    offset: 18,
  },
];

export const demoProvider: CrossingDataProvider = {
  async load(bounds) {
    return crossings
      .filter(
        ({ location: [lng, lat] }) =>
          lng >= bounds.west &&
          lng <= bounds.east &&
          lat >= bounds.south &&
          lat <= bounds.north,
      )
      .map(({ offset, ...crossing }) => ({
        ...crossing,
        reading: unknown,
        demoOffset: offset,
      }));
  },
};

// This adapter deliberately has no known live crossings or upstream requests.
// An actual adapter can group crossings by verified controller ID and dedupe/cache
// observations per controller before returning normalized readings for this viewport.
export const liveProvider: CrossingDataProvider = {
  async load() {
    return [];
  },
};

export function displayReading(
  crossing: VisibleCrossing,
  mode: DataMode,
  now: number,
  demoStart: number,
) {
  const offset = mode === "DEMO" ? crossing.demoOffset : undefined;
  const demo = offset !== undefined;
  const phase = demo
    ? (Math.max(0, now - demoStart) / 1000 + offset) % 56
    : null;
  const reading: SignalReading =
    phase === null
      ? crossing.reading
      : {
          status: phase < 36 ? "RED" : "GREEN",
          observedAt: now,
          validUntil: null,
          transition: {
            at: now + ((phase < 36 ? 36 : 56) - phase) * 1000,
            next: phase < 36 ? "GREEN" : "RED",
            verified: true,
          },
        };
  let status: SignalStatus = reading.status;
  const hasTimestamp = reading.observedAt !== null && reading.observedAt <= now;
  if (reading.validUntil !== null && reading.validUntil <= now)
    status = "STALE";
  else if (
    !demo &&
    (status === "RED" || status === "GREEN") &&
    (!hasTimestamp || reading.validUntil === null)
  )
    status = "UNKNOWN";
  const transition = reading.transition;
  const canCount =
    (status === "RED" || status === "GREEN") &&
    transition?.verified &&
    transition.at > now &&
    transition.next !== status &&
    (demo ||
      (reading.validUntil !== null &&
        reading.observedAt !== null &&
        reading.observedAt <= now));
  return {
    status:
      transition &&
      transition.at <= now &&
      (status === "RED" || status === "GREEN")
        ? ("UNKNOWN" as const)
        : status,
    seconds: canCount ? Math.ceil((transition.at - now) / 1000) : null,
    next: canCount ? transition.next : null,
    observedAt: reading.observedAt,
  };
}

export type DisplayReading = ReturnType<typeof displayReading>;
