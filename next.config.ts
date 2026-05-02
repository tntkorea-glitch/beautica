import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    resolveAlias: {
      "hyosung-payment": "./src/lib/hyosung-shim.js",
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "hyosung-payment": require.resolve("./src/lib/hyosung-shim.js"),
    };
    return config;
  },
};

export default nextConfig;
