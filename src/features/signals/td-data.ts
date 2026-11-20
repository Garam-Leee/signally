import "server-only";
import { get } from "node:https";
import {
  mapPage,
  nearbyCrossroads,
  normalizeSignal,
  type Crossroad,
} from "./data.ts";
import {
  acquireRequestLock,
  readRequestState,
  releaseRequestLock,
  reserveCall,
  saveRequestState,
} from "./request-state.ts";
import {
  parseApiResponse,
  retryTime,
  type ConnectionStatus,
} from "./request-status.ts";

const root = "https://t-data.seoul.go.kr/apig/apiman-gateway/tapi/";
const pageLimit = 30;
const pageSize = 100;
export type Issue =
  | Exclude<ConnectionStatus, "ok" | "empty">
  | "missing-key"
  | "budget"
  | "storage"
  | "blocked"
  | "busy"
  | "probe-required";
type Response = { ok: true; payload: unknown } | { ok: false; issue: Issue };

function download(url: URL, validate: (payload: unknown) => boolean) {
  return new Promise<{
    status: ConnectionStatus;
    payload?: unknown;
    retryAfter?: string;
    serverDate?: string;
  }>((resolve) => {
    const outgoing = get(
      url,
      {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        response.on("error", () => resolve({ status: "network" }));
        response.on("aborted", () => resolve({ status: "network" }));
        if (status < 200 || status >= 300) {
          resolve({
            ...parseApiResponse(status, "", validate),
            retryAfter: response.headers["retry-after"],
            serverDate: response.headers.date,
          });
          response.destroy();
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2_000_000) {
            resolve({ status: "invalid" });
            response.destroy();
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve(
            parseApiResponse(
              status,
              Buffer.concat(chunks).toString("utf8"),
              validate,
            ),
          ),
        );
      },
    );
    outgoing.on("error", () => resolve({ status: "network" }));
  });
}

async function request(
  api: "map" | "signal",
  params: Record<string, string>,
  probe = false,
): Promise<Response> {
  if (process.env.NODE_ENV !== "development")
    return { ok: false, issue: "upstream" };
  const key = (
    api === "map"
      ? process.env.SEOUL_TDATA_MAP_API_KEY
      : process.env.SEOUL_TDATA_SIGNAL_API_KEY
  )?.trim();
  let locked = false;
  let resultSaved = true;
  try {
    locked = await acquireRequestLock();
    if (!locked) return { ok: false, issue: "busy" };
    const state = await readRequestState();
    if (Date.now() < state.limit.retryAt)
      return { ok: false, issue: "blocked" };
    if (!key) return { ok: false, issue: "missing-key" };
    if (!probe && !state.mapProbePassed)
      return { ok: false, issue: "probe-required" };
    if (!(await reserveCall())) return { ok: false, issue: "budget" };
    resultSaved = false;
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
    const result = await download(url, (payload) =>
      api === "map"
        ? mapPage.safeParse(payload).success
        : normalizeSignal(payload, params.itstId, Date.now()) !== null,
    );
    const at = Date.now();
    state[api] = { at, status: result.status };
    if (api === "map" && probe) state.mapProbePassed = result.status === "ok";
    if (result.status === "rate") {
      state.limit = {
        limitedAt: at,
        retryAt: retryTime(result.retryAfter, at, result.serverDate),
      };
    }
    await saveRequestState(state);
    resultSaved = true;
    return result.status === "ok" || result.status === "empty"
      ? { ok: true, payload: result.payload }
      : { ok: false, issue: result.status };
  } catch {
    return { ok: false, issue: "storage" };
  } finally {
    // If the response could not be recorded, keep the lock and fail closed.
    if (locked && resultSaved) await releaseRequestLock().catch(() => {});
  }
}

export async function probeMap() {
  const result = await request(
    "map",
    { pageNo: "1", numOfRows: String(pageSize) },
    true,
  );
  if (!result.ok) return { issue: result.issue, rows: null };
  const rows = mapPage.parse(result.payload);
  return { issue: null, rows: rows.length };
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
  let stopSignal: Issue | undefined = stop === "rate" ? "blocked" : undefined;
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
        [
          "auth",
          "rate",
          "blocked",
          "busy",
          "budget",
          "missing-key",
          "storage",
          "probe-required",
        ].includes(response.issue)
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
