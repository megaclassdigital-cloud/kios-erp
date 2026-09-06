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
}
