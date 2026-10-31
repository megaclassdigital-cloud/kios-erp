import { ShoppingCart, Package, PiggyBank, TrendingDown, Wallet, Banknote, CreditCard } from "lucide-react";
import { redirect } from "next/navigation";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";
import { prisma } from "@/shared/infrastructure/prisma";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { PageHeader } from "@/components/kios/page-header";
import { KpiCard } from "@/components/kios/kpi-card";
import { KpiDetail, KpiLink, type DetailRow } from "@/components/kios/kpi-detail";
import { PrismaFinanceReadRepository } from "@/modules/finance/infrastructure/prisma-finance-read-repository";
import { PeriodSelector } from "../laporan/period-selector";
import { resolvePeriod } from "../laporan/resolve-period";
import { ExportToolbar } from "../laporan/export-toolbar";
import { ExpenseForm } from "./expense-form";
import { FinanceSlipButton } from "./finance-slip-button";
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
  const [summary, expenses, transactionCount, assets, expenseCount, sales, breakdown] = await Promise.all([
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
    // The sales behind the cards, newest first. Only for opening a card's detail,
    // so a failure must not take the page down.
    prisma.sale
      .findMany({
        where: { status: "PAID", paidAt: { gte: period.start, lte: period.end } },
        orderBy: { paidAt: "desc" },
        take: 100,
        select: { transactionNumber: true, paidAt: true, paymentMethod: true, grandTotal: true, cashier: { select: { name: true } } },
      })
      .catch(() => null),
    new PrismaFinanceReadRepository(prisma).productBreakdown(period.start, period.end, 100).catch(() => null),
  ]);

  const saleRows = (method?: "CASH" | "CASHLESS"): DetailRow[] =>
    (sales ?? [])
      .filter((s) => !method || s.paymentMethod === method)
      .map((s) => ({
        cells: [s.transactionNumber, (s.paidAt ?? new Date()).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), s.cashier.name, s.paymentMethod === "CASH" ? "Tunai" : "Non-tunai", formatRupiah(s.grandTotal.toString())],
      }));
  const saleColumns = [{ header: "No. Transaksi" }, { header: "Waktu" }, { header: "Kasir" }, { header: "Metode" }, { header: "Total", align: "right" as const }];
  const salesNote = sales && transactionCount > sales.length ? `Menampilkan ${sales.length} terbaru dari ${transactionCount} transaksi.` : undefined;
  const productRows = (by: "revenue" | "cogs" | "profit"): DetailRow[] =>
    [...(breakdown ?? [])]
      .map((p) => ({ ...p, profit: Number(p.revenue) - Number(p.cogs) }))
      .sort((a, b) => Number(b[by]) - Number(a[by]))
      .map((p) => ({ cells: [p.name, Number(p.quantity).toLocaleString("id-ID"), formatRupiah(p.revenue), formatRupiah(p.cogs), formatRupiah(String(p.profit))] }));
  const productColumns = [{ header: "Produk" }, { header: "Terjual", align: "right" as const }, { header: "Omzet", align: "right" as const }, { header: "Modal", align: "right" as const }, { header: "Untung", align: "right" as const }];
  const productNote = breakdown && breakdown.length >= 100 ? "Menampilkan 100 produk dengan omzet terbesar." : undefined;
  const formula: DetailRow[] = [
    { cells: ["Omzet (uang masuk dari penjualan)", formatRupiah(summary.revenue.toFixed(2))] },
    { cells: ["− Modal barang terjual", formatRupiah(summary.cogs.toFixed(2))] },
    { cells: ["= Untung kotor", formatRupiah(summary.grossProfit.toFixed(2))], bold: true },
    { cells: ["− Pengeluaran toko", formatRupiah(summary.expense.toFixed(2))] },
    { cells: ["= Untung bersih", formatRupiah(summary.operationalProfit.toFixed(2))], bold: true },
  ];

  /** Wraps each card in what clicking it shows. */
  function interactive(label: string, card: React.ReactNode): React.ReactNode {
    const unavailable = "Rincian belum bisa dimuat. Muat ulang halaman untuk mencoba lagi.";
    switch (label) {
      case "Omzet (Uang Masuk)":
        return <KpiDetail title="Transaksi yang membentuk omzet" description={period.label} columns={saleColumns} rows={saleRows()} emptyText={sales ? "Belum ada transaksi pada periode ini." : unavailable} note={salesNote} footerHref="/transaksi" footerLabel="Buka Transaksi">{card}</KpiDetail>;
      case "Diterima Tunai":
        return <KpiDetail title="Transaksi tunai" description={period.label} columns={saleColumns} rows={saleRows("CASH")} emptyText={sales ? "Belum ada transaksi tunai pada periode ini." : unavailable} note={salesNote} footerHref="/transaksi" footerLabel="Buka Transaksi">{card}</KpiDetail>;
      case "Diterima Non-Tunai":
        return <KpiDetail title="Transaksi non-tunai" description={period.label} columns={saleColumns} rows={saleRows("CASHLESS")} emptyText={sales ? "Belum ada transaksi non-tunai pada periode ini." : unavailable} note={salesNote} footerHref="/transaksi" footerLabel="Buka Transaksi">{card}</KpiDetail>;
      case "Modal Barang Terjual":
        return <KpiDetail title="Modal barang terjual per produk" description={`${period.label} — modal dari harga beli saat barang terjual.`} columns={productColumns} rows={productRows("cogs")} emptyText={breakdown ? "Belum ada penjualan pada periode ini." : unavailable} note={productNote}>{card}</KpiDetail>;
      case "Untung Kotor":
        return <KpiDetail title="Untung kotor per produk" description={`${period.label} — omzet dikurangi modal, setelah promo.`} columns={productColumns} rows={productRows("profit")} emptyText={breakdown ? "Belum ada penjualan pada periode ini." : unavailable} note={productNote}>{card}</KpiDetail>;
      case "Pengeluaran Toko":
        return <KpiLink href="#pengeluaran">{card}</KpiLink>;
      case "Untung Bersih":
        return <KpiDetail title="Cara menghitung untung bersih" description={period.label} columns={[{ header: "Komponen" }, { header: "Jumlah", align: "right" }]} rows={formula} footerHref="/aset" footerLabel="Aset toko tidak termasuk hitungan ini">{card}</KpiDetail>;
      default:
        return card;
    }
  }

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
        <div data-tour="print-slip" className="flex flex-wrap items-center gap-2">
        <FinanceSlipButton
          title="Ringkasan Keuangan"
          periodLabel={period.label}
          lines={[
            ...cards.map((c) => ({ label: c.label, value: formatRupiah(c.value), bold: c.label === "Untung Bersih" })),
            { label: "Jumlah Transaksi", value: String(transactionCount) },
          ]}
        />
        <ExportToolbar
          csvHref={`/api/reports/export?tab=keuangan&period=${period.key}${
            period.key === "custom" ? `&from=${params.from ?? ""}&to=${params.to ?? ""}` : ""
          }`}
        />
        </div>
      </div>

      <div data-tour="kpi-grid" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label}>
            {interactive(c.label, <KpiCard interactive label={c.label} value={formatRupiah(c.value)} icon={c.icon} tone={c.tone} />)}
          </div>
        ))}
        <KpiLink href="/transaksi">
          <KpiCard interactive label="Jumlah Transaksi" value={String(transactionCount)} icon={ShoppingCart} />
        </KpiLink>
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
