import { describe, expect, it } from "vitest";
import { filterProducts } from "./product-filter";

const products = [
  { name: "Beras Premium 5kg", sku: "BRS-001", barcodes: [{ barcodeValue: "8991234500011" }] },
  { name: "Minyak Goreng 1L", sku: "MYK-002", barcodes: [{ barcodeValue: "KIOS-0007" }, { barcodeValue: "8990000000002" }] },
  { name: "Pulsa 10rb", sku: "PLS-010", barcodes: [] },
];

describe("filterProducts", () => {
  it("returns everything for an empty or blank search", () => {
    expect(filterProducts(products, "")).toHaveLength(3);
    expect(filterProducts(products, "   ")).toHaveLength(3);
  });

  it("matches name case-insensitively", () => {
    expect(filterProducts(products, "BERAS").map((p) => p.sku)).toEqual(["BRS-001"]);
  });

  it("matches SKU", () => {
    expect(filterProducts(products, "myk-002").map((p) => p.name)).toEqual(["Minyak Goreng 1L"]);
  });

  it("matches any of a product's barcodes", () => {
    expect(filterProducts(products, "8990000000002").map((p) => p.sku)).toEqual(["MYK-002"]);
    expect(filterProducts(products, "kios-0007").map((p) => p.sku)).toEqual(["MYK-002"]);
  });

  it("returns nothing when no field matches", () => {
    expect(filterProducts(products, "garam")).toEqual([]);
  });
});
