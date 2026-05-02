import type { NextConfig } from "next";
import path from "path";

const hmsPath = path.resolve(__dirname, "../shared-social-publisher/src/hyosung-payment.js");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    resolveAlias: {
      "hyosung-payment": hmsPath,
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "hyosung-payment": hmsPath,
    };
    return config;
  },
};

export default nextConfig;
