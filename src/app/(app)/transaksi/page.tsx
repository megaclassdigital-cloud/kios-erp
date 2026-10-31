import { FileText, RotateCcw, Banknote, CreditCard } from "lucide-react";
import { prisma } from "@/shared/infrastructure/prisma";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { PageHeader } from "@/components/kios/page-header";
import { KpiCard } from "@/components/kios/kpi-card";
import { KpiDetail, type DetailRow } from "@/components/kios/kpi-detail";
import { StatusBadge } from "@/components/kios/status-badge";
import { RefundButton } from "./refund-button";
import { TransactionDetailButton } from "./transaction-detail-button";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral" | "destructive"> = {
  PAID: "success",
  PENDING: "warning",
  CANCELLED: "neutral",
  REFUNDED: "destructive",
};

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export default async function TransaksiPage() {
  const session = await auth();
  const seeAll = session ? hasPermission(session.user.role, "transactions.view_all") : false;
  const canRefund = session ? hasPermission(session.user.role, "refund.manage") : false;

  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const now = new Date();
  const cashierFilter = seeAll || !session ? undefined : { cashierId: session.user.id };

  const [sales, todaySales] = await Promise.all([
    prisma.sale.findMany({
      where: cashierFilter,
      orderBy: { createdAt: "desc" },
      take: 100,
      // The list only ever displays the cashier's name and an item
      // count — select instead of the previous include: { cashier: true,
      // items: true }, which pulled every SaleItem field and the full
      // User row (passwordHash included) just to show two things.
      select: {
        id: true,
        transactionNumber: true,
        createdAt: true,
        paymentMethod: true,
        grandTotal: true,
        status: true,
        cashier: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.sale.findMany({
      where: { ...cashierFilter, createdAt: { gte: startOfDay, lte: now } },
      orderBy: { createdAt: "desc" },
      select: { transactionNumber: true, createdAt: true, status: true, paymentMethod: true, grandTotal: true },
    }),
  ]);

  const todayCount = todaySales.filter((s) => s.status === "PAID").length;
  const todayRefunds = todaySales.filter((s) => s.status === "REFUNDED").length;
  const todayCash = todaySales
    .filter((s) => s.status === "PAID" && s.paymentMethod === "CASH")
    .reduce((acc, s) => acc + Number(s.grandTotal), 0);
  const todayCashless = todaySales
    .filter((s) => s.status === "PAID" && s.paymentMethod === "CASHLESS")
    .reduce((acc, s) => acc + Number(s.grandTotal), 0);

  const todayColumns = [{ header: "No. Transaksi" }, { header: "Jam" }, { header: "Metode" }, { header: "Total", align: "right" as const }];
  const todayRows = (keep: (s: (typeof todaySales)[number]) => boolean): DetailRow[] =>
    todaySales.filter(keep).map((s) => ({
      cells: [s.transactionNumber, s.createdAt.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }), s.paymentMethod === "CASH" ? "Tunai" : "Cashless", formatRupiah(Number(s.grandTotal))],
    }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Riwayat Transaksi"
        description={`Pantau semua transaksi penjualan, refund, dan aktivitas kasir ${seeAll ? "di toko Anda" : "pada shift Anda"}.`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiDetail title="Transaksi lunas hari ini" columns={todayColumns} rows={todayRows((s) => s.status === "PAID")} emptyText="Belum ada transaksi lunas hari ini.">
          <KpiCard interactive label="Total Transaksi Hari Ini" value={String(todayCount)} icon={FileText} />
        </KpiDetail>
        <KpiDetail title="Refund hari ini" columns={todayColumns} rows={todayRows((s) => s.status === "REFUNDED")} emptyText="Belum ada refund hari ini.">
          <KpiCard interactive label="Refund Hari Ini" value={String(todayRefunds)} icon={RotateCcw} tone="destructive" />
        </KpiDetail>
        <KpiDetail title="Transaksi tunai hari ini" columns={todayColumns} rows={todayRows((s) => s.status === "PAID" && s.paymentMethod === "CASH")} emptyText="Belum ada transaksi tunai hari ini.">
          <KpiCard interactive label="Total Cash" value={formatRupiah(todayCash)} icon={Banknote} tone="success" />
        </KpiDetail>
        <KpiDetail title="Transaksi cashless hari ini" columns={todayColumns} rows={todayRows((s) => s.status === "PAID" && s.paymentMethod === "CASHLESS")} emptyText="Belum ada transaksi cashless hari ini.">
          <KpiCard interactive label="Total Cashless" value={formatRupiah(todayCashless)} icon={CreditCard} tone="info" />
        </KpiDetail>
      </div>

      <div data-tour="transaction-table" className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">No. Transaksi</th>
              <th className="px-3 py-2">Waktu</th>
              <th className="px-3 py-2">Kasir</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Metode</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Belum ada transaksi.
                </td>
              </tr>
            )}
            {sales.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs text-foreground">{s.transactionNumber}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.createdAt.toLocaleString("id-ID")}</td>
                <td className="px-3 py-2 text-foreground">{s.cashier.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{s._count.items} item</td>
                <td className="px-3 py-2 text-muted-foreground">{s.paymentMethod}</td>
                <td className="px-3 py-2 font-medium text-foreground tabular-nums">
                  {formatRupiah(Number(s.grandTotal))}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status}</StatusBadge>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-3">
                    <TransactionDetailButton saleId={s.id} />
                    {canRefund && s.status === "PAID" && <RefundButton saleId={s.id} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
