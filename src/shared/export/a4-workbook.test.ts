import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildA4Workbook } from "./a4-workbook";

async function read(buf: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return wb.worksheets[0];
}

const spec = {
  sheetName: "Uji",
  title: "Judul",
  subtitles: ["Periode: hari ini"],
  orientation: "landscape" as const,
  columns: [
    { key: "name", header: "Nama", width: 20 },
    { key: "qty", header: "Qty", width: 8, type: "qty" as const },
    { key: "price", header: "Harga", width: 12, type: "money" as const },
  ],
  rows: [
    { name: "Beras", qty: 2, price: 65000 },
    { name: "Gula", qty: 1.5, price: 14000 },
  ],
  totals: { name: "TOTAL", qty: 3.5, price: 79000 },
};

describe("buildA4Workbook", () => {
  it("sets up an A4 page, one page wide, with the header repeating", async () => {
    const ws = await read(await buildA4Workbook(spec));
    expect(ws.pageSetup.paperSize).toBe(9);
    expect(ws.pageSetup.orientation).toBe("landscape");
    expect(ws.pageSetup.fitToPage).toBe(true);
    expect(ws.pageSetup.fitToWidth).toBe(1);
    expect(ws.pageSetup.fitToHeight).toBe(0);
    // title row, one subtitle, spacer -> header on row 4
    expect(ws.pageSetup.printTitlesRow).toBe("4:4");
  });

  it("writes headers, numeric data cells and a totals row", async () => {
    const ws = await read(await buildA4Workbook(spec));
    expect(ws.getRow(1).getCell(1).value).toBe("Judul");
    expect(ws.getRow(4).values).toEqual([undefined, "Nama", "Qty", "Harga"]);
    expect(ws.getRow(5).getCell(1).value).toBe("Beras");
    expect(ws.getRow(5).getCell(3).value).toBe(65000);
    expect(ws.getRow(5).getCell(3).numFmt).toBe('"Rp" #,##0');
    expect(ws.getRow(6).getCell(2).value).toBe(1.5);
    expect(ws.getRow(7).getCell(1).value).toBe("TOTAL");
    expect(ws.getRow(7).getCell(3).value).toBe(79000);
  });

  it("does not print a trailing dot on whole-number quantities", async () => {
    const ws = await read(await buildA4Workbook(spec));
    expect(ws.getRow(5).getCell(2).numFmt).toBe("#,##0");
    expect(ws.getRow(6).getCell(2).numFmt).toBe("#,##0.###");
  });

  it("says so when there is no data instead of printing a bare header", async () => {
    const ws = await read(await buildA4Workbook({ ...spec, rows: [], totals: undefined }));
    expect(String(ws.getRow(5).getCell(1).value)).toContain("Tidak ada data");
  });

  it("writes several sheets, each with its own A4 setup", async () => {
    const wb = new ExcelJS.Workbook();
    const buf = await buildA4Workbook([spec, { ...spec, sheetName: "Kedua", orientation: "portrait" }]);
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Uji", "Kedua"]);
    expect(wb.worksheets[0].pageSetup.orientation).toBe("landscape");
    expect(wb.worksheets[1].pageSetup.orientation).toBe("portrait");
    expect(wb.worksheets[1].pageSetup.paperSize).toBe(9);
  });

  it("writes formulas with real cell addresses and cached results", async () => {
    const ws = await read(
      await buildA4Workbook({
        ...spec,
        rows: [
          { name: "Beras", qty: 2, price: 65000, sub: { formula: "{qty}*{price}", result: 130000 } },
          { name: "Gula", qty: 1, price: 14000, sub: { formula: "{qty}*{price}", result: 14000 } },
        ],
        columns: [...spec.columns, { key: "sub", header: "Subtotal", width: 12, type: "money" }],
        totals: [
          { name: "TOTAL", sub: { formula: "SUM({sub:range})", result: 144000 } },
          { name: "Rata-rata", price: { formula: "AVERAGE({price:range})", result: 39500 } },
        ],
      })
    );
    expect(ws.getRow(5).getCell(4).value).toEqual({ formula: "B5*C5", result: 130000 });
    expect(ws.getRow(6).getCell(4).value).toEqual({ formula: "B6*C6", result: 14000 });
    expect(ws.getRow(7).getCell(4).value).toEqual({ formula: "SUM(D5:D6)", result: 144000 });
    expect(ws.getRow(8).getCell(3).value).toEqual({ formula: "AVERAGE(C5:C6)", result: 39500 });
    expect(ws.getRow(5).getCell(4).numFmt).toBe('"Rp" #,##0');
  });

  it("falls back to the cached result instead of a backwards range when there are no rows", async () => {
    const ws = await read(
      await buildA4Workbook({
        ...spec,
        rows: [],
        totals: { name: "TOTAL", qty: { formula: "SUM({qty:range})", result: 0 } },
      })
    );
    expect(ws.getRow(6).getCell(2).value).toBe(0);
  });

  it("rejects a formula that names a column that does not exist", async () => {
    await expect(
      buildA4Workbook({ ...spec, rows: [{ name: "x", qty: { formula: "{nope}*2", result: 0 } }] })
    ).rejects.toThrow(/Unknown column "nope"/);
  });
});
