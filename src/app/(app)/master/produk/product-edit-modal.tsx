"use client";

import { useState } from "react";
import { toast } from "sonner";

export interface EditableProduct {
  id: string;
  name: string;
  sku: string;
  productType: "PHYSICAL" | "SERVICE";
  purchasePrice: string;
  sellingPrice: string;
  minimumStock: number;
  active: boolean;
  expiryDate: string | null;
  expiryWarnDays: number;
}

/** `<input type="date">` wants YYYY-MM-DD; the API returns an ISO instant. */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Editing an existing product — the piece that was missing, and that expiry
 * tracking made necessary: a date is only true until the next delivery, so
 * there has to be somewhere to change it.
 *
 * Deliberately excludes SKU and barcode. The barcode is an identifier whose
 * whole value is that it does not change, and historical sales already hold
 * their own price and cost snapshots, so editing here can never rewrite what
 * a past transaction earned.
 */
export function ProductEditModal({
  product,
  onClose,
  onSaved,
}: {
  product: EditableProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [purchasePrice, setPurchasePrice] = useState(product.purchasePrice);
  const [sellingPrice, setSellingPrice] = useState(product.sellingPrice);
  const [minimumStock, setMinimumStock] = useState(String(product.minimumStock));
  const [expiryDate, setExpiryDate] = useState(toDateInput(product.expiryDate));
  const [expiryWarnDays, setExpiryWarnDays] = useState(String(product.expiryWarnDays));
  const [active, setActive] = useState(product.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isService = product.productType === "SERVICE";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          purchasePrice,
          sellingPrice,
          minimumStock: Number(minimumStock || 0),
          active,
          // An emptied field clears the date rather than leaving the old one
          // in place, which would be the more surprising of the two.
          ...(isService
            ? {}
            : {
                expiryDate: expiryDate ? expiryDate : null,
                expiryWarnDays: Number(expiryWarnDays || 30),
              }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan perubahan.");
        return;
      }
      toast.success(`${name} diperbarui.`);
      onSaved();
      onClose();
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={save}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-card p-5 shadow-xl"
      >
        <h2 className="text-base font-semibold text-foreground">Ubah Produk</h2>
        <p className="mt-0.5 mb-4 text-xs text-muted-foreground">
          SKU <span className="font-mono">{product.sku}</span> dan barcodenya tidak bisa diubah —
          keduanya identitas yang dipakai transaksi lama.
        </p>

        <div className="space-y-3">
          <Field label="Nama produk">
            <input value={name} onChange={(e) => setName(e.target.value)} required className={input} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Harga beli" hint="Dipakai menghitung laba.">
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
                className={input}
              />
            </Field>
            <Field label="Harga jual">
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                required
                className={input}
              />
            </Field>
          </div>

          {!isService && (
            <>
              <Field label="Stok minimum" hint="Peringatan muncul saat stok tinggal segini.">
                <input
                  type="number"
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                  className={input}
                />
              </Field>

              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">KEDALUWARSA</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Tanggal kedaluwarsa"
                    hint="Perbarui setiap kali stok baru datang. Kosongkan kalau tidak dipantau."
                  >
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className={input}
                    />
                  </Field>
                  <Field label="Ingatkan (hari)" hint="Roti beberapa hari, kalengan berbulan-bulan.">
                    <input
                      type="number"
                      min={0}
                      value={expiryWarnDays}
                      onChange={(e) => setExpiryWarnDays(e.target.value)}
                      className={input}
                    />
                  </Field>
                </div>
              </div>
            </>
          )}

          <label className="flex items-start gap-2 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Produk aktif</span>
              <span className="block text-[11px] leading-relaxed text-muted-foreground">
                Dinonaktifkan berarti tidak bisa discan di kasir. Riwayat penjualannya tetap utuh.
              </span>
            </span>
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}

const input =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:border-ring focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}
