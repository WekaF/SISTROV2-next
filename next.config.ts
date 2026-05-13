import type { NextConfig } from "next";

const ASPNET_URL = process.env.ASPNET_API_URL || "http://192.168.188.170:8090";

const nextConfig: NextConfig = {
  turbopack: {
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
