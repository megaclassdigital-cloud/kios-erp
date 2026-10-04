import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEDGE_SETTINGS,
  KeyboardWedgeBuffer,
  isTextEntryElement,
} from "./keyboard-wedge";

/** Types a string at a fixed inter-key interval, starting at `from`. */
function type(buffer: KeyboardWedgeBuffer, text: string, intervalMs: number, from = 1000) {
  let at = from;
  for (const key of text) {
    buffer.push({ key, at });
    at += intervalMs;
  }
  return at;
}

describe("KeyboardWedgeBuffer", () => {
  it("accepts a scanner-speed burst as a scan", () => {
    const buffer = new KeyboardWedgeBuffer();
    type(buffer, "8991002103115", 10);

    const scan = buffer.flush("enter");

    expect(scan?.value).toBe("8991002103115");
    expect(scan?.stats.medianIntervalMs).toBe(10);
    expect(scan?.stats.terminator).toBe("enter");
  });

  it("keeps only the last burst when a human-speed gap splits the keys", () => {
    const buffer = new KeyboardWedgeBuffer();
    // Someone idly pressed "x", then a real scan arrives 300ms later.
    buffer.push({ key: "x", at: 1000 });
    type(buffer, "2000000017", 10, 1300);

    expect(buffer.flush("enter")?.value).toBe("2000000017");
  });

  it("rejects a burst shorter than the minimum length", () => {
    const buffer = new KeyboardWedgeBuffer();
    type(buffer, "99", 10);

    expect(buffer.flush("enter")).toBeNull();
  });

  it("reports the terminator so a setup screen can show the scanner's suffix", () => {
    const buffer = new KeyboardWedgeBuffer();
    type(buffer, "2000000017", 8);

    // A scanner configured with no suffix at all simply stops typing.
    expect(buffer.flush("idle")?.stats.terminator).toBe("idle");
  });

  it("discards a burst longer than a barcode can be", () => {
    const buffer = new KeyboardWedgeBuffer();
    type(buffer, "9".repeat(DEFAULT_WEDGE_SETTINGS.maxLength + 1), 5);

    expect(buffer.isEmpty).toBe(true);
  });

  it("ignores non-printable keys without breaking the burst in progress", () => {
    const buffer = new KeyboardWedgeBuffer();
    type(buffer, "2000", 10);
    expect(buffer.push({ key: "Shift", at: 1040 })).toBe(false);
    type(buffer, "000017", 10, 1050);

    expect(buffer.flush("enter")?.value).toBe("2000000017");
  });

  it("is empty again after a flush, so bursts never bleed into each other", () => {
    const buffer = new KeyboardWedgeBuffer();
    type(buffer, "2000000017", 10);
    buffer.flush("enter");

    expect(buffer.isEmpty).toBe(true);
  });
});

describe("isTextEntryElement", () => {
  function element(tag: string, attrs: Record<string, string> = {}) {
    return { tagName: tag, ...attrs } as unknown as Element;
  }

  it("treats a text input as owning its own keystrokes", () => {
    expect(isTextEntryElement(element("INPUT", { type: "text" }))).toBe(true);
    expect(isTextEntryElement(element("TEXTAREA"))).toBe(true);
  });

  it("does not treat a button or checkbox as a text field", () => {
    expect(isTextEntryElement(element("BUTTON"))).toBe(false);
    expect(isTextEntryElement(element("INPUT", { type: "checkbox" }))).toBe(false);
  });

  it("treats nothing-focused as free for global capture", () => {
    expect(isTextEntryElement(null)).toBe(false);
  });
});
