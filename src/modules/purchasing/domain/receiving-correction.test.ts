import { describe, expect, it } from "vitest";
import { deletionDelta, InvalidCorrectionError, planCorrection, receiptTotal } from "./receiving-correction";

const line = { quantity: "5", purchasePrice: "1000.00" };

describe("planCorrection", () => {
  it("adds the difference to stock when the quantity goes up (5 -> 6)", () => {
    const plan = planCorrection(line, { quantity: "6" });
    expect(plan.stockDelta).toBe("1");
    expect(plan.quantity).toBe("6");
    expect(plan.subtotal).toBe("6000.00");
  });

  it("takes stock back when the quantity goes down (5 -> 2)", () => {
    expect(planCorrection(line, { quantity: "2" }).stockDelta).toBe("-3");
  });

  it("leaves stock alone when only the price changes", () => {
    const plan = planCorrection(line, { purchasePrice: "1250" });
    expect(plan.stockDelta).toBe("0");
    expect(plan.subtotal).toBe("6250.00");
    expect(plan.purchasePrice).toBe("1250.00");
  });

  it("handles fractional quantities exactly", () => {
    const plan = planCorrection({ quantity: "0.1", purchasePrice: "100.00" }, { quantity: "0.3" });
    expect(plan.stockDelta).toBe("0.2");
    expect(plan.subtotal).toBe("30.00");
  });

  it("rejects zero, negative and non-numeric quantities", () => {
    expect(() => planCorrection(line, { quantity: "0" })).toThrow(InvalidCorrectionError);
    expect(() => planCorrection(line, { quantity: "-1" })).toThrow(InvalidCorrectionError);
    expect(() => planCorrection(line, { quantity: "abc" })).toThrow(InvalidCorrectionError);
  });

  it("rejects too many decimals and negative prices", () => {
    expect(() => planCorrection(line, { quantity: "1.2345" })).toThrow(/3 angka/);
    expect(() => planCorrection(line, { purchasePrice: "-5" })).toThrow(/negatif/);
    expect(() => planCorrection(line, { purchasePrice: "10.005" })).toThrow(/2 angka/);
  });
});

describe("deletionDelta", () => {
  it("takes back the whole quantity, including an earlier correction", () => {
    // received 5, corrected to 6: the line now says 6, so deleting removes 6.
    expect(deletionDelta({ quantity: "6", purchasePrice: "1000.00" })).toBe("-6");
  });
});

describe("receiptTotal", () => {
  it("sums subtotals exactly", () => {
    expect(receiptTotal(["0.10", "0.20"])).toBe("0.30");
    expect(receiptTotal([])).toBe("0.00");
  });
});
