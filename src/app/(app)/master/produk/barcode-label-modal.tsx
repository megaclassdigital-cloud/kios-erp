"use client";

import { useState } from "react";
import { BarcodePreview } from "./barcode-preview";

const PAPER_SIZES = [
  { id: "thermal-58x40", label: "Label Thermal 58 × 40 mm", widthMm: 58, heightMm: 40, kind: "single" as const },
  { id: "thermal-50x30", label: "Label Thermal 50 × 30 mm", widthMm: 50, heightMm: 30, kind: "single" as const },
  { id: "thermal-40x30", label: "Label Thermal 40 × 30 mm", widthMm: 40, heightMm: 30, kind: "single" as const },
  { id: "a4-sheet", label: "A4 — banyak label sekaligus", widthMm: 210, heightMm: 297, kind: "sheet" as const },
];

/** PRD 42: every internal/manufacturer barcode must be previewable,
 * printable, and reprintable at any time — and, since a real kios prints
 * onto whatever it has on hand (a thermal label roll for shelf tags, A4
 * for a batch of new labels), onto more than one fixed paper size. The
 * @page rule is generated per selection since CSS can't express "pick one
 * of these sizes" any other way — the browser's print dialog then just
 * needs "actual size" for the physical paper to come out correctly. */
export function BarcodeLabelModal({
  productName,
  barcodeValue,
  barcodeType,
  onClose,
}: {
  productName: string;
  barcodeValue: string;
  barcodeType: "CODE128" | "EAN13";
  onClose: () => void;
}) {
  const [paperId, setPaperId] = useState(PAPER_SIZES[0].id);
  const [quantity, setQuantity] = useState(12);
  const paper = PAPER_SIZES.find((p) => p.id === paperId) ?? PAPER_SIZES[0];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <style>{`@page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: ${
        paper.kind === "sheet" ? "10mm" : "2mm"
      }; }`}</style>

      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 space-y-3 print:hidden">
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

        <div className="mt-4 flex gap-2 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700"
          >
            Tutup
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Cetak
          </button>
        </div>
      </div>
    </div>
  );
}
