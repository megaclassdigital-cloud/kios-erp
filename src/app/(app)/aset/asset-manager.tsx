"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Boxes, Wallet, Wrench } from "lucide-react";
import { KpiCard } from "@/components/kios/kpi-card";
import { ASSET_CATEGORIES, CONDITION_LABEL, type AssetSummary } from "@/modules/assets/domain/asset";
import { formatWibDate } from "@/shared/format/wib";
import { ExportPreviewButton } from "../export-preview";
import { AssetForm, emptyAsset, type AssetFormValues } from "./asset-form";
import { AssetGuide } from "./asset-guide";

interface Asset {
  id: string;
  name: string;
  category: string;
  quantity: number;
  purchasePrice: string;
  purchaseDate: string;
  condition: keyof typeof CONDITION_LABEL;
  location: string | null;
  note: string | null;
  createdByName: string;
  updatedAt: string;
  updatedByName: string | null;
}

const EXPORT_URL = "/api/assets/export";
const rupiah = (v: string | number) => `Rp${Number(v).toLocaleString("id-ID")}`;
const owned = (a: Asset) => a.condition !== "DIJUAL" && a.condition !== "HILANG";
const toValues = (a: Asset): AssetFormValues => ({
  name: a.name,
  category: a.category,
  quantity: String(a.quantity),
  purchasePrice: String(Number(a.purchasePrice)),
  purchaseDate: a.purchaseDate.slice(0, 10),
  condition: a.condition,
  location: a.location ?? "",
  note: a.note ?? "",
});

async function send(url: string, method: string, body?: AssetFormValues): Promise<string | null> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error ?? `Server tidak merespons dengan benar (${res.status}). Muat ulang halaman lalu coba lagi.`;
  } catch {
    return "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.";
  }
}

