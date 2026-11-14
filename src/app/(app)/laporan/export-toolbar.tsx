"use client";

import { Download, FileText } from "lucide-react";
import { ExportPreviewButton, exportHref } from "../export-preview";

/**
 * Preview & print, Excel, PDF and CSV for one report. All four come from the
 * same endpoint and the same sheet specs, so what is printed is what is in the
 * file. `exportUrl` is the endpoint with its period / filters, without `format`.
 */
export function ExportToolbar({ exportUrl, disabled }: { exportUrl: string; disabled?: boolean }) {
  const link = "flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted";
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <ExportPreviewButton exportUrl={exportUrl} disabled={disabled} />
      <a href={exportHref(exportUrl, "xlsx")} className={link} aria-disabled={disabled}>
        <Download className="h-4 w-4" />
        Excel
      </a>
      <a href={exportHref(exportUrl, "pdf")} className={link} aria-disabled={disabled}>
        <FileText className="h-4 w-4" />
        PDF
      </a>
      <a href={exportHref(exportUrl, "csv")} className={link} aria-disabled={disabled}>
        <Download className="h-4 w-4" />
        CSV
      </a>
    </div>
  );
}
