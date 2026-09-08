import { prisma } from "@/shared/infrastructure/prisma";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";

function formatRupiah(value: string | number) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

export async function PenjualanTab({ start, end }: { start: Date; end: Date }) {
  const [summary, transactionCount] = await Promise.all([
    new GetFinancialSummaryUseCase().execute(start, end),
    prisma.sale.count({ where: { status: "PAID", paidAt: { gte: start, lte: end } } }),
  ]);

  const avgTransaction = transactionCount > 0 ? Number(summary.revenue) / transactionCount : 0;

  const cards: [string, string][] = [
    ["Revenue", summary.revenue.toFixed(2)],
    ["Jumlah Transaksi", String(transactionCount)],
    ["Rata-rata / Transaksi", avgTransaction.toFixed(2)],
    ["Cash", summary.cash.toFixed(2)],
    ["Cashless", summary.cashless.toFixed(2)],
    ["HPP", summary.cogs.toFixed(2)],
    ["Laba Kotor", summary.grossProfit.toFixed(2)],
    ["Pengeluaran", summary.expense.toFixed(2)],
    ["Laba Operasional", summary.operationalProfit.toFixed(2)],
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {label === "Jumlah Transaksi" ? value : formatRupiah(value)}
          </p>
        </div>
      ))}
    </div>
  );
}
