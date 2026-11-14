import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // STANDALONE=1: self-contained build for cPanel "Setup Node.js App" (npm run package:godaddy).
  // GoDaddy Node.js Hosting builds from source and runs `next start`, so it doesn't need this.
  ...(process.env.STANDALONE === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
