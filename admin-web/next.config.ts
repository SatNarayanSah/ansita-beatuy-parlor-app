import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The signed-in areas (/admin, /account) check the session in the browser and load their
  // data client-side, so their pages can't render instantly on the server. Only validate
  // segments that opt in with an explicit `instant` export (dev-only warnings).
  experimental: {
    instantInsights: { validationLevel: "manual-warning" },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
