import { prisma } from "@/shared/infrastructure/prisma";

function formatRupiah(value: string | number) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

export async function KasirTab({ start, end }: { start: Date; end: Date }) {
  const [perCashier, shifts] = await Promise.all([
    prisma.sale.groupBy({
      by: ["cashierId"],
      where: { status: "PAID", paidAt: { gte: start, lte: end } },
      _sum: { grandTotal: true },
      _count: { id: true },
      orderBy: { _sum: { grandTotal: "desc" } },
    }),
    prisma.cashierShift.findMany({
      where: { status: "CLOSED", closedAt: { gte: start, lte: end } },
      orderBy: { closedAt: "desc" },
      include: { cashier: { select: { name: true } } },
      take: 50,
    }),
  ]);

  const cashierIds = perCashier.map((c) => c.cashierId);
  const cashiers = await prisma.user.findMany({
    where: { id: { in: cashierIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(cashiers.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Penjualan per Kasir</h2>
        {perCashier.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada transaksi pada periode ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="py-1">Kasir</th>
                  <th className="py-1">Jumlah Transaksi</th>
                  <th className="py-1">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {perCashier.map((c) => (
                  <tr key={c.cashierId} className="border-t border-gray-100">
                    <td className="whitespace-nowrap py-1.5 text-gray-900">{nameById.get(c.cashierId) ?? "-"}</td>
                    <td className="py-1.5 text-gray-500">{c._count.id}</td>
                    <td className="whitespace-nowrap py-1.5 font-medium text-gray-900">
                      {formatRupiah(c._sum.grandTotal?.toString() ?? "0")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Selisih Shift Kasir</h2>
        {shifts.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada shift yang ditutup pada periode ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="py-1">Kasir</th>
                  <th className="py-1">Ditutup</th>
                  <th className="py-1">Kas Diharapkan</th>
                  <th className="py-1">Kas Aktual</th>
                  <th className="py-1">Selisih</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="whitespace-nowrap py-1.5 text-gray-900">{s.cashier.name}</td>
                    <td className="whitespace-nowrap py-1.5 text-gray-500">{s.closedAt?.toLocaleString("id-ID")}</td>
                    <td className="whitespace-nowrap py-1.5 text-gray-500">{formatRupiah(s.expectedCash?.toString() ?? "0")}</td>
                    <td className="whitespace-nowrap py-1.5 text-gray-500">{formatRupiah(s.actualCash?.toString() ?? "0")}</td>
                    <td
                      className={`whitespace-nowrap py-1.5 font-medium ${
                        Number(s.difference ?? 0) < 0 ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      {formatRupiah(s.difference?.toString() ?? "0")}
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
