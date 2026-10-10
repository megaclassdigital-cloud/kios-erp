import ExcelJS from "exceljs";

/**
 * XLSX laid out to print on A4, one or more sheets.
 *
 * Both exports (Barang Masuk, Master Produk) go through here so they share a
 * page setup: A4, fit to one page wide, header row repeated on every printed
 * page, page numbers in the footer. Callers hand over rows that were already
 * produced by the same use case that feeds the on-screen table, so the file
 * can only differ from the screen in formatting.
 *
 * Anything that is arithmetic on other cells -- a subtotal, a margin, a sum,
 * an average -- is written as a real Excel formula, not a pasted number, so
 * editing a price or quantity in the sheet recalculates everything that
 * depends on it. Each formula also carries its computed result, so viewers
 * that do not recalculate (previews, some phone apps) still show the number.
 */
export type A4ColumnType = "text" | "int" | "qty" | "money" | "percent" | "center";

export interface A4Column {
  key: string;
  header: string;
  /** Excel character width. Widths should sum to roughly 90 for portrait or
   * 135 for landscape; fit-to-width shrinks anything wider. */
  width: number;
  type?: A4ColumnType;
}

/**
 * A formula template. `{key}` is the cell of column `key` on the same row;
 * `{key:range}` is that column's whole data range. So the subtotal of a line
 * is `{qty}*{price}` and a total is `SUM({subtotal:range})`. A leading "=" is
 * not written.
 */
export interface A4Formula {
  formula: string;
  /** The value the formula evaluates to, cached in the file. */
  result: number | string;
}

export type A4Cell = string | number | null | A4Formula;
export type A4Row = Record<string, A4Cell>;

export interface A4Spec {
  sheetName: string;
  title: string;
  /** Lines under the title: period, filter, who printed it, and so on. */
  subtitles: string[];
  orientation: "portrait" | "landscape";
  columns: A4Column[];
  rows: A4Row[];
  /** Optional bold rows after the data: grand totals, averages. */
  totals?: A4Row | A4Row[];
}

const MONEY_FORMAT = '"Rp" #,##0';
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFBFBFBF" } },
  left: { style: "thin", color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
  right: { style: "thin", color: { argb: "FFBFBFBF" } },
};

export function isFormula(cell: A4Cell | undefined): cell is A4Formula {
  return typeof cell === "object" && cell !== null && "formula" in cell;
}

/** `#,##0.###` would print "5." for a whole number, so pick per value. */
function qtyFormat(value: number): string {
  return Number.isInteger(value) ? "#,##0" : "#,##0.###";
}

/** Turns `{qty}*{price}` / `SUM({subtotal:range})` into real cell addresses. */
export function resolveFormula(
  template: string,
  letters: Record<string, string>,
  row: number,
  firstDataRow: number,
  lastDataRow: number
): string {
  return template.replace(/\{(\w+)(:range)?\}/g, (_m, key: string, range?: string) => {
    const col = letters[key];
    if (!col) throw new Error(`Unknown column "${key}" in formula "${template}"`);
    return range ? `${col}${firstDataRow}:${col}${lastDataRow}` : `${col}${row}`;
  });
}

function applyCell(cell: ExcelJS.Cell, type: A4ColumnType, value: A4Cell, formula?: string) {
  const numeric = isFormula(value) ? value.result : value;
  if (isFormula(value)) cell.value = { formula: formula as string, result: value.result };
  else cell.value = value;

  cell.border = BORDER;
  // Numbers right, short codes centred, prose left and wrapping.
  const horizontal =
    type === "money" || type === "int" || type === "qty" || type === "percent"
      ? "right"
      : type === "center"
        ? "center"
        : "left";
  cell.alignment = { vertical: "middle", horizontal, wrapText: type === "text" };

  if (typeof numeric !== "number") return;
  if (type === "money") cell.numFmt = MONEY_FORMAT;
  else if (type === "int") cell.numFmt = "#,##0";
  else if (type === "percent") cell.numFmt = "0.0%";
  else if (type === "qty") cell.numFmt = qtyFormat(numeric);
}

/** One or more sheets, each laid out and paginated for A4 on its own. */
export async function buildA4Workbook(specs: A4Spec | A4Spec[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kios ERP";
  wb.created = new Date();
  for (const spec of Array.isArray(specs) ? specs : [specs]) addSheet(wb, spec);

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

function addSheet(wb: ExcelJS.Workbook, spec: A4Spec) {
  const ws = wb.addWorksheet(spec.sheetName);
  ws.columns = spec.columns.map((c) => ({ key: c.key, width: c.width }));
  const lastCol = spec.columns.length;
  const letters = Object.fromEntries(spec.columns.map((c, i) => [c.key, ws.getColumn(i + 1).letter]));

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

  const firstDataRow = row;
  const lastDataRow = row + spec.rows.length - 1;

  spec.rows.forEach((data, index) => {
    const r = ws.getRow(row);
    spec.columns.forEach((c, i) => {
      const value = data[c.key] ?? null;
      const f = isFormula(value) ? resolveFormula(value.formula, letters, row, firstDataRow, lastDataRow) : undefined;
      applyCell(r.getCell(i + 1), c.type ?? "text", value, f);
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

  const totalRows = spec.totals === undefined ? [] : Array.isArray(spec.totals) ? spec.totals : [spec.totals];
  for (const totals of totalRows) {
    const r = ws.getRow(row);
    spec.columns.forEach((c, i) => {
      const cell = r.getCell(i + 1);
      const value = totals[c.key] ?? null;
      // A range over zero data rows would be backwards (H8:H7); with nothing
      // to add up, show the cached result instead of a broken formula.
      const f =
        isFormula(value) && spec.rows.length > 0
          ? resolveFormula(value.formula, letters, row, firstDataRow, lastDataRow)
          : undefined;
      applyCell(cell, c.type ?? "text", isFormula(value) && f === undefined ? value.result : value, f);
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
}

export const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
