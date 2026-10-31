import { EscPosBuilder, twoColumns, wrap } from "./escpos";

/** The part of a sale a receipt needs. The till's ReceiptSale fits it as it is. */
export interface PrintableSale {
  transactionNumber: string;
  createdAt: string;
  paidAt?: string | null;
  cashier?: { name: string } | null;
  items: {
    productNameSnapshot: string;
    quantity: string;
    unitPriceAtSale: string;
    subtotal: string;
    promoType?: string | null;
    promoValue?: string | null;
    discountAmount?: string | null;
    serviceDetail?: { phoneNumber?: string | null; meterNumber?: string | null; customerNumber?: string | null } | null;
  }[];
  subtotal: string;
  discount: string;
  grandTotal: string;
  paymentMethod: "CASH" | "CASHLESS";
  cashReceived?: string | null;
  changeAmount?: string | null;
}

export interface ReceiptPrintOptions {
  /** Characters per line: 32 for 58 mm paper, 48 for 80 mm. */
  columns: 32 | 48;
  shopName?: string;
  /** Printers with a cutter; the 58 mm models here only have a tear bar. */
  cut?: boolean;
  openDrawer?: boolean;
}

const rupiah = (v: string | number) => `Rp${Math.round(Number(v)).toLocaleString("id-ID")}`;
const qty = (v: string) => Number(v).toLocaleString("id-ID", { maximumFractionDigits: 3 });

function dateTime(sale: PrintableSale): string {
  const d = new Date(sale.paidAt ?? sale.createdAt);
  // The shop's clock, not the device's: the same receipt on any tablet.
  return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "");
}

/** The struk as ESC/POS bytes -- the same content as the on-screen Receipt, laid out for a thermal roll. */
export function buildReceiptBytes(sale: PrintableSale, options: ReceiptPrintOptions): Uint8Array {
  const cols = options.columns;
  const rule = "-".repeat(cols);
  const p = new EscPosBuilder().init();
  if (options.openDrawer && sale.paymentMethod === "CASH") p.openDrawer();

  p.align("center").bold(true).line(options.shopName ?? "Kios-ERP").bold(false).line("Struk Transaksi").align("left").line(rule);
  p.line(`No: ${sale.transactionNumber}`).line(dateTime(sale)).line(`Kasir: ${sale.cashier?.name ?? "-"}`).line(rule);

  for (const item of sale.items) {
    for (const l of wrap(item.productNameSnapshot, cols)) p.line(l);
    const gross = Number(item.quantity) * Number(item.unitPriceAtSale);
    const promo = Number(item.discountAmount ?? 0);
    if (promo > 0) {
      for (const l of twoColumns(`${qty(item.quantity)} x ${rupiah(item.unitPriceAtSale)}`, rupiah(gross), cols)) p.line(l);
      const label = item.promoType === "PERCENT" ? `Promo ${Number(item.promoValue)}%` : "Promo";
      for (const l of twoColumns(label, `-${rupiah(promo)}`, cols)) p.line(l);
      p.bold(true);
      for (const l of twoColumns("", rupiah(item.subtotal), cols)) p.line(l);
      p.bold(false);
    } else {
      for (const l of twoColumns(`${qty(item.quantity)} x ${rupiah(item.unitPriceAtSale)}`, rupiah(item.subtotal), cols)) p.line(l);
    }
    const sd = item.serviceDetail;
    if (sd) for (const l of wrap(sd.phoneNumber ? `HP: ${sd.phoneNumber}` : `Meter: ${sd.meterNumber} Plgn: ${sd.customerNumber}`, cols)) p.line(l);
  }

  p.line(rule);
  const hasPromo = Number(sale.discount) > 0;
  for (const l of twoColumns(hasPromo ? "Harga awal" : "Subtotal", rupiah(sale.subtotal), cols)) p.line(l);
  if (hasPromo) for (const l of twoColumns("Promo", `-${rupiah(sale.discount)}`, cols)) p.line(l);

  p.bold(true);
  for (const l of twoColumns("TOTAL", rupiah(sale.grandTotal), cols)) p.line(l);
  p.bold(false);
  for (const l of twoColumns("Metode", sale.paymentMethod === "CASH" ? "Tunai" : "Cashless", cols)) p.line(l);
  if (sale.paymentMethod === "CASH" && sale.cashReceived) {
    for (const l of twoColumns("Diterima", rupiah(sale.cashReceived), cols)) p.line(l);
    for (const l of twoColumns("Kembali", rupiah(sale.changeAmount ?? 0), cols)) p.line(l);
  }

  p.line(rule).align("center").line("Terima kasih").align("left");
  // A few blank lines so the last text clears the tear bar.
  if (options.cut) p.feed(3).cut();
  else p.feed(4);
  return p.build();
}

/** A short test page, to see that the connection and the paper width are right. */
export function buildTestPage(options: ReceiptPrintOptions): Uint8Array {
  const p = new EscPosBuilder().init().align("center").bold(true).line("TES PRINTER").bold(false).align("left");
  p.line("-".repeat(options.columns));
  p.line("0123456789".repeat(5).slice(0, options.columns));
  for (const l of twoColumns("Kiri", "Kanan", options.columns)) p.line(l);
  for (const l of twoColumns("TOTAL", "Rp12.500", options.columns)) p.line(l);
  p.line("-".repeat(options.columns)).align("center").line("Printer siap dipakai").align("left");
  if (options.cut) p.feed(3).cut();
  else p.feed(4);
  return p.build();
}
