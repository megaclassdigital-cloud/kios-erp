import { describe, expect, it } from "vitest";
import { duplicateMessage, findDuplicate, type KnownProductRef } from "./duplicate-product";

const products: KnownProductRef[] = [
  { id: "1", name: "Indomie Goreng", sku: "INDOMIE-GRG", activeBarcodes: ["8998866200301"] },
  { id: "2", name: "Gula Pasir 1kg", sku: "GULA-1", activeBarcodes: [] },
];

describe("findDuplicate", () => {
  it("finds the same barcode first", () => {
    const d = findDuplicate(products, { barcode: "8998866200301", name: "Lain", sku: "X" });
    expect(d?.kind).toBe("BARCODE");
    expect(d?.product.id).toBe("1");
  });

  it("finds the same SKU regardless of case and spacing", () => {
    expect(findDuplicate(products, { sku: " gula-1 " })?.product.id).toBe("2");
  });

  it("finds the same name ignoring case and extra spaces", () => {
    expect(findDuplicate(products, { name: "  indomie   GORENG " })?.product.id).toBe("1");
  });

  it("returns null for a genuinely new product", () => {
    expect(findDuplicate(products, { name: "Teh Botol", sku: "TEH-1", barcode: "123456789012" })).toBeNull();
    expect(findDuplicate(products, {})).toBeNull();
  });

  it("points the user to Barang Masuk", () => {
    const d = findDuplicate(products, { sku: "GULA-1" })!;
    expect(duplicateMessage(d)).toContain("Barang Masuk");
    expect(duplicateMessage(d)).toContain("Gula Pasir 1kg");
  });
});
