import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { InvalidPromoError, promoAmount } from "./promo";

const gross = new Decimal(20000); // 2 x 10.000

describe("promoAmount", () => {
  it("is zero without a promo", () => {
    expect(promoAmount(gross, undefined).toString()).toBe("0");
  });

  it("takes a nominal amount off the line", () => {
    expect(promoAmount(gross, { type: "NOMINAL", value: "1500" }).toString()).toBe("1500");
  });

  it("takes a percentage of the line", () => {
    expect(promoAmount(gross, { type: "PERCENT", value: "10" }).toString()).toBe("2000");
    // 15% of 9.990 = 1498.5 -> whole Rupiah
    expect(promoAmount(new Decimal(9990), { type: "PERCENT", value: "15" }).toString()).toBe("1499");
  });

  it("allows a full 100% or a nominal equal to the line, never more", () => {
    expect(promoAmount(gross, { type: "PERCENT", value: "100" }).toString()).toBe("20000");
    expect(promoAmount(gross, { type: "NOMINAL", value: "20000" }).toString()).toBe("20000");
    expect(() => promoAmount(gross, { type: "NOMINAL", value: "20001" })).toThrow(InvalidPromoError);
    expect(() => promoAmount(gross, { type: "PERCENT", value: "101" })).toThrow(InvalidPromoError);
  });

  it("rejects zero, negative and non-numeric values", () => {
    for (const value of ["0", "-5", "abc"]) {
      expect(() => promoAmount(gross, { type: "NOMINAL", value })).toThrow(InvalidPromoError);
    }
  });
});
