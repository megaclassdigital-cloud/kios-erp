import { TrendingUp, Package, PiggyBank, TrendingDown, LineChart, Banknote, CreditCard } from "lucide-react";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";
import { prisma } from "@/shared/infrastructure/prisma";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/kios/page-header";
import { KpiCard } from "@/components/kios/kpi-card";
import { EmptyState } from "@/components/kios/empty-state";
import { ExpenseForm } from "./expense-form";

function formatRupiah(value: string) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

export default async function KeuanganPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "finance.manage")) {
    redirect("/dashboard");
  }

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const now = new Date();

  const [summary, expenses] = await Promise.all([
    new GetFinancialSummaryUseCase().execute(startOfMonth, now),
    prisma.expense.findMany({ orderBy: { expenseDate: "desc" }, take: 20 }),
  ]);

  const cards: { label: string; value: string; icon: typeof TrendingUp; tone?: "success" | "warning" | "destructive" | "info" }[] = [
    { label: "Revenue", value: summary.revenue.toFixed(2), icon: TrendingUp },
    { label: "HPP", value: summary.cogs.toFixed(2), icon: Package },
    { label: "Laba Kotor", value: summary.grossProfit.toFixed(2), icon: PiggyBank, tone: "success" },
    { label: "Pengeluaran", value: summary.expense.toFixed(2), icon: TrendingDown, tone: "warning" },
    { label: "Laba Operasional", value: summary.operationalProfit.toFixed(2), icon: LineChart, tone: "success" },
    { label: "Cash", value: summary.cash.toFixed(2), icon: Banknote, tone: "success" },
    { label: "Cashless", value: summary.cashless.toFixed(2), icon: CreditCard, tone: "info" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Keuangan" description="Pantau arus kas, pengeluaran, dan keuntungan usaha Anda (bulan ini)." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <KpiCard key={c.label} label={c.label} value={formatRupiah(c.value)} icon={c.icon} tone={c.tone} />
        ))}
      </div>

      <ExpenseForm />

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Keterangan</th>
              <th className="px-3 py-2">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8">
                  <EmptyState title="Belum ada pengeluaran tercatat." />
                </td>
              </tr>
            )}
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-3 py-2 text-muted-foreground">{e.expenseDate.toLocaleDateString("id-ID")}</td>
                <td className="px-3 py-2 text-foreground">{e.category}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.description ?? "-"}</td>
                <td className="px-3 py-2 font-medium text-foreground tabular-nums">
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
