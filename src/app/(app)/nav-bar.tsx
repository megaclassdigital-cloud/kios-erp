"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { hasPermission, type Permission } from "@/shared/security/permissions";
import type { Role } from "@prisma/client";
import {
  DashboardIcon,
  KasirIcon,
  StokIcon,
  BarangMasukIcon,
  TransaksiIcon,
  KeuanganIcon,
  LaporanIcon,
} from "./nav-icons";

const PRIMARY_TABS: {
  href: string;
  label: string;
  permission: Permission;
  Icon: (props: { className?: string }) => React.ReactElement;
}[] = [
  { href: "/dashboard", label: "Dashboard", permission: "dashboard.view", Icon: DashboardIcon },
  { href: "/kasir", label: "Kasir", permission: "pos.operate", Icon: KasirIcon },
  { href: "/stok", label: "Stok Barang", permission: "inventory.view", Icon: StokIcon },
  { href: "/barang-masuk", label: "Barang Masuk", permission: "receiving.manage", Icon: BarangMasukIcon },
  { href: "/transaksi", label: "Transaksi", permission: "transactions.view", Icon: TransaksiIcon },
  { href: "/keuangan", label: "Keuangan", permission: "finance.manage", Icon: KeuanganIcon },
  { href: "/laporan", label: "Laporan", permission: "reports.view", Icon: LaporanIcon },
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

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

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
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            K
          </span>
          <span className="text-sm font-semibold text-gray-900">Kios-ERP</span>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-gray-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
              {initials(session?.user?.name)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-gray-900">
                {session?.user?.name ?? "..."}
              </span>
              <span className="block text-xs leading-tight text-gray-400">{session?.user?.role}</span>
            </span>
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 mt-1 w-52 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {visibleLinks.length > 0 && (
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Administrasi
                </p>
              )}
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
              <div className="my-1 border-t border-gray-100" />
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

      <nav
        className="flex gap-0.5 overflow-x-auto px-2 whitespace-nowrap"
        style={{ scrollbarWidth: "thin" }}
      >
        {visibleTabs.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex shrink-0 flex-col items-center gap-0.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                active
                  ? "border-blue-600 bg-blue-50/60 text-blue-600"
                  : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <tab.Icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
