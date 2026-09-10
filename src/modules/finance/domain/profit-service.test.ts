import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { ProfitService } from "./profit-service";

describe("ProfitService", () => {
  it("computes HPP and gross profit from sale-item snapshots (PRD 51 example)", () => {
    const service = new ProfitService();
    const summary = service.summarize(
      [
        {
          quantity: new Decimal(2),
          unitPriceAtSale: new Decimal("3500"),
          costPriceAtSale: new Decimal("2750"),
        },
      ],
      new Decimal("7000"),
      new Decimal(0),
      new Decimal(0)
    );
    expect(summary.revenue.toString()).toBe("7000");
    expect(summary.cogs.toString()).toBe("5500");
    expect(summary.grossProfit.toString()).toBe("1500");
  });

  it("is unaffected by a later purchase price change (uses snapshot, not current price)", () => {
    const service = new ProfitService();
    // Snapshot at time of sale — a later change to the product's current
    // purchasePrice must never be re-read here (PRD 51-52).
    const summary = service.summarize(
      [{ quantity: new Decimal(1), unitPriceAtSale: new Decimal("3500"), costPriceAtSale: new Decimal("2750") }],
      new Decimal("3500"),
      new Decimal(0),
      new Decimal(0)
    );
    expect(summary.cogs.toString()).toBe("2750");
  });

  it("subtracts expenses to reach operational profit", () => {
    const service = new ProfitService();
    const summary = service.summarize(
      [{ quantity: new Decimal(1), unitPriceAtSale: new Decimal("10000"), costPriceAtSale: new Decimal("6000") }],
      new Decimal("10000"),
      new Decimal(0),
      new Decimal("1000")
    );
    expect(summary.grossProfit.toString()).toBe("4000");
    expect(summary.operationalProfit.toString()).toBe("3000");
  });

  it("summarizeAggregates matches summarize's math for pre-summed totals (DB-aggregation path)", () => {
    const service = new ProfitService();
    const fromItems = service.summarize(
      [
        { quantity: new Decimal(2), unitPriceAtSale: new Decimal("3500"), costPriceAtSale: new Decimal("2750") },
        { quantity: new Decimal(1), unitPriceAtSale: new Decimal("10000"), costPriceAtSale: new Decimal("6000") },
      ],
      new Decimal("7000"),
      new Decimal("10000"),
      new Decimal("1000")
    );
    const fromAggregate = service.summarizeAggregates({
      revenue: new Decimal("17000"),
      cogs: new Decimal("11500"),
      cash: new Decimal("7000"),
      cashless: new Decimal("10000"),
      expense: new Decimal("1000"),
    });
    expect(fromAggregate.revenue.toString()).toBe(fromItems.revenue.toString());
    expect(fromAggregate.cogs.toString()).toBe(fromItems.cogs.toString());
    expect(fromAggregate.grossProfit.toString()).toBe(fromItems.grossProfit.toString());
    expect(fromAggregate.operationalProfit.toString()).toBe(fromItems.operationalProfit.toString());
  });
});
