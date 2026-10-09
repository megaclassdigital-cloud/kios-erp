import ExcelJS from "exceljs";

/**
 * One-sheet XLSX, laid out to print on A4.
 *
 * Both exports (Barang Masuk, Master Produk) go through here so they share a
 * page setup: A4, fit to one page wide, header row repeated on every printed
 * page, page numbers in the footer. Callers hand over rows that were already
 * produced by the same use case that feeds the on-screen table, so the file
 * can only differ from the screen in formatting.
 */
export type A4ColumnType = "text" | "int" | "qty" | "money" | "center";

export interface A4Column {
  key: string;
  header: string;
  /** Excel character width. Widths should sum to roughly 90 for portrait or
   * 135 for landscape; fit-to-width shrinks anything wider. */
  width: number;
  type?: A4ColumnType;
}

export type A4Cell = string | number | null;

export interface A4Spec {
  sheetName: string;
  title: string;
  /** Lines under the title: period, filter, who printed it, and so on. */
  subtitles: string[];
  orientation: "portrait" | "landscape";
  columns: A4Column[];
  rows: Record<string, A4Cell>[];
  /** Optional bold row after the data, e.g. grand totals. */
  totals?: Record<string, A4Cell>;
}

const MONEY_FORMAT = '"Rp" #,##0';
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFBFBFBF" } },
  left: { style: "thin", color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
  right: { style: "thin", color: { argb: "FFBFBFBF" } },
};

/** `#,##0.###` would print "5." for a whole number, so pick per value. */
function qtyFormat(value: number): string {
  return Number.isInteger(value) ? "#,##0" : "#,##0.###";
}

function applyCell(cell: ExcelJS.Cell, type: A4ColumnType, value: A4Cell) {
  cell.value = value;
  cell.border = BORDER;
  // Numbers right, short codes centred, prose left and wrapping.
  const horizontal =
    type === "money" || type === "int" || type === "qty" ? "right" : type === "center" ? "center" : "left";
  cell.alignment = { vertical: "middle", horizontal, wrapText: type === "text" };
  if (typeof value !== "number") return;
  if (type === "money") cell.numFmt = MONEY_FORMAT;
  else if (type === "int") cell.numFmt = "#,##0";
  else if (type === "qty") cell.numFmt = qtyFormat(value);
}

export async function buildA4Workbook(spec: A4Spec): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kios ERP";
  wb.created = new Date();

  const ws = wb.addWorksheet(spec.sheetName);
  ws.columns = spec.columns.map((c) => ({ key: c.key, width: c.width }));
  const lastCol = spec.columns.length;

  let row = 1;
  const titleRow = ws.getRow(row);
  titleRow.getCell(1).value = spec.title;
  titleRow.getCell(1).font = { bold: true, size: 14 };
  ws.mergeCells(row, 1, row, lastCol);
  row += 1;

  for (const line of spec.subtitles) {
    const r = ws.getRow(row);
    r.getCell(1).value = line;
    r.getCell(1).font = { size: 10, color: { argb: "FF555555" } };
    ws.mergeCells(row, 1, row, lastCol);
    row += 1;
  }
  row += 1; // spacer

  const headerRowNumber = row;
  const header = ws.getRow(headerRowNumber);
  spec.columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
    cell.border = BORDER;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  header.height = 32;
  row += 1;

  spec.rows.forEach((data, index) => {
    const r = ws.getRow(row);
    spec.columns.forEach((c, i) => {
      applyCell(r.getCell(i + 1), c.type ?? "text", data[c.key] ?? null);
      if (index % 2 === 1) {
        r.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F6FA" } };
      }
    });
    row += 1;
  });

  if (spec.rows.length === 0) {
    const r = ws.getRow(row);
    r.getCell(1).value = "Tidak ada data pada periode / filter ini.";
    r.getCell(1).font = { italic: true, color: { argb: "FF777777" } };
    ws.mergeCells(row, 1, row, lastCol);
    row += 1;
  }

  if (spec.totals) {
    const r = ws.getRow(row);
    spec.columns.forEach((c, i) => {
      const cell = r.getCell(i + 1);
      applyCell(cell, c.type ?? "text", spec.totals?.[c.key] ?? null);
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } };
    });
    row += 1;
  }

  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: spec.orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0, // as many pages tall as needed
    horizontalCentered: true,
    printTitlesRow: `${headerRowNumber}:${headerRowNumber}`,
    printArea: `A1:${ws.getColumn(lastCol).letter}${row - 1}`,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
  };
  ws.headerFooter.oddFooter = "&LKios ERP&CHalaman &P dari &N&R&D";

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

export const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
