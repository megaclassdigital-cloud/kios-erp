import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { GetReceivingReportUseCase } from "./get-receiving-report-use-case";
import { buildReceivingReportXlsx } from "../infrastructure/receiving-report-xlsx";
import type { PurchaseRepository, ReceivedItemRow } from "../repository/purchase-repository";

function row(over: Partial<ReceivedItemRow>): ReceivedItemRow {
  return {
    itemId: "item-1",
    purchaseId: "purchase-1",
    receivedAt: new Date("2026-10-08T03:15:00Z"),
    purchaseNumber: "PO-1",
    invoiceNumber: "INV-9",
    supplierName: "UD Maju",
    receivedByName: "Staf",
    productName: "Beras",
    sku: "BRS-1",
    unit: "PCS",
    productId: "prod-1",
    quantity: "10",
    purchasePrice: "60000.00",
    subtotal: "600000.00",
    expiryDate: new Date("2027-01-31T00:00:00Z"),
    stockBefore: "5",
    stockAfter: "15",
    ...over,
  };
}

function repoOf(rows: ReceivedItemRow[]): PurchaseRepository {
  return { listReceivedItems: async () => rows } as unknown as PurchaseRepository;
}

describe("GetReceivingReportUseCase", () => {
  it("totals with exact decimals, not floats", async () => {
    const report = await new GetReceivingReportUseCase(
      repoOf([
        row({ quantity: "0.1", subtotal: "0.10" }),
        row({ quantity: "0.2", subtotal: "0.20", productName: "Gula", sku: "G-1" }),
      ])
    ).execute({ start: new Date(0), end: new Date() });
    expect(report.summary.totalQuantity).toBe("0.3");
    expect(report.summary.totalValue).toBe("0.30");
  });

  it("counts receipts, not lines", async () => {
    const report = await new GetReceivingReportUseCase(
      repoOf([
        row({ purchaseNumber: "PO-1" }),
        row({ purchaseNumber: "PO-1", productName: "Gula", sku: "G-1" }),
        row({ purchaseNumber: "PO-2" }),
      ])
    ).execute({ start: new Date(0), end: new Date() });
    expect(report.summary.receiptCount).toBe(2);
    expect(report.summary.lineCount).toBe(3);
  });

  it("gives the xlsx exactly the rows and totals the screen gets", async () => {
    const rows = [
      row({}),
      row({ purchaseNumber: "PO-2", productName: "Gula", sku: "G-1", quantity: "2.5", purchasePrice: "14000.00", subtotal: "35000.00" }),
    ];
    const report = await new GetReceivingReportUseCase(repoOf(rows)).execute({ start: new Date(0), end: new Date() });
    const buf = await buildReceivingReportXlsx(
      report,
      { label: "Hari Ini", start: new Date("2026-10-08T00:00:00Z"), end: new Date("2026-10-08T23:59:59Z") },
      "Owner"
    );

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    expect(ws.pageSetup.paperSize).toBe(9);

    const headerRow = 6; // title + 3 subtitles + spacer, header on the next row
    expect(ws.getRow(headerRow).getCell(6).value).toBe("Produk");
    expect(ws.getRow(headerRow + 1).getCell(6).value).toBe("Beras");
    const cell = (r: number, c: number) => ws.getRow(r).getCell(c).value as unknown;
    const first = headerRow + 1; // 7
    expect(cell(first, 7)).toBe(5); // stok sebelum (data)
    expect(cell(first, 8)).toBe(10); // qty masuk (data)
    // Stok sesudah and subtotal are live formulas, with their cached results.
    expect(cell(first, 9)).toEqual({ formula: "G7+H7", result: 15 });
    expect(cell(first, 11)).toBe(60000);
    expect(cell(first, 12)).toBe("31/01/2027");
    expect(cell(first, 13)).toEqual({ formula: "H7*K7", result: 600000 });
    expect(cell(first + 1, 13)).toEqual({ formula: "H8*K8", result: 35000 });
    // Totals are SUMs over the data range; the extra row is an AVERAGE.
    expect(cell(first + 2, 8)).toEqual({ formula: "SUM(H7:H8)", result: 12.5 });
    expect(cell(first + 2, 13)).toEqual({ formula: "SUM(M7:M8)", result: 635000 });
    expect(cell(first + 3, 11)).toEqual({ formula: "AVERAGE(K7:K8)", result: 37000 });
    expect(report.summary.totalValue).toBe("635000.00");
  });
});
