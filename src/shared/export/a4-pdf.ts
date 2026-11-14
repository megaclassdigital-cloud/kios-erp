import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import type { PreviewSheet } from "./a4-preview";

/**
 * A real PDF from the same display sheets the preview shows and the XLSX is
 * built from: one table per sheet, A4, header row repeated on every page,
 * page numbers in the footer. Rows, totals and number formats therefore cannot
 * disagree with the screen or the Excel file.
 */
const PAGE = { portrait: { w: 595.28, h: 841.89 }, landscape: { w: 841.89, h: 595.28 } } as const;
const MARGIN = 28;
const FONT_SIZE = 8;
const LINE = 10.5;
const PAD = 3;

/** Standard PDF fonts only cover Latin-1; swap the few typographic characters we use. */
export function pdfSafe(text: string): string {
  return text
    .replace(/[−–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7e\xa0-\xff]/g, "?");
}

/** Greedy word wrap; a single over-long word is cut by characters. */
export function wrapText(text: string, maxWidth: number, width: (s: string) => number): string[] {
  const lines: string[] = [];
  let current = "";
  const push = () => {
    lines.push(current);
    current = "";
  };
  for (const word of text.split(" ")) {
    const attempt = current ? `${current} ${word}` : word;
    if (width(attempt) <= maxWidth) {
      current = attempt;
      continue;
    }
    if (current) push();
    let rest = word;
    while (width(rest) > maxWidth && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && width(rest.slice(0, cut)) > maxWidth) cut -= 1;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    current = rest;
  }
  if (current || lines.length === 0) push();
  return lines;
}

export async function buildA4Pdf(sheets: PreviewSheet[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setCreator("Kios ERP");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  type Row = { cells: string[]; kind: "data" | "total"; stripe: boolean };
  const pending: { page: ReturnType<typeof doc.addPage>; sheet: PreviewSheet }[] = [];

  for (const sheet of sheets) {
    const { w, h } = PAGE[sheet.orientation];
    const inner = w - MARGIN * 2;
    const sum = sheet.columns.reduce((a, c) => a + c.width, 0) || 1;
    const widths = sheet.columns.map((c) => (c.width / sum) * inner);
    const widthOf = (f: PDFFont, size: number) => (s: string) => f.widthOfTextAtSize(s, size);

    const rows: Row[] = [
      ...sheet.rows.map((cells, i) => ({ cells, kind: "data" as const, stripe: i % 2 === 1 })),
      ...sheet.totals.map((cells) => ({ cells, kind: "total" as const, stripe: false })),
    ];

    let page = doc.addPage([w, h]);
    pending.push({ page, sheet });
    let y = h - MARGIN;

    page.drawText(pdfSafe(sheet.title), { x: MARGIN, y: y - 12, size: 13, font: bold, color: rgb(0.1, 0.1, 0.1) });
    y -= 20;
    for (const line of sheet.subtitles) {
      page.drawText(pdfSafe(line), { x: MARGIN, y: y - 8, size: 8, font, color: rgb(0.35, 0.35, 0.35) });
      y -= 11;
    }
    y -= 6;

    const drawHeader = () => {
      const lines = sheet.columns.map((c, i) => wrapText(pdfSafe(c.header), widths[i] - PAD * 2, widthOf(bold, FONT_SIZE)));
      const height = Math.max(...lines.map((l) => l.length)) * LINE + PAD * 2;
      page.drawRectangle({ x: MARGIN, y: y - height, width: inner, height, color: rgb(0.122, 0.306, 0.471) });
      let x = MARGIN;
      lines.forEach((ls, i) => {
        ls.forEach((t, li) => {
          const tw = bold.widthOfTextAtSize(t, FONT_SIZE);
          page.drawText(t, { x: x + (widths[i] - tw) / 2, y: y - PAD - 8 - li * LINE, size: FONT_SIZE, font: bold, color: rgb(1, 1, 1) });
        });
        x += widths[i];
      });
      y -= height;
    };
    drawHeader();

    if (rows.length === 0) {
      page.drawText("Tidak ada data pada periode / filter ini.", { x: MARGIN + PAD, y: y - 12, size: 9, font, color: rgb(0.45, 0.45, 0.45) });
    }

    for (const row of rows) {
      const f = row.kind === "total" ? bold : font;
      const lines = row.cells.map((c, i) => wrapText(pdfSafe(c), widths[i] - PAD * 2, widthOf(f, FONT_SIZE)));
      const height = Math.max(1, ...lines.map((l) => l.length)) * LINE + PAD * 2;
      if (y - height < MARGIN + 16) {
        page = doc.addPage([w, h]);
        pending.push({ page, sheet });
        y = h - MARGIN;
        drawHeader();
      }
      if (row.kind === "total") page.drawRectangle({ x: MARGIN, y: y - height, width: inner, height, color: rgb(0.867, 0.922, 0.969) });
      else if (row.stripe) page.drawRectangle({ x: MARGIN, y: y - height, width: inner, height, color: rgb(0.953, 0.965, 0.98) });
      let x = MARGIN;
      lines.forEach((ls, i) => {
        const align = sheet.columns[i].align;
        ls.forEach((t, li) => {
          const tw = f.widthOfTextAtSize(t, FONT_SIZE);
          const tx = align === "right" ? x + widths[i] - PAD - tw : align === "center" ? x + (widths[i] - tw) / 2 : x + PAD;
          page.drawText(t, { x: tx, y: y - PAD - 8 - li * LINE, size: FONT_SIZE, font: f, color: rgb(0.1, 0.1, 0.1) });
        });
        page.drawRectangle({ x, y: y - height, width: widths[i], height, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.4 });
        x += widths[i];
      });
      y -= height;
    }
  }

  // Footer once all pages exist, so "Halaman n dari N" is per sheet.
  const perSheet = new Map<PreviewSheet, number[]>();
  pending.forEach((p, i) => perSheet.set(p.sheet, [...(perSheet.get(p.sheet) ?? []), i]));
  for (const [, idxs] of perSheet) {
    idxs.forEach((pi, n) => {
      const { page } = pending[pi];
      const { width } = page.getSize();
      page.drawText("Kios ERP", { x: MARGIN, y: 14, size: 7, font, color: rgb(0.45, 0.45, 0.45) });
      const label = `Halaman ${n + 1} dari ${idxs.length}`;
      page.drawText(label, { x: width - MARGIN - font.widthOfTextAtSize(label, 7), y: 14, size: 7, font, color: rgb(0.45, 0.45, 0.45) });
    });
  }
  return doc.save();
}
