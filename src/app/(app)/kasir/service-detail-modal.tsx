"use client";

import { useState } from "react";
import type { ServiceDetailInput } from "./types";

interface ScannedServiceProduct {
  id: string;
  name: string;
  sellingPrice: string;
  serviceType: "PULSA" | "TOKEN_LISTRIK";
  serviceProvider: string | null;
}

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

/** PRD 46: after scanning a service (pulsa/token) product, the cashier must
 * fill the customer's phone/meter number before it can enter the cart —
 * provider and nominal are read-only, taken straight from the product. */
export function ServiceDetailModal({
  product,
  onCancel,
  onConfirm,
}: {
  product: ScannedServiceProduct;
  onCancel: () => void;
  onConfirm: (detail: ServiceDetailInput) => void;
}) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPulsa = product.serviceType === "PULSA";

  function handleConfirm() {
    if (isPulsa && !phoneNumber.trim()) {
      setError("Nomor HP wajib diisi.");
      return;
    }
    if (!isPulsa && (!meterNumber.trim() || !customerNumber.trim())) {
      setError("Nomor meter dan nomor pelanggan wajib diisi.");
      return;
    }
    onConfirm(
      isPulsa
        ? { phoneNumber: phoneNumber.trim() }
        : { meterNumber: meterNumber.trim(), customerNumber: customerNumber.trim() }
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-5 shadow-xl">
        <h2 className="mb-1 text-base font-semibold text-foreground">
          {isPulsa ? "Isi Pulsa" : "Token Listrik"}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">{product.name}</p>

        <div className="mb-4 grid grid-cols-2 gap-3 rounded-md bg-muted p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Provider</p>
            <p className="font-medium text-foreground">{product.serviceProvider ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nominal</p>
            <p className="font-medium text-foreground tabular-nums">{formatRupiah(Number(product.sellingPrice))}</p>
          </div>
        </div>

        {isPulsa ? (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-foreground">Nomor HP</label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              autoFocus
              placeholder="08xxxxxxxxxx"
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div className="mb-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Nomor Meter</label>
              <input
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                autoFocus
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Nomor Pelanggan</label>
              <input
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Tambah ke Keranjang
          </button>
        </div>
      </div>
    </div>
  );
}
