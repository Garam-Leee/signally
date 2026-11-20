export function mapAssetPath(path: `/${string}`) {
  return `${process.env.NEXT_PUBLIC_SIGNALLY_BASE_PATH ?? ""}${path}`;
}
