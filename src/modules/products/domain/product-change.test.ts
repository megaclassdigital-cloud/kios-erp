import { describe, expect, it } from "vitest";
import { changedProductFields } from "./product-change";

const before = { name: "Beras", purchasePrice: "60000.00", sellingPrice: "65000.00", expiryDate: "2027-01-31T00:00:00.000Z", active: true };

describe("changedProductFields", () => {
  it("names only the fields that changed", () => {
    expect(changedProductFields(before, { ...before, sellingPrice: "66000.00" })).toEqual(["Harga jual"]);
    expect(changedProductFields(before, { ...before, name: "Beras Premium", active: false })).toEqual(["Nama", "Status aktif"]);
  });

  it("ignores formatting-only differences in price", () => {
    expect(changedProductFields(before, { ...before, purchasePrice: "60000" })).toEqual([]);
  });

  it("compares expiry by day, not by instant", () => {
    expect(changedProductFields(before, { ...before, expiryDate: "2027-01-31T07:00:00.000Z" })).toEqual([]);
    expect(changedProductFields(before, { ...before, expiryDate: "2027-02-28T00:00:00.000Z" })).toEqual(["Kedaluwarsa"]);
    expect(changedProductFields(before, { ...before, expiryDate: null })).toEqual(["Kedaluwarsa"]);
  });

  it("returns nothing for a creation entry or missing snapshots", () => {
    expect(changedProductFields(null, before)).toEqual([]);
    expect(changedProductFields(undefined, undefined)).toEqual([]);
  });
});
