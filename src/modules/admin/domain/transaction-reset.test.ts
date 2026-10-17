import { describe, expect, it } from "vitest";
import { assertResetConfirmed, ResetNotConfirmedError, stockRestorePlan } from "./transaction-reset";

describe("assertResetConfirmed", () => {
  it("accepts the phrase regardless of case and surrounding spaces", () => {
    expect(() => assertResetConfirmed("HAPUS TRANSAKSI")).not.toThrow();
    expect(() => assertResetConfirmed("  hapus transaksi ")).not.toThrow();
  });

  it("rejects anything else, including near misses", () => {
    for (const bad of ["", "ya", "hapus", "HAPUS  TRANSAKSI", "hapus transaksi!"]) {
      expect(() => assertResetConfirmed(bad)).toThrow(ResetNotConfirmedError);
    }
  });
});

describe("stockRestorePlan", () => {
  it("gives back what the deleted sales took out", () => {
    expect(stockRestorePlan([{ productId: "a", net: "-5" }])).toEqual([{ productId: "a", give: "5" }]);
  });

  it("nets refunds against sales", () => {
    // sold 5, 2 came back: only 3 were really gone
    expect(stockRestorePlan([{ productId: "a", net: "-3" }])).toEqual([{ productId: "a", give: "3" }]);
  });

  it("skips products that cancel out and handles fractions exactly", () => {
    const plan = stockRestorePlan([
      { productId: "a", net: "0" },
      { productId: "b", net: "-0.3" },
    ]);
    expect(plan).toEqual([{ productId: "b", give: "0.3" }]);
  });
});
