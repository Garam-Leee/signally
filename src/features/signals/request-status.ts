export const priorLimit = {
  limitedAt: Date.parse("2026-11-21T00:41:45+09:00"),
  retryAt: Date.parse("2026-11-21T06:38:27+09:00"),
};

export function retryTime(
  retryAfter: string | undefined,
  receivedAt: number,
  serverDate?: string,
) {
  const fallback = receivedAt + 60 * 60 * 1000;
  if (!retryAfter) return fallback;
  const value = retryAfter.trim();
  if (/^\d+$/.test(value)) {
    const retryAt = receivedAt + Number(value) * 1000;
    return Number.isSafeInteger(retryAt) && retryAt <= 8.64e15
      ? retryAt
      : fallback;
  }
  if (!/^[A-Za-z]{3},? /.test(value)) return fallback;
  const target = Date.parse(value);
  if (!Number.isFinite(target)) return fallback;
  const serverAt = Date.parse(serverDate ?? "");
  return Math.max(
    receivedAt,
    target,
    Number.isFinite(serverAt) ? receivedAt + target - serverAt : target,
  );
}

export type ConnectionStatus =
  "ok" | "empty" | "auth" | "rate" | "invalid" | "network" | "upstream";
export function parseApiResponse(
  status: number,
  body: string,
  validate: (data: unknown) => boolean,
) {
  if (status === 429) return { status: "rate" } as const;
  if (status === 401 || status === 403) return { status: "auth" } as const;
  if (status < 200 || status >= 300) return { status: "upstream" } as const;
  try {
    const payload: unknown = JSON.parse(body);
    if (Array.isArray(payload) && validate(payload)) {
      return { status: payload.length ? "ok" : "empty", payload } as const;
    }
  } catch {
    // Expose the category only. The response may contain credentials.
  }
  return { status: "invalid" } as const;
}
