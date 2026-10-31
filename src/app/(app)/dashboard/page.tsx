import { Wallet, Receipt, Banknote, CreditCard, TrendingDown, PiggyBank, PackageMinus, PackageX } from "lucide-react";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";
import Link from "next/link";
import { prisma } from "@/shared/infrastructure/prisma";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { KpiCard } from "@/components/kios/kpi-card";
import { KpiDetail, KpiLink, type DetailRow } from "@/components/kios/kpi-detail";
import { EmptyState } from "@/components/kios/empty-state";
import { resolvePeriod } from "../laporan/resolve-period";
import { SalesTrendWidget } from "./sales-trend-widget";
import { CashCashlessWidget } from "./cash-cashless-widget";
import { ExpenseWidget } from "./expense-widget";
import { TopProductsWidget } from "./top-products-widget";

/** Makes a whole dashboard widget a link, with a hint of where it goes. */
function WidgetLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} title={label} className="group block rounded-xl outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring">
      {children}
    </Link>
  );
}

function formatRupiah(value: string) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" });
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function greeting(hour: number) {
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

/** Fills every day in [start,end] with 0 so a quiet day still shows as a
 * bar, not a gap (PRD 10: sales trend over 7/30 days). */
function buildDailySeries(
  start: Date,
  end: Date,
  sales: { paidAt: Date | null; grandTotal: unknown }[]
) {
  const totals = new Map<string, number>();
  for (const sale of sales) {
    if (!sale.paidAt) continue;
    const key = dayKey(sale.paidAt);
    totals.set(key, (totals.get(key) ?? 0) + Number(sale.grandTotal));
  }
  const series: { label: string; value: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    series.push({ label: dayLabel(cursor), value: totals.get(dayKey(cursor)) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  const canMonitorShifts = session ? hasPermission(session.user.role, "shifts.monitor") : false;
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const now = new Date();
  const trend = resolvePeriod(await searchParams);

  const [summary, transactionCount, products, recentSales, openShifts, trendSales, expenseByCategory, topProductsToday, todaySales] =
    await Promise.all([
      new GetFinancialSummaryUseCase().execute(startOfDay, now),
      prisma.sale.count({ where: { status: "PAID", paidAt: { gte: startOfDay, lte: now } } }),
      prisma.product.findMany({
        where: { active: true, trackInventory: true },
        select: { id: true, name: true, currentStock: true, minimumStock: true },
      }),
      prisma.sale.findMany({
        where: { status: "PAID" },
        orderBy: { paidAt: "desc" },
        take: 8,
        select: { id: true, transactionNumber: true, grandTotal: true, paymentMethod: true, paidAt: true },
      }),
      canMonitorShifts
        ? prisma.cashierShift.findMany({
            where: { status: "OPEN" },
            orderBy: { openedAt: "desc" },
            include: { cashier: { select: { name: true } } },
          })
        : Promise.resolve([]),
      prisma.sale.findMany({
        where: { status: "PAID", paidAt: { gte: trend.start, lte: trend.end } },
        select: { paidAt: true, grandTotal: true },
      }),
      prisma.expense.groupBy({
        by: ["category"],
        where: { expenseDate: { gte: startOfDay, lte: now } },
        _sum: { amount: true },
      }),
      prisma.saleItem.groupBy({
        by: ["productId", "productNameSnapshot"],
        where: { sale: { status: "PAID", paidAt: { gte: startOfDay, lte: now } } },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { subtotal: "desc" } },
        take: 5,
      }),
      // Behind the day's sales cards; opening one must not be able to break the page.
      prisma.sale
        .findMany({
          where: { status: "PAID", paidAt: { gte: startOfDay, lte: now } },
          orderBy: { paidAt: "desc" },
          take: 100,
          select: { transactionNumber: true, paidAt: true, paymentMethod: true, grandTotal: true },
        })
        .catch(() => null),
    ]);

  const trendSeries = buildDailySeries(trend.start, trend.end, trendSales);

  const lowStock = products.filter(
    (p) => Number(p.currentStock) > 0 && Number(p.currentStock) <= p.minimumStock
  );
  const outOfStock = products.filter((p) => Number(p.currentStock) <= 0);

  const firstName = session?.user?.name?.split(" ")[0] ?? "Admin";

  const saleRows = (method?: "CASH" | "CASHLESS"): DetailRow[] =>
    (todaySales ?? [])
      .filter((s) => !method || s.paymentMethod === method)
      .map((s) => ({
        cells: [s.transactionNumber, (s.paidAt ?? now).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }), s.paymentMethod === "CASH" ? "Tunai" : "Non-tunai", formatRupiah(s.grandTotal.toString())],
      }));
  const saleColumns = [{ header: "No. Transaksi" }, { header: "Jam" }, { header: "Metode" }, { header: "Total", align: "right" as const }];
  const saleEmpty = todaySales ? "Belum ada transaksi hari ini." : "Rincian belum bisa dimuat. Muat ulang halaman untuk mencoba lagi.";
  const saleNote = todaySales && transactionCount > todaySales.length ? `Menampilkan ${todaySales.length} terbaru dari ${transactionCount} transaksi.` : undefined;
  const stockColumns = [{ header: "Produk" }, { header: "Stok", align: "right" as const }, { header: "Minimum", align: "right" as const }];
  const stockRows = (list: typeof products): DetailRow[] =>
    list.map((p) => ({ cells: [p.name, Number(p.currentStock).toLocaleString("id-ID"), String(p.minimumStock)] }));

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary-soft via-card to-card p-6 shadow-sm">
        <div className="pointer-events-none absolute -top-10 right-6 h-36 w-36 rounded-full bg-primary/10" />
        <div className="pointer-events-none absolute -bottom-16 right-28 h-28 w-28 rounded-full bg-info/10" />
        <div className="relative">
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            {greeting(now.getHours())}, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Semangat hari ini! Berikut ringkasan aktivitas toko Anda.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiDetail title="Omzet hari ini" description="Transaksi lunas hari ini." columns={saleColumns} rows={saleRows()} emptyText={saleEmpty} note={saleNote} footerHref="/transaksi" footerLabel="Buka Transaksi">
          <KpiCard interactive label="Omzet Hari Ini" value={formatRupiah(summary.revenue.toFixed(2))} icon={Wallet} />
        </KpiDetail>
        <KpiDetail title="Transaksi hari ini" description="Transaksi lunas hari ini." columns={saleColumns} rows={saleRows()} emptyText={saleEmpty} note={saleNote} footerHref="/transaksi" footerLabel="Buka Transaksi">
          <KpiCard interactive label="Transaksi Hari Ini" value={String(transactionCount)} icon={Receipt} />
        </KpiDetail>
        <KpiDetail title="Transaksi tunai hari ini" columns={saleColumns} rows={saleRows("CASH")} emptyText={todaySales ? "Belum ada transaksi tunai hari ini." : saleEmpty} note={saleNote} footerHref="/transaksi" footerLabel="Buka Transaksi">
          <KpiCard interactive label="Tunai Hari Ini" value={formatRupiah(summary.cash.toFixed(2))} icon={Banknote} tone="success" />
        </KpiDetail>
        <KpiDetail title="Transaksi non-tunai hari ini" columns={saleColumns} rows={saleRows("CASHLESS")} emptyText={todaySales ? "Belum ada transaksi non-tunai hari ini." : saleEmpty} note={saleNote} footerHref="/transaksi" footerLabel="Buka Transaksi">
          <KpiCard interactive label="Non-Tunai Hari Ini" value={formatRupiah(summary.cashless.toFixed(2))} icon={CreditCard} tone="info" />
        </KpiDetail>
        <KpiLink href="/keuangan#pengeluaran">
          <KpiCard interactive label="Pengeluaran Toko" value={formatRupiah(summary.expense.toFixed(2))} icon={TrendingDown} tone="warning" />
        </KpiLink>
        <KpiLink href="/keuangan">
          <KpiCard interactive label="Untung Kotor" value={formatRupiah(summary.grossProfit.toFixed(2))} icon={PiggyBank} tone="success" />
        </KpiLink>
        <KpiDetail title="Stok menipis" description="Stok di bawah atau sama dengan batas minimum." columns={stockColumns} rows={stockRows(lowStock)} emptyText="Tidak ada stok yang menipis." footerHref="/barang-masuk" footerLabel="Buka Barang Masuk">
          <KpiCard interactive label="Stok Menipis" value={String(lowStock.length)} icon={PackageMinus} tone="warning" />
        </KpiDetail>
        <KpiDetail title="Stok habis" description="Stok sudah nol." columns={stockColumns} rows={stockRows(outOfStock)} emptyText="Tidak ada stok yang habis." footerHref="/barang-masuk" footerLabel="Buka Barang Masuk">
          <KpiCard interactive label="Stok Habis" value={String(outOfStock.length)} icon={PackageX} tone="destructive" />
        </KpiDetail>
      </div>

      <SalesTrendWidget activePeriod={trend.key} series={trendSeries} />

      <div className="grid gap-4 md:grid-cols-3">
        <WidgetLink href="/keuangan" label="Lihat Keuangan"><CashCashlessWidget cash={Number(summary.cash)} cashless={Number(summary.cashless)} /></WidgetLink>
        <WidgetLink href="/keuangan#pengeluaran" label="Lihat pengeluaran"><ExpenseWidget
          items={expenseByCategory.map((e) => ({
            category: e.category,
            total: Number(e._sum.amount ?? 0),
          }))}
        /></WidgetLink>
        <WidgetLink href="/laporan?tab=produk" label="Lihat laporan produk"><TopProductsWidget
          items={topProductsToday.map((p) => ({
            productId: p.productId,
            name: p.productNameSnapshot,
            qty: Number(p._sum.quantity ?? 0),
            total: Number(p._sum.subtotal ?? 0),
          }))}
        /></WidgetLink>
      </div>

      {canMonitorShifts && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Shift Kasir Aktif (Monitoring)</h2>
          {openShifts.length === 0 ? (
            <EmptyState title="Tidak ada shift kasir yang sedang berjalan." />
          ) : (
            <ul className="space-y-2 text-sm">
              {openShifts.map((shift) => (
                <li key={shift.id} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
                  <span className="min-w-0 break-words text-foreground">{shift.cashier.name}</span>
                  <span className="text-muted-foreground">
                    Sejak {shift.openedAt.toLocaleTimeString("id-ID")} · Modal{" "}
                    {formatRupiah(shift.openingCash.toString())}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Stok Menipis / Habis</h2>
          {lowStock.length + outOfStock.length === 0 ? (
            <EmptyState title="Tidak ada produk dengan stok menipis." />
          ) : (
            <ul className="space-y-2 text-sm">
              {[...outOfStock, ...lowStock].slice(0, 8).map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate text-foreground">{p.name}</span>
                  <span
                    className={
                      "shrink-0 " +
                      (Number(p.currentStock) <= 0 ? "font-medium text-destructive" : "font-medium text-warning-foreground")
                    }
                  >
                    {Number(p.currentStock)} / min {p.minimumStock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Transaksi Terbaru</h2>
          {recentSales.length === 0 ? (
            <EmptyState title="Belum ada transaksi." />
          ) : (
            <ul className="space-y-2 text-sm">
              {recentSales.map((s) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate text-foreground">{s.transactionNumber}</span>
                  <span className="shrink-0 text-foreground tabular-nums">{formatRupiah(s.grandTotal.toString())}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
