import { describe, expect, it } from "vitest";
import { Money } from "./money";

describe("Money", () => {
  it("adds and subtracts without floating point drift", () => {
    const a = Money.fromDecimal("0.10");
    const b = Money.fromDecimal("0.20");
    expect(a.add(b).toString()).toBe("0.30");
  });

  it("multiplies by a quantity", () => {
    const price = Money.fromDecimal("3500");
    expect(price.multiply(2).toString()).toBe("7000.00");
  });

  it("rejects a negative amount", () => {
    expect(() => Money.fromDecimal("-1")).toThrow();
  });

  it("compares greater-than-or-equal correctly", () => {
    const total = Money.fromDecimal("78500");
    const received = Money.fromDecimal("100000");
    expect(received.isGreaterThanOrEqual(total)).toBe(true);
    expect(total.isGreaterThanOrEqual(received)).toBe(false);
  });
});
