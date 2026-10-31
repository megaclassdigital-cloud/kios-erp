import { Boxes, PackageMinus, PackageX, CalendarClock, CalendarX } from "lucide-react";
import { GetStockListUseCase } from "@/modules/inventory/application/get-stock-list-use-case";
import { InventoryService } from "@/modules/inventory/domain/inventory-service";
import { ExpiryService } from "@/modules/inventory/domain/expiry-service";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/kios/page-header";
import { StatusBadge } from "@/components/kios/status-badge";
import { KpiCard } from "@/components/kios/kpi-card";
import { KpiDetail, KpiLink, type DetailRow } from "@/components/kios/kpi-detail";
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

  // Physical-only is filtered at the database now (service products never
  // carry stock, PRD 46), and only the fields this table actually shows
  // are selected — not a full Product with every barcode/relation.
  const products = await new GetStockListUseCase().execute();
  const inventoryService = new InventoryService();
  const expiryService = new ExpiryService();
  // One clock for the whole render, so two rows on the same page can never
  // land on different days.
  const now = new Date();

  const lowStockCount = products.filter(
    (p) => inventoryService.classifyStock(Number(p.currentStock), p.minimumStock) === "MENIPIS"
  ).length;
  const outOfStockCount = products.filter(
    (p) => inventoryService.classifyStock(Number(p.currentStock), p.minimumStock) === "HABIS"
  ).length;
  const expiryOf = (p: (typeof products)[number]) =>
    expiryService.classify(p.expiryDate, p.expiryWarnDays, now);
  const expiringSoon = products.filter((p) => expiryOf(p) === "MENDEKATI").length;
  const expired = products.filter((p) => expiryOf(p) === "KEDALUWARSA").length;
  const untracked = products.filter((p) => expiryOf(p) === "TIDAK_DIPANTAU").length;

  const num = (v: unknown) => Number(v).toLocaleString("id-ID");
  const stockRows = (list: typeof products): DetailRow[] =>
    list.map((p) => ({ cells: [p.name, num(p.currentStock), String(p.minimumStock)] }));
  const expiryRows = (list: typeof products): DetailRow[] =>
    list.map((p) => {
      const status = expiryOf(p);
      return { cells: [p.name, num(p.currentStock), expiryService.describe(status, expiryService.daysUntil(p.expiryDate as Date, now))] };
    });
  const stockColumns = [{ header: "Produk" }, { header: "Stok", align: "right" as const }, { header: "Minimum", align: "right" as const }];
  const expiryColumns = [{ header: "Produk" }, { header: "Stok", align: "right" as const }, { header: "Kedaluwarsa" }];
  const byStatus = (status: string) => products.filter((p) => inventoryService.classifyStock(Number(p.currentStock), p.minimumStock) === status);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stok Barang"
        description="Stok barang dagangan. Peralatan toko tidak masuk di sini — lihat Aset Toko."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiLink href="#daftar-stok">
          <KpiCard interactive label="Total SKU Fisik" value={String(products.length)} icon={Boxes} />
        </KpiLink>
        <KpiDetail title="Stok Menipis" description="Stok di bawah atau sama dengan batas minimum. Tambah lewat Barang Masuk." columns={stockColumns} rows={stockRows(byStatus("MENIPIS"))} emptyText="Tidak ada stok yang menipis." footerHref="/barang-masuk" footerLabel="Buka Barang Masuk">
          <KpiCard interactive label="Stok Menipis" value={String(lowStockCount)} icon={PackageMinus} tone="warning" />
        </KpiDetail>
        <KpiDetail title="Stok Habis" description="Stok sudah nol. Tidak bisa dijual sampai ditambah." columns={stockColumns} rows={stockRows(byStatus("HABIS"))} emptyText="Tidak ada stok yang habis." footerHref="/barang-masuk" footerLabel="Buka Barang Masuk">
          <KpiCard interactive label="Stok Habis" value={String(outOfStockCount)} icon={PackageX} tone="destructive" />
        </KpiDetail>
        <KpiDetail title="Mendekati Kedaluwarsa" description="Sudah masuk masa peringatan sesuai pengaturan tiap produk." columns={expiryColumns} rows={expiryRows(products.filter((p) => expiryOf(p) === "MENDEKATI"))} emptyText="Tidak ada barang yang mendekati kedaluwarsa." footerHref="/barang-keluar" footerLabel="Catat barang keluar">
          <KpiCard interactive label="Mendekati Kedaluwarsa" value={String(expiringSoon)} icon={CalendarClock} tone="warning" />
        </KpiDetail>
        <KpiDetail title="Sudah Kedaluwarsa" description="Jangan dijual. Catat sebagai barang keluar (kedaluwarsa) supaya stok sesuai." columns={expiryColumns} rows={expiryRows(products.filter((p) => expiryOf(p) === "KEDALUWARSA"))} emptyText="Tidak ada barang yang kedaluwarsa." footerHref="/barang-keluar" footerLabel="Catat barang keluar">
          <KpiCard interactive label="Sudah Kedaluwarsa" value={String(expired)} icon={CalendarX} tone="destructive" />
        </KpiDetail>
      </div>

      {untracked > 0 && (
        <p className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning-foreground">
          {untracked} produk belum punya tanggal kedaluwarsa. Lengkapi di Master Produk agar
          peringatannya bisa muncul.
        </p>
      )}

      <BarcodeAudit />

      <h2 className="text-sm font-semibold text-foreground">Daftar Stok Barang (Produk Fisik)</h2>
      <div id="daftar-stok" className="scroll-mt-24 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Produk</th>
              <th className="px-3 py-2">Barcode</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Stok</th>
              <th className="px-3 py-2">Min</th>
              <th className="px-3 py-2">Harga Jual</th>
              <th className="px-3 py-2">Kedaluwarsa</th>
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
                    {p.primaryBarcode ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.sku}</td>
                  <td className="px-3 py-2 text-foreground tabular-nums">{Number(p.currentStock)}</td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{p.minimumStock}</td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">
                    Rp{Number(p.sellingPrice).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {(() => {
                      const expiry = expiryOf(p);
                      if (expiry === "TIDAK_DIPANTAU") {
                        return <span className="text-xs text-muted-foreground">belum diisi</span>;
                      }
                      const days = expiryService.daysUntil(p.expiryDate as Date, now);
                      return (
                        <span
                          className={
                            expiry === "KEDALUWARSA"
                              ? "text-xs font-medium text-destructive"
                              : expiry === "MENDEKATI"
                                ? "text-xs font-medium text-warning-foreground"
                                : "text-xs text-muted-foreground"
                          }
                        >
                          {expiryService.describe(expiry, days)}
                        </span>
                      );
                    })()}
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
