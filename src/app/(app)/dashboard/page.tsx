import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";
import { prisma } from "@/shared/infrastructure/prisma";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { resolvePeriod } from "../laporan/resolve-period";
import { SalesTrendWidget } from "./sales-trend-widget";
import { CashCashlessWidget } from "./cash-cashless-widget";
import { ExpenseWidget } from "./expense-widget";
import { TopProductsWidget } from "./top-products-widget";

function formatRupiah(value: string) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" });
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
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

  const [summary, transactionCount, products, recentSales, openShifts, trendSales, expenseByCategory, topProductsToday] =
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
    ]);

  const trendSeries = buildDailySeries(trend.start, trend.end, trendSales);

  const lowStock = products.filter(
    (p) => Number(p.currentStock) > 0 && Number(p.currentStock) <= p.minimumStock
  );
  const outOfStock = products.filter((p) => Number(p.currentStock) <= 0);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Penjualan Hari Ini" value={formatRupiah(summary.revenue.toFixed(2))} />
        <Kpi label="Transaksi Hari Ini" value={String(transactionCount)} />
        <Kpi label="Cash Hari Ini" value={formatRupiah(summary.cash.toFixed(2))} />
        <Kpi label="Cashless Hari Ini" value={formatRupiah(summary.cashless.toFixed(2))} />
        <Kpi label="Pengeluaran Hari Ini" value={formatRupiah(summary.expense.toFixed(2))} />
        <Kpi label="Laba Kotor" value={formatRupiah(summary.grossProfit.toFixed(2))} />
        <Kpi label="Stok Menipis" value={String(lowStock.length)} />
        <Kpi label="Stok Habis" value={String(outOfStock.length)} />
      </div>

      <SalesTrendWidget activePeriod={trend.key} series={trendSeries} />

      <div className="grid gap-4 md:grid-cols-3">
        <CashCashlessWidget cash={Number(summary.cash)} cashless={Number(summary.cashless)} />
        <ExpenseWidget
          items={expenseByCategory.map((e) => ({
            category: e.category,
            total: Number(e._sum.amount ?? 0),
          }))}
        />
        <TopProductsWidget
          items={topProductsToday.map((p) => ({
            productId: p.productId,
            name: p.productNameSnapshot,
            qty: Number(p._sum.quantity ?? 0),
            total: Number(p._sum.subtotal ?? 0),
          }))}
        />
      </div>

      {canMonitorShifts && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Shift Kasir Aktif (Monitoring)</h2>
          {openShifts.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada shift kasir yang sedang berjalan.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {openShifts.map((shift) => (
                <li key={shift.id} className="flex justify-between">
                  <span className="text-gray-700">{shift.cashier.name}</span>
                  <span className="text-gray-500">
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
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Stok Menipis / Habis</h2>
          {lowStock.length + outOfStock.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada produk dengan stok menipis.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {[...outOfStock, ...lowStock].slice(0, 8).map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span className="text-gray-700">{p.name}</span>
                  <span
                    className={
                      Number(p.currentStock) <= 0 ? "font-medium text-red-600" : "font-medium text-amber-600"
                    }
                  >
                    {Number(p.currentStock)} / min {p.minimumStock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Transaksi Terbaru</h2>
          {recentSales.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada transaksi.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentSales.map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span className="text-gray-700">{s.transactionNumber}</span>
                  <span className="text-gray-900">{formatRupiah(s.grandTotal.toString())}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
