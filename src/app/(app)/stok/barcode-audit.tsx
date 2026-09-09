"use client";

import { useEffect, useRef, useState } from "react";
import { CameraScanner } from "../camera-scanner";
import { DeviceScannerPairing } from "../device-scanner-pairing";
import { BarcodeInputHint } from "../barcode-input-hint";
import { StatusBadge } from "@/components/kios/status-badge";

const MOVEMENT_LABEL: Record<string, string> = {
  PURCHASE: "Barang Masuk",
  SALE: "Penjualan",
  RETURN_IN: "Retur Masuk",
  RETURN_OUT: "Retur Keluar",
  DAMAGE: "Rusak",
  EXPIRED: "Kedaluwarsa",
  ADJUSTMENT: "Penyesuaian",
  STOCK_OPNAME: "Stock Opname",
  INITIAL_STOCK: "Stok Awal",
};

interface AuditResult {
  product: {
    id: string;
    name: string;
    sku: string;
    currentStock: string;
    minimumStock: number;
    barcodes: { barcodeValue: string; status: string; source: string }[];
  };
  scannedBarcode: { barcodeValue: string; status: string };
  movements: {
    id: string;
    quantity: string;
    movementType: string;
    referenceType: string;
    referenceId: string;
    createdAt: string;
    note: string | null;
    actor: { name: string };
  }[];
}

/** PRD's barcode-first principle applied to audit: scan any barcode
 * (active or retired) and see exactly what happened to that product's
 * stock, in order, with who did it and why (PRD 24-25, 74). */
export function BarcodeAudit() {
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const raw = barcode;
    setBarcode("");
    await processBarcode(raw);
  }

  async function processBarcode(raw: string) {
    if (!raw.trim()) return;

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/inventory/audit?barcode=${encodeURIComponent(raw)}`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Barcode tidak terdaftar.");
      setResult(null);
      inputRef.current?.focus();
      return;
    }
    setResult(data);
    inputRef.current?.focus();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-foreground">Audit Barcode</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Scan barcode (aktif maupun sudah retired) untuk melihat riwayat mutasi stok lengkap.
      </p>
      <form onSubmit={handleScan} className="mb-3">
        <input
          ref={inputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Ketik kode lalu Enter"
          autoComplete="off"
          className="w-full rounded-md border border-input px-3 py-2 text-sm tracking-wide focus:border-ring focus:outline-none"
        />
      </form>
      <CameraScanner onScan={processBarcode} />
      <DeviceScannerPairing label="Cek Stok" onScan={processBarcode} />
      <BarcodeInputHint />

      {loading && <p className="text-sm text-muted-foreground">Memuat...</p>}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="rounded-md bg-muted p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{result.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  SKU: {result.product.sku} · Stok saat ini: {Number(result.product.currentStock)}
                </p>
              </div>
              <StatusBadge tone={result.scannedBarcode.status === "ACTIVE" ? "success" : "neutral"}>
                {result.scannedBarcode.status === "ACTIVE" ? "Barcode Aktif" : "Barcode Retired"}
              </StatusBadge>
            </div>
            {result.product.barcodes.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                {result.product.barcodes.map((b) => (
                  <span key={b.barcodeValue} className="font-mono">
                    {b.barcodeValue}
                    {b.status === "RETIRED" ? " (retired)" : ""}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1">Waktu</th>
                  <th className="py-1">Tipe</th>
                  <th className="py-1">Qty</th>
                  <th className="py-1">Referensi</th>
                  <th className="py-1">Oleh</th>
                </tr>
              </thead>
              <tbody>
                {result.movements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      Belum ada mutasi stok untuk produk ini.
                    </td>
                  </tr>
                ) : (
                  result.movements.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="py-1.5 text-muted-foreground">{new Date(m.createdAt).toLocaleString("id-ID")}</td>
                      <td className="py-1.5 text-foreground">{MOVEMENT_LABEL[m.movementType] ?? m.movementType}</td>
                      <td
                        className={`py-1.5 font-medium tabular-nums ${
                          Number(m.quantity) < 0 ? "text-destructive" : "text-success"
                        }`}
                      >
                        {Number(m.quantity) > 0 ? "+" : ""}
                        {Number(m.quantity)}
                      </td>
                      <td className="py-1.5 font-mono text-xs text-muted-foreground">
                        {m.referenceType} #{m.referenceId.slice(0, 8)}
                      </td>
                      <td className="py-1.5 text-muted-foreground">{m.actor.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
