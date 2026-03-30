import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname, "..", ".."),
  },
  async rewrites() {
    const backendUrl = process.env.SOLASHARE_API_URL ?? process.env.NEXT_PUBLIC_SOLASHARE_API_URL;

    if (!backendUrl) {
      return [];
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
