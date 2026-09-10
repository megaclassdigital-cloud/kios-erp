"use client";

import { Download, Printer } from "lucide-react";

/** PRD 54 export: CSV covers the "Excel/CSV" requirement (opens directly in
 * Excel); "Cetak" uses the browser's native print-to-PDF, which covers the
 * PDF requirement without pulling in a PDF-generation dependency. */
export function ExportToolbar({ csvHref }: { csvHref: string }) {
  return (
    <div className="flex gap-2 print:hidden">
      <a
        href={csvHref}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </a>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
      >
        <Printer className="h-4 w-4" />
        Cetak
      </button>
    </div>
  );
}
