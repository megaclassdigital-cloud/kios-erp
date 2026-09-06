import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  CheckoutDomainService,
  InsufficientCashError,
} from "./checkout-domain-service";

describe("CheckoutDomainService", () => {
  const service = new CheckoutDomainService();

  it("computes subtotal and grand total for a cart (PRD acceptance example)", () => {
    const totals = service.computeTotals([
      {
        productId: "p1",
        productName: "Indomie Goreng",
        quantity: new Decimal(2),
        unitPrice: new Decimal("3500"),
        costPrice: new Decimal("2750"),
        trackInventory: true,
      },
    ]);
    expect(totals.subtotal.toString()).toBe("7000.00");
    expect(totals.grandTotal.toString()).toBe("7000.00");
  });

  it("computes correct change (PRD 16 example: total 78500, received 100000)", () => {
    const change = service.computeChange(new Decimal("100000"), (() => {
      const totals = service.computeTotals([
        {
          productId: "p1",
          productName: "x",
          quantity: new Decimal(1),
          unitPrice: new Decimal("78500"),
          costPrice: new Decimal("0"),
          trackInventory: true,
        },
      ]);
      return totals.grandTotal;
    })());
    expect(change.toString()).toBe("21500.00");
  });

  it("rejects insufficient cash", () => {
    const totals = service.computeTotals([
      {
        productId: "p1",
        productName: "x",
        quantity: new Decimal(1),
        unitPrice: new Decimal("10000"),
        costPrice: new Decimal("0"),
        trackInventory: true,
      },
    ]);
    expect(() => service.computeChange(new Decimal("5000"), totals.grandTotal)).toThrow(
      InsufficientCashError
    );
  });
});
