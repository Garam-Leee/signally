"use server";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { inspectSignals, type Inspection } from "@/features/signals/td-data";

let inFlight: Promise<Inspection> | undefined;
let recent: Inspection | undefined;

export async function requireLocalDevelopment() {
  if (process.env.NODE_ENV !== "development") notFound();
  const request = await headers();
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
  const host = request.get("host") ?? "";
  const forwarded = request.get("x-forwarded-host");
  if (!local.test(host) || (forwarded !== null && !local.test(forwarded)))
    notFound();
}

export async function runInspection(): Promise<Inspection> {
  await requireLocalDevelopment();
  if (recent && Date.now() - recent.checkedAt < 60_000) return recent;
  inFlight ??= inspectSignals()
    .then((result) => {
      recent = result;
      return result;
    })
    .finally(() => {
      inFlight = undefined;
    });
  return inFlight;
}
