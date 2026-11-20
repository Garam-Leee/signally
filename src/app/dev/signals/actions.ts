"use server";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  inspectSignals,
  probeMap,
  type Inspection,
  type Issue,
} from "@/features/signals/td-data";
import {
  getRequestOverview,
  type RequestOverview,
} from "@/features/signals/request-state";

export async function requireLocalDevelopment() {
  if (process.env.NODE_ENV !== "development") notFound();
  const request = await headers();
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
  const host = request.get("host") ?? "";
  const forwarded = request.get("x-forwarded-host");
  if (!local.test(host) || (forwarded !== null && !local.test(forwarded)))
    notFound();
}

export type InspectorState = {
  overview: RequestOverview;
  inspection: Inspection | null;
  probe: Awaited<ReturnType<typeof probeMap>> | null;
  issue: Issue | null;
};

let inFlight = false;

export async function runInspection(
  _previous: InspectorState,
  form: FormData,
): Promise<InspectorState> {
  await requireLocalDevelopment();
  const mode = form.get("mode");
  if (inFlight || (mode !== "probe" && mode !== "area")) {
    return {
      overview: await getRequestOverview(),
      inspection: null,
      probe: null,
      issue: inFlight ? "busy" : null,
    };
  }
  inFlight = true;
  try {
    const probe = mode === "probe" ? await probeMap() : null;
    const inspection = mode === "area" ? await inspectSignals() : null;
    return {
      overview: await getRequestOverview(),
      inspection,
      probe,
      issue: probe?.issue ?? null,
    };
  } finally {
    inFlight = false;
  }
}
