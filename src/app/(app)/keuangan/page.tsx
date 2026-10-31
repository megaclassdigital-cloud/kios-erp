import { ShoppingCart, Package, PiggyBank, TrendingDown, Wallet, Banknote, CreditCard } from "lucide-react";
import { redirect } from "next/navigation";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";
import { prisma } from "@/shared/infrastructure/prisma";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { PageHeader } from "@/components/kios/page-header";
import { KpiCard } from "@/components/kios/kpi-card";
import { PeriodSelector } from "../laporan/period-selector";
import { resolvePeriod } from "../laporan/resolve-period";
import { ExportToolbar } from "../laporan/export-toolbar";
import { ExpenseForm } from "./expense-form";
import { ExpenseTable } from "./expense-table";
import Link from "next/link";
import { ListAssetsUseCase } from "@/modules/assets/application/asset-use-cases";

function formatRupiah(value: string) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

/**
 * The one place the money picture lives.
 *
 * The same seven figures used to appear here, on the dashboard, and again on
 * a Laporan tab, under three different sets of names — "Revenue" in one place
 * and "Penjualan Hari Ini" in another. The Laporan copy is gone and its period
 * selector moved here, so there is now one screen to look at and one set of
 * words for each number.
 */
export default async function KeuanganPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "finance.manage")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const period = resolvePeriod(params);

  const canSeeAssets = hasPermission(session.user.role, "assets.manage");
  const [summary, expenses, transactionCount, assets, expenseCount] = await Promise.all([
    new GetFinancialSummaryUseCase().execute(period.start, period.end),
    prisma.expense.findMany({
      where: { expenseDate: { gte: period.start, lte: period.end } },
      orderBy: { expenseDate: "desc" },
      include: { createdBy: { select: { name: true } } },
      take: 200,
    }),
    prisma.sale.count({
      where: { status: "PAID", paidAt: { gte: period.start, lte: period.end } },
    }),
    canSeeAssets ? new ListAssetsUseCase().execute() : Promise.resolve(null),
    prisma.expense.count({ where: { expenseDate: { gte: period.start, lte: period.end } } }),
  ]);

  // Named for a shopkeeper, not an accountant: "Revenue" and "HPP" meant
  // nothing on their own, and two profit lines sitting side by side with no
  // explanation of the difference raised more questions than they answered.
  const cards = [
    { label: "Omzet (Uang Masuk)", value: summary.revenue.toFixed(2), icon: ShoppingCart },
    { label: "Modal Barang Terjual", value: summary.cogs.toFixed(2), icon: Package },
    { label: "Untung Kotor", value: summary.grossProfit.toFixed(2), icon: PiggyBank, tone: "success" as const },
    { label: "Pengeluaran Toko", value: summary.expense.toFixed(2), icon: TrendingDown, tone: "warning" as const },
    { label: "Untung Bersih", value: summary.operationalProfit.toFixed(2), icon: Wallet, tone: "success" as const },
    { label: "Diterima Tunai", value: summary.cash.toFixed(2), icon: Banknote, tone: "success" as const },
    { label: "Diterima Non-Tunai", value: summary.cashless.toFixed(2), icon: CreditCard, tone: "info" as const },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Keuangan"
        description={`Omzet, pengeluaran, dan keuntungan toko — ${period.label}.`}
      />

      <div data-tour="period" className="flex flex-wrap items-center justify-between gap-2">
        <PeriodSelector basePath="/keuangan" active={period.key} />
        <ExportToolbar
          csvHref={`/api/reports/export?tab=keuangan&period=${period.key}${
            period.key === "custom" ? `&from=${params.from ?? ""}&to=${params.to ?? ""}` : ""
          }`}
        />
      </div>

      <div data-tour="kpi-grid" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <KpiCard key={c.label} label={c.label} value={formatRupiah(c.value)} icon={c.icon} tone={c.tone} />
        ))}
        <KpiCard label="Jumlah Transaksi" value={String(transactionCount)} icon={ShoppingCart} />
      </div>

      {/* Equipment is not part of any figure above: shown beside them so the two
          are never confused, with the way to the page that owns it. */}
      {assets && (
        <p data-tour="asset-note" className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground shadow-sm">
          <b className="text-foreground">Aset toko</b> (freezer, rak, timbangan, dan sejenisnya): {assets.summary.totalUnits} unit, nilai perolehan{" "}
          {formatRupiah(assets.summary.totalValue)}. Angka ini <b className="text-foreground">tidak termasuk</b> omzet, pengeluaran, maupun untung di atas.{" "}
          <Link href="/aset" className="font-medium text-primary hover:underline">Kelola di Aset Toko</Link>
        </p>
      )}

      <div data-tour="expense-form">
        <ExpenseForm />
      </div>

      <ExpenseTable
        expenses={expenses.map((e) => ({
          id: e.id,
          category: e.category,
          amount: e.amount.toString(),
          description: e.description,
          expenseDate: e.expenseDate.toISOString(),
          createdByName: e.createdBy.name,
        }))}
        total={expenseCount}
        assetCategories={assets?.categories.map((c) => c.name) ?? []}
        canMove={canSeeAssets}
      />
    </div>
  );
}
