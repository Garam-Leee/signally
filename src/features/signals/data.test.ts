import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyHttpStatus,
  delayThresholdMs,
  distanceMeters,
  mapPage,
  nearbyCrossroads,
  normalizeSignal,
} from "./data.ts";

test("MAP validates coordinates and preserves the source ID", () => {
  const row = {
    itstId: "00012",
    itstNm: "Test crossroads",
    mapCtptIntLat: "37.5",
    mapCtptIntLot: 127,
  };
  assert.deepEqual(mapPage.parse([row]), [
    {
      itstId: "00012",
      itstNm: "Test crossroads",
      latitude: 37.5,
      longitude: 127,
    },
  ]);
  assert.equal(
    mapPage.safeParse([{ ...row, mapCtptIntLat: null }]).success,
    false,
  );
  assert.equal(
    mapPage.safeParse([{ ...row, mapCtptIntLat: " " }]).success,
    false,
  );
  assert.equal(
    mapPage.safeParse([{ ...row, mapCtptIntLot: 181 }]).success,
    false,
  );
  assert.equal(mapPage.safeParse({ rows: [row] }).success, false);
});

test("Haversine filters 500 meters and requires an unambiguous center", () => {
  const center = {
    itstId: "1",
    itstNm: "난곡사거리",
    latitude: 37,
    longitude: 127,
  };
  const near = { ...center, itstId: "2", itstNm: "Test A", latitude: 37.0044 };
  const far = { ...center, itstId: "3", itstNm: "Test B", latitude: 37.0046 };
  assert.equal(distanceMeters(center, center), 0);
  assert.ok(Math.abs(distanceMeters(center, near) - 489.26) < 0.1);
  assert.deepEqual(
    nearbyCrossroads([far, near, center]).nearby.map((row) => row.itstId),
    ["1", "2"],
  );
  assert.equal(nearbyCrossroads([near, far]).center, null);
  assert.equal(
    nearbyCrossroads([center, { ...center, itstId: "4" }]).center,
    null,
  );
});

test("signal normalization preserves raw zero, handles missing directions and selects latest packet", () => {
  const now = 1_790_571_447_594;
  const rows = [
    { itstId: "1", trsmUtcTime: now - 2, nePdsgRmdrCs: 50 },
    {
      itstId: "1",
      trsmUtcTime: now - 1,
      nePdsgStatNm: "stop-And-Remain",
      nePdsgRmdrCs: 0,
      ntPdsgStatNm: null,
    },
  ];
  const result = normalizeSignal(rows, "1", now);
  assert.equal(result?.status, "normal");
  assert.deepEqual(
    result?.readings.find(({ code }) => code === "ne"),
    { code: "ne", rawState: "stop-And-Remain", rawRemaining: 0 },
  );
  assert.deepEqual(
    result?.readings.find(({ code }) => code === "nt"),
    { code: "nt", rawState: null, rawRemaining: null },
  );
  assert.equal(
    normalizeSignal(rows, "1", now + delayThresholdMs)?.status,
    "delayed",
  );
  assert.equal(normalizeSignal(rows, "1", now - 2)?.status, "unknown");
});

test("distinguishes absent signals, invalid payloads, and mismatched IDs", () => {
  const now = 1_790_571_447_594;
  assert.equal(normalizeSignal([], "1", now)?.status, "unavailable");
  assert.equal(normalizeSignal([{ itstId: "1" }], "1", now)?.provided, false);
  assert.equal(
    normalizeSignal([{ itstId: "1", ntPdsgRmdrCs: 12 }], "1", now)?.status,
    "unknown",
  );
  assert.equal(normalizeSignal([{ itstId: "2" }], "1", now), null);
  assert.equal(
    normalizeSignal([{ itstId: "1", ntPdsgRmdrCs: "12" }], "1", now),
    null,
  );
  assert.equal(normalizeSignal({ error: "unknown" }, "1", now), null);
});

test("HTTP authentication and rate failures have distinct safe error codes", () => {
  assert.equal(classifyHttpStatus(401), "auth");
  assert.equal(classifyHttpStatus(403), "auth");
  assert.equal(classifyHttpStatus(429), "rate");
  assert.equal(classifyHttpStatus(502), "upstream");
});
