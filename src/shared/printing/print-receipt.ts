import { readPrinterConfig } from "./printer-config";
import { buildReceiptBytes, buildTestPage, type PrintableSale } from "./receipt-escpos";
import { printErrorMessage, sendToPrinter } from "./transports";

export type PrintOutcome = { ok: true; via: "browser" | "printer" } | { ok: false; message: string };

/**
 * Prints a receipt the way this device is set up: straight to the thermal
 * printer when one is configured (no dialog, so no waiting), otherwise through
 * the browser's print dialog. Never throws; the outcome says what happened so
 * the till can tell the cashier and offer the dialog as a fallback.
 */
export async function printReceipt(sale: PrintableSale): Promise<PrintOutcome> {
  const config = readPrinterConfig();
  if (config.mode === "browser") {
    window.print();
    return { ok: true, via: "browser" };
  }
  try {
    await sendToPrinter(config.mode, buildReceiptBytes(sale, { columns: config.columns, cut: config.cut, openDrawer: config.openDrawer }));
    return { ok: true, via: "printer" };
  } catch (error) {
    return { ok: false, message: printErrorMessage(error) };
  }
}

export async function printTestPage(): Promise<PrintOutcome> {
  const config = readPrinterConfig();
  if (config.mode === "browser") return { ok: false, message: "Pilih jenis printer dulu (USB atau Bluetooth) sebelum tes cetak." };
  try {
    await sendToPrinter(config.mode, buildTestPage({ columns: config.columns, cut: config.cut }));
    return { ok: true, via: "printer" };
  } catch (error) {
    return { ok: false, message: printErrorMessage(error) };
  }
}
