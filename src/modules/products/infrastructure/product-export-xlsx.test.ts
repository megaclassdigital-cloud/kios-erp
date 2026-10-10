import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildProductExportXlsx } from "./product-export-xlsx";
import type { ProductExport } from "../application/get-product-export-use-case";

const base: ProductExport = {
  rows: [
    {
      name: "Beras", sku: "BRS-1", category: "Sembako", barcode: "899111", unit: "PCS", stock: "20", minimumStock: 5,
      stockStatus: "AMAN", purchasePrice: "60000.00", sellingPrice: "65000.00", stockValue: "1200000.00",
      expiryDate: new Date("2027-03-15T00:00:00Z"), expiryText: "Masih 157 hari lagi", active: true, updatedAt: new Date("2026-10-08T03:15:00Z"),
    },
  ],
  services: [
    { name: "Pulsa 10rb", sku: "PLS-10", kind: "Pulsa", provider: "Telkomsel", purchasePrice: "9500.00", sellingPrice: "11000.00", margin: "1500.00", active: true, updatedAt: new Date("2026-10-08T03:15:00Z") },
  ],
  summary: { productCount: 2, physicalCount: 1, serviceCount: 1, totalStock: "20", totalStockValue: "1200000.00", lowCount: 0, outCount: 0 },
};

async function load(data: ProductExport) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await buildProductExportXlsx(data, "", "Owner")) as unknown as ArrayBuffer);
  return wb;
}

describe("buildProductExportXlsx", () => {
  it("puts goods and services on separate A4 sheets", async () => {
    const wb = await load(base);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Master Produk", "Daftar Harga Layanan"]);
    for (const ws of wb.worksheets) expect(ws.pageSetup.paperSize).toBe(9);
  });

  it("writes the service price list with margin and profit as formulas", async () => {
    const ws = (await load(base)).getWorksheet("Daftar Harga Layanan")!;
    const row = ws.getRow(7); // title, 3 subtitles, spacer, header, then data
    expect(row.getCell(2).value).toBe("Pulsa 10rb");
    expect(row.getCell(5).value).toBe(9500);
    expect(row.getCell(6).value).toBe(11000);
    expect(row.getCell(7).value).toEqual({ formula: "F7-E7", result: 1500 });
    expect(row.getCell(8).value).toEqual({ formula: "IF(E7=0,0,(F7-E7)/E7)", result: 1500 / 9500 });
    expect(row.getCell(8).numFmt).toBe("0.0%");
    expect(ws.getRow(8).getCell(5).value).toEqual({ formula: "AVERAGE(E7:E7)", result: 9500 });
  });

  it("derives stock value, margin, profit % and status with formulas", async () => {
    const ws = (await load(base)).getWorksheet("Master Produk")!;
    const row = ws.getRow(7);
    expect(row.getCell(6).value).toBe(20); // stok (data)
    expect(row.getCell(10).value).toBe(60000); // harga beli (data)
    expect(row.getCell(11).value).toBe(65000); // harga jual (data)
    expect(row.getCell(9).value).toEqual({ formula: 'IF(F7<=0,"Habis",IF(F7<=H7,"Menipis","Aman"))', result: "Aman" });
    expect(row.getCell(12).value).toEqual({ formula: "K7-J7", result: 5000 });
    expect(row.getCell(13).value).toEqual({ formula: "IF(J7=0,0,(K7-J7)/J7)", result: 5000 / 60000 });
    expect(row.getCell(13).numFmt).toBe("0.0%");
    expect(row.getCell(14).value).toEqual({ formula: "F7*J7", result: 1200000 });
  });

  it("totals with SUM and averages with AVERAGE over the data rows", async () => {
    const ws = (await load(base)).getWorksheet("Master Produk")!;
    expect(ws.getRow(8).getCell(6).value).toEqual({ formula: "SUM(F7:F7)", result: 20 });
    expect(ws.getRow(8).getCell(14).value).toEqual({ formula: "SUM(N7:N7)", result: 1200000 });
    expect(ws.getRow(9).getCell(10).value).toEqual({ formula: "AVERAGE(J7:J7)", result: 60000 });
    expect(ws.getRow(9).getCell(13).value).toEqual({ formula: "AVERAGE(M7:M7)", result: 5000 / 60000 });
  });

  it("shows a zero buy price as 0% profit instead of a division error", async () => {
    const free = { ...base.rows[0], purchasePrice: "0.00", sellingPrice: "5000.00", stockValue: "0.00" };
    const ws = (await load({ ...base, rows: [free] })).getWorksheet("Master Produk")!;
    // The guard is in the formula itself, so Excel returns 0 when buy is 0.
    expect(ws.getRow(7).getCell(13).value).toMatchObject({ formula: "IF(J7=0,0,(K7-J7)/J7)" });
  });

  it("shows when each row was last changed, in WIB", async () => {
    const wb = await load(base);
    expect(wb.getWorksheet("Master Produk")!.getRow(7).getCell(17).value).toBe("08/10/2026 10:15");
    expect(wb.getWorksheet("Daftar Harga Layanan")!.getRow(7).getCell(9).value).toBe("08/10/2026 10:15");
  });

  it("omits the price list when there are no services", async () => {
    const wb = await load({ ...base, services: [], summary: { ...base.summary, serviceCount: 0 } });
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Master Produk"]);
  });
});
