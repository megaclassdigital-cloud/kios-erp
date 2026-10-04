"use client";

import { useState } from "react";
import { Smartphone, Usb } from "lucide-react";
import { CameraScanner } from "./camera-scanner";
import { DeviceScannerPairing } from "./device-scanner-pairing";
import { BarcodeInputHint } from "./barcode-input-hint";
import { useKeyboardWedgeScanner } from "@/shared/barcode/use-keyboard-wedge-scanner";
import { markScannerSeen, useScannerPresence } from "@/shared/barcode/scanner-presence";
import type { WedgeScan } from "@/shared/barcode/keyboard-wedge";

/**
 * The three ways a barcode can reach a page, in one place: the USB scanner
 * (captured page-wide, with a status line saying what is actually known about
 * it), the camera, and a paired phone.
 *
 * Every screen that accepts a barcode used to wire these up itself, which is
 * how they drifted apart. Owning all three here means a change to how
 * scanning works lands everywhere at once.
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
  const { source, deviceName, hidSupported, requestDevice } = useScannerPresence();
  const [showPhone, setShowPhone] = useState(false);

  useKeyboardWedgeScanner((value, scan) => {
    // Only this path implies a physical scanner, so only this path counts as
    // having seen one.
    markScannerSeen();
    onHardwareScan?.(scan);
    onScan(value);
  }, enabled);

  // A scanner is "there" for layout purposes in both known states; the status
  // line below is what distinguishes a reported device from an observed scan.
  const present = source !== "none";

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-sm">
      <ScannerStatus
        source={source}
        deviceName={deviceName}
        hidSupported={hidSupported}
        onRequestDevice={requestDevice}
      />

      <div className="flex flex-wrap items-center gap-2">
        <CameraScanner onScan={onScan} />

        {/* With a scanner working the phone is a fallback, not a peer: two
            full-size pairing panels invite a cashier to set up one they do
            not need, then wonder which device a scan came from. */}
        {present && !showPhone ? (
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

      {(!present || showPhone) && (
        <div className={present ? "border-t border-border pt-2" : undefined}>
          <DeviceScannerPairing label={label} onScan={onScan} resetSignal={resetSignal} />
        </div>
      )}

      <BarcodeInputHint />
    </div>
  );
}

/**
 * Says what is actually known, and how it is known.
 *
 * The three states are deliberately worded differently rather than collapsed
 * into one green light. "Terhubung" is the browser reporting a live device;
 * "pernah dipakai" is an observation about the past that says nothing about
 * right now. Showing both as the same green dot is what made the old
 * indicator untrustworthy.
 */
function ScannerStatus({
  source,
  deviceName,
  hidSupported,
  onRequestDevice,
}: {
  source: "hid" | "observed" | "none";
  deviceName: string | null;
  hidSupported: boolean;
  onRequestDevice: () => Promise<void>;
}) {
  if (source === "hid") {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-success" />
        <span className="text-xs font-medium text-success">Scanner terhubung</span>
        <span className="text-[11px] text-muted-foreground">
          {deviceName ? `${deviceName} — terbaca langsung dari perangkatnya` : "terbaca langsung dari perangkatnya"}
        </span>
      </p>
    );
  }

  if (source === "observed") {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-info" />
        <span className="text-xs font-medium text-info">Scanner pernah dipakai di halaman ini</span>
        <span className="text-[11px] text-muted-foreground">
          Terbaca dari scan terakhir, bukan dari perangkatnya — kalau kabelnya dicabut sekarang,
          sistem tidak bisa tahu.
        </span>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
      <span className="text-xs font-medium text-muted-foreground">Scanner belum terdeteksi</span>
      <span className="text-[11px] text-muted-foreground">Colok scanner lalu scan sekali.</span>
      {hidSupported && (
        <button
          type="button"
          onClick={() => void onRequestDevice()}
          title="Hanya untuk scanner mode HID-POS. Scanner mode keyboard sengaja disembunyikan browser demi keamanan, dan tidak akan muncul di daftar."
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
        >
          <Usb className="h-3.5 w-3.5" />
          Hubungkan perangkat
        </button>
      )}
    </div>
  );
}
