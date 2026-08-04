import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Production: set NEXT_PUBLIC_API_URL before build (.env.production.example)
};

export default nextConfig;
