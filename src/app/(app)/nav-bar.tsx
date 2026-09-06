"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

const PRIMARY_TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/kasir", label: "Kasir" },
  { href: "/stok", label: "Stok Barang" },
  { href: "/barang-masuk", label: "Barang Masuk" },
  { href: "/transaksi", label: "Transaksi" },
  { href: "/keuangan", label: "Keuangan" },
  { href: "/laporan", label: "Laporan" },
];

const SECONDARY_LINKS = [
  { href: "/master/produk", label: "Master Produk" },
  { href: "/master/supplier", label: "Supplier" },
  { href: "/stok-opname", label: "Stock Opname" },
  { href: "/master/users", label: "Master User", ownerOnly: true },
  { href: "/audit", label: "Audit Log", ownerOnly: true },
];

/**
 * Mandatory horizontal primary navigation (PRD 7-8). Never collapses into
 * a sidebar or hamburger — on narrow viewports it scrolls horizontally.
 */
export function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-3">
        <span className="shrink-0 py-3 pr-3 text-sm font-semibold text-gray-900">
          Kios-ERP
        </span>
        <nav
          className="flex flex-1 gap-1 overflow-x-auto whitespace-nowrap"
          style={{ scrollbarWidth: "thin" }}
        >
          {PRIMARY_TABS.map((tab) => {
            const active = pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            {session?.user?.name ?? "..."}
            <span className="text-xs text-gray-400">({session?.user?.role})</span>
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {SECONDARY_LINKS.filter((link) => !link.ownerOnly || session?.user?.role === "OWNER").map(
                (link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
              >
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
