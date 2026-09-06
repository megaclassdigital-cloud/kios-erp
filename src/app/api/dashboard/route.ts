import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/shared/security/require-session";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";
import { prisma } from "@/shared/infrastructure/prisma";

/** Dashboard KPI aggregation (PRD 10) — always reads live DB data, no
 * hardcoded/dummy values in this route. */
export async function GET() {
  try {
    await requireSession("dashboard.view");

    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const now = new Date();

    const [summary, transactionCount, products, recentSales] = await Promise.all([
      new GetFinancialSummaryUseCase().execute(startOfDay, now),
      prisma.sale.count({ where: { status: "PAID", paidAt: { gte: startOfDay, lte: now } } }),
      prisma.product.findMany({
        where: { active: true, trackInventory: true },
        select: { id: true, name: true, currentStock: true, minimumStock: true },
      }),
      prisma.sale.findMany({
        where: { status: "PAID" },
        orderBy: { paidAt: "desc" },
        take: 10,
        select: {
          id: true,
          transactionNumber: true,
          grandTotal: true,
          paymentMethod: true,
          paidAt: true,
        },
      }),
    ]);

    const lowStock = products.filter(
      (p) => Number(p.currentStock) > 0 && Number(p.currentStock) <= p.minimumStock
    );
    const outOfStock = products.filter((p) => Number(p.currentStock) <= 0);

    return NextResponse.json({
      salesToday: summary.revenue.toFixed(2),
      transactionCountToday: transactionCount,
      cashToday: summary.cash.toFixed(2),
      cashlessToday: summary.cashless.toFixed(2),
      expenseToday: summary.expense.toFixed(2),
      grossProfitToday: summary.grossProfit.toFixed(2),
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      lowStockProducts: lowStock.slice(0, 10),
      recentTransactions: recentSales,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
