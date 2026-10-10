"use client";

import { X } from "lucide-react";
import { ReceivingHistory } from "../../barang-masuk/receiving-history";

/** Every delivery of one product, so the person looking at Master Produk can
 * see when it came in, at what cost and with what expiry, without leaving. */
export function ProductReceivingHistoryModal({
  productId,
  productName,
  onClose,
  onChanged,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">{productName}</h2>
          <button onClick={onClose} aria-label="Tutup" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ReceivingHistory productId={productId} defaultPeriod="year" onChanged={onChanged} />
      </div>
    </div>
  );
}
