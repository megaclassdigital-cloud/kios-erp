import type { A4Spec } from "@/shared/export/a4-workbook";
import { formatWibDate, formatWibDateTime } from "@/shared/format/wib";
import type {
  CashierReport,
  FinanceReport,
  InventoryReport,
  ProductReport,
  ReportContext,
  TransactionRecord,
} from "./report-data";

/**
 * Every report sheet is defined here once. The on-screen preview (which is also
 * what gets printed), the Excel file, the PDF and the CSV are all made from
 * these specs, and the figures come from the same use cases as the pages, so a
 * number cannot differ between screen, paper and file. All times are WIB.
 */
const STATUS_LABEL = { PAID: "Lunas", PENDING: "Menunggu", CANCELLED: "Dibatalkan", REFUNDED: "Direfund" } as const;
const METHOD_LABEL = { CASH: "Tunai", CASHLESS: "Cashless" } as const;
export const MOVEMENT_LABEL: Record<string, string> = {
  PURCHASE: "Barang Masuk",
  SALE: "Penjualan",
  RETURN_IN: "Retur Masuk",
  RETURN_OUT: "Retur Keluar",
  DAMAGE: "Rusak",
  EXPIRED: "Kedaluwarsa",
  ADJUSTMENT: "Penyesuaian",
  STOCK_OPNAME: "Stock Opname",
  INITIAL_STOCK: "Stok Awal",
};
export const EXPENSE_LABEL: Record<string, string> = {
  SUPPLIER: "Supplier (tidak dipakai lagi)",
  ELECTRICITY: "Listrik & Air",
  TRANSPORT: "Transportasi & Bensin",
  SALARY: "Gaji Karyawan",
  OPERATIONAL: "Operasional Toko",
  OTHER: "Lain-lain",
};

function subtitles(ctx: ReportContext, ...extra: string[]): string[] {
  return [
    `Periode: ${ctx.period.label} (${formatWibDate(ctx.period.start)} - ${formatWibDate(ctx.period.end)}, WIB)`,
    ...extra,
    `Dicetak ${formatWibDateTime(ctx.printedAt)} WIB oleh ${ctx.printedBy}`,
  ];
}

/** One row per item line, so a name and its price sit side by side. */
export function buildTransactionsSpec(records: TransactionRecord[], ctx: ReportContext, scope: string, truncatedNote?: string): A4Spec {
  const rows = records.flatMap((t) =>
    (t.items.length ? t.items : [{ name: "-", quantity: 0, unitPrice: 0, discount: 0 }]).map((i) => ({
      at: formatWibDateTime(t.at),
      number: t.number,
      cashier: t.cashier,
      item: i.name,
      qty: i.quantity,
      price: i.unitPrice,
      discount: i.discount,
      subtotal: { formula: "{qty}*{price}-{discount}", result: i.quantity * i.unitPrice - i.discount },
      method: METHOD_LABEL[t.method],
      status: STATUS_LABEL[t.status],
    }))
  );
  const paidTotal = rows.filter((r) => r.status === "Lunas").reduce((a, r) => a + r.subtotal.result, 0);
  return {
    sheetName: "Transaksi",
    title: "Riwayat Transaksi",
    subtitles: subtitles(ctx, scope, `${new Set(records.map((t) => t.number)).size} transaksi · Subtotal = Qty × Harga − Diskon · Total hanya menghitung transaksi Lunas`, ...(truncatedNote ? [truncatedNote] : [])),
    orientation: "landscape",
    columns: [
      { key: "at", header: "Waktu (WIB)", width: 16, type: "center" },
      { key: "number", header: "No. Transaksi", width: 21, type: "center" },
      { key: "cashier", header: "Kasir", width: 14 },
      { key: "item", header: "Barang", width: 32 },
      { key: "qty", header: "Qty", width: 7, type: "qty" },
      { key: "price", header: "Harga", width: 12, type: "money" },
      { key: "discount", header: "Diskon", width: 11, type: "money" },
      { key: "subtotal", header: "Subtotal", width: 13, type: "money" },
      { key: "method", header: "Metode", width: 10, type: "center" },
      { key: "status", header: "Status", width: 10, type: "center" },
    ],
    rows,
    totals: {
      item: "Total transaksi lunas (omzet)",
      subtotal: { formula: 'SUMIF({status:range},"Lunas",{subtotal:range})', result: paidTotal },
    },
  };
}

