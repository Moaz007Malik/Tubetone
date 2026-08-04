import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Production: set NEXT_PUBLIC_* in env at build time (see .env.production.example)
};

export default nextConfig;
