import { describe, expect, it } from "vitest";
import { searchProducts } from "./product-search";

const items = [
  { name: "Indomie Goreng 70g", sku: "INDO-70", barcodes: ["8998866200301"] },
  { name: "Indomie Goreng 85g", sku: "INDO-85", barcodes: ["8998866200400"] },
  { name: "Indomie Soto", sku: "INDO-SOTO", barcodes: [] },
  { name: "Kecap Manis ABC 275 ml", sku: "KCP-ABC", barcodes: ["8991234567890"] },
  { name: "Teh Botol Sosro", sku: "TEH-1", barcodes: [] },
];
const names = (q: string) => searchProducts(items, q).map((i) => i.name);

describe("searchProducts", () => {
  it("finds by part of a word and narrows as words are added", () => {
    expect(names("indo")).toHaveLength(3);
    expect(names("indo gor")).toEqual(["Indomie Goreng 70g", "Indomie Goreng 85g"]);
    expect(names("indo gor 85")).toEqual(["Indomie Goreng 85g"]);
  });

  it("ignores word order and case", () => {
    expect(names("ABC kecap")).toEqual(["Kecap Manis ABC 275 ml"]);
  });

  it("tolerates one slipped key in a long word", () => {
    expect(names("indomie gorang")).toEqual(["Indomie Goreng 70g", "Indomie Goreng 85g"]);
    expect(names("kecapp")).toContain("Kecap Manis ABC 275 ml");
  });

  it("finds by SKU and by digits of a barcode", () => {
    expect(names("teh-1")).toEqual(["Teh Botol Sosro"]);
    expect(names("66200400")).toEqual(["Indomie Goreng 85g"]);
  });

  it("returns nothing for nonsense or an empty query", () => {
    expect(names("zzzz")).toEqual([]);
    expect(names("   ")).toEqual([]);
  });

  it("puts a closer match first and honours the limit", () => {
    expect(names("indomie")[0]).toBe("Indomie Soto"); // shorter name wins the tie
    expect(searchProducts(items, "indo", 2)).toHaveLength(2);
  });
});
