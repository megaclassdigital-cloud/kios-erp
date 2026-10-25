import { describe, expect, it } from "vitest";
import { duplicateMessage, findDuplicate, type KnownProductRef } from "./duplicate-product";

const products: KnownProductRef[] = [
  { id: "1", name: "Indomie Goreng", sku: "INDOMIE-GRG", activeBarcodes: ["8998866200301"] },
  { id: "2", name: "Gula Pasir 1kg", sku: "GULA-1", activeBarcodes: [] },
];

describe("findDuplicate", () => {
  it("finds the same barcode first", () => {
    const d = findDuplicate(products, { barcode: "8998866200301", sku: "X" });
    expect(d?.kind).toBe("BARCODE");
    expect(d?.product.id).toBe("1");
  });

  it("finds the same SKU regardless of case and spacing", () => {
    expect(findDuplicate(products, { sku: " gula-1 " })?.product.id).toBe("2");
  });

  it("returns null for a genuinely new product", () => {
    expect(findDuplicate(products, { sku: "TEH-1", barcode: "123456789012" })).toBeNull();
    expect(findDuplicate(products, {})).toBeNull();
  });

  it("points the user to Barang Masuk", () => {
    const d = findDuplicate(products, { sku: "GULA-1" })!;
    expect(duplicateMessage(d)).toContain("Barang Masuk");
    expect(duplicateMessage(d)).toContain("Gula Pasir 1kg");
  });
});

describe("findDuplicate is only for identical codes", () => {
  it("does not flag a look-alike barcode; that is a reminder, not a block", () => {
    expect(
      findDuplicate([{ id: "9", name: "Kopi", sku: "K", activeBarcodes: ["012345678905"] }], { sku: "L", barcode: "0012345678905" })
    ).toBeNull();
  });
});
