"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bell, LogOut, Search, ShoppingCart, Sun } from "lucide-react";
import { hasPermission, type Permission } from "@/shared/security/permissions";
import type { Role } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
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

/** Renders nothing until mounted so the server-rendered markup (which
 * can't know the visitor's clock) never mismatches the client's — the
 * date/time simply appears a moment after first paint instead. */
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  return (
    <div className="hidden items-center gap-2 lg:flex">
      <div className="text-right leading-tight">
        <p className="text-xs text-muted-foreground">
          {now.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
        </p>
        <p className="text-sm font-semibold text-foreground tabular-nums">
          {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <Sun className="h-5 w-5 shrink-0 text-warning" />
    </div>
  );
}

/** No notification backend exists yet — an honest empty state beats a
 * fake unread badge (PRD: never mock/hardcoded data). */
function NotificationBell() {
  return (
    <Popover>
      <PopoverTrigger className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground">
        <Bell className="h-5 w-5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="px-1 py-2 text-center text-sm text-muted-foreground">Tidak ada notifikasi baru.</p>
      </PopoverContent>
    </Popover>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/master/produk?search=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="hidden min-w-0 flex-1 max-w-md md:block">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari barang, transaksi, atau menu..."
          className="w-full rounded-lg border border-input bg-secondary py-2 pl-9 pr-3 text-sm outline-none focus:border-ring focus:bg-card"
        />
      </div>
    </form>
  );
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
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-bold text-foreground">Kios-ERP</span>
            <span className="block text-[11px] text-muted-foreground">Kelola usaha lebih mudah</span>
          </span>
        </div>

        <GlobalSearch />

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <NotificationBell />
          <LiveClock />

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
              {visibleLinks.length > 0 && (
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Administrasi</DropdownMenuLabel>
                  {visibleLinks.map((link) => (
                    <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
                      {link.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              )}
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
      </div>

      <nav
        className="flex gap-1 overflow-x-auto px-3 py-2 whitespace-nowrap"
        style={{ scrollbarWidth: "thin" }}
      >
        {visibleTabs.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <tab.Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
