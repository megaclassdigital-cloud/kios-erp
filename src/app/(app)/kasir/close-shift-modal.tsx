"use client";

import { useState } from "react";
import { formatWibDate } from "@/shared/format/wib";

interface Takings {
  transactions: number;
  omzet: string;
  grossProfit: string | null;
}
interface Summary {
  shift: Takings;
  day: Takings & { expense: string | null; netProfit: string | null };
}
interface ClosedShift {
  expectedCash: string | null;
  actualCash: string | null;
  difference: string | null;
}

const rupiah = (v: string | null) => {
  const n = Math.round(Number(v ?? 0));
  return `${n < 0 ? "-" : ""}Rp${Math.abs(n).toLocaleString("id-ID")}`;
};

function Row({ label, value, tone, bold }: { label: string; value: string; tone?: "good" | "bad"; bold?: boolean }) {
  const color = tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${color} ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

function Block({ title, t, day }: { title: string; t: Takings; day?: Summary["day"] }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
      <Row label="Transaksi lunas" value={String(t.transactions)} />
      <Row label="Omzet" value={rupiah(t.omzet)} bold />
      {t.grossProfit !== null && <Row label="Untung kotor" value={rupiah(t.grossProfit)} tone={Number(t.grossProfit) >= 0 ? "good" : "bad"} bold />}
      {day && day.expense !== null && <Row label="Pengeluaran toko hari ini" value={`− ${rupiah(day.expense)}`} />}
      {day && day.netProfit !== null && (
        <Row label="Untung bersih" value={rupiah(day.netProfit)} tone={Number(day.netProfit) >= 0 ? "good" : "bad"} bold />
      )}
    </div>
  );
}

/**
 * Closing a shift: asks for the counted cash, then shows what the shift and the
 * whole day took — so the owner does not have to open Keuangan to see today's
 * omzet and profit. The shift is already closed when the summary appears;
 * "Selesai" only moves the screen on.
 */
export function CloseShiftModal({ shiftId, onCancel, onDone }: { shiftId: string; onCancel: () => void; onDone: () => void }) {
  const [actualCash, setActualCash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ shift: ClosedShift; summary: Summary | null } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pos/shifts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId, actualCash: actualCash.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Shift gagal ditutup. Coba lagi.");
        return;
      }
      setResult({ shift: body.shift, summary: body.summary ?? null });
    } catch {
      setError("Tidak bisa terhubung. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const diff = result ? Number(result.shift.difference ?? 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg">
        {!result ? (
          <form onSubmit={submit} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Tutup Shift</h2>
            <label className="block text-sm text-foreground">
              Jumlah kas aktual saat ini (Rp)
              <input
                autoFocus
                inputMode="numeric"
                required
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value.replace(/[^\d.]/g, ""))}
                className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:border-ring focus:outline-none"
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCancel} className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted">Batal</button>
              <button type="submit" disabled={busy || actualCash === ""} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {busy ? "Menutup…" : "Tutup Shift"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-foreground">Shift ditutup</h2>
            <div className="rounded-lg border border-border p-3">
              <Row label="Kas seharusnya" value={rupiah(result.shift.expectedCash)} />
              <Row label="Kas aktual" value={rupiah(result.shift.actualCash)} />
              <Row
                label="Selisih"
                value={diff === 0 ? "Pas" : `${diff > 0 ? "+" : ""}${rupiah(result.shift.difference)}`}
                tone={diff === 0 ? "good" : "bad"}
                bold
              />
            </div>
            {result.summary ? (
              <>
                <Block title="Shift ini" t={result.summary.shift} />
                <Block title={`Hari ini (${formatWibDate(new Date())} WIB)`} t={result.summary.day} day={result.summary.day} />
                <p className="text-xs text-muted-foreground">
                  Hari ini = semua kasir sejak 00.00 WIB. Untung kotor = omzet dikurangi modal barang terjual (setelah promo); angkanya sama dengan halaman Keuangan.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Ringkasan omzet belum bisa dimuat. Lihat di halaman Keuangan.</p>
            )}
            <div className="flex justify-end">
              <button onClick={onDone} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Selesai</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
