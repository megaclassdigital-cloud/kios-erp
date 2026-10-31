"use client";

import { useState } from "react";
import { toast } from "sonner";

export interface ExpenseRow {
  id: string;
  category: string;
  amount: string;
  description: string | null;
  /** ISO instant. */
  expenseDate: string;
  createdByName: string;
}

const CATEGORIES = [
  { value: "ELECTRICITY", label: "Listrik & Air" },
  { value: "TRANSPORT", label: "Transportasi & Bensin" },
  { value: "SALARY", label: "Gaji Karyawan" },
  { value: "OPERATIONAL", label: "Operasional Toko" },
  { value: "OTHER", label: "Lain-lain" },
];
const input = "w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:border-ring focus:outline-none";
const dateOnly = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function send(url: string, method: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error ?? `Server tidak merespons dengan benar (${res.status}). Muat ulang halaman lalu coba lagi.`;
  } catch {
    return "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.";
  }
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-5 shadow-xl">
        <h2 className="mb-3 text-base font-semibold text-foreground">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ExpenseEditModal({ expense, onClose, onDone }: { expense: ExpenseRow; onClose: () => void; onDone: () => void }) {
  const [category, setCategory] = useState(expense.category);
  const [amount, setAmount] = useState(String(Number(expense.amount)));
  const [description, setDescription] = useState(expense.description ?? "");
  const [date, setDate] = useState(dateOnly(expense.expenseDate));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // An old SUPPLIER record may keep its category, but it is never offered as a choice for another.
  const options = expense.category === "SUPPLIER" ? [{ value: "SUPPLIER", label: "Supplier (tidak dipakai lagi)" }, ...CATEGORIES] : CATEGORIES;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // Keep the original time of day when the date is untouched, so the order of the day's entries does not change.
    const expenseDate = date === dateOnly(expense.expenseDate) ? expense.expenseDate : new Date(`${date}T12:00:00`).toISOString();
    const problem = await send(`/api/expenses/${expense.id}`, "PATCH", { category, amount, description: description || undefined, expenseDate });
    setBusy(false);
    if (problem) return setError(problem);
    toast.success("Pengeluaran diperbarui.");
    onDone();
    onClose();
  }

  return (
    <Shell title="Ubah Pengeluaran">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-xs font-medium text-foreground">Kategori
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${input} mt-1`}>
            {options.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-foreground">Jumlah (Rp)
            <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required className={`${input} mt-1`} />
          </label>
          <label className="block text-xs font-medium text-foreground">Tanggal
            <input type="date" value={date} max={dateOnly(new Date().toISOString())} onChange={(e) => setDate(e.target.value)} required className={`${input} mt-1`} />
          </label>
        </div>
        <label className="block text-xs font-medium text-foreground">Keterangan
          <input value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} className={`${input} mt-1`} />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm font-medium">Batal</button>
          <button disabled={busy} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan Perubahan"}</button>
        </div>
      </form>
    </Shell>
  );
}

/** Turns an expense into an asset: the money leaves the expenses and shows up as equipment instead. */
export function ExpenseMoveModal({ expense, categories, onClose, onDone }: { expense: ExpenseRow; categories: string[]; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(expense.description ?? "");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const qty = Number(quantity);
  const unit = qty >= 1 ? Math.round(Number(expense.amount) / qty) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const problem = await send(`/api/expenses/${expense.id}/move-to-asset`, "POST", { name, category, quantity });
    setBusy(false);
    if (problem) return setError(problem);
    toast.success(`${name} dipindahkan ke Aset Toko.`);
    onDone();
    onClose();
  }

  return (
    <Shell title="Pindahkan ke Aset Toko">
      <p className="mb-3 text-xs text-muted-foreground">
        Untuk pembelian peralatan tahan lama yang tadinya tercatat sebagai pengeluaran. Nilainya (Rp{Number(expense.amount).toLocaleString("id-ID")}) keluar dari pengeluaran dan tidak lagi mengurangi untung, lalu tercatat sebagai aset dengan tanggal yang sama.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-xs font-medium text-foreground">Nama aset
          <input value={name} onChange={(e) => setName(e.target.value)} required className={`${input} mt-1`} placeholder="Mis. Freezer Box 300L" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-foreground">Kategori aset
            <select value={category} onChange={(e) => setCategory(e.target.value)} required className={`${input} mt-1`}>
              {categories.length === 0 && <option value="">Belum ada kategori</option>}
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-foreground">Jumlah unit
            <input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className={`${input} mt-1`} />
          </label>
        </div>
        {qty >= 1 && <p className="text-xs text-muted-foreground">Harga per unit: Rp{unit.toLocaleString("id-ID")}. Kondisi awal: Baik (bisa diubah di Aset Toko).</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm font-medium">Batal</button>
          <button disabled={busy || categories.length === 0} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "Memindahkan..." : "Pindahkan"}</button>
        </div>
      </form>
    </Shell>
  );
}
