import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { redirect } from "next/navigation";
import { resolvePeriod } from "./resolve-period";
import { PeriodSelector } from "./period-selector";
import { TabNav, type ReportTab } from "./tab-nav";
import { ExportToolbar } from "./export-toolbar";
import { PenjualanTab } from "./penjualan-tab";
import { ProdukTab } from "./produk-tab";
import { InventarisTab } from "./inventaris-tab";
import { KasirTab } from "./kasir-tab";

const VALID_TABS: ReportTab[] = ["penjualan", "produk", "inventaris", "kasir"];

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "reports.view")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const tab: ReportTab = VALID_TABS.includes(params.tab as ReportTab)
    ? (params.tab as ReportTab)
    : "penjualan";
  const period = resolvePeriod(params);

  const periodQuery = new URLSearchParams({
    period: period.key,
    ...(period.key === "custom" ? { from: params.from ?? "", to: params.to ?? "" } : {}),
  }).toString();

  const csvHref = `/api/reports/export?tab=${tab}&${periodQuery}`;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary-soft via-card to-card p-6 shadow-sm">
        <div className="pointer-events-none absolute -top-10 right-6 h-36 w-36 rounded-full bg-primary/10" />
        <div className="pointer-events-none absolute -bottom-16 right-28 h-28 w-28 rounded-full bg-info/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground md:text-2xl">Laporan</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pantau perkembangan usaha Anda dengan laporan yang lengkap dan akurat — {period.label}.
            </p>
          </div>
          <ExportToolbar csvHref={csvHref} />
        </div>
      </div>

      <PeriodSelector basePath="/laporan" active={period.key} extraParams={{ tab }} />
      <TabNav active={tab} periodQuery={periodQuery} />

      {tab === "penjualan" && <PenjualanTab start={period.start} end={period.end} />}
      {tab === "produk" && <ProdukTab start={period.start} end={period.end} />}
      {tab === "inventaris" && <InventarisTab start={period.start} end={period.end} />}
      {tab === "kasir" && <KasirTab start={period.start} end={period.end} />}
    </div>
  );
}
