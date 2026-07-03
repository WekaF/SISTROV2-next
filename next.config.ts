import type { NextConfig } from "next";
import path from "path";

const ASPNET_URL = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/aspnet-proxy/:path*",
        destination: `${ASPNET_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
