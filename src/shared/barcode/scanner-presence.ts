"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Whether a scanner is attached — reported by source, never as a single
 * guess dressed up as a fact.
 *
 * There are two honest answers available, and they mean different things:
 *
 *   "hid"       The browser itself reports a granted HID device that is
 *               connected right now. This is a real hardware fact: unplug
 *               the scanner and a disconnect event fires immediately.
 *
 *   "observed"  A burst of keystrokes at scanner speed arrived on this page
 *               during this session. That the burst happened is a fact; that
 *               the scanner is *still* plugged in is not. It is the only
 *               thing available for a scanner running in keyboard-wedge
 *               mode, which browsers deliberately hide from WebHID so a web
 *               page cannot read a keyboard.
 *
 * An earlier version stored the last sighting for eight hours and called the
 * result "terdeteksi". That was a guess with a long memory: a scanner
 * unplugged in the morning still showed green at lunch. Nothing is persisted
 * now — "observed" lasts only as long as the page, so the light can never
 * claim something older than what it actually saw.
 */
export type ScannerSource = "hid" | "observed" | "none";

export interface ScannerPresence {
  source: ScannerSource;
  /** Product name when the browser could tell us one. */
  deviceName: string | null;
  /** False on browsers without WebHID, where only "observed" is possible. */
  hidSupported: boolean;
  /** Opens the browser's device picker. Needs a user gesture, so it must be
   * called straight from a click. */
  requestDevice: () => Promise<void>;
}

interface HidDeviceLike {
  productName?: string;
  vendorId?: number;
  productId?: number;
}

interface HidLike {
  getDevices(): Promise<HidDeviceLike[]>;
  requestDevice(options: { filters: unknown[] }): Promise<HidDeviceLike[]>;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

function hid(): HidLike | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as unknown as { hid?: HidLike }).hid ?? null;
}

// Session-scoped, module-level: shared by every ScanSources on the page so
// they agree, and gone the moment the page is gone.
let observedThisSession = false;
const listeners = new Set<() => void>();

/** Called only from the keyboard-wedge path — the one input that implies a
 * physical scanner typed something. Camera and phone scans are what you use
 * *instead of* a scanner, so they must never light this. */
export function markScannerSeen() {
  if (observedThisSession) return;
  observedThisSession = true;
  for (const l of listeners) l();
}

export function useScannerPresence(): ScannerPresence {
  const hidSupported = typeof navigator !== "undefined" && !!hid();
  // Starts empty on both server and client so hydration matches; the effect
  // below fills it in immediately after mount.
  const [device, setDevice] = useState<HidDeviceLike | null>(null);
  const [observed, setObserved] = useState(false);

  const refreshHid = useCallback(async () => {
    const api = hid();
    if (!api) return;
    try {
      // getDevices() lists devices this origin was granted *and* that are
      // currently connected, so its emptiness is itself meaningful.
      const devices = await api.getDevices();
      setDevice(devices[0] ?? null);
    } catch {
      setDevice(null);
    }
  }, []);

  useEffect(() => {
    // Sweep the key the old eight-hour version wrote. Nothing reads it any
    // more, but leaving it behind in every till's browser is litter.
    try {
      window.localStorage.removeItem("kios-erp.scanner.last-seen");
    } catch {
      // Private window or blocked storage — nothing to clean up there.
    }

    function sync() {
      setObserved(observedThisSession);
    }
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  useEffect(() => {
    const api = hid();
    if (!api) return;
    void refreshHid();
    // Real hardware events: plugging or unplugging the scanner updates the
    // light with no polling and no staleness window.
    const onChange = () => void refreshHid();
    api.addEventListener("connect", onChange);
    api.addEventListener("disconnect", onChange);
    return () => {
      api.removeEventListener("connect", onChange);
      api.removeEventListener("disconnect", onChange);
    };
  }, [refreshHid]);

  const requestDevice = useCallback(async () => {
    const api = hid();
    if (!api) return;
    try {
      // No filters: a barcode scanner has no standard vendor id, so the user
      // picks theirs from the list. Browsers hide keyboard-class devices from
      // this picker on purpose, so a wedge-mode scanner will not appear —
      // that is a browser security boundary, not something to work around.
      await api.requestDevice({ filters: [] });
      await refreshHid();
    } catch {
      // Dismissing the picker is a normal outcome, not an error.
    }
  }, [refreshHid]);

  const source: ScannerSource = device ? "hid" : observed ? "observed" : "none";

  return {
    source,
    deviceName: device?.productName ?? null,
    hidSupported,
    requestDevice,
  };
}
