"use client";

import { useState } from "react";
import { CONDITION_LABEL } from "@/modules/assets/domain/asset";

export interface AssetFormValues {
  name: string;
  category: string;
  quantity: string;
  purchasePrice: string;
  purchaseDate: string;
  condition: keyof typeof CONDITION_LABEL;
  note: string;
}

const today = () => new Date().toISOString().slice(0, 10);
export const emptyAsset = (category = ""): AssetFormValues => ({
  name: "",
  category,
  quantity: "1",
  purchasePrice: "",
  purchaseDate: today(),
  condition: "BAIK",
  note: "",
});

const input = "w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:border-ring focus:outline-none";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** The one form, used for adding an asset and for correcting it, so the two can never drift apart. */
export function AssetForm({
  categories,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  categories: string[];
  initial: AssetFormValues;
  submitLabel: string;
  onSubmit: (values: AssetFormValues) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof AssetFormValues>(key: K, value: AssetFormValues[K]) => setV((p) => ({ ...p, [key]: value }));

  const total = Number(v.quantity || 0) * Number(v.purchasePrice || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const problem = await onSubmit(v);
    setBusy(false);
    if (problem) setError(problem);
    else if (!onCancel) setV(emptyAsset(v.category)); // adding: ready for the next, same category
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Nama aset" hint="Mis. Freezer Box 300L, Timbangan Digital 30kg.">
          <input value={v.name} onChange={(e) => set("name", e.target.value)} required className={input} />
        </Field>
        <Field label="Kategori" hint={categories.length === 0 ? "Belum ada kategori. Tambah dulu di bagian Kategori Aset di atas." : "Daftar kategori bisa diubah di bagian Kategori Aset."}>
          <select value={v.category} onChange={(e) => set("category", e.target.value)} required className={input}>
            {!v.category && <option value="">Pilih kategori</option>}
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Kondisi">
          <select value={v.condition} onChange={(e) => set("condition", e.target.value as AssetFormValues["condition"])} className={input}>
            {Object.entries(CONDITION_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Jumlah (unit)">
          <input type="number" min="1" step="1" value={v.quantity} onChange={(e) => set("quantity", e.target.value)} required className={input} />
        </Field>
        <Field label="Harga beli per unit" hint={total > 0 ? `Nilai: Rp${total.toLocaleString("id-ID")}` : "Yang Anda bayar untuk satu unit."}>
          <input type="number" min="0" value={v.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} required className={input} />
        </Field>
        <Field label="Tanggal beli">
          <input type="date" value={v.purchaseDate} max={today()} onChange={(e) => set("purchaseDate", e.target.value)} required className={input} />
        </Field>
        <div className="md:col-span-3">
          <Field label="Catatan" hint="Opsional. Mis. merek, nomor seri, garansi sampai kapan.">
            <input value={v.note} onChange={(e) => set("note", e.target.value)} maxLength={300} className={input} />
          </Field>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Batal
          </button>
        )}
        <button type="submit" disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
          {busy ? "Menyimpan..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
