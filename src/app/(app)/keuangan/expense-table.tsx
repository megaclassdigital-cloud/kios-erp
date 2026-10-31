"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/kios/empty-state";
import { ExpenseEditModal, ExpenseMoveModal, type ExpenseRow } from "./expense-modals";

const LABEL: Record<string, string> = {
  SUPPLIER: "Supplier (tidak dipakai lagi)",
  ELECTRICITY: "Listrik & Air",
  TRANSPORT: "Transportasi & Bensin",
  SALARY: "Gaji Karyawan",
  OPERATIONAL: "Operasional Toko",
  OTHER: "Lain-lain",
};
const rupiah = (v: string) => `Rp${Number(v).toLocaleString("id-ID")}`;

/**
 * The saved expenses, each of which can now be corrected, deleted, or -- if it
 * was really a purchase of equipment -- moved to Aset Toko. Before this, a
 * wrong entry could only be lived with, which skewed the profit figure above.
 */
export function ExpenseTable({
  expenses,
  total,
  assetCategories,
  canMove,
}: {
  expenses: ExpenseRow[];
  /** All expenses in the period; `expenses` may be only the newest part. */
  total: number;
  assetCategories: string[];
  canMove: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [moving, setMoving] = useState<ExpenseRow | null>(null);
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? expenses.filter((e) => `${e.description ?? ""} ${LABEL[e.category] ?? ""}`.toLowerCase().includes(q)) : expenses;
  }, [expenses, search]);

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/expenses/${deleting.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) toast.error(data?.error ?? `Gagal menghapus (${res.status}).`);
      else {
        toast.success("Pengeluaran dihapus.");
        router.refresh();
      }
    } catch {
      toast.error("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  return (
    <div id="pengeluaran" data-tour="expense-table" className="scroll-mt-24 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari keterangan atau kategori" className="min-w-48 flex-1 rounded-md border border-input px-3 py-1.5 text-sm" />
        <p className="text-xs text-muted-foreground">
          {expenses.length < total ? `Menampilkan ${expenses.length} terbaru dari ${total} pengeluaran pada periode ini. Persempit periodenya untuk melihat yang lain.` : `${total} pengeluaran pada periode ini.`}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Keterangan</th>
              <th className="px-3 py-2 text-right">Jumlah</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8">
                  <EmptyState title={expenses.length === 0 ? "Belum ada pengeluaran tercatat pada periode ini." : "Tidak ada pengeluaran yang cocok dengan pencarian."} />
                </td>
              </tr>
            )}
            {shown.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{new Date(e.expenseDate).toLocaleDateString("id-ID")}</td>
                <td className="px-3 py-2 text-foreground">{LABEL[e.category] ?? e.category}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {e.description ?? "—"}
                  <span className="block text-[11px]">dicatat oleh {e.createdByName}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-foreground">{rupiah(e.amount)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button onClick={() => setEditing(e)} className="mr-3 text-xs text-primary hover:underline">Ubah</button>
                  {canMove && (
                    <button onClick={() => setMoving(e)} title="Kalau ini sebenarnya pembelian peralatan tahan lama" className="mr-3 text-xs text-primary hover:underline">
                      Pindah ke Aset
                    </button>
                  )}
                  <button onClick={() => setDeleting(e)} className="text-xs text-destructive hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <ExpenseEditModal expense={editing} onClose={() => setEditing(null)} onDone={() => router.refresh()} />}
      {moving && <ExpenseMoveModal expense={moving} categories={assetCategories} onClose={() => setMoving(null)} onDone={() => router.refresh()} />}
      {deleting && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-5 shadow-xl">
            <h2 className="text-base font-semibold text-foreground">Hapus pengeluaran?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              <b className="text-foreground">{rupiah(deleting.amount)}</b> ({deleting.description ?? LABEL[deleting.category]}) dihapus dan tidak lagi dihitung di pengeluaran maupun untung. Kalau ini sebenarnya pembelian peralatan, gunakan <b>Pindah ke Aset</b> supaya nilainya tetap tercatat.
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setDeleting(null)} className="flex-1 rounded-md border border-border py-2 text-sm font-medium">Batal</button>
              <button disabled={busy} onClick={remove} className="flex-1 rounded-md bg-destructive py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Menghapus..." : "Ya, hapus"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
