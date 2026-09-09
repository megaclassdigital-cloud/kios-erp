"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { hasPermission, type Permission } from "@/shared/security/permissions";
import type { Role } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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

  const visibleTabs = role ? PRIMARY_TABS.filter((tab) => hasPermission(role, tab.permission)) : [];
  const visibleLinks = role ? SECONDARY_LINKS.filter((link) => hasPermission(role, link.permission)) : [];

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            K
          </span>
          <span className="text-sm font-semibold text-foreground">Kios-ERP</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 outline-none hover:bg-muted">
            <Avatar>
              <AvatarFallback>{initials(session?.user?.name)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-foreground">
                {session?.user?.name ?? "..."}
              </span>
              <span className="block text-xs leading-tight text-muted-foreground">{session?.user?.role}</span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {visibleLinks.length > 0 && <DropdownMenuLabel>Administrasi</DropdownMenuLabel>}
            {visibleLinks.map((link) => (
              <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
                {link.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
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
