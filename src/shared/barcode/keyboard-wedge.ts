/**
 * Recognizes a USB keyboard-wedge barcode scanner from the *rhythm* of the
 * keystrokes it emits, rather than from the device itself.
 *
 * A wedge scanner is seen by the OS as an ordinary keyboard: the browser is
 * never told its make, model or even that it exists (there is no API that
 * reveals VID/PID for a HID keyboard). What does give it away is timing —
 * it fires characters ~5-30ms apart with machine-like regularity, where
 * even a fast typist rarely drops below 80ms and never evenly.
 *
 * Recognizing the pattern instead of the device is what keeps this
 * configuration-free: no driver, no pairing, no stored device id, nothing
 * to re-set after a reboot, and swapping in a different scanner later needs
 * no change at all. It also means the scanner's suffix setting does not
 * matter — Enter, Tab and "no suffix at all" are all handled.
 *
 * Framework-free on purpose (no React, no DOM types beyond what's passed
 * in) so the rules are unit-testable; `use-keyboard-wedge-scanner.ts` is
 * the thin browser binding.
 */

export interface WedgeKey {
  key: string;
  /** Monotonic milliseconds (event.timeStamp / performance.now()). */
  at: number;
}

/** How the burst ended. Worth keeping: it is the scanner's configured
 * suffix, which a setup screen can show back to the user. */
export type WedgeTerminator = "enter" | "tab" | "idle";

export interface WedgeScan {
  value: string;
  /**
   * Observed characteristics of the device that produced this scan. This is
   * the only place the raw timing is visible, so it is captured here for a
   * later "scanner terdeteksi — hubungkan ke terminal ini?" flow to store
   * as the terminal's hardware profile. Nothing reads it yet.
   */
  stats: {
    length: number;
    medianIntervalMs: number;
    terminator: WedgeTerminator;
  };
}

export interface WedgeSettings {
  /** Shorter bursts are discarded — guards against a stray keypress being
   * read as a one-character "barcode". */
  minLength: number;
  /** A gap longer than this means the next character belongs to a new
   * burst, not this one. Sits between scanner speed (~5-30ms) and human
   * speed (80ms+). */
  maxIntervalMs: number;
  /** A scanner configured with no suffix just stops typing; after this long
   * with no further character the burst is treated as complete. */
  idleFlushMs: number;
  /** Mirrors BarcodeValue's own limit — anything longer is not a barcode. */
  maxLength: number;
}

export const DEFAULT_WEDGE_SETTINGS: WedgeSettings = {
  minLength: 4,
  maxIntervalMs: 35,
  idleFlushMs: 60,
  maxLength: 64,
};

export class KeyboardWedgeBuffer {
  private chars: string[] = [];
  private intervals: number[] = [];
  private lastAt: number | null = null;

  constructor(private readonly settings: WedgeSettings = DEFAULT_WEDGE_SETTINGS) {}

  get isEmpty(): boolean {
    return this.chars.length === 0;
  }

  reset(): void {
    this.chars = [];
    this.intervals = [];
    this.lastAt = null;
  }

  /**
   * Feeds one key. Returns true when it was taken as part of a barcode
   * burst (the caller then suppresses it), false when it is not a printable
   * character this buffer cares about.
   */
  push({ key, at }: WedgeKey): boolean {
    // Modifiers, arrows, F-keys etc. all report multi-character names.
    if (key.length !== 1) return false;

    if (this.lastAt !== null && at - this.lastAt > this.settings.maxIntervalMs) {
      // Too slow to belong to the burst in progress. Start a fresh one from
      // this key rather than dropping it — a scan may begin at any moment,
      // including right after someone idly pressed a key.
      this.chars = [];
      this.intervals = [];
    } else if (this.lastAt !== null) {
      this.intervals.push(at - this.lastAt);
    }

    this.chars.push(key);
    this.lastAt = at;

    if (this.chars.length > this.settings.maxLength) this.reset();
    return true;
  }

  /** Closes the burst, returning a scan only when it qualifies as one. */
  flush(terminator: WedgeTerminator): WedgeScan | null {
    const value = this.chars.join("");
    const intervals = this.intervals;
    this.reset();

    if (value.length < this.settings.minLength) return null;

    return {
      value,
      stats: {
        length: value.length,
        medianIntervalMs: median(intervals),
        terminator,
      },
    };
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Whether an element owns its own keystrokes. When one of these has focus
 * the wedge listener stays out of the way entirely: the cashier may be
 * typing a product name, and a scan aimed at the POS barcode box or the
 * product search box should keep landing there exactly as it does today.
 * Global capture is for the rest of the time — after a button click, a
 * closed dialog, or a fresh page, when nothing is focused and a scan would
 * otherwise be swallowed by the void.
 */
export function isTextEntryElement(element: Element | null | undefined): boolean {
  if (!element) return false;
  if (element.tagName === "TEXTAREA") return true;
  if ((element as HTMLElement).isContentEditable) return true;
  if (element.tagName !== "INPUT") return false;

  const type = (element as HTMLInputElement).type;
  return !NON_TEXT_INPUT_TYPES.has(type);
}

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "submit",
  "reset",
  "checkbox",
  "radio",
  "file",
  "range",
  "color",
  "image",
]);
