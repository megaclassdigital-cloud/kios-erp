import { describe, expect, it } from "vitest";
import { Quantity } from "./quantity";

describe("Quantity", () => {
  it("accumulates repeated scans of the same product", () => {
    let qty = Quantity.of(1);
    qty = qty.add(Quantity.of(1));
    expect(qty.toNumber()).toBe(2);
  });

  it("rejects zero/negative quantity for cart lines", () => {
    expect(() => Quantity.of(0).assertPositive()).toThrow();
    expect(() => Quantity.of(-1).assertPositive()).toThrow();
  });

  it("negates for stock-out movements", () => {
    expect(Quantity.of(5).negate().toNumber()).toBe(-5);
  });
});
