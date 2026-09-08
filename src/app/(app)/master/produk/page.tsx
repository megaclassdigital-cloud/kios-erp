"use client";

import { useEffect, useState } from "react";
import { ProductForm } from "./product-form";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  currentStock: string;
  sellingPrice: string;
  active: boolean;
  productType: "PHYSICAL" | "SERVICE";
  barcodes: { barcodeValue: string; status: string }[];
}

interface Category {
  id: string;
  name: string;
}

export default function MasterProdukPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Master Produk</h1>
      <ProductForm categories={categories} onCreated={load} />

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
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
