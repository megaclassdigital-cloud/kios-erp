import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Rewrites bare `import { X } from "lucide-react"` into per-icon deep
  // imports at build time, so a page using 5 icons ships 5 small modules
  // instead of pulling in the whole ~1500-icon barrel file — smaller
  // client bundles, faster hydration, without changing how anything is
  // imported in the actual page code.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
