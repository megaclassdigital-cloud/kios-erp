import { EscPosBuilder, twoColumns, wrap } from "./escpos";
import type { ReceiptPrintOptions } from "./receipt-escpos";

export interface BarcodeLabelJob {
  productName: string;
  barcodeValue: string;
  barcodeType: "CODE128" | "EAN13";
  /** How many labels to print. */
  copies: number;
}

/** Barcode labels on the receipt printer: the name, the bars and the number, repeated `copies` times. */
export function buildBarcodeLabelBytes(job: BarcodeLabelJob, options: ReceiptPrintOptions): Uint8Array {
  const p = new EscPosBuilder().init();
  const copies = Math.max(1, Math.min(200, Math.floor(job.copies)));
  const maxDots = options.columns === 48 ? 576 : 384;
  for (let i = 0; i < copies; i++) {
    p.align("center").bold(true);
    for (const l of wrap(job.productName, options.columns)) p.line(l);
    p.bold(false).barcode(job.barcodeValue, job.barcodeType, maxDots).feed(2);
  }
  if (options.cut) p.feed(1).cut();
  else p.feed(3);
  return p.build();
}

export interface SlipLine {
  label: string;
  value: string;
  bold?: boolean;
}

export interface SummarySlip {
  title: string;
  subtitle?: string;
  lines: SlipLine[];
  footer?: string;
}

/** A short summary on the receipt roll (the day's figures, for instance), not the whole report. */
export function buildSummarySlipBytes(slip: SummarySlip, options: ReceiptPrintOptions): Uint8Array {
  const cols = options.columns;
  const rule = "-".repeat(cols);
  const p = new EscPosBuilder().init().align("center").bold(true);
  for (const l of wrap(slip.title, cols)) p.line(l);
  p.bold(false);
  if (slip.subtitle) for (const l of wrap(slip.subtitle, cols)) p.line(l);
  p.align("left").line(rule);
  for (const line of slip.lines) {
    p.bold(!!line.bold);
    for (const l of twoColumns(line.label, line.value, cols)) p.line(l);
  }
  p.bold(false).line(rule);
  if (slip.footer) p.align("center").line(slip.footer).align("left");
  if (options.cut) p.feed(3).cut();
  else p.feed(4);
  return p.build();
}
