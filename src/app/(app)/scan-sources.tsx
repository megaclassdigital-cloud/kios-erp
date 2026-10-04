"use client";

import { useState } from "react";
import { ScanLine, Smartphone } from "lucide-react";
import { CameraScanner } from "./camera-scanner";
import { DeviceScannerPairing } from "./device-scanner-pairing";
import { BarcodeInputHint } from "./barcode-input-hint";
import { useKeyboardWedgeScanner } from "@/shared/barcode/use-keyboard-wedge-scanner";
import { markScannerSeen, useScannerPresence } from "@/shared/barcode/scanner-presence";
import type { WedgeScan } from "@/shared/barcode/keyboard-wedge";

/**
 * The three ways a barcode can reach a page, in one place: the USB scanner
 * (captured page-wide, with a light saying whether one is there), the
 * camera, and a paired phone.
 *
 * Every screen that accepts a barcode used to wire these up itself, which is
 * how they drifted apart — different combinations, different wording,
 * page-wide capture on one screen only. Owning all three here means a change
 * to how scanning works lands everywhere at once.
 */
export function ScanSources({
  label,
  onScan,
  enabled = true,
  resetSignal,
  onHardwareScan,
}: {
  /** Shown to whoever pairs a phone, so they can tell sessions apart. */
  label: string;
  onScan: (value: string) => void;
  /** Gates the page-wide capture — pages with two scan targets, or a phase
   * where scanning means nothing, pass false. */
  enabled?: boolean;
  /** Change it to rotate the pairing code (the POS does this per sale). */
  resetSignal?: unknown;
  /** Raw timing of a hardware scan, for the terminal's device registry. */
  onHardwareScan?: (scan: WedgeScan) => void;
}) {
  const { connected, lastSeenAt } = useScannerPresence();
  const [showPhone, setShowPhone] = useState(false);

  useKeyboardWedgeScanner((value, scan) => {
    // Only this path implies a physical scanner, so only this path lights
    // the indicator.
    markScannerSeen();
    onHardwareScan?.(scan);
    onScan(value);
  }, enabled);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          aria-hidden
          className={`h-2 w-2 shrink-0 rounded-full ${connected ? "bg-success" : "bg-muted-foreground/40"}`}
        />
        <span className={`text-xs font-medium ${connected ? "text-success" : "text-muted-foreground"}`}>
          {connected ? "Scanner terdeteksi" : "Scanner belum terdeteksi"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {connected
            ? "siap dipakai — langsung tembak barcodenya"
            : lastSeenAt
              ? // Says "it worked here before", which points at a loose cable
                // rather than at the app, and is the first thing worth checking.
                `terakhir terdeteksi ${lastSeenAt.toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })} — periksa kabelnya, atau pakai cara di bawah`
              : "colok scanner lalu scan sekali, atau pakai cara di bawah"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CameraScanner onScan={onScan} />

        {/* With a scanner on the till the phone is a fallback, not a peer:
            leaving a second pairing UI at full size invites a cashier to set
            one up they do not need, and then wonder which device a scan came
            from. It stays one click away either way. */}
        {connected && !showPhone ? (
          <button
            type="button"
            onClick={() => setShowPhone(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            <Smartphone className="h-3.5 w-3.5" />
            Pakai HP sebagai scanner cadangan
          </button>
        ) : null}
      </div>

      {(!connected || showPhone) && (
        <div className={connected ? "border-t border-border pt-2" : undefined}>
          {connected && (
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ScanLine className="h-3.5 w-3.5 shrink-0" />
              Scanner sudah terpasang — HP hanya perlu kalau scannernya bermasalah.
            </p>
          )}
          <DeviceScannerPairing label={label} onScan={onScan} resetSignal={resetSignal} />
        </div>
      )}

      <BarcodeInputHint />
    </div>
  );
}
