import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node-only packages; load them at runtime instead of bundling them.
  serverExternalPackages: ["microsoft-cognitiveservices-speech-sdk", "pdfjs-dist", "@napi-rs/canvas", "sharp"],
  experimental: {
    // Alert uploads can be up to 20 MB (the login check reads the request first).
    proxyClientMaxBodySize: "25mb",
  },
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
