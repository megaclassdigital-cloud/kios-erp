import Decimal from "decimal.js";
import { prisma } from "@/shared/infrastructure/prisma";
import { ProfitService } from "../domain/profit-service";

/** Drives PRD 52 (financial summary) and PRD 10 KPI cards from the same
 * source-of-truth snapshots — no duplicated math between dashboard and
 * reports. */
export class GetFinancialSummaryUseCase {
  async execute(start: Date, end: Date) {
    const [saleItems, sales, expenses] = await Promise.all([
      prisma.saleItem.findMany({
        where: { sale: { status: "PAID", paidAt: { gte: start, lte: end } } },
        select: { quantity: true, unitPriceAtSale: true, costPriceAtSale: true },
      }),
      prisma.sale.findMany({
        where: { status: "PAID", paidAt: { gte: start, lte: end } },
        select: { paymentMethod: true, grandTotal: true },
      }),
      prisma.expense.findMany({
        where: { expenseDate: { gte: start, lte: end } },
        select: { amount: true },
      }),
    ]);

    const cash = sales
      .filter((s) => s.paymentMethod === "CASH")
      .reduce((acc, s) => acc.plus(s.grandTotal.toString()), new Decimal(0));
    const cashless = sales
      .filter((s) => s.paymentMethod === "CASHLESS")
      .reduce((acc, s) => acc.plus(s.grandTotal.toString()), new Decimal(0));
    const totalExpense = expenses.reduce(
      (acc, e) => acc.plus(e.amount.toString()),
      new Decimal(0)
    );

    const profitService = new ProfitService();
    return profitService.summarize(
      saleItems.map((i) => ({
        quantity: new Decimal(i.quantity.toString()),
        unitPriceAtSale: new Decimal(i.unitPriceAtSale.toString()),
        costPriceAtSale: new Decimal(i.costPriceAtSale.toString()),
      })),
      cash,
      cashless,
      totalExpense
    );
  }
}
