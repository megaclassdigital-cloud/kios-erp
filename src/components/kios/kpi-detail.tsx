"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export interface DetailColumn {
  header: string;
  align?: "left" | "right";
}

export interface DetailRow {
  cells: string[];
  /** Highlight a row (a total, say). */
  bold?: boolean;
  /** Makes the row a link to where the thing can be changed. */
  href?: string;
}

/**
 * Makes a KPI card clickable: wraps the card and opens a window listing what
 * the number is made of. The rows are worked out on the server, when the page
 * is built, so opening it is instant and shows exactly the figures on the
 * card (same data, same moment).
 */
export function KpiDetail({
  title,
  description,
  columns,
  rows,
  footerHref,
  footerLabel,
  emptyText = "Tidak ada data.",
  note,
  children,
}: {
  title: string;
  description?: string;
  columns: DetailColumn[];
  rows: DetailRow[];
  footerHref?: string;
  footerLabel?: string;
  emptyText?: string;
  /** Said under the table, e.g. "Menampilkan 100 terbaru". */
  note?: string;
  /** The KpiCard (rendered with `interactive`). */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="group block h-full w-full rounded-xl text-left outline-none">
        {children}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 print:hidden"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-card shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-border p-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">{title}</h2>
                {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
              </div>
              <button onClick={() => setOpen(false)} aria-label="Tutup" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {rows.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">{emptyText}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                    <tr>
                      {columns.map((c) => (
                        <th key={c.header} className={`px-3 py-2 ${c.align === "right" ? "text-right" : "text-left"}`}>
                          {c.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={`border-t border-border ${row.bold ? "bg-muted/50 font-semibold" : ""}`}>
                        {row.cells.map((cell, j) => (
                          <td key={j} className={`px-3 py-2 ${columns[j]?.align === "right" ? "text-right tabular-nums" : ""}`}>
                            {j === 0 && row.href ? (
                              <Link href={row.href} className="text-primary hover:underline">{cell}</Link>
                            ) : (
                              cell
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {(note || footerHref) && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3 text-xs">
                <span className="text-muted-foreground">{note}</span>
                {footerHref && (
                  <Link href={footerHref} className="font-medium text-primary hover:underline">
                    {footerLabel ?? "Buka halaman lengkap"} →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** A KPI card that jumps to a place on this page or another (a link, not a window). */
export function KpiLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group block h-full rounded-xl outline-none">
      {children}
    </Link>
  );
}
