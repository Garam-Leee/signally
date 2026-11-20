import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { priorLimit } from "./request-status.ts";

test("persisted cooldown blocks requests without spending slots", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "signally-rate-test-"));
  const cwd = process.cwd();
  const priorEnv = {
    NODE_ENV: process.env.NODE_ENV,
    SEOUL_TDATA_MAP_API_KEY: process.env.SEOUL_TDATA_MAP_API_KEY,
  };
  t.after(async () => {
    process.chdir(cwd);
    for (const [name, oldValue] of Object.entries(priorEnv)) {
      if (oldValue === undefined) delete process.env[name];
      else process.env[name] = oldValue;
    }
    t.mock.restoreAll();
    syncBuiltinESMExports();
    await rm(directory, { recursive: true, force: true });
  });
  process.chdir(directory);
  Reflect.set(process.env, "NODE_ENV", "development");
  process.env.SEOUL_TDATA_MAP_API_KEY = "test-only";
  for (let slot = 1; slot <= 5; slot++)
    await mkdir(join(".td-data-budget", String(slot)), { recursive: true });

  const fakeGet = t.mock.method(
    https,
    "get",
    (
      _url: URL,
      _options: https.RequestOptions,
      callback: (response: EventEmitter) => void,
    ) => {
      const response = Object.assign(new EventEmitter(), {
        statusCode: 429,
        headers: { "retry-after": "120" },
        destroy() {},
      });
      queueMicrotask(() => callback(response));
      return new EventEmitter();
    },
  );
  syncBuiltinESMExports();
  const time = t.mock.method(Date, "now", () => priorLimit.retryAt - 1);
  const { probeMap } = await import("./td-data.ts");
  const { getRequestOverview, readRequestState } =
    await import("./request-state.ts");
  assert.equal((await probeMap()).issue, "blocked");
  assert.equal((await getRequestOverview()).used, 5);
  assert.equal(fakeGet.mock.callCount(), 0);

  time.mock.mockImplementation(() => priorLimit.retryAt);
  assert.equal((await probeMap()).issue, "rate");
  assert.deepEqual((await readRequestState()).limit, {
    limitedAt: priorLimit.retryAt,
    retryAt: priorLimit.retryAt + 120_000,
  });
  const restarted = (await import(
    String("./request-state.ts?restart")
  )) as typeof import("./request-state.ts");
  assert.equal((await restarted.getRequestOverview()).blocked, true);
  assert.equal((await probeMap()).issue, "blocked");
  assert.equal((await getRequestOverview()).used, 6);
  assert.equal(fakeGet.mock.callCount(), 1);
});
