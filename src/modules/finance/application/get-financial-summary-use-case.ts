import Decimal from "decimal.js";
import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaFinanceReadRepository } from "../infrastructure/prisma-finance-read-repository";
import { ProfitService } from "../domain/profit-service";

/** Drives PRD 52 (financial summary) and PRD 10 KPI cards from the same
 * source-of-truth snapshots — no duplicated math between dashboard and
 * reports. The database sums revenue/cogs/cash/cashless/expense directly
 * (SUM/GROUP BY) instead of this use case pulling every sale item, sale,
 * and expense row for the period into Node just to add them up. */
export class GetFinancialSummaryUseCase {
  async execute(start: Date, end: Date) {
    const financeReads = new PrismaFinanceReadRepository(prisma);
    const aggregate = await financeReads.summary(start, end);

    const profitService = new ProfitService();
    return profitService.summarizeAggregates({
      revenue: new Decimal(aggregate.revenue),
      cogs: new Decimal(aggregate.cogs),
      cash: new Decimal(aggregate.cash),
      cashless: new Decimal(aggregate.cashless),
      expense: new Decimal(aggregate.expense),
    });
  }
}
