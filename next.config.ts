import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second copy of the app (e.g. a test instance) run side by side without sharing the build folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // passport photos are shrunk in the browser first, but allow headroom for the 2 MB server limit
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
