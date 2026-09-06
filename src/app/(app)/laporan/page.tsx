import { prisma } from "@/shared/infrastructure/prisma";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";

function formatRupiah(value: string) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

export default async function LaporanPage() {
  const start30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [summary, grouped] = await Promise.all([
    new GetFinancialSummaryUseCase().execute(start30, now),
    prisma.saleItem.groupBy({
      by: ["productId", "productNameSnapshot"],
      where: { sale: { status: "PAID", paidAt: { gte: start30, lte: now } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Laporan (30 Hari Terakhir)</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          ["Revenue", summary.revenue.toFixed(2)],
          ["HPP", summary.cogs.toFixed(2)],
          ["Laba Kotor", summary.grossProfit.toFixed(2)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{formatRupiah(value)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Produk Terlaris</h2>
        {grouped.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada data penjualan.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-1">Produk</th>
                <th className="py-1">Qty Terjual</th>
                <th className="py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => (
                <tr key={g.productId} className="border-t border-gray-100">
                  <td className="py-1.5 text-gray-900">{g.productNameSnapshot}</td>
                  <td className="py-1.5 text-gray-500">{Number(g._sum.quantity)}</td>
                  <td className="py-1.5 font-medium text-gray-900">
                    {formatRupiah(g._sum.subtotal?.toString() ?? "0")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