/** The same elements, in the same words, as the Keuangan page. */
export function buildFinanceSpecs(data: FinanceReport, ctx: ReportContext): A4Spec[] {
  const gross = data.revenue - data.cogs;
  const net = gross - data.expense;
  const summary: A4Spec = {
    sheetName: "Ringkasan",
    title: "Laporan Keuangan",
    subtitles: subtitles(ctx, "Omzet dan modal dari harga saat barang terjual (setelah promo). Aset toko tidak termasuk hitungan ini."),
    orientation: "portrait",
    columns: [
      { key: "label", header: "Keterangan", width: 60 },
      { key: "value", header: "Nilai", width: 30, type: "money" },
    ],
    rows: [
      { label: "Omzet (Uang Masuk)", value: data.revenue },
      { label: "Modal Barang Terjual", value: data.cogs },
      { label: "Untung Kotor (Omzet - Modal)", value: gross },
      { label: "Pengeluaran Toko", value: data.expense },
      { label: "Untung Bersih (Untung Kotor - Pengeluaran)", value: net },
      { label: "Diterima Tunai", value: data.cash },
      { label: "Diterima Non-Tunai", value: data.cashless },
    ],
    totals: { label: `Jumlah Transaksi Lunas: ${data.transactions}`, value: null },
  };
  const products: A4Spec = {
    sheetName: "Per Produk",
    title: "Omzet, Modal dan Untung per Produk",
    subtitles: subtitles(ctx, "Untung = Omzet - Modal"),
    orientation: "portrait",
    columns: [
      { key: "name", header: "Produk", width: 40 },
      { key: "qty", header: "Terjual", width: 10, type: "qty" },
      { key: "revenue", header: "Omzet", width: 16, type: "money" },
      { key: "cogs", header: "Modal", width: 16, type: "money" },
      { key: "profit", header: "Untung", width: 16, type: "money" },
    ],
    rows: data.products.map((p) => ({
      name: p.name,
      qty: p.quantity,
      revenue: p.revenue,
      cogs: p.cogs,
      profit: { formula: "{revenue}-{cogs}", result: p.revenue - p.cogs },
    })),
    totals: {
      name: "Total",
      revenue: { formula: "SUM({revenue:range})", result: data.products.reduce((a, p) => a + p.revenue, 0) },
      cogs: { formula: "SUM({cogs:range})", result: data.products.reduce((a, p) => a + p.cogs, 0) },
      profit: { formula: "SUM({profit:range})", result: data.products.reduce((a, p) => a + p.revenue - p.cogs, 0) },
    },
  };
  const expenses: A4Spec = {
    sheetName: "Pengeluaran",
    title: "Pengeluaran Toko",
    subtitles: subtitles(ctx),
    orientation: "portrait",
    columns: [
      { key: "date", header: "Tanggal", width: 14, type: "center" },
      { key: "category", header: "Kategori", width: 26 },
      { key: "description", header: "Keterangan", width: 36 },
      { key: "amount", header: "Jumlah", width: 16, type: "money" },
    ],
    rows: data.expenses.map((e) => ({
      date: formatWibDate(e.date),
      category: EXPENSE_LABEL[e.category] ?? e.category,
      description: e.description || "-",
      amount: e.amount,
    })),
    totals: { category: "Total pengeluaran", amount: { formula: "SUM({amount:range})", result: data.expenses.reduce((a, e) => a + e.amount, 0) } },
  };
  return [summary, products, expenses];
}

