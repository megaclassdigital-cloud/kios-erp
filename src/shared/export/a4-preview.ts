import type { A4Cell, A4ColumnType, A4Spec } from "./a4-workbook";

/**
 * What the screen shows before a file is downloaded: the very same sheet spec
 * the XLSX is built from, turned into display text. Because both come from one
 * spec, the preview cannot disagree with the file about a row, a total or an
 * average -- only about fonts.
 */
export interface PreviewColumn {
  header: string;
  align: "left" | "right" | "center";
  /** Excel character width, reused as the relative width on screen. */
  width: number;
}

export interface PreviewSheet {
  name: string;
  title: string;
  subtitles: string[];
  orientation: "portrait" | "landscape";
  columns: PreviewColumn[];
  rows: string[][];
  totals: string[][];
}

const id = (value: number, maxFraction: number) =>
  value.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: maxFraction });

/** Cell text the way the workbook formats it: Rupiah, whole numbers, quantities
 * up to 3 decimals, percentages with one. */
export function formatCell(cell: A4Cell | undefined, type: A4ColumnType = "text"): string {
  const value = cell !== null && typeof cell === "object" && "formula" in cell ? cell.result : cell;
  if (value === null || value === undefined) return "";
  if (typeof value !== "number") return String(value);
  switch (type) {
    case "money":
      return `Rp${id(Math.round(value), 0)}`;
    case "int":
      return id(Math.round(value), 0);
    case "qty":
      return id(value, 3);
    case "percent":
      return `${id(value * 100, 1)}%`;
    default:
      return String(value);
  }
}

export function buildA4Preview(specs: A4Spec | A4Spec[]): PreviewSheet[] {
  return (Array.isArray(specs) ? specs : [specs]).map((spec) => {
    const line = (row: Record<string, A4Cell>) => spec.columns.map((c) => formatCell(row[c.key], c.type));
    const totals = spec.totals === undefined ? [] : Array.isArray(spec.totals) ? spec.totals : [spec.totals];
    return {
      name: spec.sheetName,
      title: spec.title,
      subtitles: spec.subtitles,
      orientation: spec.orientation,
      columns: spec.columns.map((c) => ({
        header: c.header,
        width: c.width,
        align: c.type === "money" || c.type === "int" || c.type === "qty" || c.type === "percent" ? "right" : c.type === "center" ? "center" : "left",
      })),
      rows: spec.rows.map(line),
      totals: totals.map(line),
    };
  });
}
