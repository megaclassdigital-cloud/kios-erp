"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatWibDateTime } from "@/shared/format/wib";
import { DropView, PaymentView, qty, rupiah, send } from "./types";

type DropItem = DropView["items"][number];

/** The drop-offs, newest first, each line with a Retur button for what is unsold; then the payments made. */
export function DropsList({ drops, payments, onChanged }: { drops: DropView[]; payments: PaymentView[]; onChanged: () => void }) {
  const [returning, setReturning] = useState<{ drop: DropView; item: DropItem } | null>(null);

  return (
    <div className="space-y-4">
      <section data-tour="drops-list" className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Riwayat Titipan Masuk</h2>
        {drops.length === 0 && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Belum ada titipan. Catat titipan pertama lewat formulir di atas.</p>}
        {drops.map((d) => (
          <article key={d.id} className="rounded-xl border border-border bg-card shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-2 rounded-t-xl bg-muted px-3 py-2 text-xs">
              <span className="font-mono text-foreground">{d.number}</span>
              <span className="text-muted-foreground">{d.supplierName} · {formatWibDateTime(new Date(d.createdAt))}</span>
            </header>
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] text-muted-foreground">
                <tr>
                  <th className="px-3 py-1">Barang</th>
                  <th className="px-2 py-1 text-right">Masuk</th>
                  <th className="px-2 py-1 text-right">Harga titip</th>
                  <th className="px-2 py-1 text-right">Diretur</th>
                  <th className="px-2 py-1 text-right">Sisa stok</th>
                  <th className="px-3 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((i) => {
                  const returnable = Math.max(0, Math.min(Number(i.quantity) - Number(i.quantityReturned), Number(i.onHand)));
                  return (
                    <tr key={i.id} className="border-t border-border/60">
                      <td className="px-3 py-1.5 text-foreground">{i.productName}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{qty(i.quantity)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{rupiah(i.unitCost)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{qty(i.quantityReturned)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{qty(i.onHand)}</td>
                      <td className="px-3 py-1.5 text-right">
                        <button disabled={returnable <= 0} onClick={() => setReturning({ drop: d, item: i })} title={returnable <= 0 ? "Tidak ada sisa yang bisa diretur" : "Kembalikan barang yang tidak laku"} className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
                          Retur
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {d.note && <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">Catatan: {d.note}</p>}
          </article>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Pembayaran ke Penitip</h2>
        {payments.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Belum ada pembayaran.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr><th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Penitip</th><th className="px-3 py-2">Catatan</th><th className="px-3 py-2 text-right">Jumlah</th></tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatWibDateTime(new Date(p.paidAt))}</td>
                    <td className="px-3 py-2">{p.supplierName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.note ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">{rupiah(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {returning && <ReturnModal drop={returning.drop} item={returning.item} onClose={() => setReturning(null)} onDone={onChanged} />}
    </div>
  );
}

function ReturnModal({ drop, item, onClose, onDone }: { drop: DropView; item: DropItem; onClose: () => void; onDone: () => void }) {
  const max = Math.max(0, Math.min(Number(item.quantity) - Number(item.quantityReturned), Number(item.onHand)));
  const [quantity, setQuantity] = useState(String(max));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: problem } = await send(`/api/consignment/items/${item.id}/return`, "POST", { quantity });
    setBusy(false);
    if (problem) return setError(problem);
    toast.success(`${quantity} ${item.productName} diretur ke ${drop.supplierName}. Stok berkurang.`);
    onDone();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-xl bg-card p-5 shadow-xl">
        <h2 className="text-base font-semibold text-foreground">Retur {item.productName}</h2>
        <p className="text-xs text-muted-foreground">
          Dari {drop.number} ({drop.supplierName}). Maksimal <b>{qty(max)}</b> unit: sisa stok yang belum diretur. Yang sudah terjual tidak bisa diretur, dan tetap menjadi utang.
        </p>
        <label className="block text-xs font-medium text-foreground">
          Jumlah diretur
          <input type="number" min="0" max={max} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm" />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm font-medium">Batal</button>
          <button disabled={busy} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "Memproses..." : "Retur barang"}</button>
        </div>
      </form>
    </div>
  );
}
