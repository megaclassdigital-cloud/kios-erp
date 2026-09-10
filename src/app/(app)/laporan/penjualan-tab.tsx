import { ShoppingCart, Receipt, TrendingDown as AvgIcon, Banknote, CreditCard, Package, PiggyBank, TrendingDown, LineChart } from "lucide-react";
import { prisma } from "@/shared/infrastructure/prisma";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";
import { KpiCard } from "@/components/kios/kpi-card";

function formatRupiah(value: string | number) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

export async function PenjualanTab({ start, end }: { start: Date; end: Date }) {
  const [summary, transactionCount] = await Promise.all([
    new GetFinancialSummaryUseCase().execute(start, end),
    prisma.sale.count({ where: { status: "PAID", paidAt: { gte: start, lte: end } } }),
  ]);

  const avgTransaction = transactionCount > 0 ? Number(summary.revenue) / transactionCount : 0;

  const cards: { label: string; value: string; icon: typeof ShoppingCart; tone?: "success" | "warning" | "info" }[] = [
    { label: "Revenue (Penjualan)", value: formatRupiah(summary.revenue.toFixed(2)), icon: ShoppingCart },
    { label: "Jumlah Transaksi", value: String(transactionCount), icon: Receipt },
    { label: "Rata-rata / Transaksi", value: formatRupiah(avgTransaction.toFixed(2)), icon: AvgIcon, tone: "warning" },
    { label: "Cash", value: formatRupiah(summary.cash.toFixed(2)), icon: Banknote, tone: "success" },
    { label: "Cashless", value: formatRupiah(summary.cashless.toFixed(2)), icon: CreditCard, tone: "info" },
    { label: "HPP (Harga Pokok)", value: formatRupiah(summary.cogs.toFixed(2)), icon: Package },
    { label: "Laba Kotor", value: formatRupiah(summary.grossProfit.toFixed(2)), icon: PiggyBank, tone: "success" },
    { label: "Pengeluaran", value: formatRupiah(summary.expense.toFixed(2)), icon: TrendingDown, tone: "warning" },
    { label: "Laba Operasional", value: formatRupiah(summary.operationalProfit.toFixed(2)), icon: LineChart, tone: "success" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {cards.map((c) => (
        <KpiCard key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} />
      ))}
    </div>
  );
}
