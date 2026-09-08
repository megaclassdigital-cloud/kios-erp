import { NextRequest, NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { prisma } from "@/shared/infrastructure/prisma";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";
import { resolvePeriod } from "@/app/(app)/laporan/resolve-period";

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\r\n");
}

/** PRD 54 export (CSV covers the "Excel/CSV" requirement — opens directly
 * in Excel). One query set per report tab, kept intentionally separate from
 * the on-screen tab components since the shapes (flat rows vs KPI cards)
 * don't share much beyond the date range. */
async function buildCsv(tab: string, start: Date, end: Date): Promise<{ filename: string; csv: string }> {
  if (tab === "produk") {
    const rows = await prisma.saleItem.groupBy({
      by: ["productId", "productNameSnapshot"],
      where: { sale: { status: "PAID", paidAt: { gte: start, lte: end } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
    });
    const csv = toCsv([
      ["Produk", "Qty Terjual", "Total"],
      ...rows.map((r) => [r.productNameSnapshot, Number(r._sum.quantity ?? 0), Number(r._sum.subtotal ?? 0)]),
    ]);
    return { filename: "laporan-produk.csv", csv };
  }

  if (tab === "inventaris") {
    const movements = await prisma.stockMovement.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true } } },
    });
    const csv = toCsv([
      ["Waktu", "Produk", "Tipe", "Qty"],
      ...movements.map((m) => [m.createdAt.toISOString(), m.product.name, m.movementType, Number(m.quantity)]),
    ]);
    return { filename: "laporan-inventaris.csv", csv };
  }

  if (tab === "kasir") {
    const perCashier = await prisma.sale.groupBy({
      by: ["cashierId"],
      where: { status: "PAID", paidAt: { gte: start, lte: end } },
      _sum: { grandTotal: true },
      _count: { id: true },
    });
    const cashiers = await prisma.user.findMany({
      where: { id: { in: perCashier.map((c) => c.cashierId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(cashiers.map((c) => [c.id, c.name]));
    const csv = toCsv([
      ["Kasir", "Jumlah Transaksi", "Revenue"],
      ...perCashier.map((c) => [nameById.get(c.cashierId) ?? "-", c._count.id, Number(c._sum.grandTotal ?? 0)]),
    ]);
    return { filename: "laporan-kasir.csv", csv };
  }

  const summary = await new GetFinancialSummaryUseCase().execute(start, end);
  const transactionCount = await prisma.sale.count({ where: { status: "PAID", paidAt: { gte: start, lte: end } } });
  const csv = toCsv([
    ["Metrik", "Nilai"],
    ["Revenue", summary.revenue.toFixed(2)],
    ["Jumlah Transaksi", transactionCount],
    ["Cash", summary.cash.toFixed(2)],
    ["Cashless", summary.cashless.toFixed(2)],
    ["HPP", summary.cogs.toFixed(2)],
    ["Laba Kotor", summary.grossProfit.toFixed(2)],
    ["Pengeluaran", summary.expense.toFixed(2)],
    ["Laba Operasional", summary.operationalProfit.toFixed(2)],
  ]);
  return { filename: "laporan-penjualan.csv", csv };
}

export async function GET(req: NextRequest) {
  try {
    await requireSession("reports.view");
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") ?? "penjualan";
    const period = resolvePeriod({
      period: searchParams.get("period") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    const { filename, csv } = await buildCsv(tab, period.start, period.end);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
