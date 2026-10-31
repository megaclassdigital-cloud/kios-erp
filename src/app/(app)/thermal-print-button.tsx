"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { printJob } from "@/shared/printing/print-receipt";
import type { PrinterConfig } from "@/shared/printing/printer-config";
import { PrinterSettingsModal } from "./printer-settings";

/**
 * One button to put something on the shop's thermal printer, for any screen
 * that has a printout: a past receipt, barcode labels, the day's figures. It
 * sends straight to the printer set up on this device (no dialog, so no wait),
 * and when none is set up it opens the settings instead of printing the
 * whole screen by mistake.
 */
export function ThermalPrintButton({
  label,
  build,
  className = "flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50",
  disabled,
}: {
  label: string;
  /** Builds the ESC/POS bytes for this device's paper width. */
  build: (config: PrinterConfig) => Uint8Array;
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(false);

  async function print() {
    setBusy(true);
    const outcome = await printJob(build);
    setBusy(false);
    if (outcome.ok) return void toast.success("Dikirim ke printer.");
    if (outcome.needsSetup) return setSettings(true);
    toast.error(outcome.message, { duration: 10000 });
  }

  return (
    <>
      <span className="inline-flex gap-1 print:hidden">
        <button type="button" onClick={() => void print()} disabled={busy || disabled} className={className}>
          <Printer className="h-4 w-4" />
          {busy ? "Mencetak..." : label}
        </button>
        <button type="button" onClick={() => setSettings(true)} aria-label="Pengaturan printer" title="Pengaturan printer" className="rounded-md border border-border px-2 text-sm text-muted-foreground hover:bg-muted">
          ⚙
        </button>
      </span>
      {settings && <PrinterSettingsModal onClose={() => setSettings(false)} />}
    </>
  );
}
