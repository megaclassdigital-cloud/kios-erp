/**
 * How this device prints receipts. Stored on the device (a tablet at the till
 * has its own printer), never on the server: the server cannot know what is
 * plugged into which tablet.
 */
export type PrinterMode = "browser" | "usb" | "rawbt" | "bluetooth";

export interface PrinterConfig {
  mode: PrinterMode;
  /** 32 characters per line for 58 mm paper, 48 for 80 mm. */
  columns: 32 | 48;
  /** Print as soon as a cash/cashless sale is complete (USB and RawBT only: they need no tap). */
  autoPrint: boolean;
  openDrawer: boolean;
  cut: boolean;
}

const KEY = "kios-erp.printer";
export const DEFAULT_PRINTER: PrinterConfig = { mode: "browser", columns: 32, autoPrint: false, openDrawer: false, cut: false };

let inMemory: PrinterConfig | null = null;

/** Falls back to the browser's own print dialog on anything unreadable, so a printer is never *required* to sell. */
export function readPrinterConfig(): PrinterConfig {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PrinterConfig>;
      return {
        mode: (["browser", "usb", "rawbt", "bluetooth"] as const).includes(parsed.mode as PrinterMode) ? (parsed.mode as PrinterMode) : "browser",
        columns: parsed.columns === 48 ? 48 : 32,
        autoPrint: parsed.autoPrint === true,
        openDrawer: parsed.openDrawer === true,
        cut: parsed.cut === true,
      };
    }
  } catch {
    // Private window or blocked storage: use what was set during this visit.
  }
  return inMemory ?? DEFAULT_PRINTER;
}

export function writePrinterConfig(config: PrinterConfig): void {
  inMemory = config;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // Kept in memory for this visit.
  }
}
