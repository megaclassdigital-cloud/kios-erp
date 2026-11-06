"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ProductPicker, serverSearch, type PickerItem } from "../product-picker";
import { rupiah, send } from "./types";

interface Line {
  productId: string;
  name: string;
  quantity: string;
  unitCost: string;
  sellingPrice: string;
}

/**
 * "Terima titipan baru": choose the consignor, pick their goods by name or
 * barcode, give the quantity and the price they set. Only products marked as
 * that consignor's consignment goods can be picked, so nothing here can add
 * stock to a product that belongs to the shop.
 */
export function DropForm({ suppliers, onSaved }: { suppliers: { id: string; name: string }[]; onSaved: () => void }) {
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = useMemo(() => (supplierId ? serverSearch("consignment", `&consignorId=${encodeURIComponent(supplierId)}`) : async () => []), [supplierId]);

  function add(item: PickerItem) {
    if (!item.id) return;
    if (lines.some((l) => l.productId === item.id)) return void toast.info(`${item.name} sudah ada di daftar. Ubah jumlahnya di sana.`);
    setLines((prev) => [...prev, { productId: item.id!, name: item.name, quantity: "1", unitCost: String(Math.round(Number(item.purchasePrice ?? 0))), sellingPrice: String(Math.round(Number(item.sellingPrice ?? 0))) }]);
  }
  const update = (id: string, patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.productId === id ? { ...l, ...patch } : l)));
  const total = lines.reduce((sum, l) => sum + Number(l.quantity || 0) * Number(l.unitCost || 0), 0);
  const totalSales = lines.reduce((sum, l) => sum + Number(l.quantity || 0) * Number(l.sellingPrice || 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: problem, data } = await send("/api/consignment", "POST", {
      supplierId,
      note: note || undefined,
      lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost, sellingPrice: l.sellingPrice })),
    });
    setBusy(false);
    if (problem) return setError(problem);
    const consignment = data.consignment as { number: string };
    toast.success(`Titipan ${consignment.number} tersimpan. Stok sudah bertambah.`);
    for (const w of (data.warnings as string[]) ?? []) toast.warning(w, { duration: 10000 });
    setLines([]);
    setNote("");
    onSaved();
  }

  return (
    <form data-tour="drop-form" onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Terima Titipan Baru</h2>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-medium text-foreground">
          Penitip (sales)
          <select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setLines([]); // another consignor, another set of goods
            }}
            required
            className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
          >
            <option value="">Pilih penitip</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
            Penitip belum ada? Tambahkan di <Link href="/master/supplier" className="text-primary hover:underline">Supplier</Link>.
          </span>
        </label>
        <label className="block text-xs font-medium text-foreground">
          Catatan (opsional)
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm" placeholder="Mis. nota sales No. 123" />
        </label>
      </div>

      {supplierId ? (
        <ProductPicker
          label="Cari barang titipan"
          hint="Hanya barang yang ditandai sebagai titipan dari penitip ini. Barang belum terdaftar? Daftarkan di Master Produk dengan pilihan Barang titipan."
          search={search}
          onPick={add}
        />
      ) : (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Pilih penitip dulu untuk mencari barangnya.</p>
      )}

      {lines.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Barang</th>
                <th className="px-3 py-2">Jumlah</th>
                <th className="px-3 py-2">Harga titip / unit</th>
                <th className="px-3 py-2">Harga jual / unit</th>
                <th className="px-3 py-2 text-right">Margin / unit</th>
                <th className="px-3 py-2 text-right">Nilai titip</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.productId} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{l.name}</td>
                  <td className="px-3 py-2"><input type="number" min="0" step="any" value={l.quantity} onChange={(e) => update(l.productId, { quantity: e.target.value })} aria-label="Jumlah" className="w-20 rounded border border-input px-2 py-1" /></td>
                  <td className="px-3 py-2"><input type="number" min="0" value={l.unitCost} onChange={(e) => update(l.productId, { unitCost: e.target.value })} aria-label="Harga titip" className="w-28 rounded border border-input px-2 py-1" /></td>
                  <td className="px-3 py-2"><input type="number" min="0" value={l.sellingPrice} onChange={(e) => update(l.productId, { sellingPrice: e.target.value })} aria-label="Harga jual" className="w-28 rounded border border-input px-2 py-1" /></td>
                  <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${Number(l.sellingPrice || 0) <= Number(l.unitCost || 0) ? "font-medium text-destructive" : "text-success"}`}>
                    {rupiah(Number(l.sellingPrice || 0) - Number(l.unitCost || 0))}
                    {Number(l.sellingPrice) > 0 && <span className="block text-[11px] font-normal">{Math.round(((Number(l.sellingPrice) - Number(l.unitCost || 0)) / Number(l.sellingPrice)) * 100)}%</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{rupiah(Number(l.quantity || 0) * Number(l.unitCost || 0))}</td>
                  <td className="px-3 py-2 text-right"><button type="button" onClick={() => setLines((p) => p.filter((x) => x.productId !== l.productId))} className="text-xs text-destructive hover:underline">Hapus</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/50 font-semibold">
                <td className="px-3 py-2" colSpan={5}>
                  Jika semua terjual: bayar ke penitip {rupiah(total)} · penjualan {rupiah(totalSales)} · untung toko {rupiah(totalSales - total)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{rupiah(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            Harga titip menjadi harga beli barang ini, jadi modal saat terjual mengikuti harga sales. Harga jual yang Anda ubah di sini ikut mengubah harga jual di Master Produk. Margin dihitung otomatis dari selisihnya. Belum menjadi utang: utang baru muncul saat barangnya terjual.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <button disabled={busy || !supplierId || lines.length === 0} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
        {busy ? "Menyimpan..." : "Simpan Titipan"}
      </button>
    </form>
  );
}
