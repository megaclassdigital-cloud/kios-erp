import { describe, expect, it } from "vitest";
import { cartTotals, clampPromo, lineDiscount, lineNet } from "./cart-math";
import type { CartLine } from "./types";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  lineId: "l",
  productId: "p",
  name: "Beras",
  unitPrice: 10000,
  quantity: 2,
  trackInventory: true,
  productType: "PHYSICAL",
  ...over,
});

describe("cart promo math", () => {
  it("keeps the original price and shows the promo separately", () => {
    const l = line({ promo: { type: "PERCENT", value: "10" } });
    expect(lineDiscount(l)).toBe(2000);
    expect(lineNet(l)).toBe(18000);
  });

  it("totals: harga awal, promo, harga akhir", () => {
    const totals = cartTotals([line({ promo: { type: "NOMINAL", value: "1500" } }), line({ lineId: "m" })]);
    expect(totals).toEqual({ gross: 40000, discount: 1500, net: 38500 });
  });

  it("clamps a nominal promo when the quantity drops below it", () => {
    const l = clampPromo(line({ quantity: 1, promo: { type: "NOMINAL", value: "15000" } }));
    expect(l.promo?.value).toBe("10000");
  });
});
