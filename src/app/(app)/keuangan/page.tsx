import { ShoppingCart, Package, PiggyBank, TrendingDown, Wallet, Banknote, CreditCard } from "lucide-react";
import { redirect } from "next/navigation";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary-use-case";
import { prisma } from "@/shared/infrastructure/prisma";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { PageHeader } from "@/components/kios/page-header";
import { KpiCard } from "@/components/kios/kpi-card";
import { EmptyState } from "@/components/kios/empty-state";
import { HelpPanel, HelpStep } from "@/components/kios/help-panel";
import { PeriodSelector } from "../laporan/period-selector";
import { resolvePeriod } from "../laporan/resolve-period";
import { ExportToolbar } from "../laporan/export-toolbar";
import { ExpenseForm } from "./expense-form";

function formatRupiah(value: string) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

const EXPENSE_LABEL: Record<string, string> = {
  SUPPLIER: "Supplier (tidak dipakai lagi)",
  ELECTRICITY: "Listrik & Air",
  TRANSPORT: "Transportasi & Bensin",
  SALARY: "Gaji Karyawan",
  OPERATIONAL: "Operasional Toko",
  OTHER: "Lain-lain",
};

/**
 * The one place the money picture lives.
 *
 * The same seven figures used to appear here, on the dashboard, and again on
 * a Laporan tab, under three different sets of names — "Revenue" in one place
 * and "Penjualan Hari Ini" in another. The Laporan copy is gone and its period
 * selector moved here, so there is now one screen to look at and one set of
 * words for each number.
 */
export default async function KeuanganPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "finance.manage")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const period = resolvePeriod(params);

  const [summary, expenses, transactionCount] = await Promise.all([
    new GetFinancialSummaryUseCase().execute(period.start, period.end),
    prisma.expense.findMany({
      where: { expenseDate: { gte: period.start, lte: period.end } },
      orderBy: { expenseDate: "desc" },
      take: 20,
    }),
    prisma.sale.count({
      where: { status: "PAID", paidAt: { gte: period.start, lte: period.end } },
    }),
  ]);

  // Named for a shopkeeper, not an accountant: "Revenue" and "HPP" meant
  // nothing on their own, and two profit lines sitting side by side with no
  // explanation of the difference raised more questions than they answered.
  const cards = [
    { label: "Omzet (Uang Masuk)", value: summary.revenue.toFixed(2), icon: ShoppingCart },
    { label: "Modal Barang Terjual", value: summary.cogs.toFixed(2), icon: Package },
    { label: "Untung Kotor", value: summary.grossProfit.toFixed(2), icon: PiggyBank, tone: "success" as const },
    { label: "Pengeluaran Toko", value: summary.expense.toFixed(2), icon: TrendingDown, tone: "warning" as const },
    { label: "Untung Bersih", value: summary.operationalProfit.toFixed(2), icon: Wallet, tone: "success" as const },
    { label: "Diterima Tunai", value: summary.cash.toFixed(2), icon: Banknote, tone: "success" as const },
    { label: "Diterima Non-Tunai", value: summary.cashless.toFixed(2), icon: CreditCard, tone: "info" as const },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Keuangan"
        description={`Omzet, pengeluaran, dan keuntungan toko — ${period.label}.`}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <PeriodSelector basePath="/keuangan" active={period.key} />
        <ExportToolbar
          csvHref={`/api/reports/export?tab=keuangan&period=${period.key}${
            period.key === "custom" ? `&from=${params.from ?? ""}&to=${params.to ?? ""}` : ""
          }`}
        />
      </div>

      <HelpPanel id="keuangan" title="Cara membaca angka di halaman ini">
        <HelpStep n={1}>
          <strong className="text-foreground">Omzet</strong> adalah seluruh uang masuk dari
          penjualan. Ini <em>bukan</em> keuntungan — di dalamnya masih ada modal barangnya.
        </HelpStep>
        <HelpStep n={2}>
          <strong className="text-foreground">Modal Barang Terjual</strong> adalah harga beli dari
          barang-barang yang laku pada periode ini. Dihitung dari harga beli saat barang itu
          terjual, jadi perubahan harga supplier belakangan tidak mengubah laporan lama.
        </HelpStep>
        <HelpStep n={3}>
          <strong className="text-foreground">Untung Kotor = Omzet − Modal Barang Terjual.</strong>{" "}
          Ini keuntungan dari berdagangnya saja, belum dipotong biaya toko.
        </HelpStep>
        <HelpStep n={4}>
          <strong className="text-foreground">Untung Bersih = Untung Kotor − Pengeluaran Toko.</strong>{" "}
          Inilah angka yang benar-benar Anda bawa pulang. Kalau hanya mau melihat satu angka, lihat
          yang ini.
        </HelpStep>
        <HelpStep n={5}>
          <strong className="text-foreground">Jangan catat belanja stok sebagai pengeluaran.</strong>{" "}
          Modalnya sudah terhitung otomatis. Mencatatnya dua kali membuat Untung Bersih terlihat
          jauh lebih kecil — bahkan bisa tampak rugi padahal untung.
        </HelpStep>
      </HelpPanel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <KpiCard key={c.label} label={c.label} value={formatRupiah(c.value)} icon={c.icon} tone={c.tone} />
        ))}
        <KpiCard label="Jumlah Transaksi" value={String(transactionCount)} icon={ShoppingCart} />
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
                  <EmptyState title="Belum ada pengeluaran tercatat pada periode ini." />
                </td>
              </tr>
            )}
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-3 py-2 text-muted-foreground">{e.expenseDate.toLocaleDateString("id-ID")}</td>
                <td className="px-3 py-2 text-foreground">{EXPENSE_LABEL[e.category] ?? e.category}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.description ?? "—"}</td>
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
