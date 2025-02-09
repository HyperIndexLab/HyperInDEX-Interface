import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: 'in-dex.4everland.store',
      },
    ],
  },
};

export default nextConfig;
