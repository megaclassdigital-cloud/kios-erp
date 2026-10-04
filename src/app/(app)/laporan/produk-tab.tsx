import { prisma } from "@/shared/infrastructure/prisma";

function formatRupiah(value: string | number) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

function ProductTable({
  title,
  rows,
}: {
  title: string;
  rows: { productId: string; productNameSnapshot: string; qty: number; total: number }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada data penjualan pada periode ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">Produk</th>
                <th className="py-1">Qty</th>
                <th className="py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.productId} className="border-t border-border">
                  <td className="whitespace-nowrap py-1.5 text-foreground">{r.productNameSnapshot}</td>
                  <td className="py-1.5 text-muted-foreground tabular-nums">{r.qty}</td>
                  <td className="py-1.5 font-medium text-foreground tabular-nums">{formatRupiah(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export async function ProdukTab({ start, end }: { start: Date; end: Date }) {
  const where = { sale: { status: "PAID" as const, paidAt: { gte: start, lte: end } } };

  const [best, sold, activeProducts] = await Promise.all([
    prisma.saleItem.groupBy({
      by: ["productId", "productNameSnapshot"],
      where,
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 10,
    }),
    // Which products moved at all in the period. "Kurang laku" used to be
    // this same list sorted ascending, which could only ever show products
    // that *did* sell — the ones that sold nothing, the whole point of the
    // report, were invisible. A product with one sale looked like the worst
    // performer while dead stock sat unlisted.
    prisma.saleItem.findMany({
      where,
      select: { productId: true },
      distinct: ["productId"],
    }),
    prisma.product.findMany({
      where: { active: true, productType: "PHYSICAL" },
      select: { id: true, name: true, currentStock: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const soldIds = new Set(sold.map((s) => s.productId));
  const neverSold = activeProducts.filter((p) => !soldIds.has(p.id));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ProductTable
        title="Produk Terlaris"
        rows={best.map((r) => ({
          productId: r.productId,
          productNameSnapshot: r.productNameSnapshot,
          qty: Number(r._sum.quantity ?? 0),
          total: Number(r._sum.subtotal ?? 0),
        }))}
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Tidak Laku Sama Sekali</h2>
        <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
          Produk aktif yang tidak terjual satu pun pada periode ini — modal yang mengendap di rak.
        </p>
        {neverSold.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Semua produk aktif terjual minimal satu kali pada periode ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1">Produk</th>
                  <th className="py-1">Sisa Stok</th>
                </tr>
              </thead>
              <tbody>
                {neverSold.slice(0, 15).map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="whitespace-nowrap py-1.5 text-foreground">{p.name}</td>
                    <td className="py-1.5 text-muted-foreground tabular-nums">{Number(p.currentStock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {neverSold.length > 15 && (
              <p className="mt-2 text-xs text-muted-foreground">
                dan {neverSold.length - 15} produk lainnya.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
