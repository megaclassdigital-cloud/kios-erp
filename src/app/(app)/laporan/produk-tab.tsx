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
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada data penjualan pada periode ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-1">Produk</th>
                <th className="py-1">Qty</th>
                <th className="py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.productId} className="border-t border-gray-100">
                  <td className="whitespace-nowrap py-1.5 text-gray-900">{r.productNameSnapshot}</td>
                  <td className="py-1.5 text-gray-500">{r.qty}</td>
                  <td className="py-1.5 font-medium text-gray-900">{formatRupiah(r.total)}</td>
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

  const [best, worst] = await Promise.all([
    prisma.saleItem.groupBy({
      by: ["productId", "productNameSnapshot"],
      where,
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 10,
    }),
    prisma.saleItem.groupBy({
      by: ["productId", "productNameSnapshot"],
      where,
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: "asc" } },
      take: 10,
    }),
  ]);

  const mapRows = (rows: typeof best) =>
    rows.map((r) => ({
      productId: r.productId,
      productNameSnapshot: r.productNameSnapshot,
      qty: Number(r._sum.quantity ?? 0),
      total: Number(r._sum.subtotal ?? 0),
    }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ProductTable title="Produk Terlaris" rows={mapRows(best)} />
      <ProductTable title="Produk Kurang Laku" rows={mapRows(worst)} />
    </div>
  );
}
