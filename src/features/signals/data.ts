import { z } from "zod";
import { directions } from "./directions.ts";

const id = z
  .union([z.string().trim().min(1), z.number().int().nonnegative()])
  .transform(String);
const decimal = z
  .union([
    z.number(),
    z
      .string()
      .trim()
      .regex(/^-?\d+(\.\d+)?$/)
      .transform(Number),
  ])
  .pipe(z.number());
const mapRow = z
  .object({
    itstId: id,
    itstNm: z.string().trim().min(1),
    mapCtptIntLat: decimal.pipe(z.number().min(-90).max(90)),
    mapCtptIntLot: decimal.pipe(z.number().min(-180).max(180)),
  })
  .transform(({ itstId, itstNm, mapCtptIntLat, mapCtptIntLot }) => ({
    itstId,
    itstNm,
    latitude: mapCtptIntLat,
    longitude: mapCtptIntLot,
  }));

export type Crossroad = z.output<typeof mapRow>;
type Point = Pick<Crossroad, "latitude" | "longitude">;
export const mapPage = z.array(mapRow);

export function distanceMeters(a: Point, b: Point) {
  const radians = Math.PI / 180;
  const latitude = (b.latitude - a.latitude) * radians;
  const longitude = (b.longitude - a.longitude) * radians;
  const haversine =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(a.latitude * radians) *
      Math.cos(b.latitude * radians) *
      Math.sin(longitude / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function nearbyCrossroads(rows: readonly Crossroad[]) {
  const centers = rows.filter(
    (row) => row.itstNm.replace(/\s/g, "") === "난곡사거리",
  );
  const center = centers.length === 1 ? centers[0] : null;
  const nearby = center
    ? rows
        .map((row) => ({ ...row, distance: distanceMeters(center, row) }))
        .filter((row) => row.distance <= 500)
        .sort((a, b) => a.distance - b.distance)
    : [];
  return { center, nearby };
}

type Direction = keyof typeof directions;
const codes = Object.keys(directions) as Direction[];
const fields = Object.fromEntries(
  codes.flatMap((code) => [
    [`${code}PdsgStatNm`, z.string().max(100).nullable().optional()],
    [`${code}PdsgRmdrCs`, z.number().nullable().optional()],
  ]),
);
const signalRows = z.array(
  z
    .object({
      itstId: id,
      trsmUtcTime: z
        .number()
        .int()
        .min(1_000_000_000_000)
        .max(9_999_999_999_999)
        .nullable()
        .optional(),
    })
    .and(z.object(fields)),
);
export const delayThresholdMs = 10_000;

export function normalizeSignal(payload: unknown, itstId: string, now: number) {
  const parsed = signalRows.safeParse(payload);
  if (!parsed.success || parsed.data.some((row) => row.itstId !== itstId))
    return null;
  const latest = parsed.data.reduce<(typeof parsed.data)[number] | undefined>(
    (current, row) =>
      !current || (row.trsmUtcTime ?? 0) > (current.trsmUtcTime ?? 0)
        ? row
        : current,
    undefined,
  );
  const readings = codes.map((code) => {
    const rawState = latest?.[`${code}PdsgStatNm`] as string | null | undefined;
    const rawRemaining = latest?.[`${code}PdsgRmdrCs`] as
      number | null | undefined;
    return {
      code,
      rawState: rawState ?? null,
      rawRemaining: rawRemaining ?? null,
    };
  });
  const provided = readings.some(
    ({ rawState, rawRemaining }) =>
      Boolean(rawState?.trim()) || rawRemaining !== null,
  );
  const timestamp = latest?.trsmUtcTime ?? null;
  const status: "unavailable" | "unknown" | "delayed" | "normal" = !provided
    ? "unavailable"
    : timestamp === null || timestamp > now
      ? "unknown"
      : now - timestamp > delayThresholdMs
        ? "delayed"
        : "normal";
  return { provided, timestamp, readings, status };
}

export function classifyHttpStatus(status: number) {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate";
  return "upstream";
}
