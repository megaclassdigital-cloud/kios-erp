"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { STOCK_OUT_REASONS, type StockOutReason } from "@/modules/inventory/domain/stock-out";
import { StockOutHistory } from "./stock-out-history";

interface PickedProduct {
  id: string;
  name: string;
  sku: string;
  baseUnit: string;
  currentStock: string;
}

const input = "w-full rounded-md border border-input px-3 py-2 text-sm";

export function StockOutForm() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<PickedProduct[]>([]);
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<StockOutReason>("RUSAK");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  // Search as the cashier types or a scanner types for them: name, SKU or an
  // exact barcode.
  useEffect(() => {
    if (product || query.trim().length < 2) {
      setMatches([]);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/stock-out/products?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => setMatches(d.products ?? []))
        .catch(() => setMatches([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, product]);

  const reset = useCallback(() => {
    setProduct(null);
    setQuery("");
    setQuantity("");
    setNote("");
    setReason("RUSAK");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity, reason, note: note || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan pengeluaran barang.");
        return;
      }
      toast.success(`${product.name}: stok berkurang ${quantity} ${product.baseUnit}.`);
      reset();
      setHistoryKey((k) => k + 1);
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const remaining = product ? Number(product.currentStock) - Number(quantity || 0) : 0;

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Barang</label>
          {product ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm">
              <span>
                <b>{product.name}</b> <span className="text-muted-foreground">({product.sku}) · stok {Number(product.currentStock).toLocaleString("id-ID")} {product.baseUnit}</span>
              </span>
              <button type="button" onClick={reset} className="text-xs text-primary hover:underline">Ganti</button>
            </div>
          ) : (
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik nama / SKU, atau scan barcode"
                className={input}
              />
              {matches.length > 0 && (
                <ul className="mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-card text-sm shadow-sm">
                  {matches.map((m) => (
                    <li key={m.id}>
                      <button type="button" onClick={() => setProduct(m)} className="flex w-full justify-between px-3 py-2 text-left hover:bg-muted">
                        <span>{m.name} <span className="text-muted-foreground">({m.sku})</span></span>
                        <span className="tabular-nums text-muted-foreground">stok {Number(m.currentStock).toLocaleString("id-ID")}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Jumlah keluar</label>
            <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={input} required />
            {product && Number(quantity) > 0 && (
              <p className={`mt-1 text-xs ${remaining < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {remaining < 0 ? "Melebihi stok yang ada." : `Sisa stok: ${remaining.toLocaleString("id-ID")} ${product.baseUnit}`}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Alasan</label>
            <select value={reason} onChange={(e) => setReason(e.target.value as StockOutReason)} className={input}>
              {Object.entries(STOCK_OUT_REASONS).map(([key, r]) => (
                <option key={key} value={key}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Catatan{STOCK_OUT_REASONS[reason].noteRequired ? " (wajib)" : ""}
            </label>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={input} required={STOCK_OUT_REASONS[reason].noteRequired} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy || !product || !(Number(quantity) > 0) || remaining < 0}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? "Menyimpan..." : "Catat Barang Keluar"}
        </button>
      </form>

      <StockOutHistory refreshKey={historyKey} />
    </div>
  );
}
