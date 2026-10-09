"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { formatWibDateTime } from "@/shared/format/wib";

const PERIODS = [
  { key: "today", label: "Hari Ini" },
  { key: "7d", label: "7 Hari Terakhir" },
  { key: "30d", label: "30 Hari Terakhir" },
  { key: "month", label: "Bulan Ini" },
  { key: "year", label: "Tahun Ini" },
  { key: "custom", label: "Pilih Tanggal" },
] as const;

interface Row {
  receivedAt: string;
  purchaseNumber: string;
  invoiceNumber: string | null;
  supplierName: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: string;
  purchasePrice: string;
  subtotal: string;
}

interface Report {
  rows: Row[];
  summary: { receiptCount: number; lineCount: number; totalQuantity: string; totalValue: string };
}

const rupiah = (v: string) => `Rp${Number(v).toLocaleString("id-ID")}`;

/**
 * What has actually been received, per period. Reads the same endpoint the
 * XLSX download uses, so the table on screen and the file are one query.
 * `refreshKey` bumps after a receiving is confirmed so a new receipt shows up
 * here without a reload.
 */
export function ReceivingHistory({ refreshKey }: { refreshKey: number }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const customReady = period !== "custom" || (from !== "" && to !== "" && from <= to);
  const query = new URLSearchParams({ period });
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
  }, [qs, customReady, refreshKey]);

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Riwayat Barang Masuk</h2>
          <p className="text-xs text-muted-foreground">Pilih periode, lalu unduh sebagai Excel ukuran A4.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Periode laporan"
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="rounded-md border border-input px-2 py-1.5 text-sm"
          >
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
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

      {report && (
        <p className="text-xs text-muted-foreground">
          {report.summary.receiptCount} penerimaan · {report.summary.lineCount} baris · total qty{" "}
          {Number(report.summary.totalQuantity).toLocaleString("id-ID")} · nilai {rupiah(report.summary.totalValue)}
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
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Harga Beli</th>
              <th className="px-3 py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {report && report.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Belum ada barang masuk pada periode ini.
                </td>
              </tr>
            )}
            {report?.rows.map((r, i) => (
              <tr key={`${r.purchaseNumber}-${r.sku}-${i}`} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatWibDateTime(new Date(r.receivedAt))}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-foreground">
                  {r.purchaseNumber}
                  {r.invoiceNumber && <span className="block font-sans text-muted-foreground">Inv. {r.invoiceNumber}</span>}
                </td>
                <td className="px-3 py-2 text-foreground">{r.supplierName}</td>
                <td className="px-3 py-2 text-foreground">{r.productName}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {Number(r.quantity).toLocaleString("id-ID")} {r.unit}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{rupiah(r.purchasePrice)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">{rupiah(r.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
