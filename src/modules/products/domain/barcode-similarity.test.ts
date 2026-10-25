import { describe, expect, it } from "vitest";
import { barcodeKeys, sharedBarcodeKey } from "./barcode-similarity";

const same = (a: string, b: string) => sharedBarcodeKey([a], [b]) !== null;

describe("barcode similarity", () => {
  it("treats identical codes as the same", () => {
    expect(same("8998866200301", "8998866200301")).toBe(true);
  });

  it("ignores leading zeros: UPC-A vs EAN-13", () => {
    expect(same("012345678905", "0012345678905")).toBe(true);
  });

  it("ignores spaces and dashes", () => {
    expect(same("8998866 200301", "8998866-200301")).toBe(true);
  });

  it("matches a code typed without, or with a wrong, check digit", () => {
    expect(same("899886620030", "8998866200301")).toBe(true); // check digit missing
    expect(same("8998866200301", "8998866200309")).toBe(true); // check digit differs
  });

  it("compares text codes case-insensitively", () => {
    expect(same("ABC-123", "abc-123")).toBe(true);
  });

  it("does not confuse neighbouring internal numbers or unrelated codes", () => {
    expect(same("2000000017", "2000000018")).toBe(false);
    expect(same("8998866200301", "8999999000012")).toBe(false);
  });

  it("has no keys for an empty code", () => {
    expect(barcodeKeys("  ")).toEqual([]);
  });
});
