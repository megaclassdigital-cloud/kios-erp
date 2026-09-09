"use client";

import { useEffect, useState } from "react";
import { CameraScanner } from "../camera-scanner";
import { DeviceScannerPairing } from "../device-scanner-pairing";
import { BarcodeInputHint } from "../barcode-input-hint";
import { PageHeader } from "@/components/kios/page-header";

interface Supplier {
  id: string;
  name: string;
}

interface ReceivingLine {
  productId: string;
  name: string;
  quantity: string;
  purchasePrice: string;
}

export default function BarangMasukPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [barcode, setBarcode] = useState("");
  const [lines, setLines] = useState<ReceivingLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => setSuppliers(d.suppliers ?? []));
  }, []);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const raw = barcode;
    setBarcode("");
    await processBarcode(raw);
  }

  async function processBarcode(raw: string) {
    if (!raw.trim()) return;

    const res = await fetch("/api/barcodes/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: raw }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Barcode tidak terdaftar.");
      return;
    }
    setError(null);
    const product = data.product;
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: String(Number(l.quantity) + 1) } : l
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: "1",
          purchasePrice: product.purchasePrice,
        },
      ];
    });
  }

  function updateLine(productId: string, field: "quantity" | "purchasePrice", value: string) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, [field]: value } : l)));
  }

  async function confirmReceiving() {
    if (!supplierId || lines.length === 0) return;
    setError(null);
    const res = await fetch("/api/receiving", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId,
        invoiceNumber: invoiceNumber || undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          purchasePrice: l.purchasePrice,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan barang masuk.");
      return;
    }
    setMessage(`Barang masuk ${data.purchase.purchaseNumber} berhasil disimpan.`);
    setLines([]);
    setInvoiceNumber("");
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Barang Masuk" />

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Supplier</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm"
          >
            <option value="">Pilih supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">No. Invoice</label>
          <input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 text-sm"
          />
        </div>
      </div>

      <form onSubmit={handleScan} className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">SCAN BARCODE PRODUK</label>
        <input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          autoFocus
          className="w-full rounded-md border border-input px-3 py-2 text-lg focus:border-ring focus:outline-none"
          placeholder="Ketik kode lalu Enter"
        />
      </form>
      <CameraScanner onScan={processBarcode} />
      <DeviceScannerPairing label="Barang Masuk" onScan={processBarcode} />
      <BarcodeInputHint />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</div>
      )}
      {message && (
        <div className="rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
          {message}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Produk</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Harga Beli</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                  Belum ada item di-scan.
                </td>
              </tr>
            )}
            {lines.map((l) => (
              <tr key={l.productId} className="border-t border-border">
                <td className="px-3 py-2 text-foreground">{l.name}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={l.quantity}
                    onChange={(e) => updateLine(l.productId, "quantity", e.target.value)}
                    className="w-20 rounded border border-input px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={l.purchasePrice}
                    onChange={(e) => updateLine(l.productId, "purchasePrice", e.target.value)}
                    className="w-28 rounded border border-input px-2 py-1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={confirmReceiving}
        disabled={!supplierId || lines.length === 0}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        Konfirmasi Barang Masuk
      </button>
    </div>
  );
}
