"use client";

import { useEffect, useRef } from "react";
import {
  DEFAULT_WEDGE_SETTINGS,
  KeyboardWedgeBuffer,
  isTextEntryElement,
  type WedgeScan,
} from "./keyboard-wedge";

/**
 * Makes a USB keyboard-wedge scanner work anywhere on the page, not only
 * while the barcode box happens to have focus.
 *
 * Without this, a scan fired right after the cashier clicked a quantity
 * button or closed a dialog goes nowhere at all — silently, which is the
 * worst way for it to fail mid-transaction.
 *
 * Keys are only intercepted while no text field has focus, so nothing can
 * be stolen from someone who is actually typing, and a scan aimed at the
 * barcode box still behaves exactly as before. See `keyboard-wedge.ts` for
 * why recognition is based on typing rhythm rather than on the device.
 */
export function useKeyboardWedgeScanner(
  onScan: (value: string, scan: WedgeScan) => void,
  enabled = true
) {
  // The handler is re-created on every render (it closes over cart state),
  // but the listener is attached once — route through a ref so a scan is
  // always dispatched to the current handler, never a stale one.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const buffer = new KeyboardWedgeBuffer();
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    function cancelIdleFlush() {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    }

    function emit(terminator: "enter" | "tab" | "idle") {
      cancelIdleFlush();
      const scan = buffer.flush(terminator);
      if (scan) onScanRef.current(scan.value, scan);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isTextEntryElement(document.activeElement)) {
        buffer.reset();
        cancelIdleFlush();
        return;
      }
      // A shortcut is a deliberate human action, never scanner output.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "Escape") {
        buffer.reset();
        cancelIdleFlush();
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        // Only claim these while a burst is in progress, so Tab keeps
        // moving focus and Enter keeps activating the focused button at
        // every other moment.
        if (buffer.isEmpty) return;
        event.preventDefault();
        emit(event.key === "Tab" ? "tab" : "enter");
        return;
      }

      if (!buffer.push({ key: event.key, at: event.timeStamp || performance.now() })) return;
      // Safe to swallow: nothing with a text field focused reaches here, so
      // these characters had no destination to begin with.
      event.preventDefault();

      cancelIdleFlush();
      idleTimer = setTimeout(() => emit("idle"), DEFAULT_WEDGE_SETTINGS.idleFlushMs);
    }

    // Capture phase: get the keys before a stray handler elsewhere does.
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      cancelIdleFlush();
    };
  }, [enabled]);
}
