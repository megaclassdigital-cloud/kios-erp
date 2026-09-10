import Decimal from "decimal.js";

export interface FinancialSummary {
  revenue: Decimal;
  cogs: Decimal;
  grossProfit: Decimal;
  expense: Decimal;
  operationalProfit: Decimal;
  cash: Decimal;
  cashless: Decimal;
}

/** HPP/profit math driven entirely by stored sale-item snapshots — never
 * by re-reading the current product price (PRD 51-52). */
export class ProfitService {
  summarize(
    saleItems: { quantity: Decimal; unitPriceAtSale: Decimal; costPriceAtSale: Decimal }[],
    cashRevenue: Decimal,
    cashlessRevenue: Decimal,
    totalExpense: Decimal
  ): FinancialSummary {
    const revenue = saleItems.reduce(
      (acc, i) => acc.plus(i.unitPriceAtSale.times(i.quantity)),
      new Decimal(0)
    );
    const cogs = saleItems.reduce(
      (acc, i) => acc.plus(i.costPriceAtSale.times(i.quantity)),
      new Decimal(0)
    );
    const grossProfit = revenue.minus(cogs);
    const operationalProfit = grossProfit.minus(totalExpense);

    return {
      revenue,
      cogs,
      grossProfit,
      expense: totalExpense,
      operationalProfit,
      cash: cashRevenue,
      cashless: cashlessRevenue,
    };
  }

  /** Same grossProfit/operationalProfit derivation as summarize(), but
   * for callers that already have revenue/cogs/cash/cashless/expense as
   * pre-summed totals (e.g. computed by the database) instead of raw
   * sale-item rows to reduce over. */
  summarizeAggregates(input: {
    revenue: Decimal;
    cogs: Decimal;
    cash: Decimal;
    cashless: Decimal;
    expense: Decimal;
  }): FinancialSummary {
    const grossProfit = input.revenue.minus(input.cogs);
    const operationalProfit = grossProfit.minus(input.expense);
    return {
      revenue: input.revenue,
      cogs: input.cogs,
      grossProfit,
      expense: input.expense,
      operationalProfit,
      cash: input.cash,
      cashless: input.cashless,
    };
  }
}
