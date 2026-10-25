"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Eye, Printer, X } from "lucide-react";
import type { PreviewSheet } from "@/shared/export/a4-preview";

/** Rows that fit on one printed A4 page, roughly (the titles take the first
 * page's share). The screen preview is an approximation of where Excel will
 * break pages, not a guarantee. */
const ROWS_PER_PAGE = { landscape: 24, portrait: 36 } as const;
// A4 at 96 dpi.
const PAGE_PX = { landscape: { w: 1123, h: 794 }, portrait: { w: 794, h: 1123 } } as const;

function paginate(sheet: PreviewSheet): { rows: string[][]; last: boolean }[] {
  const per = ROWS_PER_PAGE[sheet.orientation];
  const pages: string[][][] = [];
  for (let i = 0; i < sheet.rows.length; i += per) pages.push(sheet.rows.slice(i, i + per));
  if (pages.length === 0) pages.push([]);
  return pages.map((rows, i) => ({ rows, last: i === pages.length - 1 }));
}

/**
 * "Preview" button for an export: opens the document as it will be laid out on
 * A4 before anything is downloaded. It reads the same sheet the Excel file is
 * built from, so what is shown is what is in the file. From the preview the
 * user can download the Excel file or print the pages (Save as PDF).
 */
export function ExportPreviewButton({
  previewUrl,
  downloadUrl,
  disabled,
}: {
  previewUrl: string;
  downloadUrl: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
      >
        <Eye className="h-4 w-4" />
        Preview
      </button>
      {open && <PreviewModal previewUrl={previewUrl} downloadUrl={downloadUrl} onClose={() => setOpen(false)} />}
    </>
  );
}

function PreviewModal({ previewUrl, downloadUrl, onClose }: { previewUrl: string; downloadUrl: string; onClose: () => void }) {
  const [sheets, setSheets] = useState<PreviewSheet[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(previewUrl)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "Preview belum bisa dimuat.");
        if (!cancelled) setSheets(d.sheets);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  const sheet = sheets?.[tab];

  // Fit the page to the window instead of making a tablet scroll sideways.
  useEffect(() => {
    if (!sheet || !viewport.current) return;
    const el = viewport.current;
    const fit = () => setZoom(Math.min(1, (el.clientWidth - 24) / PAGE_PX[sheet.orientation].w));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sheet]);

  const pages = sheet ? paginate(sheet) : [];
  const widthSum = sheet?.columns.reduce((a, c) => a + c.width, 0) ?? 1;

  // In <body>, outside the page, so printing can drop the page and keep only this.
  return createPortal(
    <div data-print-flow className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-3 print:block">
      {/* The page size for "Save as PDF" follows the sheet shown. */}
      {sheet && <style>{`@media print { @page { size: A4 ${sheet.orientation}; margin: 8mm; } }`}</style>}
      <div className="flex max-h-[95vh] w-full max-w-6xl flex-col rounded-xl bg-card shadow-xl print:block print:max-h-none print:max-w-none print:shadow-none">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 print:hidden">
          <h2 className="mr-auto text-sm font-semibold text-foreground">
            Preview dokumen A4{sheet ? ` — ${pages.length} halaman (perkiraan)` : ""}
          </h2>
          {sheets && sheets.length > 1 && (
            <div className="flex gap-1">
              {sheets.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => setTab(i)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${i === tab ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground"}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => window.print()}
            disabled={!sheet}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
            title="Pilih 'Simpan sebagai PDF' di jendela cetak"
          >
            <Printer className="h-4 w-4" />
            Cetak / PDF
          </button>
          <a
            href={downloadUrl}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Download className="h-4 w-4" />
            Download Excel
          </a>
          <button onClick={onClose} aria-label="Tutup" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={viewport} className="min-h-0 flex-1 overflow-auto bg-muted p-3 print:block print:max-h-none print:overflow-visible print:bg-white print:p-0">
          {error && <p className="p-4 text-sm text-destructive">{error}</p>}
          {!sheets && !error && <p className="p-4 text-sm text-muted-foreground">Menyiapkan preview...</p>}
          {sheet && (
            <div className="mx-auto print:w-full!" style={{ width: PAGE_PX[sheet.orientation].w * zoom }}>
              <div style={{ zoom }} className="space-y-4 print:[zoom:1]! print:space-y-0">
                {pages.map((page, index) => (
                  <section
                    key={index}
                    style={{ width: PAGE_PX[sheet.orientation].w, minHeight: PAGE_PX[sheet.orientation].h }}
                    className="flex flex-col bg-white p-8 text-[11px] text-gray-900 shadow-md print:min-h-0! print:w-full! print:break-after-page print:p-0 print:shadow-none"
                  >
                    {index === 0 && (
                      <header className="mb-3">
                        <h3 className="text-base font-bold">{sheet.title}</h3>
                        {sheet.subtitles.map((line) => (
                          <p key={line} className="text-[10px] text-gray-500">{line}</p>
                        ))}
                      </header>
                    )}
                    <table className="w-full table-fixed border-collapse">
                      <colgroup>
                        {sheet.columns.map((c) => (
                          <col key={c.header} style={{ width: `${(c.width / widthSum) * 100}%` }} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr>
                          {sheet.columns.map((c) => (
                            <th key={c.header} className="border border-gray-300 bg-[#1F4E78] px-1.5 py-1 text-center font-semibold text-white">
                              {c.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {page.rows.map((row, r) => (
                          <tr key={r} className={r % 2 === 1 ? "bg-[#F3F6FA]" : ""}>
                            {row.map((cell, c) => (
                              <td key={c} style={{ textAlign: sheet.columns[c].align }} className="break-words border border-gray-300 px-1.5 py-1">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {sheet.rows.length === 0 && (
                          <tr>
                            <td colSpan={sheet.columns.length} className="border border-gray-300 px-2 py-3 italic text-gray-500">
                              Tidak ada data pada periode / filter ini.
                            </td>
                          </tr>
                        )}
                        {page.last &&
                          sheet.totals.map((row, t) => (
                            <tr key={`t${t}`} className="bg-[#DDEBF7] font-bold">
                              {row.map((cell, c) => (
                                <td key={c} style={{ textAlign: sheet.columns[c].align }} className="border border-gray-300 px-1.5 py-1">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    <footer className="mt-auto flex justify-between pt-3 text-[9px] text-gray-500">
                      <span>Kios ERP</span>
                      <span>Halaman {index + 1} dari {pages.length}</span>
                    </footer>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