export function buildProductSpecs(data: ProductReport, ctx: ReportContext): A4Spec[] {
  return [
    {
      sheetName: "Terlaris",
      title: "Laporan Produk - Terlaris",
      subtitles: subtitles(ctx, "Urut dari omzet terbesar"),
      orientation: "portrait",
      columns: [
        { key: "name", header: "Produk", width: 50 },
        { key: "qty", header: "Qty Terjual", width: 14, type: "qty" },
        { key: "total", header: "Total", width: 18, type: "money" },
      ],
      rows: data.sold.map((s) => ({ name: s.name, qty: s.quantity, total: s.total })),
      totals: { name: "Total", total: { formula: "SUM({total:range})", result: data.sold.reduce((a, s) => a + s.total, 0) } },
    },
    {
      sheetName: "Tidak Laku",
      title: "Laporan Produk - Tidak Laku Sama Sekali",
      subtitles: subtitles(ctx, "Produk aktif yang tidak terjual satu pun pada periode ini"),
      orientation: "portrait",
      columns: [
        { key: "name", header: "Produk", width: 60 },
        { key: "stock", header: "Sisa Stok", width: 16, type: "qty" },
      ],
      rows: data.neverSold.map((p) => ({ name: p.name, stock: p.stock })),
    },
  ];
}

export function buildInventorySpecs(data: InventoryReport, ctx: ReportContext): A4Spec[] {
  return [
    {
      sheetName: "Mutasi Stok",
      title: "Laporan Inventaris - Mutasi Stok",
      subtitles: subtitles(ctx),
      orientation: "portrait",
      columns: [
        { key: "at", header: "Waktu (WIB)", width: 18, type: "center" },
        { key: "product", header: "Produk", width: 44 },
        { key: "type", header: "Tipe", width: 18 },
        { key: "qty", header: "Qty", width: 10, type: "qty" },
      ],
      rows: data.movements.map((m) => ({ at: formatWibDateTime(m.at), product: m.product, type: MOVEMENT_LABEL[m.type] ?? m.type, qty: m.quantity })),
    },
    {
      sheetName: "Selisih Opname",
      title: "Laporan Inventaris - Selisih Stock Opname",
      subtitles: subtitles(ctx, "Hanya opname yang sudah disetujui"),
      orientation: "portrait",
      columns: [
        { key: "number", header: "No. Opname", width: 22, type: "center" },
        { key: "product", header: "Produk", width: 50 },
        { key: "difference", header: "Selisih", width: 12, type: "qty" },
      ],
      rows: data.opname.map((o) => ({ number: o.number, product: o.product, difference: o.difference })),
    },
  ];
}

export function buildCashierSpecs(data: CashierReport, ctx: ReportContext): A4Spec[] {
  return [
    {
      sheetName: "Per Kasir",
      title: "Laporan Kasir - Penjualan per Kasir",
      subtitles: subtitles(ctx),
      orientation: "portrait",
      columns: [
        { key: "name", header: "Kasir", width: 40 },
        { key: "tx", header: "Jumlah Transaksi", width: 18, type: "int" },
        { key: "revenue", header: "Omzet", width: 20, type: "money" },
      ],
      rows: data.perCashier.map((c) => ({ name: c.name, tx: c.transactions, revenue: c.revenue })),
      totals: {
        name: "Total",
        tx: { formula: "SUM({tx:range})", result: data.perCashier.reduce((a, c) => a + c.transactions, 0) },
        revenue: { formula: "SUM({revenue:range})", result: data.perCashier.reduce((a, c) => a + c.revenue, 0) },
      },
    },
    {
      sheetName: "Selisih Shift",
      title: "Laporan Kasir - Selisih Shift",
      subtitles: subtitles(ctx, "Selisih = Kas Aktual - Kas Diharapkan"),
      orientation: "portrait",
      columns: [
        { key: "cashier", header: "Kasir", width: 22 },
        { key: "closedAt", header: "Ditutup (WIB)", width: 18, type: "center" },
        { key: "expected", header: "Kas Diharapkan", width: 18, type: "money" },
        { key: "actual", header: "Kas Aktual", width: 18, type: "money" },
        { key: "difference", header: "Selisih", width: 16, type: "money" },
      ],
      rows: data.shifts.map((s) => ({
        cashier: s.cashier,
        closedAt: formatWibDateTime(s.closedAt),
        expected: s.expected,
        actual: s.actual,
        difference: { formula: "{actual}-{expected}", result: s.actual - s.expected },
      })),
    },
  ];
}
