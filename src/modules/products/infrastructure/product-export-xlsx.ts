import { buildA4Workbook, type A4Row, type A4Spec } from "@/shared/export/a4-workbook";
import { formatWibDate, formatWibDateTime } from "@/shared/format/wib";
import type { ProductExport } from "../application/get-product-export-use-case";

const STOCK_LABEL = { AMAN: "Aman", MENIPIS: "Menipis", HABIS: "Habis" } as const;

const average = (values: number[]) => (values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length);

/** Estimated profit on cost: (sell - buy) / buy. Zero buy price has no meaningful
 * percentage, so it reads 0 rather than a division error -- same rule as the
 * sheet's IF(buy=0,0,...) formula. */
function profitRatio(buy: number, sell: number): number {
  return buy === 0 ? 0 : (sell - buy) / buy;
}

/** Margin, percentage and average rows shared by both sheets. */
function priceAverages(rows: { buy: number; sell: number }[]): A4Row {
  return {
    buy: { formula: "AVERAGE({buy:range})", result: average(rows.map((r) => r.buy)) },
    sell: { formula: "AVERAGE({sell:range})", result: average(rows.map((r) => r.sell)) },
    margin: { formula: "AVERAGE({margin:range})", result: average(rows.map((r) => r.sell - r.buy)) },
    profit: { formula: "AVERAGE({profit:range})", result: average(rows.map((r) => profitRatio(r.buy, r.sell))) },
  };
}

const PROFIT_FORMULA = "IF({buy}=0,0,({sell}-{buy})/{buy})";

export function buildProductExportXlsx(data: ProductExport, search: string, printedBy: string): Promise<Buffer> {
  const { rows, services, summary } = data;
  const filterLine = search.trim() ? `Filter pencarian: "${search.trim()}"` : "Semua barang";

  const stockPrices = rows.map((r) => ({ buy: Number(r.purchasePrice), sell: Number(r.sellingPrice) }));

  const stockSheet: A4Spec = {
    sheetName: "Master Produk",
    title: "Daftar Produk & Stok",
    subtitles: [
      `${filterLine} · ${summary.physicalCount} barang · ${summary.lowCount} menipis · ${summary.outCount} habis`,
      "Margin = Harga Jual − Harga Beli · Profit % = Margin ÷ Harga Beli · Nilai Stok (Modal) = Stok × Harga Beli",
      `Dicetak ${formatWibDateTime(new Date())} oleh ${printedBy}`,
    ],
    orientation: "landscape",
    columns: [
      { key: "no", header: "No", width: 5, type: "center" },
      { key: "name", header: "Nama Produk", width: 32 },
      { key: "sku", header: "SKU", width: 13 },
      { key: "barcode", header: "Barcode Aktif", width: 16, type: "center" },
      { key: "category", header: "Kategori", width: 12 },
      { key: "stock", header: "Stok", width: 8, type: "qty" },
      { key: "unit", header: "Satuan", width: 8, type: "center" },
      { key: "min", header: "Stok Min", width: 9, type: "int" },
      { key: "status", header: "Status Stok", width: 11, type: "center" },
      { key: "buy", header: "Harga Beli", width: 13, type: "money" },
      { key: "sell", header: "Harga Jual", width: 13, type: "money" },
      { key: "margin", header: "Margin (Rp)", width: 13, type: "money" },
      { key: "profit", header: "Profit (%)", width: 10, type: "percent" },
      { key: "value", header: "Nilai Stok (Modal)", width: 16, type: "money" },
      { key: "expiry", header: "Kedaluwarsa", width: 13, type: "center" },
      { key: "expiryText", header: "Status Kedaluwarsa", width: 20 },
      { key: "updated", header: "Terakhir Diubah", width: 16, type: "center" },
    ],
    rows: rows.map((r, i) => {
      const buy = Number(r.purchasePrice);
      const sell = Number(r.sellingPrice);
      return {
        no: i + 1,
        name: r.active ? r.name : `${r.name} (nonaktif)`,
        sku: r.sku,
        barcode: r.barcode,
        category: r.category,
        stock: Number(r.stock),
        unit: r.unit,
        min: r.minimumStock,
        // Same rule as InventoryService.classifyStock.
        status: {
          formula: 'IF({stock}<=0,"Habis",IF({stock}<={min},"Menipis","Aman"))',
          result: STOCK_LABEL[r.stockStatus],
        },
        buy,
        sell,
        margin: { formula: "{sell}-{buy}", result: sell - buy },
        profit: { formula: PROFIT_FORMULA, result: profitRatio(buy, sell) },
        value: { formula: "{stock}*{buy}", result: Number(r.stockValue) },
        expiry: r.expiryDate ? formatWibDate(r.expiryDate) : "-",
        expiryText: r.expiryText,
        updated: formatWibDateTime(r.updatedAt),
      };
    }),
    totals: [
      {
        name: "TOTAL",
        stock: { formula: "SUM({stock:range})", result: Number(summary.totalStock) },
        value: { formula: "SUM({value:range})", result: Number(summary.totalStockValue) },
      },
      { name: "Rata-rata", ...priceAverages(stockPrices) },
    ],
  };

  if (services.length === 0) return buildA4Workbook(stockSheet);

  // Services (pulsa, token listrik) have no stock, so they get their own
  // table: a price list rather than a stock list.
  const servicePrices = services.map((r) => ({ buy: Number(r.purchasePrice), sell: Number(r.sellingPrice) }));
  const priceSheet: A4Spec = {
    sheetName: "Daftar Harga Layanan",
    title: "Daftar Harga Layanan",
    subtitles: [
      `${filterLine.replace("Semua barang", "Semua layanan")} · ${summary.serviceCount} layanan (pulsa, token listrik, dan sejenisnya)`,
      "Margin = Harga Jual − Harga Beli · Profit % = Margin ÷ Harga Beli",
      `Dicetak ${formatWibDateTime(new Date())} oleh ${printedBy}`,
    ],
    orientation: "portrait",
    columns: [
      { key: "no", header: "No", width: 5, type: "center" },
      { key: "name", header: "Layanan", width: 28 },
      { key: "kind", header: "Jenis", width: 12, type: "center" },
      { key: "provider", header: "Provider", width: 12 },
      { key: "buy", header: "Harga Beli", width: 13, type: "money" },
      { key: "sell", header: "Harga Jual", width: 13, type: "money" },
      { key: "margin", header: "Margin (Rp)", width: 12, type: "money" },
      { key: "profit", header: "Profit (%)", width: 10, type: "percent" },
      { key: "updated", header: "Terakhir Diubah", width: 16, type: "center" },
    ],
    rows: services.map((r, i) => {
      const buy = Number(r.purchasePrice);
      const sell = Number(r.sellingPrice);
      return {
        no: i + 1,
        name: r.active ? r.name : `${r.name} (nonaktif)`,
        kind: r.kind,
        provider: r.provider,
        buy,
        sell,
        margin: { formula: "{sell}-{buy}", result: sell - buy },
        profit: { formula: PROFIT_FORMULA, result: profitRatio(buy, sell) },
        updated: formatWibDateTime(r.updatedAt),
      };
    }),
    totals: [{ name: "Rata-rata", ...priceAverages(servicePrices) }],
  };
  return buildA4Workbook([stockSheet, priceSheet]);
}
