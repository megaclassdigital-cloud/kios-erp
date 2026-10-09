import { buildA4Workbook } from "@/shared/export/a4-workbook";
import { formatWibDate, formatWibDateTime } from "@/shared/format/wib";
import type { ReceivingReport } from "../application/get-receiving-report-use-case";

/** XLSX numbers are doubles; the values are 2dp money / 3dp quantities, which
 * a double holds exactly, so converting at this last step loses nothing. */
const num = (v: string) => Number(v);

export function buildReceivingReportXlsx(
  report: ReceivingReport,
  period: { label: string; start: Date; end: Date },
  printedBy: string
): Promise<Buffer> {
  const { rows, summary } = report;
  return buildA4Workbook({
    sheetName: "Barang Masuk",
    title: "Laporan Barang Masuk",
    subtitles: [
      `Periode: ${period.label} (${formatWibDate(period.start)} - ${formatWibDate(period.end)})`,
      `${summary.receiptCount} penerimaan · ${summary.lineCount} baris barang`,
      `Dicetak ${formatWibDateTime(new Date())} oleh ${printedBy}`,
    ],
    orientation: "landscape",
    columns: [
      { key: "no", header: "No", width: 5, type: "center" },
      { key: "date", header: "Tanggal", width: 16, type: "center" },
      { key: "purchaseNumber", header: "No. Penerimaan", width: 18, type: "center" },
      { key: "invoice", header: "No. Invoice", width: 16 },
      { key: "supplier", header: "Supplier", width: 24 },
      { key: "product", header: "Nama Produk", width: 36 },
      { key: "sku", header: "SKU", width: 14 },
      { key: "qty", header: "Qty", width: 9, type: "qty" },
      { key: "unit", header: "Satuan", width: 8, type: "center" },
      { key: "price", header: "Harga Beli", width: 14, type: "money" },
      { key: "subtotal", header: "Subtotal", width: 16, type: "money" },
    ],
    rows: rows.map((r, i) => ({
      no: i + 1,
      date: formatWibDateTime(r.receivedAt),
      purchaseNumber: r.purchaseNumber,
      invoice: r.invoiceNumber ?? "-",
      supplier: r.supplierName,
      product: r.productName,
      sku: r.sku,
      qty: num(r.quantity),
      unit: r.unit,
      price: num(r.purchasePrice),
      subtotal: num(r.subtotal),
    })),
    totals: {
      no: null,
      product: "TOTAL",
      qty: num(summary.totalQuantity),
      subtotal: num(summary.totalValue),
    },
  });
}
