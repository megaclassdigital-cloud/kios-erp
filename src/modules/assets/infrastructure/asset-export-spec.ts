import { buildA4Workbook, type A4Spec } from "@/shared/export/a4-workbook";
import { formatWibDate, formatWibDateTime } from "@/shared/format/wib";
import { assetValue, CONDITION_LABEL, summarizeAssets } from "../domain/asset";
import type { AssetRecord } from "../repository/asset-repository";

/** The sheet both the XLSX and the on-screen preview are made from. */
export function buildAssetSpec(assets: AssetRecord[], printedBy: string): A4Spec {
  const summary = summarizeAssets(assets);
  const owned = (a: AssetRecord) => a.condition !== "DIJUAL" && a.condition !== "HILANG";

  return {
    sheetName: "Aset Toko",
    title: "Daftar Aset Toko",
    subtitles: [
      `${assets.length} catatan · ${summary.totalUnits} unit dimiliki · ${summary.needsAttentionUnits} unit rusak / perlu perbaikan`,
      "Nilai = Jumlah × Harga Satuan, dihitung hanya untuk aset yang masih dimiliki (yang sudah dijual atau hilang bernilai 0). Nilai perolehan, tanpa penyusutan.",
      `Dicetak ${formatWibDateTime(new Date())} oleh ${printedBy}`,
    ],
    orientation: "landscape",
    columns: [
      { key: "no", header: "No", width: 5, type: "center" },
      { key: "name", header: "Nama Aset", width: 34 },
      { key: "category", header: "Kategori", width: 20 },
      { key: "date", header: "Tgl Beli", width: 12, type: "center" },
      { key: "qty", header: "Jumlah", width: 8, type: "int" },
      { key: "price", header: "Harga Satuan", width: 14, type: "money" },
      { key: "condition", header: "Kondisi", width: 15, type: "center" },
      { key: "value", header: "Nilai", width: 15, type: "money" },
      { key: "note", header: "Catatan", width: 30 },
    ],
    rows: assets.map((a, i) => ({
      no: i + 1,
      name: a.name,
      category: a.category,
      date: formatWibDate(a.purchaseDate),
      qty: a.quantity,
      price: Number(a.purchasePrice),
      condition: CONDITION_LABEL[a.condition],
      value: {
        formula: `IF(OR({condition}="${CONDITION_LABEL.DIJUAL}",{condition}="${CONDITION_LABEL.HILANG}"),0,{qty}*{price})`,
        result: owned(a) ? Number(assetValue(a)) : 0,
      },
      note: a.note ?? "",
    })),
    totals: {
      name: "TOTAL",
      qty: { formula: "SUM({qty:range})", result: assets.reduce((n, a) => n + a.quantity, 0) },
      value: { formula: "SUM({value:range})", result: Number(summary.totalValue) },
    },
  };
}

export function buildAssetXlsx(assets: AssetRecord[], printedBy: string): Promise<Buffer> {
  return buildA4Workbook(buildAssetSpec(assets, printedBy));
}
