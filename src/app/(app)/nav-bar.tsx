"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { hasPermission, type Permission } from "@/shared/security/permissions";
import type { Role } from "@prisma/client";

const PRIMARY_TABS: { href: string; label: string; permission: Permission }[] = [
  { href: "/dashboard", label: "Dashboard", permission: "dashboard.view" },
  { href: "/kasir", label: "Kasir", permission: "pos.operate" },
  { href: "/stok", label: "Stok Barang", permission: "inventory.view" },
  { href: "/barang-masuk", label: "Barang Masuk", permission: "receiving.manage" },
  { href: "/transaksi", label: "Transaksi", permission: "transactions.view" },
  { href: "/keuangan", label: "Keuangan", permission: "finance.manage" },
  { href: "/laporan", label: "Laporan", permission: "reports.view" },
];

const SECONDARY_LINKS: { href: string; label: string; permission: Permission }[] = [
  { href: "/master/produk", label: "Master Produk", permission: "products.manage" },
  { href: "/master/kategori", label: "Kategori", permission: "products.manage" },
  { href: "/master/supplier", label: "Supplier", permission: "suppliers.manage" },
  { href: "/stok-opname", label: "Stock Opname", permission: "stockopname.manage" },
  { href: "/master/users", label: "Master User", permission: "users.manage" },
  { href: "/master/permissions", label: "Permissions", permission: "users.manage" },
  { href: "/audit", label: "Audit Log", permission: "audit.view" },
];

/**
 * Mandatory horizontal primary navigation (PRD 7-8). Never collapses into
 * a sidebar or hamburger — on narrow viewports it scrolls horizontally.
 * Every tab/link is filtered by the signed-in role's actual permission
 * (PRD 5, and the point that hiding client-side is not authorization on its
 * own — this filtering is a UX convenience on top of the server-side guards
 * already in each page/API, not a replacement for them).
 */
export function NavBar({ role }: { role?: Role }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleTabs = role ? PRIMARY_TABS.filter((tab) => hasPermission(role, tab.permission)) : [];
  const visibleLinks = role ? SECONDARY_LINKS.filter((link) => hasPermission(role, link.permission)) : [];

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
          {visibleTabs.map((tab) => {
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
              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
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
