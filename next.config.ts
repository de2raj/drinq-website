import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Self-contained build for GoDaddy cPanel "Setup Node.js App" (see DEPLOY.md).
  output: "standalone",
};

export default nextConfig;
