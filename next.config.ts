import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Rewrites bare `import { X } from "lucide-react"` into per-icon deep
    // imports at build time, so a page using 5 icons ships 5 small modules
    // instead of pulling in the whole ~1500-icon barrel file — smaller
    // client bundles, faster hydration, without changing how anything is
    // imported in the actual page code.
    optimizePackageImports: ["lucide-react"],

    // How long the client router may reuse a page it has already loaded.
    //
    // The default for dynamic routes is 0, and every page here is dynamic
    // (force-dynamic in the (app) layout, because each reads the session).
    // So navigating back to a tab always went to the server — and the server
    // is ~830ms away in Sydney, which is what "pindah tab terasa lambat"
    // actually was. Thirty seconds of reuse makes flipping between Kasir,
    // Stok and Transaksi instant, because it never leaves the browser.
    //
    // Safe to be stale for that long: a mutation that matters calls
    // router.refresh(), which busts this cache, and checkout re-validates
    // stock and price on the server at the moment of sale — so a cached
    // screen can never cause an overselling or a wrong price, only a figure
    // that is briefly behind.
    //
    // Not a substitute for moving the database closer; it removes the round
    // trip for repeat navigation, not for the first load of each page.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;
