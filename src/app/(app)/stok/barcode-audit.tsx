"use client";

import { useEffect, useRef, useState } from "react";
import { CameraScanner } from "../camera-scanner";
import { DeviceScannerPairing } from "../device-scanner-pairing";
import { BarcodeInputHint } from "../barcode-input-hint";

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
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-gray-900">Audit Barcode</h2>
      <p className="mb-3 text-xs text-gray-500">
        Scan barcode (aktif maupun sudah retired) untuk melihat riwayat mutasi stok lengkap.
      </p>
      <form onSubmit={handleScan} className="mb-3">
        <input
          ref={inputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Ketik kode lalu Enter"
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm tracking-wide focus:border-blue-500 focus:outline-none"
        />
      </form>
      <CameraScanner onScan={processBarcode} />
      <DeviceScannerPairing label="Cek Stok" onScan={processBarcode} />
      <BarcodeInputHint />

      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="rounded-md bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{result.product.name}</p>
                <p className="text-xs text-gray-500">
                  SKU: {result.product.sku} · Stok saat ini: {Number(result.product.currentStock)}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  result.scannedBarcode.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {result.scannedBarcode.status === "ACTIVE" ? "Barcode Aktif" : "Barcode Retired"}
              </span>
            </div>
            {result.product.barcodes.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-gray-500">
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
              <thead className="sticky top-0 bg-white text-left text-xs text-gray-500">
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
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      Belum ada mutasi stok untuk produk ini.
                    </td>
                  </tr>
                ) : (
                  result.movements.map((m) => (
                    <tr key={m.id} className="border-t border-gray-100">
                      <td className="py-1.5 text-gray-500">{new Date(m.createdAt).toLocaleString("id-ID")}</td>
                      <td className="py-1.5 text-gray-700">{MOVEMENT_LABEL[m.movementType] ?? m.movementType}</td>
                      <td
                        className={`py-1.5 font-medium ${
                          Number(m.quantity) < 0 ? "text-red-600" : "text-green-700"
                        }`}
                      >
                        {Number(m.quantity) > 0 ? "+" : ""}
                        {Number(m.quantity)}
                      </td>
                      <td className="py-1.5 font-mono text-xs text-gray-500">
                        {m.referenceType} #{m.referenceId.slice(0, 8)}
                      </td>
                      <td className="py-1.5 text-gray-500">{m.actor.name}</td>
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
