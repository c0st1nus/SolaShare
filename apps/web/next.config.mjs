import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const remotePatterns = [
  { protocol: "https", hostname: "**" },
  { protocol: "http", hostname: "localhost", port: "3000" },
  { protocol: "http", hostname: "127.0.0.1", port: "3000" },
];

if (apiUrl) {
  try {
    const parsedApiUrl = new URL(apiUrl);

    remotePatterns.push({
      protocol: parsedApiUrl.protocol.replace(":", ""),
      hostname: parsedApiUrl.hostname,
      ...(parsedApiUrl.port ? { port: parsedApiUrl.port } : {}),
    });
  } catch {
    // Ignore invalid NEXT_PUBLIC_API_URL values at config load time.
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns,
    dangerouslyAllowLocalIP: true,
  },
  turbopack: {
    root: rootDir,
  },
};

export default nextConfig;