export function AssetManager() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState<Asset | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/assets");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Daftar aset belum bisa dimuat.");
      setAssets(data.assets);
      setSummary(data.summary);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (assets ?? []).filter(
      (a) =>
        (!category || a.category === category) &&
        (!condition || a.condition === condition) &&
        (!q || `${a.name} ${a.location ?? ""} ${a.note ?? ""}`.toLowerCase().includes(q))
    );
  }, [assets, category, condition, search]);

  async function add(values: AssetFormValues) {
    const problem = await send("/api/assets", "POST", values);
    if (!problem) {
      toast.success(`${values.name} dicatat.`);
      void load();
    }
    return problem;
  }

  async function save(values: AssetFormValues) {
    if (!editing) return null;
    const problem = await send(`/api/assets/${editing.id}`, "PATCH", values);
    if (!problem) {
      toast.success("Perubahan disimpan.");
      setEditing(null);
      void load();
    }
    return problem;
  }

  async function remove() {
    if (!deleting) return;
    const problem = await send(`/api/assets/${deleting.id}`, "DELETE");
    if (problem) toast.error(problem);
    else toast.success(`${deleting.name} dihapus dari daftar.`);
    setDeleting(null);
    void load();
  }

  return (
    <div className="space-y-4">
      <AssetGuide />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard label="Unit aset dimiliki" value={summary ? String(summary.totalUnits) : "-"} icon={Boxes} />
        <KpiCard label="Nilai perolehan" value={summary ? rupiah(summary.totalValue) : "-"} icon={Wallet} tone="info" />
        <KpiCard label="Rusak / perlu perbaikan (unit)" value={summary ? String(summary.needsAttentionUnits) : "-"} icon={Wrench} tone={summary && summary.needsAttentionUnits > 0 ? "warning" : "default"} />
      </div>

      {summary && summary.byCategory.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">REKAP PER KATEGORI</p>
          <div className="grid gap-x-6 gap-y-1 text-sm md:grid-cols-2">
            {summary.byCategory.map((c) => (
              <div key={c.category} className="flex justify-between">
                <span className="text-foreground">{c.category} <span className="text-xs text-muted-foreground">({c.units} unit)</span></span>
                <span className="tabular-nums text-muted-foreground">{rupiah(c.value)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Nilai = harga beli × jumlah. Aset yang sudah dijual atau hilang tidak dihitung.</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Tambah Aset</h2>
        <AssetForm initial={emptyAsset()} submitLabel="Simpan Aset" onSubmit={add} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, lokasi, catatan" className="min-w-48 flex-1 rounded-md border border-input px-3 py-1.5 text-sm" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-input px-2 py-1.5 text-sm">
          <option value="">Semua kategori</option>
          {ASSET_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={condition} onChange={(e) => setCondition(e.target.value)} className="rounded-md border border-input px-2 py-1.5 text-sm">
          <option value="">Semua kondisi</option>
          {Object.entries(CONDITION_LABEL).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
        <ExportPreviewButton previewUrl={`${EXPORT_URL}?format=preview`} downloadUrl={EXPORT_URL} disabled={!assets?.length} />
        <a href={EXPORT_URL} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
          Download Excel (A4)
        </a>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Aset</th>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Lokasi</th>
              <th className="px-3 py-2">Tgl Beli</th>
              <th className="px-3 py-2 text-right">Jumlah</th>
              <th className="px-3 py-2 text-right">Harga/unit</th>
              <th className="px-3 py-2 text-right">Nilai</th>
              <th className="px-3 py-2">Kondisi</th>
              <th className="px-3 py-2">Terakhir diubah</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loadError && (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-destructive">{loadError}</td></tr>
            )}
            {assets && shown.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">{assets.length === 0 ? "Belum ada aset tercatat. Isi formulir di atas untuk mulai." : "Tidak ada aset yang cocok dengan filter."}</td></tr>
            )}
            {shown.map((a) => (
              <tr key={a.id} className={`border-t border-border ${owned(a) ? "" : "text-muted-foreground"}`}>
                <td className="px-3 py-2"><span className="font-medium text-foreground">{a.name}</span>{a.note && <span className="block text-xs text-muted-foreground">{a.note}</span>}</td>
                <td className="px-3 py-2">{a.category}</td>
                <td className="px-3 py-2">{a.location ?? "-"}</td>
                <td className="whitespace-nowrap px-3 py-2">{formatWibDate(new Date(a.purchaseDate))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{a.quantity}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{rupiah(a.purchasePrice)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">{owned(a) ? rupiah(a.quantity * Number(a.purchasePrice)) : "-"}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.condition === "BAIK" ? "bg-success-soft text-success" : a.condition === "RUSAK" || a.condition === "PERLU_PERBAIKAN" ? "bg-warning-soft text-warning-foreground" : "bg-muted text-muted-foreground"}`}>
                    {CONDITION_LABEL[a.condition]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                  {formatWibDate(new Date(a.updatedAt))}
                  <span className="block">{a.updatedByName ?? a.createdByName}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button onClick={() => setEditing(a)} className="mr-3 text-xs text-primary hover:underline">Ubah</button>
                  <button onClick={() => setDeleting(a)} className="text-xs text-destructive hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-card p-5 shadow-xl">
            <h2 className="mb-3 text-base font-semibold text-foreground">Ubah Aset</h2>
            <AssetForm initial={toValues(editing)} submitLabel="Simpan Perubahan" onSubmit={save} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-5 shadow-xl">
            <h2 className="text-base font-semibold text-foreground">Hapus aset?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              <b className="text-foreground">{deleting.name}</b> ({deleting.quantity} unit) dihapus dari daftar dan rekap. Kalau asetnya hanya dijual atau hilang, lebih baik ubah kondisinya supaya riwayatnya tetap terlihat.
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setDeleting(null)} className="flex-1 rounded-md border border-border py-2 text-sm font-medium">Batal</button>
              <button onClick={remove} className="flex-1 rounded-md bg-destructive py-2 text-sm font-medium text-white">Ya, hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
