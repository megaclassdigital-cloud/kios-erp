"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * SUPPLIER is deliberately absent.
 *
 * Money paid to a supplier for stock is already counted once, as HPP, at the
 * moment those goods sell. Recording it here as well subtracted the same
 * money a second time from Laba Bersih -- and since SUPPLIER sat first in
 * this list it was the pre-selected option, so it was the value most likely
 * to be picked. Buying 100 items at 2.500 and selling them all at 3.500 is a
 * 100.000 profit; with the purchase also logged as an expense the report read
 * minus 150.000.
 *
 * Stock purchases belong in Barang Masuk, which is where the cost reaches the
 * books correctly. The enum value still exists in the database so no history
 * is rewritten; nothing can write it any more.
 */
const CATEGORIES = [
  { value: "ELECTRICITY", label: "Listrik & Air" },
  { value: "TRANSPORT", label: "Transportasi & Bensin" },
  { value: "SALARY", label: "Gaji Karyawan" },
  { value: "OPERATIONAL", label: "Operasional Toko" },
  { value: "OTHER", label: "Lain-lain" },
];

export function ExpenseForm() {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        amount,
        description: description || undefined,
        expenseDate: new Date().toISOString(),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Gagal menyimpan pengeluaran.");
      return;
    }
    setAmount("");
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Tambah Pengeluaran</h2>
      <p className="mt-1 mb-3 text-xs text-muted-foreground">
        Hanya biaya menjalankan toko. <strong className="text-foreground">Belanja stok ke supplier
        jangan dicatat di sini</strong> — modalnya sudah dihitung otomatis saat barangnya terjual,
        jadi mencatatnya lagi membuat laba terlihat jauh lebih kecil dari seharusnya. Belanja stok
        masuk lewat <strong className="text-foreground">Barang Masuk</strong>.
      </p>
      <div className="grid gap-3 md:grid-cols-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-input px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Jumlah"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="rounded-md border border-input px-3 py-2 text-sm"
        />
        <input
          placeholder="Keterangan"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border border-input px-3 py-2 text-sm md:col-span-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </form>
  );
}
