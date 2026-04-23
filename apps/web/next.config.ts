import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@shveyka/core", "@shveyka/db"],
};

export default nextConfig;
