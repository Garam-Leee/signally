import { readFile } from "node:fs/promises";
import { join } from "node:path";

const assets = ["maplibre-gl-worker.mjs"];

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return assets.map((asset) => ({ asset }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset: string }> },
) {
  const { asset } = await params;
  if (!assets.includes(asset)) return new Response(null, { status: 404 });
  const script = await readFile(
    join(process.cwd(), "node_modules", "maplibre-gl", "dist", asset),
    "utf8",
  );
  return new Response(script, {
    headers: { "Content-Type": "text/javascript; charset=utf-8" },
  });
}
