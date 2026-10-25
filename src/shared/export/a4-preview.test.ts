import { describe, expect, it } from "vitest";
import { buildA4Preview, formatCell } from "./a4-preview";
import type { A4Spec } from "./a4-workbook";

describe("formatCell", () => {
  it("formats the way the workbook does", () => {
    expect(formatCell(1500000, "money")).toBe("Rp1.500.000");
    expect(formatCell(12.5, "qty")).toBe("12,5");
    expect(formatCell(1234, "int")).toBe("1.234");
    expect(formatCell(0.1534, "percent")).toBe("15,3%");
    expect(formatCell("Gula", "text")).toBe("Gula");
    expect(formatCell(null, "money")).toBe("");
  });

  it("shows a formula's computed result", () => {
    expect(formatCell({ formula: "A1*B1", result: 600000 }, "money")).toBe("Rp600.000");
    expect(formatCell({ formula: 'IF(A1<=0,"Habis","Aman")', result: "Aman" }, "center")).toBe("Aman");
  });
});

describe("buildA4Preview", () => {
  const spec: A4Spec = {
    sheetName: "Uji",
    title: "Judul",
    subtitles: ["Periode"],
    orientation: "landscape",
    columns: [
      { key: "name", header: "Produk", width: 20 },
      { key: "qty", header: "Qty", width: 8, type: "qty" },
      { key: "total", header: "Total", width: 12, type: "money" },
    ],
    rows: [{ name: "Gula", qty: 2.5, total: { formula: "x", result: 35000 } }, { name: "Beras", qty: 1, total: 12000 }],
    totals: [{ name: "TOTAL", qty: { formula: "SUM", result: 3.5 }, total: { formula: "SUM", result: 47000 } }],
  };

  it("turns rows and totals into display text, aligned by type", () => {
    const [sheet] = buildA4Preview(spec);
    expect(sheet.columns.map((c) => c.align)).toEqual(["left", "right", "right"]);
    expect(sheet.rows).toEqual([["Gula", "2,5", "Rp35.000"], ["Beras", "1", "Rp12.000"]]);
    expect(sheet.totals).toEqual([["TOTAL", "3,5", "Rp47.000"]]);
    expect(sheet.orientation).toBe("landscape");
  });

  it("handles several sheets and no totals", () => {
    const sheets = buildA4Preview([spec, { ...spec, sheetName: "Dua", totals: undefined }]);
    expect(sheets.map((s) => s.name)).toEqual(["Uji", "Dua"]);
    expect(sheets[1].totals).toEqual([]);
  });
});
