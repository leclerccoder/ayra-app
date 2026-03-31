import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com", "localhost", "127.0.0.1"],
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
