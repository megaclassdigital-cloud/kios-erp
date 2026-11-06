import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { buildConsignorPositions, cleanDropLines, cleanPayment, cleanReturnQuantity, InvalidConsignmentError, returnableUnits } from "./consignment";

describe("cleanDropLines", () => {
  it("accepts quantities and prices, tidying them", () => {
    expect(cleanDropLines([{ productId: "p1", quantity: "10", unitCost: "2500" }])).toEqual([{ productId: "p1", quantity: "10", unitCost: "2500.00" }]);
  });

  it("rejects an empty drop, a repeated product, bad quantities and bad prices", () => {
    const one = { productId: "p1", quantity: "1", unitCost: "100" };
    expect(() => cleanDropLines([])).toThrow(/minimal satu/);
    expect(() => cleanDropLines([one, one])).toThrow(/dua kali/);
    expect(() => cleanDropLines([{ ...one, quantity: "0" }])).toThrow(/lebih dari 0/);
    expect(() => cleanDropLines([{ ...one, quantity: "1.2345" }])).toThrow(/3 angka/);
    expect(() => cleanDropLines([{ ...one, quantity: "abc" }])).toThrow(InvalidConsignmentError);
    expect(() => cleanDropLines([{ ...one, unitCost: "-1" }])).toThrow(/negatif/);
    expect(() => cleanDropLines([{ ...one, unitCost: "1.234" }])).toThrow(/2 angka/);
  });
});

describe("returns and payments", () => {
  it("only what is still on the shelf and not yet returned can go back", () => {
    expect(returnableUnits({ quantity: "20", quantityReturned: "5" }, "12").toString()).toBe("12"); // 15 not returned, 12 left
    expect(returnableUnits({ quantity: "20", quantityReturned: "5" }, "40").toString()).toBe("15");
    expect(returnableUnits({ quantity: "20", quantityReturned: "20" }, "9").toString()).toBe("0");
  });

  it("refuses to return more than that, with the number in the message", () => {
    expect(cleanReturnQuantity("5", new Decimal(12))).toBe("5");
    expect(() => cleanReturnQuantity("13", new Decimal(12))).toThrow(/Hanya 12 unit/);
    expect(() => cleanReturnQuantity("0", new Decimal(12))).toThrow(/lebih dari 0/);
  });

  it("refuses to pay more than is owed", () => {
    expect(cleanPayment("50000", "75000.00")).toBe("50000.00");
    expect(cleanPayment("75000", "75000.00")).toBe("75000.00");
    expect(() => cleanPayment("75001", "75000.00")).toThrow(/melebihi utang/);
    expect(() => cleanPayment("-5", "75000.00")).toThrow(/lebih dari 0/);
  });
});

describe("buildConsignorPositions", () => {
  const t = (d: string) => new Date(d);
  const base = {
    consignors: [{ id: "c1", name: "Sales Roti" }, { id: "c2", name: "Sales Snack" }],
    products: [
      { id: "p1", name: "Roti Tawar", consignorId: "c1", currentStock: "6" },
      { id: "p2", name: "Keripik", consignorId: "c2", currentStock: "10" },
    ],
    items: [
      { productId: "p1", consignorId: "c1", quantity: "20", quantityReturned: "4", unitCost: "9000", droppedAt: t("2026-11-01T01:00:00Z") },
      { productId: "p2", consignorId: "c2", quantity: "10", quantityReturned: "0", unitCost: "1000", droppedAt: t("2026-11-02T01:00:00Z") },
    ],
    saleLines: [
      { productId: "p1", quantity: "6", costPriceAtSale: "9000", paidAt: t("2026-11-03T03:00:00Z") },
      { productId: "p1", quantity: "4", costPriceAtSale: "9000", paidAt: t("2026-11-04T03:00:00Z") },
      // Before the first drop-off: the shop's own earlier stock, not owed to anyone.
      { productId: "p1", quantity: "50", costPriceAtSale: "8000", paidAt: t("2026-10-20T03:00:00Z") },
    ],
    payments: [{ consignorId: "c1", amount: "30000" }],
  };

  it("owes only for what sold, at the price on each sale, less what was paid", () => {
    const [roti, snack] = buildConsignorPositions(base);
    expect(roti).toMatchObject({ receivedUnits: "20", returnedUnits: "4", soldUnits: "10", onHandUnits: "6", soldCost: "90000.00", paid: "30000.00", balance: "60000.00" });
    expect(snack).toMatchObject({ soldUnits: "0", soldCost: "0.00", balance: "0.00", onHandUnits: "10" });
  });

  it("reconciles: received - returned - sold = on hand (for this example)", () => {
    const [roti] = buildConsignorPositions(base);
    expect(Number(roti.receivedUnits) - Number(roti.returnedUnits) - Number(roti.soldUnits)).toBe(Number(roti.onHandUnits));
  });

  it("shows a negative balance when the shop has paid ahead", () => {
    const [roti] = buildConsignorPositions({ ...base, payments: [{ consignorId: "c1", amount: "100000" }] });
    expect(roti.balance).toBe("-10000.00");
  });

  it("lists the biggest debt first within a consignor and ignores another consignor's payments", () => {
    const [roti] = buildConsignorPositions({
      ...base,
      products: [...base.products, { id: "p3", name: "Donat", consignorId: "c1", currentStock: "0" }],
      items: [...base.items, { productId: "p3", consignorId: "c1", quantity: "5", quantityReturned: "0", unitCost: "5000", droppedAt: t("2026-11-01T01:00:00Z") }],
      saleLines: [...base.saleLines, { productId: "p3", quantity: "5", costPriceAtSale: "5000", paidAt: t("2026-11-05T01:00:00Z") }],
      payments: [...base.payments, { consignorId: "c2", amount: "999" }],
    });
    expect(roti.products.map((p) => p.name)).toEqual(["Roti Tawar", "Donat"]);
    expect(roti.paid).toBe("30000.00");
  });
});
