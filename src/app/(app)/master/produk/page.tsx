"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductForm } from "./product-form";
import { BarcodeLabelModal } from "./barcode-label-modal";
import { ProductEditModal, type EditableProduct } from "./product-edit-modal";
import { ExpiryService } from "@/modules/inventory/domain/expiry-service";
import { ScanSources } from "../../scan-sources";
import { PageHeader } from "@/components/kios/page-header";
import { StatusBadge } from "@/components/kios/status-badge";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  currentStock: string;
  sellingPrice: string;
  active: boolean;
  productType: "PHYSICAL" | "SERVICE";
  purchasePrice: string;
  minimumStock: number;
  expiryDate: string | null;
  expiryWarnDays: number;
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
  const [labelFor, setLabelFor] = useState<{
    name: string;
    barcode: string;
    barcodeType: "CODE128" | "EAN13";
  } | null>(null);
  // Set by the form while it is waiting for the barcode of a new product.
  // Exactly one of the two captures on this page is live at a time.
  const [formAwaitingBarcode, setFormAwaitingBarcode] = useState(false);
  const [editing, setEditing] = useState<EditableProduct | null>(null);


  const handleAwaitingBarcodeChange = useCallback((awaiting: boolean) => {
    setFormAwaitingBarcode(awaiting);
  }, []);

  const expiryService = useMemo(() => new ExpiryService(), []);
  // Plain value, not memoised: it is one Date per render, and every row in
  // this render then compares against the same instant.
  const now = new Date();

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
    // Pre-fill from the header's global search (?search=...) without
    // needing useSearchParams()/Suspense — reading location directly in
    // an effect only ever runs client-side, after hydration.
    const fromUrl = new URLSearchParams(window.location.search).get("search");
    if (fromUrl) setSearch(fromUrl);
  }, []);

  async function generateBarcode(product: ProductRow) {
    setGeneratingId(product.id);
    const res = await fetch(`/api/products/${product.id}/barcodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "GENERATE_INTERNAL", unit: "PCS" }),
    });
    const data = await res.json().catch(() => ({}));
    setGeneratingId(null);
    if (!res.ok) {
      toast.error(data.error ?? "Gagal membuat barcode.");
      return;
    }
    await load();
    setLabelFor({
      name: product.name,
      barcode: data.barcode.barcodeValue,
      barcodeType: data.barcode.barcodeType,
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Master Produk"
        description="Daftarkan barang dan layanan yang dijual, beserta barcodenya."
      />

      <ProductForm
        categories={categories}
        knownProducts={products}
        onCreated={load}
        onAwaitingBarcodeChange={handleAwaitingBarcodeChange}
      />

      <div data-tour="product-search" className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="cari-produk">
          CARI PRODUK
        </label>
        <input
          id="cari-produk"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nama, SKU, atau scan barcodenya..."
          autoComplete="off"
          className="w-full rounded-md border border-input px-3 py-2 text-sm focus:border-ring focus:outline-none"
        />
        <div className="mt-2">
          {/* Only live while the add-product form is not itself waiting for a
              barcode, so one scan never lands in both fields. */}
          <ScanSources
            label="Cari Produk"
            onScan={setSearch}
            enabled={!formAwaitingBarcode && !labelFor}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Produk</th>
              <th className="px-3 py-2">Tipe</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Barcode</th>
              <th className="px-3 py-2">Stok</th>
              <th className="px-3 py-2">Harga Jual</th>
              <th className="px-3 py-2">Kedaluwarsa</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  {products.length === 0 ? "Belum ada produk." : "Tidak ada produk yang cocok."}
                </td>
              </tr>
            )}
            {filteredProducts.map((p) => {
              const activeBarcode = p.barcodes.find((b) => b.status === "ACTIVE");
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{p.name}</td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={p.productType === "SERVICE" ? "purple" : "neutral"}>
                      {p.productType === "SERVICE" ? "Layanan" : "Fisik"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.sku}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {activeBarcode?.barcodeValue ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-foreground tabular-nums">
                    {p.productType === "SERVICE" ? "—" : Number(p.currentStock)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">
                    Rp{Number(p.sellingPrice).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {p.productType === "SERVICE" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (() => {
                      const expiry = p.expiryDate ? new Date(p.expiryDate) : null;
                      const status = expiryService.classify(expiry, p.expiryWarnDays, now);
                      if (status === "TIDAK_DIPANTAU") {
                        return <span className="text-xs text-muted-foreground">belum diisi</span>;
                      }
                      const days = expiryService.daysUntil(expiry as Date, now);
                      return (
                        <span className={
                          status === "KEDALUWARSA" ? "text-xs font-medium text-destructive"
                          : status === "MENDEKATI" ? "text-xs font-medium text-warning-foreground"
                          : "text-xs text-muted-foreground"
                        }>
                          {expiryService.describe(status, days)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setEditing({
                        id: p.id, name: p.name, sku: p.sku, productType: p.productType,
                        purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice,
                        minimumStock: p.minimumStock, active: p.active,
                        expiryDate: p.expiryDate, expiryWarnDays: p.expiryWarnDays,
                      })}
                      className="mr-3 text-xs text-primary hover:underline"
                    >
                      Ubah
                    </button>
                    {activeBarcode ? (
                      <button
                        onClick={() =>
                          setLabelFor({
                            name: p.name,
                            barcode: activeBarcode.barcodeValue,
                            barcodeType: activeBarcode.barcodeType,
                          })
                        }
                        className="text-xs text-primary hover:underline"
                      >
                        Lihat Barcode
                      </button>
                    ) : (
                      <button
                        onClick={() => generateBarcode(p)}
                        disabled={generatingId === p.id}
                        title="Membuat barcode milik toko untuk produk ini, lalu menampilkannya untuk dicetak. Jangan dipakai bila kemasannya sudah punya barcode pabrik."
                        className="text-xs text-primary hover:underline disabled:opacity-50"
                      >
                        {generatingId === p.id ? "Membuat..." : "Buatkan Barcode"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductEditModal
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}

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
