"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/shared/security/permissions";
import { HistoryRow, type HistoryItem } from "./receiving-history-row";

const PERIODS = [
  { key: "today", label: "Hari Ini" },
  { key: "yesterday", label: "Kemarin" },
  { key: "week", label: "Minggu Ini" },
  { key: "7d", label: "7 Hari Terakhir" },
  { key: "month", label: "Bulan Ini" },
  { key: "lastmonth", label: "Bulan Lalu" },
  { key: "30d", label: "30 Hari Terakhir" },
  { key: "year", label: "Tahun Ini" },
  { key: "custom", label: "Pilih Rentang Tanggal" },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

interface Report {
  rows: HistoryItem[];
  warnings?: string[];
  summary: { receiptCount: number; lineCount: number; totalQuantity: string; totalValue: string };
}

const rupiah = (v: string) => `Rp${Number(v).toLocaleString("id-ID")}`;
const qty = (v: string) => Number(v).toLocaleString("id-ID");

/**
 * What has actually been received, per period. Reads the same endpoint the
 * XLSX download uses, so the table on screen and the file are one query.
 * `refreshKey` bumps after a receiving is confirmed so a new receipt shows up
 * here without a reload.
 */
export function ReceivingHistory({
  refreshKey = 0,
  productId,
  defaultPeriod = "7d",
  onChanged,
}: {
  refreshKey?: number;
  /** Called after a line was corrected or deleted, so the page around this
   * history (e.g. the product list's stock) can refresh too. */
  onChanged?: () => void;
  /** Limits the history to one product (used from Master Produk). */
  productId?: string;
  defaultPeriod?: PeriodKey;
}) {
  const [period, setPeriod] = useState<PeriodKey>(defaultPeriod);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localKey, setLocalKey] = useState(0);
  const [onlySupplier, setOnlySupplier] = useState(false);
  const { data: session } = useSession();
  const canEdit = session ? hasPermission(session.user.role, "receiving.edit") : false;

  const customReady = period !== "custom" || (from !== "" && to !== "" && from <= to);
  const query = new URLSearchParams({ period });
  if (productId) query.set("productId", productId);
  if (onlySupplier) query.set("only", "purchase");
  if (period === "custom") {
    query.set("from", from);
    query.set("to", to);
  }
  const qs = query.toString();

  useEffect(() => {
    if (!customReady) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/receiving/report?${qs}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error ?? "Gagal memuat riwayat barang masuk.");
        return data as Report;
      })
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [qs, customReady, refreshKey, localKey]);

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{productId ? "Riwayat Barang Masuk Produk Ini" : "Riwayat Barang Masuk"}</h2>
          <p className="text-xs text-muted-foreground">
            Penerimaan barang masuk dan pembaruan stok (stok awal, stok opname, penyesuaian). Semua baris bisa diubah atau dihapus. Pilih periode, lalu unduh sebagai Excel A4.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Periode laporan"
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            className="rounded-md border border-input px-2 py-1.5 text-sm"
          >
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={onlySupplier} onChange={(e) => setOnlySupplier(e.target.checked)} />
            Hanya penerimaan supplier
          </label>
          {period === "custom" && (
            <>
              <input type="date" aria-label="Dari tanggal" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-input px-2 py-1 text-sm" />
              <span className="text-muted-foreground">—</span>
              <input type="date" aria-label="Sampai tanggal" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-input px-2 py-1 text-sm" />
            </>
          )}
          {customReady ? (
            <a
              href={`/api/receiving/report?${qs}&format=xlsx`}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Download className="h-4 w-4" />
              Download Excel (A4)
            </a>
          ) : (
            <span className="rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground">
              Isi tanggal dengan benar dulu
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      {report?.warnings?.map((w) => (
        <div key={w} className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning-foreground">{w}</div>
      ))}

      {report && (
        <p className="text-xs text-muted-foreground">
          {report.summary.receiptCount} penerimaan supplier · {report.summary.lineCount} baris · total qty masuk{" "}
          {qty(report.summary.totalQuantity)} · nilai {rupiah(report.summary.totalValue)}
        </p>
      )}

      <div className={`overflow-x-auto rounded-lg border border-border ${loading ? "opacity-60" : ""}`}>
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">No. Penerimaan</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">Produk</th>
              <th className="px-3 py-2 text-right">Stok Sebelum</th>
              <th className="px-3 py-2 text-right">Qty Masuk</th>
              <th className="px-3 py-2 text-right">Stok Sesudah</th>
              <th className="px-3 py-2 text-right">Harga Beli</th>
              <th className="px-3 py-2">Kedaluwarsa</th>
              <th className="px-3 py-2 text-right">Subtotal</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {report && report.rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">
                  Belum ada barang masuk pada periode ini.
                </td>
              </tr>
            )}
            {report?.rows.map((r) => (
              <HistoryRow
                key={r.itemId}
                row={r}
                canEdit={canEdit}
                onChanged={() => {
                  setLocalKey((k) => k + 1);
                  onChanged?.();
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
