"use client";

import { useState } from "react";
import type { CartLine } from "./types";
import { Receipt, type ReceiptSale } from "./receipt";

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export function PaymentModal({
  shiftId,
  cart,
  grandTotal,
  onClose,
  onSuccess,
}: {
  shiftId: string;
  cart: CartLine[];
  grandTotal: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [method, setMethod] = useState<"CASH" | "CASHLESS">("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<ReceiptSale | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const idempotencyKey = useState(() => crypto.randomUUID())[0];
  const change = Math.max(0, Number(cashReceived || 0) - grandTotal);

  async function submitCheckout() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/pos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shiftId,
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: String(l.quantity),
          serviceDetail: l.serviceDetail,
        })),
        paymentMethod: method,
        cashReceived: method === "CASH" ? cashReceived : undefined,
        idempotencyKey,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Checkout gagal.");
      return;
    }
    if (method === "CASH") {
      setSuccessMessage(`Transaksi ${data.sale.transactionNumber} berhasil.`);
      setCompletedSale(data.sale);
    } else {
      setPendingSaleId(data.sale.id);
    }
  }

  async function confirmCashless() {
    if (!pendingSaleId) return;
    setLoading(true);
    const res = await fetch("/api/pos/checkout/confirm-cashless", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId: pendingSaleId, providerRef: "MANUAL-CONFIRM" }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Konfirmasi gagal.");
      return;
    }
    setSuccessMessage(`Pembayaran cashless untuk ${data.sale.transactionNumber} berhasil.`);
    setCompletedSale(data.sale);
  }

  if (completedSale) {
    return (
      <Receipt
        sale={completedSale}
        onClose={() => onSuccess(successMessage ?? "Transaksi berhasil.")}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-card p-5 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-foreground">Pembayaran</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground tabular-nums">{formatRupiah(grandTotal)}</span>
        </p>

        {!pendingSaleId && (
          <>
            <div className="mb-4 flex gap-2">
              {(["CASH", "CASHLESS"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`flex-1 rounded-md border py-2 text-sm font-medium ${
                    method === m
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {m === "CASH" ? "Cash" : "Cashless"}
                </button>
              ))}
            </div>

            {method === "CASH" && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-foreground">Uang Diterima</label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  autoFocus
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Kembalian: <span className="font-medium text-foreground tabular-nums">{formatRupiah(change)}</span>
                </p>
              </div>
            )}

            {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground"
              >
                Batal
              </button>
              <button
                onClick={submitCheckout}
                disabled={loading || (method === "CASH" && Number(cashReceived || 0) < grandTotal)}
                className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Konfirmasi"}
              </button>
            </div>
          </>
        )}

        {pendingSaleId && (
          <div className="space-y-3">
            <p className="text-sm text-warning-foreground">
              Menunggu konfirmasi pembayaran dari penyedia cashless (QRIS/Transfer/EDC).
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              onClick={confirmCashless}
              disabled={loading}
              className="w-full rounded-md bg-success py-2 text-sm font-medium text-success-foreground hover:bg-success/90 disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Simulasikan Pembayaran Diterima"}
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-md border border-border py-2 text-sm font-medium text-foreground"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
