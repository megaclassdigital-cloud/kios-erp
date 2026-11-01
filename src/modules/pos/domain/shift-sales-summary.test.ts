import { describe, expect, it } from "vitest";
import { summarizeShiftSales, type ShiftSaleLike } from "./shift-sales-summary";

const sale = (over: Partial<ShiftSaleLike>): ShiftSaleLike => ({ status: "PAID", paymentMethod: "CASH", grandTotal: "10000", items: [{ quantity: "2" }], ...over });

describe("summarizeShiftSales", () => {
  it("adds up paid sales by method and counts the units", () => {
    const s = summarizeShiftSales([
      sale({}),
      sale({ paymentMethod: "CASHLESS", grandTotal: "25000", items: [{ quantity: "1" }, { quantity: "1.5" }] }),
    ]);
    expect(s).toMatchObject({ paidCount: 2, paidTotal: "35000.00", cashTotal: "10000.00", cashlessTotal: "25000.00", unitsSold: "4.5", otherCount: 0 });
  });

  it("lists but does not count pending, refunded or cancelled sales", () => {
    const s = summarizeShiftSales([sale({}), sale({ status: "PENDING", paymentMethod: "CASHLESS" }), sale({ status: "REFUNDED" }), sale({ status: "CANCELLED" })]);
    expect(s.paidCount).toBe(1);
    expect(s.paidTotal).toBe("10000.00");
    expect(s.otherCount).toBe(3);
  });

  it("is zero for an empty shift", () => {
    expect(summarizeShiftSales([])).toMatchObject({ paidCount: 0, paidTotal: "0.00", unitsSold: "0", otherCount: 0 });
  });
});
