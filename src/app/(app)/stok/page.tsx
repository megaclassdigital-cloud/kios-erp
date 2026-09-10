import { Boxes, PackageMinus, PackageX } from "lucide-react";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { InventoryService } from "@/modules/inventory/domain/inventory-service";
import { prisma } from "@/shared/infrastructure/prisma";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/kios/page-header";
import { StatusBadge } from "@/components/kios/status-badge";
import { KpiCard } from "@/components/kios/kpi-card";
import { BarcodeAudit } from "./barcode-audit";

const STATUS_TONE: Record<string, "success" | "warning" | "destructive"> = {
  AMAN: "success",
  MENIPIS: "warning",
  HABIS: "destructive",
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
  const lowStockCount = products.filter(
    (p) => inventoryService.classifyStock(Number(p.currentStock), p.minimumStock) === "MENIPIS"
  ).length;
  const outOfStockCount = products.filter(
    (p) => inventoryService.classifyStock(Number(p.currentStock), p.minimumStock) === "HABIS"
  ).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stok Barang"
        description="Kelola data stok barang fisik dengan mudah dan akurat."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Total SKU Fisik" value={String(products.length)} icon={Boxes} />
        <KpiCard label="Stok Menipis" value={String(lowStockCount)} icon={PackageMinus} tone="warning" />
        <KpiCard label="Stok Habis" value={String(outOfStockCount)} icon={PackageX} tone="destructive" />
      </div>

      <BarcodeAudit />

      <h2 className="text-sm font-semibold text-foreground">Daftar Stok Barang (Produk Fisik)</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
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
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{p.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {p.barcodes.find((b) => b.status === "ACTIVE")?.barcodeValue ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.sku}</td>
                  <td className="px-3 py-2 text-foreground tabular-nums">{Number(p.currentStock)}</td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{p.minimumStock}</td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">
                    Rp{Number(p.sellingPrice).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={STATUS_TONE[status]}>{status}</StatusBadge>
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
