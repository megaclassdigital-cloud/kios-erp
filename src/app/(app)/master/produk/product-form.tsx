"use client";

import { useState } from "react";
import { BarcodePreview } from "./barcode-preview";

interface Category {
  id: string;
  name: string;
}

export function ProductForm({ categories, onCreated }: { categories: Category[]; onCreated: () => void }) {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productType, setProductType] = useState<"PHYSICAL" | "SERVICE">("PHYSICAL");
  const [serviceType, setServiceType] = useState<"PULSA" | "TOKEN_LISTRIK">("PULSA");
  const [serviceProvider, setServiceProvider] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [minimumStock, setMinimumStock] = useState("5");
  const [initialStock, setInitialStock] = useState("0");
  const [barcodeMode, setBarcodeMode] = useState<"GENERATE_INTERNAL" | "SCAN_EXISTING" | "NONE">(
    "GENERATE_INTERNAL"
  );
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [previewBarcode, setPreviewBarcode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const barcode =
      barcodeMode === "SCAN_EXISTING"
        ? { mode: "SCAN_EXISTING" as const, value: scannedBarcode, unit: "PCS" }
        : barcodeMode === "GENERATE_INTERNAL"
          ? { mode: "GENERATE_INTERNAL" as const, unit: "PCS" }
          : { mode: "NONE" as const };

    const isService = productType === "SERVICE";
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku,
        name,
        categoryId: categoryId || undefined,
        productType,
        serviceType: isService ? serviceType : undefined,
        serviceProvider: isService ? serviceProvider || undefined : undefined,
        baseUnit: isService ? "TRANSAKSI" : "PCS",
        purchasePrice,
        sellingPrice,
        minimumStock: isService ? 0 : Number(minimumStock),
        trackInventory: !isService,
        initialStock: isService ? undefined : initialStock,
        barcode,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan produk.");
      return;
    }

    const newBarcode = data.product?.barcodes?.[0]?.barcodeValue ?? null;
    setPreviewBarcode(newBarcode);
    setSku("");
    setName("");
    setPurchasePrice("");
    setSellingPrice("");
    setInitialStock("0");
    setScannedBarcode("");
    setServiceProvider("");
    onCreated();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 lg:col-span-2">
        <h2 className="text-sm font-semibold text-gray-900">Tambah Produk</h2>

        <div className="flex gap-2 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" checked={productType === "PHYSICAL"}
              onChange={() => setProductType("PHYSICAL")} />
            Barang Fisik
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={productType === "SERVICE"}
              onChange={() => setProductType("SERVICE")} />
            Layanan (Pulsa/Token Listrik)
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Nama produk" value={name} onChange={(e) => setName(e.target.value)} required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Tanpa kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {productType === "SERVICE" ? (
            <>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value as "PULSA" | "TOKEN_LISTRIK")}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="PULSA">Pulsa</option>
                <option value="TOKEN_LISTRIK">Token Listrik</option>
              </select>
              <input placeholder="Provider (mis. Telkomsel, PLN)" value={serviceProvider}
                onChange={(e) => setServiceProvider(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </>
          ) : (
            <input type="number" placeholder="Stok minimum" value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          )}
          <input type="number" placeholder={productType === "SERVICE" ? "Harga modal (beli ke provider)" : "Harga beli"}
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)} required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input type="number" placeholder={productType === "SERVICE" ? "Harga jual (nominal + admin)" : "Harga jual"}
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)} required
            className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          {productType === "PHYSICAL" && (
            <input type="number" placeholder="Stok awal" value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          )}
        </div>

        <div className="rounded-md border border-gray-200 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">BARCODE</p>
          <div className="mb-2 flex gap-2 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" checked={barcodeMode === "GENERATE_INTERNAL"}
                onChange={() => setBarcodeMode("GENERATE_INTERNAL")} />
              Generate Barcode Kios-ERP
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={barcodeMode === "SCAN_EXISTING"}
                onChange={() => setBarcodeMode("SCAN_EXISTING")} />
              Scan Barcode Pabrik
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={barcodeMode === "NONE"}
                onChange={() => setBarcodeMode("NONE")} />
              Tanpa Barcode
            </label>
          </div>
          {barcodeMode === "SCAN_EXISTING" && (
            <input placeholder="Scan/ketik barcode pabrik" value={scannedBarcode}
              onChange={(e) => setScannedBarcode(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Menyimpan..." : "Simpan Produk"}
        </button>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Preview Barcode</h2>
        {previewBarcode ? (
          <BarcodePreview value={previewBarcode} format={previewBarcode.startsWith("KERP") ? "CODE128" : "EAN13"} />
        ) : (
          <p className="text-sm text-gray-400">Simpan produk untuk melihat barcode.</p>
        )}
      </div>
    </div>
  );
}
