"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductPicker, serverSearch, type PickerItem } from "../product-picker";
import { rupiah, send } from "./types";

/**
 * "Catat penjualan susulan": consigned goods that sold but were never rung up
 * at the till. Stock goes down and the units are added to what is owed, the
 * same as if they had been scanned. It creates no sale, so takings are unchanged.
 */
export function CatchUpForm({ suppliers, onSaved }: { suppliers: { id: string; name: string }[]; onSaved: () => void }) {
  const [supplierId, setSupplierId] = useState("");
  const [product, setProduct] = useState<PickerItem | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [soldAt, setSoldAt] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = useMemo(() => (supplierId ? serverSearch("consignment", `&consignorId=${encodeURIComponent(supplierId)}`) : async () => []), [supplierId]);
  const cost = Number(product?.purchasePrice ?? 0);
  const price = Number(product?.sellingPrice ?? 0);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product?.id) return;
    setBusy(true);
    setError(null);
    const { error: problem, data } = await send("/api/consignment/catchup", "POST", {
      productId: product.id,
      quantity,
      soldAt: soldAt ? new Date(`${soldAt}T12:00:00`).toISOString() : undefined,
      note: note || undefined,
    });
    setBusy(false);
    if (problem) return setError(problem);
    toast.success(`Tercatat. Stok ${String(data.productName)} berkurang ${quantity}, utang bertambah ${rupiah(String(data.owed))}.`);
    setProduct(null);
    setQuantity("1");
    setNote("");
    setSoldAt("");
    onSaved();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Catat Penjualan Susulan</h2>
        <p className="text-xs text-muted-foreground">
          Untuk barang titipan yang sudah laku tetapi kemarin tidak sempat dikasir. Stok berkurang dan utang ke penitip bertambah. Ini tidak membuat transaksi kasir, jadi omzet di Keuangan tidak berubah.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-medium text-foreground">
          Penitip
          <select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setProduct(null);
            }}
            className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
          >
            <option value="">Pilih penitip</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-foreground">
          Tanggal terjual (opsional)
          <input type="date" max={today} value={soldAt} onChange={(e) => setSoldAt(e.target.value)} className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm" />
        </label>
      </div>

      {supplierId ? (
        <ProductPicker label="Cari barang titipan" hint="Ketik nama atau scan barcode barang yang sudah terjual." search={search} onPick={setProduct} />
      ) : (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Pilih penitip dulu untuk mencari barangnya.</p>
      )}

      {product && (
        <div className="grid items-end gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_8rem_auto]">
          <div className="text-sm text-foreground">
            <p className="font-medium">{product.name}</p>
            <p className="text-xs text-muted-foreground">Harga titip {rupiah(cost)} · harga jual {rupiah(price)} · margin {rupiah(price - cost)} / unit</p>
          </div>
          <label className="block text-xs font-medium text-foreground">
            Jumlah terjual
            <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm" />
          </label>
          <p className="text-sm font-semibold tabular-nums text-foreground">Utang {rupiah(Number(quantity || 0) * cost)}<span className="block text-xs font-normal text-success">Untung toko {rupiah(Number(quantity || 0) * (price - cost))}</span></p>
          <label className="block text-xs font-medium text-foreground md:col-span-3">
            Catatan (opsional)
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Mis. terjual Sabtu, lupa dikasir" className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm" />
          </label>
        </div>
      )}

      {error && <p className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>}
      <button disabled={busy || !product} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {busy ? "Menyimpan..." : "Catat penjualan"}
      </button>
    </form>
  );
}
