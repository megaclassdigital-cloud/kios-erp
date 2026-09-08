"use client";

/** PRD 54 export: CSV covers the "Excel/CSV" requirement (opens directly in
 * Excel); "Cetak" uses the browser's native print-to-PDF, which covers the
 * PDF requirement without pulling in a PDF-generation dependency. */
export function ExportToolbar({ csvHref }: { csvHref: string }) {
  return (
    <div className="flex gap-2 print:hidden">
      <a
        href={csvHref}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Export CSV
      </a>
      <button
        onClick={() => window.print()}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Cetak
      </button>
    </div>
  );
}
