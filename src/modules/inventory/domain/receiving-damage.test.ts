import { describe, expect, it } from "vitest";
import { InvalidDamageError, parseDamaged, usableQuantity } from "./receiving-damage";

describe("parseDamaged", () => {
  it("treats nothing entered as zero", () => {
    expect(parseDamaged("45", undefined).toString()).toBe("0");
    expect(parseDamaged("45", "").toString()).toBe("0");
  });

  it("accepts a damaged quantity up to everything received", () => {
    expect(parseDamaged("45", "5").toString()).toBe("5");
    expect(parseDamaged("45", "45").toString()).toBe("45");
  });

  it("rejects more damaged than received, negatives and non-numbers", () => {
    expect(() => parseDamaged("45", "46")).toThrow(InvalidDamageError);
    expect(() => parseDamaged("45", "-1")).toThrow(InvalidDamageError);
    expect(() => parseDamaged("45", "abc")).toThrow(InvalidDamageError);
    expect(() => parseDamaged("45", "1.2345")).toThrow(InvalidDamageError);
  });
});

describe("usableQuantity", () => {
  it("is received minus damaged", () => {
    expect(usableQuantity("45", "5")).toBe("40");
    expect(usableQuantity("2.5", "0.5")).toBe("2");
  });
});
