import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite uploads de imagem maiores nos route handlers.
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
