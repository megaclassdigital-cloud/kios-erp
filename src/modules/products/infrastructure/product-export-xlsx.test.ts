import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildProductExportXlsx } from "./product-export-xlsx";
import type { ProductExport } from "../application/get-product-export-use-case";

const base: ProductExport = {
  rows: [
    {
      name: "Beras", sku: "BRS-1", category: "Sembako", barcode: "899111", unit: "PCS", stock: "20", minimumStock: 5,
      stockStatus: "AMAN", purchasePrice: "60000.00", sellingPrice: "65000.00", stockValue: "1200000.00",
      expiryDate: new Date("2027-03-15T00:00:00Z"), expiryText: "Masih 157 hari lagi", active: true,
    },
  ],
  services: [
    { name: "Pulsa 10rb", sku: "PLS-10", kind: "Pulsa", provider: "Telkomsel", purchasePrice: "9500.00", sellingPrice: "11000.00", margin: "1500.00", active: true },
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

  it("writes the service price list with margin", async () => {
    const ws = (await load(base)).getWorksheet("Daftar Harga Layanan")!;
    const row = ws.getRow(7); // title, 3 subtitles, spacer, header, then data
    expect(row.getCell(2).value).toBe("Pulsa 10rb");
    expect(row.getCell(5).value).toBe(9500);
    expect(row.getCell(6).value).toBe(11000);
    expect(row.getCell(7).value).toBe(1500);
  });

  it("omits the price list when there are no services", async () => {
    const wb = await load({ ...base, services: [], summary: { ...base.summary, serviceCount: 0 } });
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Master Produk"]);
  });
});
