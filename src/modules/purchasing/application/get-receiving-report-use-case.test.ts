import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { GetReceivingReportUseCase } from "./get-receiving-report-use-case";
import { buildReceivingReportXlsx } from "../infrastructure/receiving-report-xlsx";
import type { PurchaseRepository, ReceivedItemRow } from "../repository/purchase-repository";

function row(over: Partial<ReceivedItemRow>): ReceivedItemRow {
  return {
    receivedAt: new Date("2026-10-08T03:15:00Z"),
    purchaseNumber: "PO-1",
    invoiceNumber: "INV-9",
    supplierName: "UD Maju",
    receivedByName: "Staf",
    productName: "Beras",
    sku: "BRS-1",
    unit: "PCS",
    quantity: "10",
    purchasePrice: "60000.00",
    subtotal: "600000.00",
    ...over,
  };
}

function repoOf(rows: ReceivedItemRow[]): PurchaseRepository {
  return {
    create: async () => {
      throw new Error("unused");
    },
    listRecent: async () => [],
    listReceivedItems: async () => rows,
  };
}

describe("GetReceivingReportUseCase", () => {
  it("totals with exact decimals, not floats", async () => {
    const report = await new GetReceivingReportUseCase(
      repoOf([
        row({ quantity: "0.1", subtotal: "0.10" }),
        row({ quantity: "0.2", subtotal: "0.20", productName: "Gula", sku: "G-1" }),
      ])
    ).execute(new Date(0), new Date());
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
    ).execute(new Date(0), new Date());
    expect(report.summary.receiptCount).toBe(2);
    expect(report.summary.lineCount).toBe(3);
  });

  it("gives the xlsx exactly the rows and totals the screen gets", async () => {
    const rows = [
      row({}),
      row({ purchaseNumber: "PO-2", productName: "Gula", sku: "G-1", quantity: "2.5", purchasePrice: "14000.00", subtotal: "35000.00" }),
    ];
    const report = await new GetReceivingReportUseCase(repoOf(rows)).execute(new Date(0), new Date());
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
    expect(ws.getRow(headerRow).getCell(6).value).toBe("Nama Produk");
    expect(ws.getRow(headerRow + 1).getCell(6).value).toBe("Beras");
    expect(ws.getRow(headerRow + 1).getCell(8).value).toBe(10);
    expect(ws.getRow(headerRow + 1).getCell(10).value).toBe(60000);
    expect(ws.getRow(headerRow + 2).getCell(8).value).toBe(2.5);
    expect(ws.getRow(headerRow + 2).getCell(11).value).toBe(35000);
    const totals = ws.getRow(headerRow + 3);
    expect(totals.getCell(8).value).toBe(12.5);
    expect(totals.getCell(11).value).toBe(635000);
    expect(report.summary.totalValue).toBe("635000.00");
  });
});
