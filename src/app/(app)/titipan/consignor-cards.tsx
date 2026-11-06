"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConsignorView, qty, rupiah, send } from "./types";

/** One card per consignor: what is owed, what sold, what is left, and a way to pay. */
export function ConsignorCards({ consignors, onChanged }: { consignors: ConsignorView[]; onChanged: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [paying, setPaying] = useState<ConsignorView | null>(null);

  if (consignors.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Belum ada penitip. Tandai produk sebagai <b>Barang titipan</b> di Master Produk dan pilih penitipnya, lalu catat titipan pertama di bawah.
      </p>
    );
  }

  return (
    <div data-tour="consignor-cards" className="grid gap-3 md:grid-cols-2">
      {consignors.map((c) => {
        const owed = Number(c.balance);
        return (
          <article key={c.consignorId} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <header className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
              <button onClick={() => setOpen(open === c.consignorId ? null : c.consignorId)} className="text-xs text-primary hover:underline">
                {open === c.consignorId ? "Tutup rincian" : "Rincian barang"}
              </button>
            </header>

            <p className="mt-2 text-xs text-muted-foreground">{owed < 0 ? "Kelebihan bayar" : "Utang ke penitip"}</p>
            <p className={`text-2xl font-semibold tabular-nums ${owed > 0 ? "text-destructive" : "text-foreground"}`}>{rupiah(Math.abs(owed))}</p>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Terjual</dt>
              <dd className="text-right tabular-nums">{qty(c.soldUnits)} unit · {rupiah(c.soldCost)}</dd>
              <dt className="text-muted-foreground">Sudah dibayar</dt>
              <dd className="text-right tabular-nums">{rupiah(c.paid)}</dd>
              <dt className="text-muted-foreground">Sisa di toko</dt>
              <dd className="text-right tabular-nums">{qty(c.onHandUnits)} unit</dd>
              <dt className="text-muted-foreground">Diretur</dt>
              <dd className="text-right tabular-nums">{qty(c.returnedUnits)} unit</dd>
            </dl>

            {open === c.consignorId && (
              <table className="mt-3 w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1">Barang</th>
                    <th className="py-1 text-right">Masuk</th>
                    <th className="py-1 text-right">Retur</th>
                    <th className="py-1 text-right">Terjual</th>
                    <th className="py-1 text-right">Sisa</th>
                    <th className="py-1 text-right">Utang</th>
                  </tr>
                </thead>
                <tbody>
                  {c.products.map((p) => (
                    <tr key={p.productId} className="border-t border-border">
                      <td className="py-1 text-foreground">{p.name}</td>
                      <td className="py-1 text-right tabular-nums">{qty(p.received)}</td>
                      <td className="py-1 text-right tabular-nums">{qty(p.returned)}</td>
                      <td className="py-1 text-right tabular-nums">{qty(p.sold)}</td>
                      <td className="py-1 text-right tabular-nums">{qty(p.onHand)}</td>
                      <td className="py-1 text-right tabular-nums">{rupiah(p.owed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <button
              disabled={owed <= 0}
              onClick={() => setPaying(c)}
              className="mt-3 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
            >
              Bayar penitip
            </button>
          </article>
        );
      })}

      {paying && <PayModal consignor={paying} onClose={() => setPaying(null)} onDone={onChanged} />}
    </div>
  );
}

function PayModal({ consignor, onClose, onDone }: { consignor: ConsignorView; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(Math.round(Number(consignor.balance))));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: problem } = await send("/api/consignment/payments", "POST", { supplierId: consignor.consignorId, amount, note: note || undefined });
    setBusy(false);
    if (problem) return setError(problem);
    toast.success(`Pembayaran ke ${consignor.name} dicatat.`);
    onDone();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-xl bg-card p-5 shadow-xl">
        <h2 className="text-base font-semibold text-foreground">Bayar {consignor.name}</h2>
        <p className="text-xs text-muted-foreground">
          Utang saat ini {rupiah(consignor.balance)} (terjual × harga titip, dikurangi yang sudah dibayar). Ini bukan pengeluaran: modalnya sudah dihitung saat barang terjual.
        </p>
        <label className="block text-xs font-medium text-foreground">
          Jumlah dibayar (Rp)
          <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm" />
        </label>
        <label className="block text-xs font-medium text-foreground">
          Catatan (opsional)
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm" />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm font-medium">Batal</button>
          <button disabled={busy} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "Menyimpan..." : "Catat pembayaran"}</button>
        </div>
      </form>
    </div>
  );
}
