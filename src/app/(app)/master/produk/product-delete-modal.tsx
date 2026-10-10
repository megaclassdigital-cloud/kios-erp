"use client";

import { useState } from "react";
import { toast } from "sonner";

/**
 * Confirmation before deleting a product. Says plainly what delete means here
 * (gone from the lists and the till; history and barcodes are kept), because
 * "Hapus" next to a product can otherwise read as "erase everything about it".
 */
export function ProductDeleteModal({
  product,
  onClose,
  onDeleted,
}: {
  product: { id: string; name: string; stock: number | null };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasStock = product.stock !== null && product.stock !== 0;

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus produk.");
      toast.success(`${product.name} dihapus.`);
      onDeleted();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl bg-card p-5 shadow-xl">
        <h2 className="text-base font-semibold text-foreground">Hapus produk?</h2>
        <p className="mt-2 text-sm text-foreground">
          <b>{product.name}</b> akan hilang dari Master Produk, kasir, dan daftar stok.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Riwayat penjualan dan barang masuk tetap tersimpan. Barcodenya dinonaktifkan dan tidak akan pernah dipakai ulang.
          SKU-nya tetap dicadangkan untuk produk ini.
        </p>
        {hasStock && (
          <p className="mt-3 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning-foreground">
            Stok masih {product.stock}. Kosongkan dulu lewat stok opname atau penjualan; produk dengan stok tidak bisa dihapus.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="rounded-md border border-border px-4 py-2 text-sm">
            Batal
          </button>
          <button
            onClick={remove}
            disabled={busy || hasStock}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Menghapus..." : "Ya, hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
