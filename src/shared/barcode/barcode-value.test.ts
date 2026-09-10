import { describe, expect, it } from "vitest";
import { BarcodeValue, InvalidBarcodeError, formatInternalBarcode, isValidEan13 } from "./barcode-value";

describe("BarcodeValue", () => {
  it("trims scanner whitespace/newlines", () => {
    expect(BarcodeValue.normalize("  8991234567890\r\n").toString()).toBe("8991234567890");
  });

  it("rejects an empty scan", () => {
    expect(() => BarcodeValue.normalize("   ")).toThrow(InvalidBarcodeError);
  });
});

describe("isValidEan13", () => {
  it("accepts a genuine 13-digit EAN13 with a correct check digit", () => {
    expect(isValidEan13("8991002101012")).toBe(true);
  });

  it("rejects a 13-digit value with a wrong check digit (common with hand-made test data)", () => {
    expect(isValidEan13("8992388100017")).toBe(false);
  });

  it("rejects non-13-digit values (Code128/UPC-A/internal codes) rather than throwing", () => {
    expect(isValidEan13("2000000001")).toBe(false);
    expect(isValidEan13("123456789012")).toBe(false);
  });
});

describe("formatInternalBarcode", () => {
  it("produces a stable, short, all-numeric value in GS1's internal-use (20-29) range", () => {
    expect(formatInternalBarcode(1n)).toBe("2000000001");
    expect(formatInternalBarcode(152n)).toBe("2000000152");
  });

  it("never collides for sequential values", () => {
    const values = new Set([1n, 2n, 3n].map(formatInternalBarcode));
    expect(values.size).toBe(3);
  });
});
