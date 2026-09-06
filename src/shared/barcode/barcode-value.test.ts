import { describe, expect, it } from "vitest";
import { BarcodeValue, InvalidBarcodeError, formatInternalBarcode } from "./barcode-value";

describe("BarcodeValue", () => {
  it("trims scanner whitespace/newlines", () => {
    expect(BarcodeValue.normalize("  8991234567890\r\n").toString()).toBe("8991234567890");
  });

  it("rejects an empty scan", () => {
    expect(() => BarcodeValue.normalize("   ")).toThrow(InvalidBarcodeError);
  });
});

describe("formatInternalBarcode", () => {
  it("produces a stable KERP-prefixed, zero-padded value", () => {
    expect(formatInternalBarcode(1n)).toBe("KERP000000000001");
    expect(formatInternalBarcode(152n)).toBe("KERP000000000152");
  });

  it("never collides for sequential values", () => {
    const values = new Set([1n, 2n, 3n].map(formatInternalBarcode));
    expect(values.size).toBe(3);
  });
});
