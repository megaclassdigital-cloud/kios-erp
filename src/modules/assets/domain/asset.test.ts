import { describe, expect, it } from "vitest";
import { cleanAsset, InvalidAssetError, summarizeAssets, type AssetInput } from "./asset";

const base: AssetInput = {
  name: "  Freezer   Box 300L ",
  category: "Pendingin & Freezer",
  quantity: "2",
  purchasePrice: "3500000",
  purchaseDate: "2026-10-01",
  condition: "BAIK",
  location: " Depan ",
  note: "",
};
const now = new Date("2026-10-31T00:00:00Z");

describe("cleanAsset", () => {
  it("tidies the name and the optional fields", () => {
    const a = cleanAsset(base, now);
    expect(a.name).toBe("Freezer Box 300L");
    expect(a.quantity).toBe(2);
    expect(a.purchasePrice).toBe("3500000.00");
    expect(a.location).toBe("Depan");
    expect(a.note).toBeNull();
  });

  it("rejects each bad field with a readable message", () => {
    const bad = (over: Partial<AssetInput>) => () => cleanAsset({ ...base, ...over }, now);
    expect(bad({ name: "  " })).toThrow(/Nama aset/);
    expect(bad({ category: "Lain" })).toThrow(/kategori/);
    expect(bad({ quantity: "0" })).toThrow(/minimal 1/);
    expect(bad({ quantity: "1.5" })).toThrow(/bulat/);
    expect(bad({ purchasePrice: "abc" })).toThrow(/angka/);
    expect(bad({ purchasePrice: "-1" })).toThrow(/negatif/);
    expect(bad({ purchaseDate: "bukan tanggal" })).toThrow(/Tanggal/);
    expect(bad({ purchaseDate: "2027-01-01" })).toThrow(/masa depan/);
    expect(bad({ name: "" })).toThrow(InvalidAssetError);
  });
});

describe("summarizeAssets", () => {
  const rows = [
    { category: "Pendingin & Freezer", condition: "BAIK" as const, quantity: 2, purchasePrice: "3500000.00" },
    { category: "Rak & Perabot", condition: "PERLU_PERBAIKAN" as const, quantity: 3, purchasePrice: "250000.00" },
    { category: "Rak & Perabot", condition: "RUSAK" as const, quantity: 1, purchasePrice: "250000.00" },
    { category: "Elektronik & Kasir", condition: "DIJUAL" as const, quantity: 1, purchasePrice: "1000000.00" },
    { category: "Kendaraan", condition: "HILANG" as const, quantity: 1, purchasePrice: "9000000.00" },
  ];

  it("totals what the shop still owns; sold and lost stay out of the value", () => {
    const s = summarizeAssets(rows);
    expect(s.totalUnits).toBe(6);
    expect(s.totalValue).toBe("8000000.00"); // 2x3.5jt + 3x250k + 1x250k
  });

  it("groups by category, biggest value first", () => {
    const s = summarizeAssets(rows);
    expect(s.byCategory.map((c) => c.category)).toEqual(["Pendingin & Freezer", "Rak & Perabot"]);
    expect(s.byCategory[1]).toEqual({ category: "Rak & Perabot", units: 4, value: "1000000.00" });
  });

  it("counts units that need attention and every condition", () => {
    const s = summarizeAssets(rows);
    expect(s.needsAttentionUnits).toBe(4);
    expect(s.byCondition.find((c) => c.condition === "DIJUAL")?.units).toBe(1);
  });

  it("is empty-safe", () => {
    expect(summarizeAssets([])).toMatchObject({ totalUnits: 0, totalValue: "0.00", byCategory: [], needsAttentionUnits: 0 });
  });
});
