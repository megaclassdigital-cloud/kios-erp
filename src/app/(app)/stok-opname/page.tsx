"use client";

import { useState } from "react";
import { CameraScanner } from "../camera-scanner";

interface Line {
  productId: string;
  name: string;
  physicalQty: string;
}

interface ReviewLine {
  productId: string;
  product?: { name: string };
  systemQty: string;
  physicalQty: string;
  difference: string;
}

export default function StokOpnamePage() {
  const [opnameId, setOpnameId] = useState<string | null>(null);
  const [status, setStatus] = useState<"IDLE" | "DRAFT" | "SUBMITTED" | "APPROVED">("IDLE");
  const [barcode, setBarcode] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [review, setReview] = useState<ReviewLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    const res = await fetch("/api/stock-opname", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Gagal memulai stock opname.");
      return;
    }
    setOpnameId(data.opname.id);
    setStatus("DRAFT");
    setLines([]);
  }

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
      if (prev.find((l) => l.productId === product.id)) return prev;
      return [...prev, { productId: product.id, name: product.name, physicalQty: "0" }];
    });
  }

  function updateQty(productId: string, value: string) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, physicalQty: value } : l)));
  }

  async function submit() {
    if (!opnameId) return;
    const res = await fetch("/api/stock-opname/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opnameId,
        lines: lines.map((l) => ({ productId: l.productId, physicalQty: l.physicalQty })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Gagal submit.");
      return;
    }
    setReview(data.opname.items);
    setStatus("SUBMITTED");
  }

  async function approve() {
    if (!opnameId) return;
    const res = await fetch("/api/stock-opname/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opnameId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Gagal approve.");
      return;
    }
    setStatus("APPROVED");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Stock Opname</h1>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {status === "IDLE" && (
        <button onClick={start} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Mulai Stock Opname
        </button>
      )}

      {status === "DRAFT" && (
        <>
          <form onSubmit={handleScan} className="rounded-lg border border-gray-200 bg-white p-3">
            <label className="mb-1 block text-xs font-medium text-gray-500">SCAN PRODUK</label>
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} autoFocus
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-lg" placeholder="Scan barcode lalu Enter" />
          </form>
          <CameraScanner onScan={processBarcode} />
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr><th className="px-3 py-2">Produk</th><th className="px-3 py-2">Qty Fisik</th></tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.productId} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-900">{l.name}</td>
                    <td className="px-3 py-2">
                      <input type="number" value={l.physicalQty} onChange={(e) => updateQty(l.productId, e.target.value)}
                        className="w-24 rounded border border-gray-300 px-2 py-1" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={submit} disabled={lines.length === 0}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            Review &amp; Submit
          </button>
        </>
      )}

      {status === "SUBMITTED" && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr><th className="px-3 py-2">Produk</th><th className="px-3 py-2">Sistem</th><th className="px-3 py-2">Fisik</th><th className="px-3 py-2">Selisih</th></tr>
              </thead>
              <tbody>
                {review.map((r) => (
                  <tr key={r.productId} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-900">{r.product?.name ?? r.productId}</td>
                    <td className="px-3 py-2 text-gray-500">{r.systemQty}</td>
                    <td className="px-3 py-2 text-gray-500">{r.physicalQty}</td>
                    <td className={`px-3 py-2 font-medium ${Number(r.difference) < 0 ? "text-red-600" : "text-green-600"}`}>
                      {r.difference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={approve} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            Approve
          </button>
        </>
      )}

      {status === "APPROVED" && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Stock opname disetujui. Stok telah disesuaikan.
        </div>
      )}
    </div>
  );
}
