import { prisma } from "@/shared/infrastructure/prisma";
import { InventoryService } from "@/modules/inventory/domain/inventory-service";

const MOVEMENT_LABEL: Record<string, string> = {
  PURCHASE: "Barang Masuk",
  SALE: "Penjualan",
  RETURN_IN: "Retur Masuk",
  RETURN_OUT: "Retur Keluar",
  DAMAGE: "Rusak",
  EXPIRED: "Kedaluwarsa",
  ADJUSTMENT: "Penyesuaian",
  STOCK_OPNAME: "Stock Opname",
  INITIAL_STOCK: "Stok Awal",
};

export async function InventarisTab({ start, end }: { start: Date; end: Date }) {
  const inventoryService = new InventoryService();

  const [products, movements, opnameItems] = await Promise.all([
    prisma.product.findMany({
      where: { trackInventory: true, active: true },
      select: { id: true, name: true, currentStock: true, minimumStock: true },
    }),
    prisma.stockMovement.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { product: { select: { name: true } } },
    }),
    prisma.stockOpnameItem.findMany({
      where: {
        difference: { not: 0 },
        stockOpname: { status: "APPROVED", approvedAt: { gte: start, lte: end } },
      },
      include: { product: { select: { name: true } }, stockOpname: { select: { opnameNumber: true } } },
      take: 50,
    }),
  ]);

  let aman = 0,
    menipis = 0,
    habis = 0;
  for (const p of products) {
    const status = inventoryService.classifyStock(Number(p.currentStock), p.minimumStock);
    if (status === "AMAN") aman++;
    else if (status === "MENIPIS") menipis++;
    else habis++;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Stok Aman</p>
          <p className="mt-1 text-lg font-semibold text-success">{aman}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Stok Menipis</p>
          <p className="mt-1 text-lg font-semibold text-warning-foreground">{menipis}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Stok Habis</p>
          <p className="mt-1 text-lg font-semibold text-destructive">{habis}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Mutasi Stok (Periode Ini)</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada mutasi stok pada periode ini.</p>
        ) : (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1">Waktu</th>
                  <th className="py-1">Produk</th>
                  <th className="py-1">Tipe</th>
                  <th className="py-1">Qty</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="whitespace-nowrap py-1.5 text-muted-foreground">{m.createdAt.toLocaleString("id-ID")}</td>
                    <td className="whitespace-nowrap py-1.5 text-foreground">{m.product.name}</td>
                    <td className="whitespace-nowrap py-1.5 text-muted-foreground">{MOVEMENT_LABEL[m.movementType] ?? m.movementType}</td>
                    <td
                      className={`py-1.5 font-medium tabular-nums ${
                        Number(m.quantity) < 0 ? "text-destructive" : "text-success"
                      }`}
                    >
                      {Number(m.quantity) > 0 ? "+" : ""}
                      {Number(m.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Selisih Stock Opname (Disetujui)</h2>
        {opnameItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada selisih stock opname pada periode ini.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">No. Opname</th>
                <th className="py-1">Produk</th>
                <th className="py-1">Sistem</th>
                <th className="py-1">Fisik</th>
                <th className="py-1">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {opnameItems.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="whitespace-nowrap py-1.5 font-mono text-xs text-muted-foreground">{o.stockOpname.opnameNumber}</td>
                  <td className="whitespace-nowrap py-1.5 text-foreground">{o.product.name}</td>
                  <td className="py-1.5 text-muted-foreground tabular-nums">{Number(o.systemQty)}</td>
                  <td className="py-1.5 text-muted-foreground tabular-nums">{Number(o.physicalQty)}</td>
                  <td
                    className={`py-1.5 font-medium tabular-nums ${
                      Number(o.difference) < 0 ? "text-destructive" : "text-success"
                    }`}
                  >
                    {Number(o.difference) > 0 ? "+" : ""}
                    {Number(o.difference)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
