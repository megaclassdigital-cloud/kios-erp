"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RESET_CONFIRMATION } from "@/modules/admin/domain/transaction-reset";

interface Counts {
  sales: number;
  saleItems: number;
  payments: number;
  shifts: number;
  stockMovements: number;
  unitsToRestore: string;
  numberCounters: number;
}

const n = (v: number | string) => Number(v).toLocaleString("id-ID");

export function ResetForm() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoreStock, setRestoreStock] = useState(true);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reset-transactions");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Gagal memuat ringkasan data.");
      setCounts(data.counts);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reset-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: typed, restoreStock }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Gagal menghapus data.");
      toast.success("Data transaksi dihapus.");
      setTyped("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const empty = counts && counts.sales === 0 && counts.shifts === 0 && counts.stockMovements === 0;
  const confirmed = typed.trim().toUpperCase() === RESET_CONFIRMATION;

  return (
    <div className="max-w-xl space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Yang akan dihapus</h2>
        {counts ? (
          <dl className="mt-2 space-y-1 text-sm">
            {[
              ["Transaksi penjualan", counts.sales],
              ["Item transaksi", counts.saleItems],
              ["Pembayaran", counts.payments],
              ["Shift kasir", counts.shifts],
              ["Catatan stok dari penjualan/refund", counts.stockMovements],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="tabular-nums text-foreground">{n(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{error ?? "Memuat…"}</p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Produk, supplier, barang masuk, pembaruan stok, akun pengguna, dan audit log <b>tidak</b> disentuh.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive-soft/40 p-4">
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input type="checkbox" className="mt-1" checked={restoreStock} onChange={(e) => setRestoreStock(e.target.checked)} />
          <span>
            Kembalikan stok barang yang terjual
            {counts && restoreStock && Number(counts.unitsToRestore) !== 0 && (
              <span className="block text-xs text-muted-foreground">
                {n(counts.unitsToRestore)} unit akan ditambahkan kembali ke stok, seolah penjualan simulasi itu tidak pernah terjadi.
              </span>
            )}
            {!restoreStock && (
              <span className="block text-xs text-warning-foreground">
                Stok dibiarkan seperti sekarang (sudah berkurang oleh penjualan simulasi).
              </span>
            )}
          </span>
        </label>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground" htmlFor="konfirmasi">
            Ketik <b>{RESET_CONFIRMATION}</b> untuk melanjutkan. Ini tidak bisa dibatalkan.
          </label>
          <input
            id="konfirmasi"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="w-full rounded-md border border-input px-3 py-2 text-sm"
          />
        </div>

        {error && counts && <p className="text-sm text-destructive">{error}</p>}
        {empty && <p className="text-sm text-muted-foreground">Tidak ada data transaksi yang tersisa.</p>}

        <button
          onClick={reset}
          disabled={busy || !confirmed || !!empty}
          className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Menghapus..." : "Hapus data transaksi"}
        </button>
      </section>
    </div>
  );
}
