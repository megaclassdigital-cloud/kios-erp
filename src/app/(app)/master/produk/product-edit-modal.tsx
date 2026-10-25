"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { KnownProductRef } from "@/modules/products/domain/duplicate-product";
import { findReminders } from "@/modules/products/domain/similar-products";
import { SimilarReminder } from "./similar-reminder";

export interface EditableProduct {
  id: string;
  name: string;
  sku: string;
  productType: "PHYSICAL" | "SERVICE";
  serviceType: "PULSA" | "TOKEN_LISTRIK" | null;
  serviceProvider: string | null;
  categoryId: string | null;
  purchasePrice: string;
  sellingPrice: string;
  minimumStock: number;
  currentStock: string;
  /** Active barcode values, read-only here. */
  barcodes: string[];
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
 * Editing an existing product. Laid out like the add-product form -- same
 * sections, labels, hints and rules -- so the two can be compared field by
 * field: whatever can be typed when adding a product can be corrected here,
 * except what is an identity (SKU, barcode) or a ledger (stock).
 *
 * Stock is shown but not editable: it only ever moves through Barang Masuk,
 * Stok Opname, Barang Keluar or a sale, each of which leaves a record. That
 * is also where the initial stock and the damaged count entered at creation
 * are corrected (Riwayat).
 */
export function ProductEditModal({
  product,
  categories,
  knownProducts,
  onClose,
  onSaved,
}: {
  product: EditableProduct;
  categories: { id: string; name: string }[];
  knownProducts: KnownProductRef[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [categoryId, setCategoryId] = useState(product.categoryId ?? "");
  const [serviceProvider, setServiceProvider] = useState(product.serviceProvider ?? "");
  const [purchasePrice, setPurchasePrice] = useState(product.purchasePrice);
  const [sellingPrice, setSellingPrice] = useState(product.sellingPrice);
  const [minimumStock, setMinimumStock] = useState(String(product.minimumStock));
  const [expiryDate, setExpiryDate] = useState(toDateInput(product.expiryDate));
  const [expiryWarnDays, setExpiryWarnDays] = useState(String(product.expiryWarnDays));
  const [active, setActive] = useState(product.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isService = product.productType === "SERVICE";

  // Renaming into another product's name would recreate the duplicate the
  // add form refuses. The server checks the same thing.
  const reminders = useMemo(
    () => (name.trim() === product.name.trim() ? [] : findReminders(knownProducts.filter((p) => p.id !== product.id), { name })),
    [knownProducts, product.id, product.name, name]
  );
  const [reminderOk, setReminderOk] = useState(true);

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
          acknowledgeSimilar: reminders.length > 0 ? true : undefined,
          categoryId: categoryId || null,
          purchasePrice,
          sellingPrice,
          active,
          ...(isService
            ? { serviceProvider: serviceProvider || undefined }
            : {
                minimumStock: Number(minimumStock || 0),
                expiryDate: expiryDate || null,
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
        className="max-h-[90vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded-xl bg-card p-5 shadow-xl"
      >
        <div>
          <h2 className="text-base font-semibold text-foreground">Ubah Produk</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            SKU dan barcode tidak bisa diubah — keduanya identitas yang dipakai transaksi lama.
          </p>
        </div>

        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-semibold text-muted-foreground">
            {isService ? "DATA LAYANAN" : "DATA PRODUK"}
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nama produk" hint="Nama yang muncul di struk, mis. Indomie Goreng.">
              <input value={name} onChange={(e) => setName(e.target.value)} required className={input} />
            </Field>
            <Field label="SKU" hint="Tidak bisa diubah.">
              <input value={product.sku} disabled className={`${input} font-mono text-muted-foreground`} />
            </Field>
            <Field label="Kategori" hint="Opsional. Memudahkan laporan per kelompok barang.">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={input}>
                <option value="">Tanpa kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            {isService ? (
              <>
                <Field label="Jenis layanan" hint="Tidak bisa diubah.">
                  <input
                    value={product.serviceType === "TOKEN_LISTRIK" ? "Token Listrik" : "Pulsa"}
                    disabled
                    className={`${input} text-muted-foreground`}
                  />
                </Field>
                <Field label="Provider" hint="Mis. Telkomsel, PLN.">
                  <input value={serviceProvider} onChange={(e) => setServiceProvider(e.target.value)} className={input} />
                </Field>
              </>
            ) : (
              <Field label="Stok minimum" hint="Sistem memberi peringatan saat stok tinggal segini.">
                <input type="number" value={minimumStock} onChange={(e) => setMinimumStock(e.target.value)} className={input} />
              </Field>
            )}
            {!isService && (
              <Field label="Barcode aktif" hint="Tidak bisa diubah.">
                <input
                  value={product.barcodes.join(", ") || "Belum ada"}
                  disabled
                  className={`${input} font-mono text-muted-foreground`}
                />
              </Field>
            )}
          </div>
        </fieldset>

        <SimilarReminder reminders={reminders} onAcknowledgedChange={setReminderOk} />

        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-semibold text-muted-foreground">
            {isService ? "HARGA" : "HARGA & STOK"}
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label={isService ? "Harga modal" : "Harga beli"}
              hint={isService ? "Yang Anda bayar ke provider." : "Yang Anda bayar ke supplier. Dipakai untuk menghitung laba."}
            >
              <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} required className={input} />
            </Field>
            <Field
              label="Harga jual"
              hint={isService ? "Nominal + biaya admin yang dibayar pembeli." : "Yang dibayar pembeli di kasir."}
            >
              <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required className={input} />
            </Field>
            {!isService && (
              <>
                <Field
                  label="Stok saat ini"
                  hint="Tidak diubah di sini. Tambah lewat Barang Masuk, koreksi lewat Riwayat atau Stok Opname, kurangi lewat Barang Keluar."
                >
                  <input
                    value={`${Number(product.currentStock).toLocaleString("id-ID")} PCS`}
                    disabled
                    className={`${input} text-muted-foreground`}
                  />
                </Field>
                <Field
                  label="Tanggal kedaluwarsa"
                  hint="Lihat tanggal di kemasan. Wajib diisi untuk barang fisik. Perbarui setiap kali stok baru datang."
                >
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    required
                    className={input}
                  />
                </Field>
                <Field
                  label="Ingatkan berapa hari sebelumnya?"
                  hint="Roti cukup beberapa hari, makanan kaleng bisa berbulan-bulan. Sistem mulai memperingatkan saat sisa harinya segini."
                >
                  <input type="number" min={0} value={expiryWarnDays} onChange={(e) => setExpiryWarnDays(e.target.value)} className={input} />
                </Field>
              </>
            )}
          </div>
        </fieldset>

        <label className="flex items-start gap-2 rounded-lg border border-border p-3">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium text-foreground">Produk aktif</span>
            <span className="block text-[11px] leading-relaxed text-muted-foreground">
              Dinonaktifkan berarti tidak bisa discan di kasir. Riwayat penjualannya tetap utuh.
            </span>
          </span>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving || !reminderOk}
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
