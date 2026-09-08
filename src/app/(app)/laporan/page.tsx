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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-gray-900">
          Laporan <span className="text-sm font-normal text-gray-500">({period.label})</span>
        </h1>
        <ExportToolbar csvHref={csvHref} />
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
