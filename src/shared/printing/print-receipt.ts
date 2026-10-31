import { readPrinterConfig, type PrinterConfig } from "./printer-config";
import { buildReceiptBytes, buildTestPage, type PrintableSale } from "./receipt-escpos";
import { printErrorMessage, sendToPrinter } from "./transports";

export type PrintOutcome =
  | { ok: true; via: "browser" | "printer" }
  | { ok: false; message: string; /** No thermal printer is set up on this device yet. */ needsSetup?: boolean };

export interface PrintOptions {
  /**
   * Whether the browser's print dialog is an acceptable fallback when no
   * thermal printer is set up. True for the till's receipt (the page is laid
   * out for it); false for everything else, where the dialog would print the
   * whole screen instead of the thing asked for.
   */
  browserFallback?: boolean;
}

/**
 * Sends one print job the way this device is set up. Never throws: the outcome
 * says what happened, so the caller can tell the cashier and offer the dialog
 * or the settings.
 */
export async function printJob(build: (config: PrinterConfig) => Uint8Array, options: PrintOptions = {}): Promise<PrintOutcome> {
  const config = readPrinterConfig();
  if (config.mode === "browser") {
    if (options.browserFallback) {
      window.print();
      return { ok: true, via: "browser" };
    }
    return { ok: false, needsSetup: true, message: "Printer struk belum diatur di perangkat ini. Buka Pengaturan Printer dulu." };
  }
  try {
    await sendToPrinter(config.mode, build(config));
    return { ok: true, via: "printer" };
  } catch (error) {
    return { ok: false, message: printErrorMessage(error) };
  }
}

/** The sale's receipt, straight to the thermal printer, or through the browser's dialog if none is set up. */
export function printReceipt(sale: PrintableSale, options: PrintOptions = { browserFallback: true }): Promise<PrintOutcome> {
  return printJob((c) => buildReceiptBytes(sale, { columns: c.columns, cut: c.cut, openDrawer: c.openDrawer }), options);
}

export function printTestPage(): Promise<PrintOutcome> {
  return printJob((c) => buildTestPage({ columns: c.columns, cut: c.cut }));
}
