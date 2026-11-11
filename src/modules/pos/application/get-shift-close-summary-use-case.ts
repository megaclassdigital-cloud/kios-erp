import { prisma } from "@/shared/infrastructure/prisma";
import { endOfWibDay, startOfWibDay } from "@/shared/format/wib";
import { PrismaFinanceReadRepository } from "@/modules/finance/infrastructure/prisma-finance-read-repository";
import { PrismaShiftRepository } from "../infrastructure/prisma-shift-repository";
import { buildShiftCloseSummary, type ShiftCloseSummary } from "../domain/shift-close-summary";

/** The takings screen shown right after a shift is closed. Same figures, from
 * the same sale snapshots, as the Keuangan page for "Hari Ini". */
export class GetShiftCloseSummaryUseCase {
  async execute(shiftId: string, now = new Date()): Promise<ShiftCloseSummary> {
    const finance = new PrismaFinanceReadRepository(prisma);
    const start = startOfWibDay(now);
    const end = endOfWibDay(now);
    const [shift, shiftCash, day, dayCount] = await Promise.all([
      finance.shiftTotals(shiftId),
      new PrismaShiftRepository(prisma).sumSalesForShift(shiftId),
      finance.summary(start, end),
      prisma.sale.count({ where: { status: "PAID", paidAt: { gte: start, lte: end } } }),
    ]);
    return buildShiftCloseSummary({
      shift: { ...shift, cash: shiftCash.cash, cashless: shiftCash.cashless },
      day: { revenue: day.revenue, cogs: day.cogs, transactions: dayCount, cash: day.cash, cashless: day.cashless },
      dayExpense: day.expense,
    });
  }
}
