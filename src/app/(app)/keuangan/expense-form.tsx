"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["SUPPLIER", "ELECTRICITY", "TRANSPORT", "SALARY", "OPERATIONAL", "OTHER"];

export function ExpenseForm() {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0]);
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
      <h2 className="mb-3 text-sm font-semibold text-foreground">Tambah Pengeluaran</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-input px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
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
