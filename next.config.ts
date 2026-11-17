import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the optional in-memory-key local session separate from the existing preview.
  distDir: process.env.ONEULBADANG_LIVE_DEV === "1" ? ".next-live" : ".next",
};

export default nextConfig;
