import { Prisma } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { FinanceReadRepository, FinancialAggregate, ProductBreakdownRow } from "../repository/finance-read-repository";

/** Revenue/cogs and cash/cashless are deliberately two separate queries
 * rather than one join: sale_items joined to sales would duplicate each
 * sale's grandTotal once per line item on a multi-item sale, silently
 * inflating the cash/cashless totals. Keeping them apart avoids that
 * fan-out entirely instead of trying to be clever with it. */
export class PrismaFinanceReadRepository implements FinanceReadRepository {
  constructor(private readonly db: Db) {}

  async productBreakdown(start: Date, end: Date, limit: number): Promise<ProductBreakdownRow[]> {
    return this.db.$queryRaw<ProductBreakdownRow[]>(Prisma.sql`
      SELECT si."productNameSnapshot" AS name,
             SUM(si.quantity)::text AS quantity,
             COALESCE(SUM(si.quantity * si."unitPriceAtSale" - si."discountAmount"), 0)::text AS revenue,
             COALESCE(SUM(si.quantity * si."costPriceAtSale"), 0)::text AS cogs
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      WHERE s.status = 'PAID' AND s."paidAt" >= ${start} AND s."paidAt" <= ${end}
      GROUP BY si."productId", si."productNameSnapshot"
      ORDER BY SUM(si.quantity * si."unitPriceAtSale" - si."discountAmount") DESC
      LIMIT ${limit}
    `);
  }

  async summary(start: Date, end: Date): Promise<FinancialAggregate> {
    const [revenueCogs, cashSplit, expenseTotal] = await Promise.all([
      this.db.$queryRaw<{ revenue: string; cogs: string }[]>(Prisma.sql`
        SELECT
          COALESCE(SUM(si.quantity * si."unitPriceAtSale" - si."discountAmount"), 0)::text AS revenue,
          COALESCE(SUM(si.quantity * si."costPriceAtSale"), 0)::text AS cogs
        FROM sale_items si
        JOIN sales s ON s.id = si."saleId"
        WHERE s.status = 'PAID' AND s."paidAt" >= ${start} AND s."paidAt" <= ${end}
      `),
      this.db.$queryRaw<{ cash: string; cashless: string }[]>(Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN "paymentMethod" = 'CASH' THEN "grandTotal" ELSE 0 END), 0)::text AS cash,
          COALESCE(SUM(CASE WHEN "paymentMethod" = 'CASHLESS' THEN "grandTotal" ELSE 0 END), 0)::text AS cashless
        FROM sales
        WHERE status = 'PAID' AND "paidAt" >= ${start} AND "paidAt" <= ${end}
      `),
      this.db.$queryRaw<{ total: string }[]>(Prisma.sql`
        SELECT COALESCE(SUM(amount), 0)::text AS total
        FROM expenses
        WHERE "expenseDate" >= ${start} AND "expenseDate" <= ${end}
      `),
    ]);

    return {
      revenue: revenueCogs[0]?.revenue ?? "0",
      cogs: revenueCogs[0]?.cogs ?? "0",
      cash: cashSplit[0]?.cash ?? "0",
      cashless: cashSplit[0]?.cashless ?? "0",
      expense: expenseTotal[0]?.total ?? "0",
    };
  }
}
