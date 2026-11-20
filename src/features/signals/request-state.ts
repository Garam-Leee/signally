import "server-only";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rmdir,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { priorLimit } from "./request-status.ts";

export const callLimit = 50;
export const budgetDirectory = join(process.cwd(), ".td-data-budget");
export const requestLock = join(budgetDirectory, "request-lock");

const timestamp = z.number().int().min(0).max(8.64e15);
const attempt = z.object({
  at: timestamp,
  status: z.enum([
    "ok",
    "empty",
    "auth",
    "rate",
    "invalid",
    "network",
    "upstream",
  ]),
});
const stateSchema = z.object({
  map: attempt.nullable(),
  signal: attempt.nullable(),
  limit: z.object({ limitedAt: timestamp, retryAt: timestamp }),
  mapProbePassed: z.boolean(),
});

export type RequestState = z.infer<typeof stateSchema>;
const baseline: RequestState = {
  map: { at: priorLimit.limitedAt, status: "rate" },
  signal: null,
  limit: priorLimit,
  mapProbePassed: false,
};
const statePath = join(budgetDirectory, "request-state.json");

export function missingFile(error: unknown) {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

export async function readRequestState(): Promise<RequestState> {
  try {
    const saved = stateSchema.parse(
      JSON.parse(await readFile(statePath, "utf8")),
    );
    return {
      ...saved,
      limit:
        saved.limit.retryAt >= priorLimit.retryAt ? saved.limit : priorLimit,
    };
  } catch (error) {
    if (!missingFile(error)) throw error;
    return baseline;
  }
}

export async function saveRequestState(state: RequestState) {
  const next = statePath + ".new";
  await writeFile(next, JSON.stringify(state), { mode: 0o600 });
  await rename(next, statePath);
}

export async function acquireRequestLock() {
  await mkdir(budgetDirectory, { recursive: true });
  try {
    await mkdir(requestLock);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

export async function releaseRequestLock() {
  await rmdir(requestLock);
}

export async function reserveCall() {
  for (let slot = 1; slot <= callLimit; slot++) {
    try {
      await mkdir(join(budgetDirectory, String(slot)));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  return false;
}

export async function getRequestOverview() {
  try {
    const state = await readRequestState();
    const entries: string[] = await readdir(budgetDirectory).catch(
      (error: unknown) => {
        if (missingFile(error)) return [];
        throw error;
      },
    );
    const used = entries.filter((name) =>
      /^(?:[1-9]|[1-4]\d|50)$/.test(name),
    ).length;
    return {
      state,
      used,
      limit: callLimit,
      blocked: Date.now() < state.limit.retryAt,
      busy: entries.includes("request-lock"),
    };
  } catch {
    return {
      state: null,
      used: null,
      limit: callLimit,
      blocked: true,
      busy: false,
    };
  }
}

export type RequestOverview = Awaited<ReturnType<typeof getRequestOverview>>;
