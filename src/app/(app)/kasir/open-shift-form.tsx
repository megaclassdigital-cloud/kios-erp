"use client";

import { useState } from "react";
import type { OpenShift } from "./types";

export function OpenShiftForm({ onOpened }: { onOpened: (shift: OpenShift) => void }) {
  const [openingCash, setOpeningCash] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/pos/shifts/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingCash }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal membuka shift.");
      return;
    }
    // The open-shift response already contains the created shift — use it
    // directly instead of a redundant GET /shifts/current read-back.
    onOpened(data.shift);
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-foreground">Buka Shift Kasir</h2>
      <p className="mb-4 text-sm text-muted-foreground">Masukkan modal kas awal untuk memulai.</p>
      <label className="mb-1 block text-sm font-medium text-foreground">Modal Kas Awal</label>
      <input
        type="number"
        min={0}
        value={openingCash}
        onChange={(e) => setOpeningCash(e.target.value)}
        className="mb-3 w-full rounded-md border border-input px-3 py-2 text-sm"
      />
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      <button
        onClick={handleOpen}
        disabled={loading}
        className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? "Membuka..." : "Buka Shift"}
      </button>
    </div>
  );
}
