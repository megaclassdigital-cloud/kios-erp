"use client";

import { useState } from "react";
import { BarcodePreview } from "./barcode-preview";
import { buildLabelPng, downloadBlob } from "./barcode-label-file";

const PAPER_SIZES = [
  { id: "thermal-58x40", label: "Label Thermal 58 × 40 mm", widthMm: 58, heightMm: 40, kind: "single" as const },
  { id: "thermal-50x30", label: "Label Thermal 50 × 30 mm", widthMm: 50, heightMm: 30, kind: "single" as const },
  { id: "thermal-40x30", label: "Label Thermal 40 × 30 mm", widthMm: 40, heightMm: 30, kind: "single" as const },
  { id: "a4-sheet", label: "A4 — banyak label sekaligus", widthMm: 210, heightMm: 297, kind: "sheet" as const },
];

const SHEET_COLUMNS = 3;
const SHEET_MARGIN_MM = 10;

/**
 * Paper-size picker + preview + Cetak (browser print) + Unduh PNG (a real
 * file at 300dpi, sized to the physical paper) — shared by the Master
 * Produk list's reprint modal and the "just generated" preview right
 * after creating a product, so both paths offer the same capability
 * instead of print-only in one place and preview-only in the other
 * (PRD 42: preview, print, reprint, download).
 */
export function BarcodeLabelPrinter({
  productName,
  barcodeValue,
  barcodeType,
}: {
  productName: string;
  barcodeValue: string;
  barcodeType: "CODE128" | "EAN13";
}) {
  const [paperId, setPaperId] = useState(PAPER_SIZES[0].id);
  const [quantity, setQuantity] = useState(12);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const paper = PAPER_SIZES.find((p) => p.id === paperId) ?? PAPER_SIZES[0];

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const blob = await buildLabelPng({
        productName,
        barcodeValue,
        barcodeType,
        widthMm: paper.widthMm,
        heightMm: paper.heightMm,
        sheet: paper.kind === "sheet" ? { quantity, columns: SHEET_COLUMNS, marginMm: SHEET_MARGIN_MM } : undefined,
      });
      downloadBlob(blob, `barcode-${barcodeValue}-${paper.id}.png`);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Gagal membuat file unduhan.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <style>{`@page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: ${
        paper.kind === "sheet" ? `${SHEET_MARGIN_MM}mm` : "2mm"
      }; }`}</style>

      <div className="mb-3 space-y-3 print:hidden">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">UKURAN KERTAS</label>
          <select
            value={paperId}
            onChange={(e) => setPaperId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {PAPER_SIZES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {paper.kind === "sheet" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">JUMLAH LABEL</label>
            <input
              type="number"
              min={1}
              max={200}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {paper.kind === "sheet" ? (
        <div data-print-area className="grid grid-cols-3 gap-2">
          {Array.from({ length: quantity }).map((_, i) => (
            <div key={i} className="rounded border border-dashed border-gray-300 p-1.5 text-center">
              <p className="truncate text-[9px] font-medium text-gray-900">{productName}</p>
              <BarcodePreview value={barcodeValue} format={barcodeType} />
            </div>
          ))}
        </div>
      ) : (
        <div data-print-area className="text-center">
          <p className="mb-1 text-sm font-medium text-gray-900">{productName}</p>
          <BarcodePreview value={barcodeValue} format={barcodeType} />
        </div>
      )}

      {downloadError && <p className="mt-2 text-xs text-red-600 print:hidden">{downloadError}</p>}

      <div className="mt-4 flex gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cetak
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {downloading ? "Membuat file..." : "Unduh PNG"}
        </button>
      </div>
    </div>
  );
}
