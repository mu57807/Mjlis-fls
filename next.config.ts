import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node-only packages; load them at runtime instead of bundling them.
  serverExternalPackages: ["microsoft-cognitiveservices-speech-sdk"],
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
