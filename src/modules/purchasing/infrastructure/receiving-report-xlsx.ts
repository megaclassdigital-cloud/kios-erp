import { buildA4Workbook } from "@/shared/export/a4-workbook";
import { formatWibDate, formatWibDateTime } from "@/shared/format/wib";
import { stockInLabel } from "../domain/stock-in-source";
import type { ReceivingReport } from "../application/get-receiving-report-use-case";

/** XLSX numbers are doubles; the values are 2dp money / 3dp quantities, which
 * a double holds exactly, so converting at this last step loses nothing. */
const num = (v: string) => Number(v);

export function buildReceivingReportXlsx(
  report: ReceivingReport,
  period: { label: string; start: Date; end: Date },
  printedBy: string,
  /** Set when the report is for a single product (its history). */
  productName?: string
): Promise<Buffer> {
  const { rows, summary } = report;
  return buildA4Workbook({
    sheetName: "Barang Masuk",
    title: productName ? `Riwayat Barang Masuk - ${productName}` : "Laporan Barang Masuk",
    subtitles: [
      `Periode: ${period.label} (${formatWibDate(period.start)} - ${formatWibDate(period.end)})`,
      `${summary.receiptCount} penerimaan supplier · ${summary.lineCount} baris penambahan stok · Stok Sesudah = Stok Sebelum + Qty Masuk · Subtotal = Qty × Harga Beli`,
      ...report.warnings.map((w) => `Perhatian: ${w}`),
      `Dicetak ${formatWibDateTime(new Date())} oleh ${printedBy}`,
    ],
    orientation: "landscape",
    columns: [
      { key: "no", header: "No", width: 5, type: "center" },
      { key: "date", header: "Tanggal", width: 16, type: "center" },
      { key: "purchaseNumber", header: "No. Penerimaan", width: 18, type: "center" },
      { key: "invoice", header: "No. Invoice", width: 15 },
      { key: "supplier", header: "Supplier", width: 22 },
      { key: "product", header: "Produk", width: 34 },
      { key: "before", header: "Stok Sebelum", width: 11, type: "qty" },
      { key: "qty", header: "Qty Masuk", width: 10, type: "qty" },
      { key: "after", header: "Stok Sesudah", width: 11, type: "qty" },
      { key: "unit", header: "Satuan", width: 8, type: "center" },
      { key: "price", header: "Harga Beli", width: 14, type: "money" },
      { key: "expiry", header: "Kedaluwarsa", width: 13, type: "center" },
      { key: "subtotal", header: "Subtotal", width: 16, type: "money" },
    ],
    rows: rows.map((r, i) => {
      const fromSupplier = r.source === "PURCHASE";
      return {
        no: i + 1,
        date: formatWibDateTime(r.receivedAt),
        // Stock that did not come from a supplier has no receipt number; the
        // source takes its place so the row still says where the goods came from.
        purchaseNumber: r.purchaseNumber ?? stockInLabel(r.source),
        invoice: r.invoiceNumber ?? "-",
        // No supplier recorded is written as null, as asked, not left blank.
        supplier: r.supplierName || "null",
        product: r.productName,
        before: num(r.stockBefore),
        qty: num(r.quantity),
        after: { formula: "{before}+{qty}", result: num(r.stockAfter) },
        unit: r.unit,
        price: r.purchasePrice === null ? "-" : num(r.purchasePrice),
        expiry: r.expiryDate ? formatWibDate(r.expiryDate) : "-",
        // Cost only exists for a supplier receipt, so only those rows have a
        // subtotal; the others show "-" and are skipped by SUM and AVERAGE.
        subtotal: fromSupplier && r.subtotal !== null ? { formula: "{qty}*{price}", result: num(r.subtotal) } : "-",
      };
    }),
    totals: [
      {
        product: "TOTAL",
        qty: { formula: "SUM({qty:range})", result: num(summary.totalQuantity) },
        subtotal: { formula: "SUM({subtotal:range})", result: num(summary.totalValue) },
      },
      {
        product: "Rata-rata harga beli",
        price: { formula: "AVERAGE({price:range})", result: average(rows.flatMap((r) => (r.purchasePrice === null ? [] : [num(r.purchasePrice)]))) },
      },
    ],
  });
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}
