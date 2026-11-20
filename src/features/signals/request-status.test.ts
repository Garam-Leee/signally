import assert from "node:assert/strict";
import test from "node:test";
import { parseApiResponse, priorLimit, retryTime } from "./request-status.ts";

test("Retry-After supports seconds and HTTP dates", () => {
  assert.equal(retryTime("21402", priorLimit.limitedAt), priorLimit.retryAt);
  assert.equal(
    retryTime("Fri, 20 Nov 2026 21:38:27 GMT", priorLimit.limitedAt),
    priorLimit.retryAt,
  );
  assert.equal(
    retryTime(
      "Fri, 20 Nov 2026 21:38:27 GMT",
      priorLimit.limitedAt + 5000,
      "Fri, 20 Nov 2026 15:41:45 GMT",
    ),
    priorLimit.retryAt + 5000,
  );
  assert.equal(
    retryTime("n/a", priorLimit.limitedAt),
    priorLimit.limitedAt + 3_600_000,
  );
  assert.equal(
    retryTime(undefined, priorLimit.limitedAt),
    priorLimit.limitedAt + 3_600_000,
  );
  assert.equal(
    retryTime("-1", priorLimit.limitedAt),
    priorLimit.limitedAt + 3_600_000,
  );
});

test("HTTP failures do not expose body; valid, empty and invalid payloads are distinct", () => {
  const validate = () => true;
  for (const [http, status] of [
    [429, "rate"],
    [403, "auth"],
    [502, "upstream"],
  ] as const) {
    assert.deepEqual(
      parseApiResponse(http, '{"message":"private body"}', validate),
      { status },
    );
  }
  assert.deepEqual(parseApiResponse(200, "[]", validate), {
    status: "empty",
    payload: [],
  });
  assert.deepEqual(parseApiResponse(200, '{"rows":[]}', validate), {
    status: "invalid",
  });
  assert.deepEqual(parseApiResponse(200, "<html>", validate), {
    status: "invalid",
  });
  assert.deepEqual(
    parseApiResponse(200, "[{}]", () => false),
    { status: "invalid" },
  );
});
