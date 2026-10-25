"use client";

import { useEffect, useRef } from "react";
import {
  DEFAULT_WEDGE_SETTINGS,
  KeyboardWedgeBuffer,
  isScanTarget,
  isTextEntryElement,
  wedgeKeyChar,
  type WedgeScan,
} from "./keyboard-wedge";

/** Empties a React-controlled input so its state follows. */
function clearInput(element: Element | null) {
  if (!(element instanceof HTMLInputElement)) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(element, "");
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Makes a USB keyboard-wedge scanner work anywhere on the page, not only
 * while the barcode box happens to have focus -- and identically on every
 * device, tablets included.
 *
 * Without this, a scan fired right after the cashier clicked a quantity
 * button or closed a dialog goes nowhere at all — silently, which is the
 * worst way for it to fail mid-transaction.
 *
 * Two cases:
 *  - No text field focused: keys are intercepted as they arrive.
 *  - The page's own barcode box (marked `data-scan-target`) focused: keys
 *    flow into it as normal so slow human typing is untouched; if they turn
 *    out to be a scanner burst, the box is cleared and the scan is handled
 *    here, exactly as in the first case. Any other text field is left alone,
 *    so nothing is stolen from someone who is actually typing.
 *
 * See `keyboard-wedge.ts` for why recognition is based on typing rhythm
 * rather than on the device.
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
    // The focused scan-target box at the time the burst started, so it can
    // be emptied when the burst completes.
    let burstTarget: Element | null = null;

    function cancelIdleFlush() {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    }

    function emit(terminator: "enter" | "tab" | "idle") {
      cancelIdleFlush();
      const scan = buffer.flush(terminator);
      const target = burstTarget;
      burstTarget = null;
      if (!scan) return;
      if (target) clearInput(target);
      onScanRef.current(scan.value, scan);
    }

    function handleKeyDown(event: KeyboardEvent) {
      const active = document.activeElement;
      const inScanTarget = isScanTarget(active);
      if (isTextEntryElement(active) && !inScanTarget) {
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
        const hadBurst = buffer.size >= DEFAULT_WEDGE_SETTINGS.minLength;
        if (inScanTarget && !hadBurst) {
          // Someone typing into the box by hand: let Enter submit it.
          buffer.reset();
          cancelIdleFlush();
          return;
        }
        event.preventDefault();
        emit(event.key === "Tab" ? "tab" : "enter");
        return;
      }

      const char = wedgeKeyChar(event);
      if (char === null) return;
      if (!buffer.push({ key: char, at: event.timeStamp || performance.now() })) return;
      if (inScanTarget) {
        burstTarget = active;
      } else {
        // Safe to swallow: nothing with a text field focused reaches here, so
        // these characters had no destination to begin with.
        event.preventDefault();
      }

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
