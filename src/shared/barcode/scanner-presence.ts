"use client";

import { useEffect, useState } from "react";

/**
 * Whether a USB scanner appears to be plugged into this machine.
 *
 * It is *appears* on purpose. No browser API reports a HID keyboard, so the
 * honest answer can only ever be inferred from behaviour: a burst of
 * keystrokes at scanner speed is the one piece of evidence available. The
 * indicator therefore lights only after a scan has actually been seen, and
 * never claims a device is present before that — a light that guessed would
 * be worse than no light, because the cashier would stop trusting it.
 *
 * The timestamp lives in localStorage so the status survives moving between
 * tabs and reloading, and so a second tab on the same till agrees.
 */
const STORAGE_KEY = "kios-erp.scanner.last-seen";

/** How long a sighting keeps the light on. Long enough to cover a whole
 * shift without re-scanning, short enough that a scanner unplugged
 * yesterday is not still reported as present this morning. */
const FRESH_WINDOW_MS = 8 * 60 * 60 * 1000;

type Listener = () => void;
const listeners = new Set<Listener>();

function readLastSeen(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Called when a scan arrives through the keyboard-wedge path — the only
 * path that implies physical hardware. Camera and phone scans deliberately
 * do not mark presence: they are what you use *instead of* a scanner. */
export function markScannerSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Still notify: the light should come on for this session even when
    // storage is unavailable.
  }
  for (const listener of listeners) listener();
}

export interface ScannerPresence {
  /** True when a wedge scan was seen within the freshness window. */
  connected: boolean;
  lastSeenAt: Date | null;
}

export function useScannerPresence(): ScannerPresence {
  // Starts disconnected on both server and client so hydration matches; the
  // effect below corrects it immediately after mount.
  const [lastSeen, setLastSeen] = useState<number | null>(null);

  useEffect(() => {
    function sync() {
      setLastSeen(readLastSeen());
    }
    sync();
    listeners.add(sync);
    // Another tab on the same till scanning counts as the same scanner.
    window.addEventListener("storage", sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    connected: lastSeen !== null && Date.now() - lastSeen < FRESH_WINDOW_MS,
    lastSeenAt: lastSeen === null ? null : new Date(lastSeen),
  };
}
