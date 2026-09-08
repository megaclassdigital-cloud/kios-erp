"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductForm } from "./product-form";
import { BarcodeLabelModal } from "./barcode-label-modal";
import { CameraScanner } from "../../camera-scanner";
import { DeviceScannerPairing } from "../../device-scanner-pairing";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  currentStock: string;
  sellingPrice: string;
  active: boolean;
  productType: "PHYSICAL" | "SERVICE";
  barcodes: { barcodeValue: string; barcodeType: "CODE128" | "EAN13"; status: string }[];
}

interface Category {
  id: string;
  name: string;
}

export default function MasterProdukPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [labelFor, setLabelFor] = useState<{
    name: string;
    barcode: string;
    barcodeType: "CODE128" | "EAN13";
  } | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcodes.some((b) => b.barcodeValue.toLowerCase().includes(q))
    );
  }, [products, search]);

  async function load() {
    const [pRes, cRes] = await Promise.all([fetch("/api/products"), fetch("/api/categories")]);
    const pData = await pRes.json();
    const cData = await cRes.json();
    setProducts(pData.products ?? []);
    setCategories(cData.categories ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function generateBarcode(product: ProductRow) {
    setGeneratingId(product.id);
    setGenError(null);
    const res = await fetch(`/api/products/${product.id}/barcodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "GENERATE_INTERNAL", unit: "PCS" }),
    });
    const data = await res.json().catch(() => ({}));
    setGeneratingId(null);
    if (!res.ok) {
      setGenError(data.error ?? "Gagal membuat barcode.");
      return;
    }
    await load();
    setLabelFor({ name: product.name, barcode: data.barcode.barcodeValue, barcodeType: data.barcode.barcodeType });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Master Produk</h1>
      <ProductForm categories={categories} onCreated={load} />

      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <label className="mb-1 block text-xs font-medium text-gray-500">CARI PRODUK</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nama, SKU, atau ketik kode barcode..."
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <CameraScanner onScan={(code) => setSearch(code)} />
        <DeviceScannerPairing label="Cari Produk" onScan={(code) => setSearch(code)} />
      </div>

      {genError && <p className="text-sm text-red-600">{genError}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">Produk</th>
              <th className="px-3 py-2">Tipe</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Barcode</th>
              <th className="px-3 py-2">Stok</th>
              <th className="px-3 py-2">Harga Jual</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  {products.length === 0 ? "Belum ada produk." : "Tidak ada produk yang cocok."}
                </td>
              </tr>
            )}
            {filteredProducts.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-900">{p.name}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.productType === "SERVICE" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"
                  }`}>
                    {p.productType === "SERVICE" ? "Layanan" : "Fisik"}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-500">{p.sku}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">
                  {p.barcodes.find((b) => b.status === "ACTIVE")?.barcodeValue ?? "-"}
                </td>
                <td className="px-3 py-2 text-gray-900">
                  {p.productType === "SERVICE" ? "-" : Number(p.currentStock)}
                </td>
                <td className="px-3 py-2 text-gray-500">
                  Rp{Number(p.sellingPrice).toLocaleString("id-ID")}
                </td>
                <td className="px-3 py-2 text-right">
                  {(() => {
                    const activeBarcode = p.barcodes.find((b) => b.status === "ACTIVE");
                    if (activeBarcode) {
                      return (
                        <button
                          onClick={() =>
                            setLabelFor({
                              name: p.name,
                              barcode: activeBarcode.barcodeValue,
                              barcodeType: activeBarcode.barcodeType,
                            })
                          }
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Lihat Barcode
                        </button>
                      );
                    }
                    return (
                      <button
                        onClick={() => generateBarcode(p)}
                        disabled={generatingId === p.id}
                        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {generatingId === p.id ? "Membuat..." : "Buat Barcode"}
                      </button>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {labelFor && (
        <BarcodeLabelModal
          productName={labelFor.name}
          barcodeValue={labelFor.barcode}
          barcodeType={labelFor.barcodeType}
          onClose={() => setLabelFor(null)}
        />
      )}
    </div>
  );
}
