const pages = process.env.SIGNALLY_PAGES === "1";

/** @type {import("next").NextConfig} */
const config = {
  pageExtensions: pages
    ? ["tsx", "ts", "jsx", "js"]
    : ["server.tsx", "tsx", "ts", "jsx", "js"],
  ...(pages && {
    output: "export",
    basePath: process.env.SIGNALLY_PAGES_BASE_PATH ?? "/signally",
    trailingSlash: true,
  }),
  env: {
    NEXT_PUBLIC_SIGNALLY_BASE_PATH: pages
      ? (process.env.SIGNALLY_PAGES_BASE_PATH ?? "/signally")
      : "",
  },
};

export default config;
