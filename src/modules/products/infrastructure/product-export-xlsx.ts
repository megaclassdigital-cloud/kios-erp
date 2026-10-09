import { buildA4Workbook } from "@/shared/export/a4-workbook";
import { formatWibDate, formatWibDateTime } from "@/shared/format/wib";
import type { ProductExport } from "../application/get-product-export-use-case";

const STOCK_LABEL = { AMAN: "Aman", MENIPIS: "Menipis", HABIS: "Habis" } as const;

export function buildProductExportXlsx(data: ProductExport, search: string, printedBy: string): Promise<Buffer> {
  const { rows, summary } = data;
  return buildA4Workbook({
    sheetName: "Master Produk",
    title: "Daftar Produk & Stok",
    subtitles: [
      search.trim() ? `Filter pencarian: "${search.trim()}"` : "Semua produk",
      `${summary.productCount} produk (${summary.physicalCount} barang fisik) · ${summary.lowCount} menipis · ${summary.outCount} habis`,
      `Dicetak ${formatWibDateTime(new Date())} oleh ${printedBy}`,
    ],
    orientation: "landscape",
    columns: [
      { key: "no", header: "No", width: 5, type: "center" },
      { key: "name", header: "Nama Produk", width: 34 },
      { key: "sku", header: "SKU", width: 13 },
      { key: "barcode", header: "Barcode Aktif", width: 17, type: "center" },
      { key: "category", header: "Kategori", width: 13 },
      { key: "type", header: "Tipe", width: 8, type: "center" },
      { key: "stock", header: "Stok", width: 8, type: "qty" },
      { key: "unit", header: "Satuan", width: 8, type: "center" },
      { key: "min", header: "Stok Min", width: 9, type: "int" },
      { key: "status", header: "Status Stok", width: 11, type: "center" },
      { key: "buy", header: "Harga Beli", width: 13, type: "money" },
      { key: "sell", header: "Harga Jual", width: 13, type: "money" },
      { key: "value", header: "Nilai Stok (Modal)", width: 16, type: "money" },
      { key: "expiry", header: "Kedaluwarsa", width: 14, type: "center" },
      { key: "expiryText", header: "Status Kedaluwarsa", width: 22 },
    ],
    rows: rows.map((r, i) => ({
      no: i + 1,
      name: r.active ? r.name : `${r.name} (nonaktif)`,
      sku: r.sku,
      barcode: r.barcode,
      category: r.category,
      type: r.productType === "SERVICE" ? "Layanan" : "Fisik",
      stock: r.stock === null ? "-" : Number(r.stock),
      unit: r.unit,
      min: r.minimumStock === null ? "-" : r.minimumStock,
      status: r.stockStatus ? STOCK_LABEL[r.stockStatus] : "-",
      buy: Number(r.purchasePrice),
      sell: Number(r.sellingPrice),
      value: r.stockValue === null ? "-" : Number(r.stockValue),
      expiry: r.expiryDate ? formatWibDate(r.expiryDate) : "-",
      expiryText: r.expiryText,
    })),
    totals: {
      name: "TOTAL",
      stock: Number(summary.totalStock),
      value: Number(summary.totalStockValue),
    },
  });
}
