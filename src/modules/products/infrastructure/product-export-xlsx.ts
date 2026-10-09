import { buildA4Workbook } from "@/shared/export/a4-workbook";
import { formatWibDate, formatWibDateTime } from "@/shared/format/wib";
import type { ProductExport } from "../application/get-product-export-use-case";

const STOCK_LABEL = { AMAN: "Aman", MENIPIS: "Menipis", HABIS: "Habis" } as const;

export function buildProductExportXlsx(data: ProductExport, search: string, printedBy: string): Promise<Buffer> {
  const { rows, services, summary } = data;
  const stockSheet = {
    sheetName: "Master Produk",
    title: "Daftar Produk & Stok",
    subtitles: [
      search.trim() ? `Filter pencarian: "${search.trim()}"` : "Semua barang",
      `${summary.physicalCount} barang · ${summary.lowCount} menipis · ${summary.outCount} habis`,
      `Dicetak ${formatWibDateTime(new Date())} oleh ${printedBy}`,
    ],
    orientation: "landscape" as const,
    columns: [
      { key: "no", header: "No", width: 5, type: "center" as const },
      { key: "name", header: "Nama Produk", width: 34 },
      { key: "sku", header: "SKU", width: 13 },
      { key: "barcode", header: "Barcode Aktif", width: 17, type: "center" as const },
      { key: "category", header: "Kategori", width: 13 },
      { key: "stock", header: "Stok", width: 8, type: "qty" as const },
      { key: "unit", header: "Satuan", width: 8, type: "center" as const },
      { key: "min", header: "Stok Min", width: 9, type: "int" as const },
      { key: "status", header: "Status Stok", width: 11, type: "center" as const },
      { key: "buy", header: "Harga Beli", width: 13, type: "money" as const },
      { key: "sell", header: "Harga Jual", width: 13, type: "money" as const },
      { key: "value", header: "Nilai Stok (Modal)", width: 16, type: "money" as const },
      { key: "expiry", header: "Kedaluwarsa", width: 14, type: "center" as const },
      { key: "expiryText", header: "Status Kedaluwarsa", width: 22 },
      { key: "updated", header: "Terakhir Diubah", width: 16, type: "center" as const },
    ],
    rows: rows.map((r, i) => ({
      no: i + 1,
      name: r.active ? r.name : `${r.name} (nonaktif)`,
      sku: r.sku,
      barcode: r.barcode,
      category: r.category,
      stock: Number(r.stock),
      unit: r.unit,
      min: r.minimumStock,
      status: STOCK_LABEL[r.stockStatus],
      buy: Number(r.purchasePrice),
      sell: Number(r.sellingPrice),
      value: Number(r.stockValue),
      expiry: r.expiryDate ? formatWibDate(r.expiryDate) : "-",
      expiryText: r.expiryText,
      updated: formatWibDateTime(r.updatedAt),
    })),
    totals: {
      name: "TOTAL",
      stock: Number(summary.totalStock),
      value: Number(summary.totalStockValue),
    },
  };

  if (services.length === 0) return buildA4Workbook(stockSheet);

  // Services (pulsa, token listrik) have no stock, so they get their own
  // table: a price list rather than a stock list.
  const priceSheet = {
    sheetName: "Daftar Harga Layanan",
    title: "Daftar Harga Layanan",
    subtitles: [
      search.trim() ? `Filter pencarian: "${search.trim()}"` : "Semua layanan",
      `${summary.serviceCount} layanan (pulsa, token listrik, dan sejenisnya)`,
      `Dicetak ${formatWibDateTime(new Date())} oleh ${printedBy}`,
    ],
    orientation: "portrait" as const,
    columns: [
      { key: "no", header: "No", width: 5, type: "center" as const },
      { key: "name", header: "Layanan", width: 30 },
      { key: "kind", header: "Jenis", width: 13, type: "center" as const },
      { key: "provider", header: "Provider", width: 14 },
      { key: "buy", header: "Harga Beli", width: 14, type: "money" as const },
      { key: "sell", header: "Harga Jual", width: 14, type: "money" as const },
      { key: "margin", header: "Margin", width: 12, type: "money" as const },
      { key: "updated", header: "Terakhir Diubah", width: 16, type: "center" as const },
    ],
    rows: services.map((r, i) => ({
      no: i + 1,
      name: r.active ? r.name : `${r.name} (nonaktif)`,
      kind: r.kind,
      provider: r.provider,
      buy: Number(r.purchasePrice),
      sell: Number(r.sellingPrice),
      margin: Number(r.margin),
      updated: formatWibDateTime(r.updatedAt),
    })),
  };
  return buildA4Workbook([stockSheet, priceSheet]);
}
