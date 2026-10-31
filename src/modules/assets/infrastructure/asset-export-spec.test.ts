import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildAssetSpec, buildAssetXlsx } from "./asset-export-spec";
import { buildA4Preview } from "@/shared/export/a4-preview";
import type { AssetRecord } from "../repository/asset-repository";

const rec = (over: Partial<AssetRecord>): AssetRecord => ({
  id: "a",
  name: "Freezer",
  category: "Pendingin & Freezer",
  quantity: 2,
  purchasePrice: "3500000.00",
  purchaseDate: new Date("2026-10-01"),
  condition: "BAIK",
  location: "Depan",
  note: null,
  createdByName: "Owner",
  createdAt: new Date(),
  updatedAt: new Date(),
  updatedByName: null,
  ...over,
});

describe("asset export", () => {
  const assets = [rec({}), rec({ id: "b", name: "Printer lama", condition: "DIJUAL", quantity: 1, purchasePrice: "500000.00" })];

  it("values only what is still owned, and the total agrees with the recap", () => {
    const spec = buildAssetSpec(assets, "Owner");
    expect(spec.rows.map((r) => (r.value as { result: number }).result)).toEqual([7000000, 0]);
    expect((spec.totals as unknown as { value: { result: number } }).value.result).toBe(7000000);
  });

  it("the preview shows the same numbers the file holds", () => {
    const [sheet] = buildA4Preview(buildAssetSpec(assets, "Owner"));
    expect(sheet.rows[0]).toContain("Rp7.000.000");
    expect(sheet.rows[1]).toContain("Rp0");
    expect(sheet.totals[0]).toContain("Rp7.000.000");
  });

  it("writes real formulas into the workbook", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await buildAssetXlsx(assets, "Owner")) as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    const valueCell = ws.getRow(7).getCell(9).value as { formula: string };
    expect(valueCell.formula).toContain("IF(OR(H7=");
    expect((ws.getRow(9).getCell(9).value as { formula: string }).formula).toBe("SUM(I7:I8)");
  });
});
