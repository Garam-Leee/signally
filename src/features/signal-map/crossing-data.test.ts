import assert from "node:assert/strict";
import test from "node:test";
import {
  demoProvider,
  displayReading,
  liveProvider,
  type VisibleCrossing,
} from "./crossing-data.ts";

const crossing: VisibleCrossing = {
  id: "test",
  name: "test",
  intersection: "test",
  location: [127, 37],
  demoOffset: 0,
  reading: { status: "RED", observedAt: 1000, validUntil: 7000 },
};

test("demo reads a simulated schedule and switches at the exact phase boundary", () => {
  assert.deepEqual(displayReading(crossing, "DEMO", 35_001, 0), {
    status: "RED",
    seconds: 1,
    next: "GREEN",
    observedAt: 35_001,
  });
  assert.equal(displayReading(crossing, "DEMO", 36_000, 0).status, "GREEN");
  assert.equal(displayReading(crossing, "DEMO", 56_000, 0).status, "RED");
});

test("live countdown requires a verified transition and stops on expiry", () => {
  assert.equal(displayReading(crossing, "LIVE", 2000, 0).seconds, null);
  assert.equal(displayReading(crossing, "LIVE", 999, 0).status, "UNKNOWN");
  const verified: VisibleCrossing = {
    ...crossing,
    reading: {
      ...crossing.reading,
      transition: { at: 6500, next: "GREEN", verified: true },
    },
  };
  assert.equal(displayReading(verified, "LIVE", 5000, 0).seconds, 2);
  assert.equal(displayReading(verified, "LIVE", 6500, 0).status, "UNKNOWN");
  assert.equal(displayReading(verified, "LIVE", 7000, 0).status, "STALE");
});

test("local demo only returns crossings in view and live does not reuse them", async () => {
  const inside = {
    west: 126.914,
    east: 126.915,
    south: 37.4815,
    north: 37.4822,
  };
  const signal = new AbortController().signal;
  assert.equal((await demoProvider.load(inside, signal)).length, 4);
  assert.deepEqual(
    await demoProvider.load({ ...inside, east: 126.913 }, signal),
    [],
  );
  assert.deepEqual(await liveProvider.load(inside, signal), []);
});
