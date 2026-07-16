import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully client-rendered app (chain reads happen in the browser), so we ship
  // plain static files. Works on any static host.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
