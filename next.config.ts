import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas", "mammoth"],
  // PDF.js loads its native canvas support dynamically, outside normal tracing.
  outputFileTracingIncludes: {
    "/api/resume": [
      "./node_modules/@napi-rs/canvas*/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
};
export default config;
