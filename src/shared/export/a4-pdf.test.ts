import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildA4Pdf, pdfSafe, wrapText } from "./a4-pdf";
import { specsToCsv } from "./export-response";
import { buildA4Preview } from "./a4-preview";
import type { A4Spec } from "./a4-workbook";

const spec = (n: number): A4Spec => ({
  sheetName: "T",
  title: "Judul − uji",
  subtitles: ["Periode: Hari Ini"],
  orientation: "portrait",
  columns: [
    { key: "name", header: "Barang", width: 30 },
    { key: "total", header: "Total", width: 14, type: "money" },
  ],
  rows: Array.from({ length: n }, (_, i) => ({ name: `Barang ${i} dengan nama yang cukup panjang untuk dibungkus ke baris berikutnya`, total: i * 1000 })),
  totals: { name: "Total", total: { formula: "SUM({total:range})", result: 5000 } },
});

describe("PDF export", () => {
  it("makes a valid multi-page PDF from the same sheet the preview shows", async () => {
    const bytes = await buildA4Pdf(buildA4Preview(spec(120)));
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });

  it("copes with an empty sheet", async () => {
    const doc = await PDFDocument.load(await buildA4Pdf(buildA4Preview(spec(0))));
    expect(doc.getPageCount()).toBe(1);
  });

  it("replaces characters the standard font cannot draw", () => {
    expect(pdfSafe("a − b … “x” 日本")).toBe('a - b ... "x" ??');
  });

  it("wraps long words and text", () => {
    const w = (s: string) => s.length * 5;
    expect(wrapText("aaa bbb ccc", 35, w)).toEqual(["aaa", "bbb", "ccc"].slice(0, 0).concat(["aaa bbb", "ccc"]));
    expect(wrapText("abcdefghijkl", 30, w).every((l) => l.length <= 6)).toBe(true);
  });
});

describe("CSV export", () => {
  it("uses plain numbers, formula results, and quotes commas", () => {
    const csv = specsToCsv([spec(2)]);
    expect(csv).toContain("Barang,Total");
    expect(csv.split("\r\n").pop()).toBe("Total,5000");
    expect(specsToCsv([{ ...spec(1), rows: [{ name: "a,b", total: 1 }] }])).toContain('"a,b",1');
  });
});
