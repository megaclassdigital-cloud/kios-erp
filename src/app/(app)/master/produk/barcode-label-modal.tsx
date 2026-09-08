"use client";

import { BarcodePreview } from "./barcode-preview";

/** PRD 42: every internal/manufacturer barcode must be previewable,
 * printable, and reprintable at any time — not just right after a product
 * is created. */
export function BarcodeLabelModal({
  productName,
  barcodeValue,
  onClose,
}: {
  productName: string;
  barcodeValue: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xs rounded-lg bg-white p-5 shadow-xl">
        <div data-print-area className="text-center">
          <p className="mb-2 text-sm font-medium text-gray-900">{productName}</p>
          <div className="flex justify-center">
            <BarcodePreview
              value={barcodeValue}
              format={barcodeValue.startsWith("KERP") ? "CODE128" : "EAN13"}
            />
          </div>
        </div>
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
