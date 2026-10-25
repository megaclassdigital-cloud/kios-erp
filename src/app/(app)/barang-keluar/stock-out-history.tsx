"use client";

import { useEffect, useState } from "react";
import { formatWibDateTime } from "@/shared/format/wib";

interface Row {
  id: string;
  createdAt: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: string;
  movementType: string;
  note: string | null;
  actorName: string;
}

const PERIODS = [
  { key: "today", label: "Hari ini" },
  { key: "7d", label: "7 hari" },
  { key: "month", label: "Bulan ini" },
  { key: "year", label: "Tahun ini" },
];

export function StockOutHistory({ refreshKey }: { refreshKey: number }) {
  const [period, setPeriod] = useState("month");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stock-out?period=${period}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "Riwayat belum bisa dimuat.");
        if (!cancelled) {
          setRows(d.rows);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [period, refreshKey]);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Riwayat Barang Keluar</h2>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-md border border-input px-2 py-1 text-sm">
          {PERIODS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>
      {error && <p className="px-4 py-3 text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Produk</th>
              <th className="px-3 py-2 text-right">Jumlah Keluar</th>
              <th className="px-3 py-2">Alasan / Catatan</th>
              <th className="px-3 py-2">Dicatat oleh</th>
            </tr>
          </thead>
          <tbody>
            {rows?.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Belum ada barang keluar pada periode ini.</td></tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatWibDateTime(new Date(r.createdAt))}</td>
                <td className="px-3 py-2">{r.productName} <span className="text-xs text-muted-foreground">({r.sku})</span></td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-destructive">
                  -{Number(r.quantity).toLocaleString("id-ID")} {r.unit}
                </td>
                <td className="px-3 py-2">{r.note ?? "-"}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.actorName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
