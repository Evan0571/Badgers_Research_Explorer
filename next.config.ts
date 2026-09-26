import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ["pdf-parse", "mammoth"],
};
export default config;
