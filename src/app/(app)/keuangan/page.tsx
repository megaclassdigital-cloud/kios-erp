import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";
import { prisma } from "@/shared/infrastructure/prisma";
import { ExpenseForm } from "./expense-form";

function formatRupiah(value: string) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

export default async function KeuanganPage() {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const now = new Date();

  const [summary, expenses] = await Promise.all([
    new GetFinancialSummaryUseCase().execute(startOfMonth, now),
    prisma.expense.findMany({ orderBy: { expenseDate: "desc" }, take: 20 }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Keuangan (Bulan Ini)</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Revenue", summary.revenue.toFixed(2)],
          ["HPP", summary.cogs.toFixed(2)],
          ["Laba Kotor", summary.grossProfit.toFixed(2)],
          ["Pengeluaran", summary.expense.toFixed(2)],
          ["Laba Operasional", summary.operationalProfit.toFixed(2)],
          ["Cash", summary.cash.toFixed(2)],
          ["Cashless", summary.cashless.toFixed(2)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{formatRupiah(value)}</p>
          </div>
        ))}
      </div>

      <ExpenseForm />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Keterangan</th>
              <th className="px-3 py-2">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-500">{e.expenseDate.toLocaleDateString("id-ID")}</td>
                <td className="px-3 py-2 text-gray-700">{e.category}</td>
                <td className="px-3 py-2 text-gray-500">{e.description ?? "-"}</td>
                <td className="px-3 py-2 font-medium text-gray-900">
                  {formatRupiah(e.amount.toString())}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
