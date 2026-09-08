import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { InventoryService } from "@/modules/inventory/domain/inventory-service";
import { prisma } from "@/shared/infrastructure/prisma";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { redirect } from "next/navigation";
import { BarcodeAudit } from "./barcode-audit";

const STATUS_STYLE: Record<string, string> = {
  AMAN: "bg-green-100 text-green-700",
  MENIPIS: "bg-amber-100 text-amber-700",
  HABIS: "bg-red-100 text-red-700",
};

export default async function StokPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "inventory.view")) {
    redirect("/dashboard");
  }

  const repo = new PrismaProductRepository(prisma);
  const allProducts = await repo.list({});
  // Stok Barang tracks physical inventory only — service products
  // (pulsa/token) never carry stock (PRD 46).
  const products = allProducts.filter((p) => p.trackInventory);
  const inventoryService = new InventoryService();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Stok Barang</h1>
      <BarcodeAudit />
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">Produk</th>
              <th className="px-3 py-2">Barcode</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Stok</th>
              <th className="px-3 py-2">Min</th>
              <th className="px-3 py-2">Harga Jual</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const status = inventoryService.classifyStock(Number(p.currentStock), p.minimumStock);
              return (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-900">{p.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">
                    {p.barcodes.find((b) => b.status === "ACTIVE")?.barcodeValue ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{p.sku}</td>
                  <td className="px-3 py-2 text-gray-900">{Number(p.currentStock)}</td>
                  <td className="px-3 py-2 text-gray-500">{p.minimumStock}</td>
                  <td className="px-3 py-2 text-gray-500">
                    Rp{Number(p.sellingPrice).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
