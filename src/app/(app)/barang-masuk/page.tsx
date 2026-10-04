"use client";

import { useEffect, useRef, useState } from "react";
import { CameraScanner } from "../camera-scanner";
import { DeviceScannerPairing } from "../device-scanner-pairing";
import { BarcodeInputHint } from "../barcode-input-hint";
import { PageHeader } from "@/components/kios/page-header";
import { HelpPanel, HelpStep } from "@/components/kios/help-panel";
import { useKeyboardWedgeScanner } from "@/shared/barcode/use-keyboard-wedge-scanner";

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

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export default function BarangMasukPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [barcode, setBarcode] = useState("");
  const [lines, setLines] = useState<ReceivingLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Same page-wide capture as the POS. Receiving is a type-then-scan loop
  // -- quantity, price, next item -- so focus leaves the barcode box after
  // every single line, which is precisely when a scan would otherwise be
  // swallowed.
  useKeyboardWedgeScanner((value) => void processBarcode(value));

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
      inputRef.current?.focus();
      return;
    }
    setError(null);
    // Hand focus back after every scan, the way the POS and the stock
    // lookup already do, so the next item can be scanned or typed without
    // reaching for the mouse.
    inputRef.current?.focus();
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

  const totalQty = lines.reduce((acc, l) => acc + Number(l.quantity || 0), 0);
  const totalValue = lines.reduce((acc, l) => acc + Number(l.quantity || 0) * Number(l.purchasePrice || 0), 0);
  const supplierName = suppliers.find((s) => s.id === supplierId)?.name;

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
      <PageHeader title="Barang Masuk" description="Terima stok dari supplier dengan mudah dan cepat." />

      <HelpPanel id="barang-masuk" title="Panduan menerima barang">
        <HelpStep n={1}>
          Pilih <strong className="text-foreground">supplier</strong> dan isi{" "}
          <strong className="text-foreground">no. invoice</strong> dari nota yang dibawa supplier,
          supaya nanti bisa dicocokkan saat ada selisih.
        </HelpStep>
        <HelpStep n={2}>
          Scan barang satu per satu sambil membongkar kiriman, lalu isi jumlah yang benar-benar
          diterima — bukan jumlah yang dipesan.
        </HelpStep>
        <HelpStep n={3}>
          <strong className="text-foreground">Isi harga beli sesuai nota kali ini.</strong> Harga
          dari supplier sering berubah, dan laporan laba memakai harga saat barang itu masuk.
        </HelpStep>
        <HelpStep n={4}>
          Setelah disimpan, <strong className="text-foreground">stok bertambah otomatis</strong>.
          Jangan mengubah stok lewat jalan lain — semua perubahan stok harus punya jejak.
        </HelpStep>
        <HelpStep n={5}>
          Barang yang belum pernah didaftarkan tidak bisa discan di sini. Daftarkan dulu di{" "}
          <strong className="text-foreground">Master Produk</strong>.
        </HelpStep>
      </HelpPanel>

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

      <div className="grid gap-4 lg:grid-cols-3">
        {/* min-w-0: see the same note in pos-terminal.tsx -- the received
            items table holds this column open otherwise. */}
        <div className="min-w-0 space-y-3 lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-3">
            <form onSubmit={handleScan} className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">SCAN BARCODE PRODUK</label>
              <input
                ref={inputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                autoFocus
                className="w-full rounded-md border border-input px-3 py-2 text-lg focus:border-ring focus:outline-none"
                placeholder="Ketik kode lalu Enter"
              />
            </form>
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <p className="mb-1 text-xs font-medium text-muted-foreground">SCANNER KAMERA</p>
              <CameraScanner onScan={processBarcode} />
            </div>
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <p className="mb-1 text-xs font-medium text-muted-foreground">DEVICE SCANNER</p>
              <DeviceScannerPairing label="Barang Masuk" onScan={processBarcode} />
            </div>
          </div>
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
                  <th className="px-3 py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
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
                    <td className="px-3 py-2 font-medium text-foreground tabular-nums">
                      {formatRupiah(Number(l.quantity || 0) * Number(l.purchasePrice || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-20 lg:self-start">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Ringkasan Penerimaan</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="shrink-0 text-muted-foreground">Supplier</dt>
              <dd className="min-w-0 truncate text-right font-medium text-foreground">{supplierName ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="shrink-0 text-muted-foreground">No. Invoice</dt>
              <dd className="min-w-0 truncate text-right text-foreground">{invoiceNumber || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Jumlah Item</dt>
              <dd className="text-foreground tabular-nums">{lines.length} jenis produk</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total Qty</dt>
              <dd className="text-foreground tabular-nums">{totalQty} pcs</dd>
            </div>
          </dl>
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-semibold text-foreground">
            <span>Total Nilai Pembelian</span>
            <span className="tabular-nums">{formatRupiah(totalValue)}</span>
          </div>
          <button
            onClick={confirmReceiving}
            disabled={!supplierId || lines.length === 0}
            className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            Konfirmasi Barang Masuk
          </button>
        </div>
      </div>
    </div>
  );
}
