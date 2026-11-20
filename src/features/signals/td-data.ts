import "server-only";
import { mkdir } from "node:fs/promises";
import { get } from "node:https";
import { join } from "node:path";
import {
  classifyHttpStatus,
  mapPage,
  nearbyCrossroads,
  normalizeSignal,
  type Crossroad,
} from "./data";

const root = "https://t-data.seoul.go.kr/apig/apiman-gateway/tapi/";
const pageLimit = 30;
const pageSize = 100;
const callLimit = 50;
export type Issue =
  | ReturnType<typeof classifyHttpStatus>
  | "missing-key"
  | "budget"
  | "invalid"
  | "network"
  | "storage";
type Response = { ok: true; payload: unknown } | { ok: false; issue: Issue };

async function reserveCall() {
  const directory = join(process.cwd(), ".td-data-budget");
  try {
    await mkdir(directory, { recursive: true });
    for (let slot = 1; slot <= callLimit; slot++) {
      try {
        await mkdir(join(directory, String(slot)));
        return null;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
    }
    return "budget";
  } catch {
    return "storage";
  }
}

async function request(
  api: "map" | "signal",
  params: Record<string, string>,
): Promise<Response> {
  if (process.env.NODE_ENV !== "development")
    return { ok: false, issue: "upstream" };
  const key = (
    api === "map"
      ? process.env.SEOUL_TDATA_MAP_API_KEY
      : process.env.SEOUL_TDATA_SIGNAL_API_KEY
  )?.trim();
  if (!key) return { ok: false, issue: "missing-key" };
  const issue = await reserveCall();
  if (issue) return { ok: false, issue };
  const url = new URL(
    api === "map"
      ? "v2xCrossroadMapInformation/1.0"
      : "v2xSignalPhaseTimingFusionCurrentInfo/1.0",
    root,
  );
  url.search = new URLSearchParams({
    ...params,
    type: "json",
    [api === "map" ? "apiKey" : "apikey"]: key,
  }).toString();
  // Node HTTPS keeps the authenticated URL outside Next.js fetch instrumentation.
  return new Promise((resolve) => {
    const outgoing = get(
      url,
      {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        response.on("error", () => resolve({ ok: false, issue: "network" }));
        if (status < 200 || status >= 300) {
          resolve({ ok: false, issue: classifyHttpStatus(status) });
          response.destroy();
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2_000_000) {
            resolve({ ok: false, issue: "invalid" });
            response.destroy();
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          try {
            resolve({
              ok: true,
              payload: JSON.parse(
                Buffer.concat(chunks).toString("utf8"),
              ) as unknown,
            });
          } catch {
            resolve({ ok: false, issue: "invalid" });
          }
        });
      },
    );
    outgoing.on("error", () => resolve({ ok: false, issue: "network" }));
  });
}

async function readMap() {
  const rows = new Map<string, Crossroad>();
  const pages = new Set<string>();
  let stop: Issue | "page-limit" | "repeat" | "end" = "page-limit";
  let mapAuthenticated = false;
  for (let page = 1; page <= pageLimit; page++) {
    const response = await request("map", {
      pageNo: String(page),
      numOfRows: String(pageSize),
    });
    if (!response.ok) {
      stop = response.issue;
      break;
    }
    const parsed = mapPage.safeParse(response.payload);
    if (!parsed.success) {
      stop = "invalid";
      break;
    }
    mapAuthenticated = true;
    if (!parsed.data.length) {
      stop = "end";
      break;
    }
    const signature = JSON.stringify(
      [...new Set(parsed.data.map((row) => row.itstId))].sort(),
    );
    if (pages.has(signature)) {
      stop = "repeat";
      break;
    }
    pages.add(signature);
    for (const row of parsed.data) {
      const existing = rows.get(row.itstId);
      if (
        existing &&
        (existing.latitude !== row.latitude ||
          existing.longitude !== row.longitude ||
          existing.itstNm !== row.itstNm)
      ) {
        return { rows: [], stop: "invalid" as const, mapAuthenticated };
      }
      rows.set(row.itstId, row);
    }
  }
  return { rows: [...rows.values()], stop, mapAuthenticated } as const;
}

export async function inspectSignals() {
  const { rows, stop, mapAuthenticated } = await readMap();
  const { center, nearby } = nearbyCrossroads(rows);
  let stopSignal: Issue | undefined;
  const crossroads: (Crossroad & {
    distance: number;
    issue: Issue | null;
    signal: ReturnType<typeof normalizeSignal>;
  })[] = [];
  for (const crossroad of nearby) {
    const response: Response = stopSignal
      ? { ok: false as const, issue: stopSignal }
      : await request("signal", {
          itstId: crossroad.itstId,
          pageNo: "1",
          numOfRows: "10",
        });
    if (!response.ok) {
      if (
        ["auth", "rate", "budget", "missing-key", "storage"].includes(
          response.issue,
        )
      )
        stopSignal = response.issue;
      crossroads.push({ ...crossroad, issue: response.issue, signal: null });
      continue;
    }
    const signal = normalizeSignal(
      response.payload,
      crossroad.itstId,
      Date.now(),
    );
    crossroads.push({
      ...crossroad,
      issue: signal ? null : ("invalid" as const),
      signal,
    });
  }
  return {
    center,
    crossroads,
    mapStop: stop,
    mapAuthenticated,
    checkedAt: Date.now(),
  };
}

export type Inspection = Awaited<ReturnType<typeof inspectSignals>>;
