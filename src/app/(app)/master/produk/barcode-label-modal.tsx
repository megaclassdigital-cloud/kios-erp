"use client";

import { BarcodeLabelPrinter } from "./barcode-label-printer";

/** PRD 42: every internal/manufacturer barcode must be previewable,
 * printable, reprintable, and downloadable at any time — not just right
 * after a product is created. */
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
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-2 flex items-center justify-between print:hidden">
          <h2 className="text-sm font-semibold text-gray-900">Barcode Produk</h2>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
            Tutup
          </button>
        </div>
        <BarcodeLabelPrinter productName={productName} barcodeValue={barcodeValue} barcodeType={barcodeType} />
      </div>
    </div>
  );
}
