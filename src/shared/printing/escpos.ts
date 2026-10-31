/**
 * A tiny ESC/POS encoder: the command language nearly every thermal receipt
 * printer understands (including the HaoYin CP-58 and the RPP02N). Pure bytes,
 * no browser APIs, so the receipt layout can be unit-tested without a printer.
 *
 * Text is ASCII only. Thermal printers default to a code page that has no
 * Indonesian-specific letters anyway, and a character the printer does not
 * know prints as garbage; transliterating here keeps every receipt readable.
 */
const ESC = 0x1b;
const GS = 0x1d;

/** Letters with accents lose the accent; typographic symbols become their plain cousins; the rest become "?". */
export function toPrinterText(text: string): string {
  return text
    .replace(/[−–—]/g, "-")
    .replace(/×/g, "x")
    .replace(/[·•]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");
}

export class EscPosBuilder {
  private bytes: number[] = [];

  /** Reset the printer to its defaults. First thing in every job. */
  init(): this {
    this.bytes.push(ESC, 0x40);
    return this;
  }

  align(where: "left" | "center" | "right"): this {
    this.bytes.push(ESC, 0x61, where === "left" ? 0 : where === "center" ? 1 : 2);
    return this;
  }

  bold(on: boolean): this {
    this.bytes.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  /** Double width and height for the grand total; normal size otherwise. */
  big(on: boolean): this {
    this.bytes.push(GS, 0x21, on ? 0x11 : 0x00);
    return this;
  }

  text(text: string): this {
    for (const ch of toPrinterText(text)) this.bytes.push(ch.charCodeAt(0));
    return this;
  }

  line(text = ""): this {
    return this.text(text).feed(1);
  }

  feed(lines: number): this {
    this.bytes.push(ESC, 0x64, Math.max(0, Math.min(255, lines)));
    return this;
  }

  /** Feed a little past the cutter and cut. Only for printers that have one. */
  cut(): this {
    this.bytes.push(GS, 0x56, 0x42, 0x00);
    return this;
  }

  /** Kick the cash drawer wired to the printer's RJ11 port. */
  openDrawer(): this {
    this.bytes.push(ESC, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  build(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

/** Break text into lines of at most `width`, at spaces where possible. */
export function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let current = "";
  for (const word of toPrinterText(text).split(/\s+/).filter(Boolean)) {
    let w = word;
    while (w.length > width) {
      if (current) {
        out.push(current);
        current = "";
      }
      out.push(w.slice(0, width));
      w = w.slice(width);
    }
    if (!current) current = w;
    else if (current.length + 1 + w.length <= width) current += ` ${w}`;
    else {
      out.push(current);
      current = w;
    }
  }
  if (current) out.push(current);
  return out.length ? out : [""];
}

/** "left ........ right" on one line, right-aligned; the left side wraps if it cannot fit beside the right. */
export function twoColumns(left: string, right: string, width: number): string[] {
  const l = toPrinterText(left);
  const r = toPrinterText(right);
  if (l.length + r.length + 1 <= width) return [l + " ".repeat(width - l.length - r.length) + r];
  const lines = wrap(l, width);
  const last = lines[lines.length - 1];
  if (last.length + r.length + 1 <= width) {
    lines[lines.length - 1] = last + " ".repeat(width - last.length - r.length) + r;
    return lines;
  }
  return [...lines, " ".repeat(Math.max(0, width - r.length)) + r];
}
