import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Produce a self-contained server build for Docker / VPS deploys.
  output: "standalone",
  // Pin the tracing root to this app so the standalone output isn't nested
  // (this app lives inside a larger monorepo with other lockfiles).
  outputFileTracingRoot: path.join(__dirname),
  // Allow large image uploads through server actions / route handlers.
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
