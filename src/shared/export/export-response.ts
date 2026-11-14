import { NextResponse } from "next/server";
import { buildA4Preview } from "./a4-preview";
import { buildA4Pdf } from "./a4-pdf";
import { XLSX_CONTENT_TYPE, buildA4Workbook, isFormula, type A4Spec } from "./a4-workbook";

export type ExportFormat = "preview" | "xlsx" | "pdf" | "csv";

export function parseExportFormat(value: string | null, fallback: ExportFormat = "xlsx"): ExportFormat {
  return value === "preview" || value === "xlsx" || value === "pdf" || value === "csv" ? value : fallback;
}

function csvCell(value: string | number | null): string {
  const s = value === null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Plain values (numbers stay numbers, formulas give their result); several sheets are stacked with a blank line between. */
export function specsToCsv(specs: A4Spec[]): string {
  const blocks = specs.map((spec) => {
    const value = (cell: unknown) => (isFormula(cell as never) ? (cell as { result: number | string }).result : ((cell as string | number | null | undefined) ?? null));
    const line = (row: Record<string, unknown>) => spec.columns.map((c) => csvCell(value(row[c.key]))).join(",");
    const totals = spec.totals === undefined ? [] : Array.isArray(spec.totals) ? spec.totals : [spec.totals];
    return [
      csvCell(spec.title),
      ...spec.subtitles.map(csvCell),
      spec.columns.map((c) => csvCell(c.header)).join(","),
      ...spec.rows.map(line),
      ...totals.map(line),
    ].join("\r\n");
  });
  // BOM so Excel opens UTF-8 (Rp, accents) correctly.
  return "﻿" + blocks.join("\r\n\r\n");
}

/**
 * The one way every report endpoint answers: the same sheet specs become the
 * on-screen preview (which is also what gets printed), the Excel file, the PDF
 * and the CSV, so the four can never disagree about a figure.
 */
export async function respondWithSpecs(specs: A4Spec[], format: ExportFormat, fileBase: string): Promise<NextResponse> {
  if (format === "preview") return NextResponse.json({ sheets: buildA4Preview(specs) });
  const headers = (type: string, ext: string) => ({
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="${fileBase}.${ext}"`,
    "Cache-Control": "no-store",
  });
  if (format === "pdf") {
    const pdf = await buildA4Pdf(buildA4Preview(specs));
    return new NextResponse(new Uint8Array(pdf), { headers: headers("application/pdf", "pdf") });
  }
  if (format === "csv") {
    return new NextResponse(specsToCsv(specs), { headers: headers("text/csv; charset=utf-8", "csv") });
  }
  const file = await buildA4Workbook(specs);
  return new NextResponse(new Uint8Array(file), { headers: headers(XLSX_CONTENT_TYPE, "xlsx") });
}
