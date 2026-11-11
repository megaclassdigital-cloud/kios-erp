import { FileText, RotateCcw, Banknote, CreditCard, ShoppingCart, PiggyBank } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/shared/infrastructure/prisma";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { PageHeader } from "@/components/kios/page-header";
import { KpiCard } from "@/components/kios/kpi-card";
import { KpiDetail, type DetailRow } from "@/components/kios/kpi-detail";
import { StatusBadge } from "@/components/kios/status-badge";
import { PrismaFinanceReadRepository } from "@/modules/finance/infrastructure/prisma-finance-read-repository";
import { formatWibDateTime } from "@/shared/format/wib";
import { PeriodSelector } from "../laporan/period-selector";
import { resolvePeriod } from "../laporan/resolve-period";
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

const STATUS_LABEL: Record<string, string> = { PAID: "Lunas", PENDING: "Menunggu", CANCELLED: "Dibatalkan", REFUNDED: "Direfund" };
const PAGE_SIZE = 50;
const DETAIL_LIMIT = 200;
const MAX_LINES = 4;

/**
 * Transaction history for a chosen period (WIB days). The cards and the table
 * use the same period and the same rule as Keuangan — a sale belongs to the
 * day it was paid — so a number here can be matched to one there.
 */
export default async function TransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; page?: string }>;
}) {
  const session = await auth();
  const seeAll = session ? hasPermission(session.user.role, "transactions.view_all") : false;
  const canRefund = session ? hasPermission(session.user.role, "refund.manage") : false;
  const canSeeProfit = session ? hasPermission(session.user.role, "finance.manage") : false;

  const params = await searchParams;
  // Opens on today: the question this page usually answers is "what happened today".
  const period = resolvePeriod({ ...params, period: params.period ?? "today" });
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const cashierId = seeAll || !session ? undefined : session.user.id;

  // A sale belongs to the day it was paid; one never paid (waiting, cancelled)
  // falls back to the day it was started.
  const inPeriod = {
    ...(cashierId ? { cashierId } : {}),
    OR: [
      { paidAt: { gte: period.start, lte: period.end } },
      { paidAt: null, createdAt: { gte: period.start, lte: period.end } },
    ],
  };

  const [sales, total, groups, totals, detail] = await Promise.all([
    prisma.sale.findMany({
      where: inPeriod,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      // Only what the table shows (no full User row — passwordHash included).
      select: {
        id: true,
        transactionNumber: true,
        createdAt: true,
        paidAt: true,
        paymentMethod: true,
        grandTotal: true,
        status: true,
        cashier: { select: { name: true } },
        items: {
          orderBy: { id: "asc" },
          select: { id: true, productNameSnapshot: true, quantity: true, unitPriceAtSale: true, discountAmount: true },
        },
      },
    }),
    prisma.sale.count({ where: inPeriod }),
    prisma.sale.groupBy({ by: ["status", "paymentMethod"], where: inPeriod, _count: { _all: true }, _sum: { grandTotal: true } }),
    new PrismaFinanceReadRepository(prisma).periodTotals(period.start, period.end, cashierId).catch(() => null),
    // Behind the cards; opening one must not be able to break the page.
    prisma.sale
      .findMany({
        where: inPeriod,
        orderBy: { createdAt: "desc" },
        take: DETAIL_LIMIT,
        select: { transactionNumber: true, createdAt: true, paidAt: true, status: true, paymentMethod: true, grandTotal: true },
      })
      .catch(() => null),
  ]);

  const sum = (keep: (g: (typeof groups)[number]) => boolean) =>
    groups.filter(keep).reduce((acc, g) => ({ n: acc.n + g._count._all, amount: acc.amount + Number(g._sum.grandTotal ?? 0) }), { n: 0, amount: 0 });
  const paid = sum((g) => g.status === "PAID");
  const refunded = sum((g) => g.status === "REFUNDED");
  const cash = sum((g) => g.status === "PAID" && g.paymentMethod === "CASH");
  const cashless = sum((g) => g.status === "PAID" && g.paymentMethod === "CASHLESS");
  const grossProfit = totals ? Number(totals.revenue) - Number(totals.cogs) : null;

  const columns = [{ header: "No. Transaksi" }, { header: "Waktu (WIB)" }, { header: "Metode" }, { header: "Total", align: "right" as const }];
  const rowsFor = (keep: (s: NonNullable<typeof detail>[number]) => boolean): DetailRow[] =>
    (detail ?? []).filter(keep).map((s) => ({
      cells: [s.transactionNumber, formatWibDateTime(s.paidAt ?? s.createdAt), s.paymentMethod === "CASH" ? "Tunai" : "Cashless", formatRupiah(Number(s.grandTotal))],
    }));
  const unavailable = "Rincian belum bisa dimuat. Muat ulang halaman untuk mencoba lagi.";
  const note = detail && total > detail.length ? `Menampilkan ${detail.length} terbaru dari ${total} transaksi pada periode ini.` : undefined;

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const q = new URLSearchParams({ period: period.key });
    if (period.key === "custom") {
      q.set("from", params.from ?? "");
      q.set("to", params.to ?? "");
    }
    if (p > 1) q.set("page", String(p));
    return `/transaksi?${q.toString()}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Riwayat Transaksi"
        description={`Pantau semua transaksi penjualan, refund, dan aktivitas kasir ${seeAll ? "di toko Anda" : "pada shift Anda"} — ${period.label}.`}
      />

      <PeriodSelector
        basePath="/transaksi"
        active={period.key}
        custom={params}
        presets={[
          { key: "today", label: "Hari Ini" },
          { key: "yesterday", label: "Kemarin" },
          { key: "week", label: "Minggu Ini" },
          { key: "month", label: "Bulan Ini" },
          { key: "lastmonth", label: "Bulan Lalu" },
          { key: "year", label: "Tahun Ini" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiDetail title="Transaksi lunas" description={period.label} columns={columns} rows={rowsFor((s) => s.status === "PAID")} emptyText={detail ? "Belum ada transaksi lunas pada periode ini." : unavailable} note={note}>
          <KpiCard interactive label="Transaksi Lunas" value={String(paid.n)} icon={FileText} />
        </KpiDetail>
        <KpiCard label="Omzet" value={totals ? formatRupiah(Number(totals.revenue)) : "-"} icon={ShoppingCart} />
        {canSeeProfit && <KpiCard label="Untung Kotor" value={grossProfit === null ? "-" : formatRupiah(grossProfit)} icon={PiggyBank} tone="success" />}
        <KpiDetail title="Transaksi tunai" description={period.label} columns={columns} rows={rowsFor((s) => s.status === "PAID" && s.paymentMethod === "CASH")} emptyText={detail ? "Belum ada transaksi tunai pada periode ini." : unavailable} note={note}>
          <KpiCard interactive label="Total Cash" value={formatRupiah(cash.amount)} icon={Banknote} tone="success" />
        </KpiDetail>
        <KpiDetail title="Transaksi cashless" description={period.label} columns={columns} rows={rowsFor((s) => s.status === "PAID" && s.paymentMethod === "CASHLESS")} emptyText={detail ? "Belum ada transaksi cashless pada periode ini." : unavailable} note={note}>
          <KpiCard interactive label="Total Cashless" value={formatRupiah(cashless.amount)} icon={CreditCard} tone="info" />
        </KpiDetail>
        <KpiDetail title="Refund" description={period.label} columns={columns} rows={rowsFor((s) => s.status === "REFUNDED")} emptyText={detail ? "Belum ada refund pada periode ini." : unavailable} note={note}>
          <KpiCard interactive label="Refund" value={String(refunded.n)} icon={RotateCcw} tone="destructive" />
        </KpiDetail>
      </div>
      <p className="text-xs text-muted-foreground">
        Omzet dan untung dihitung dari transaksi lunas pada hari bayarnya (WIB), sama dengan halaman Keuangan. Refund tidak dihitung.
      </p>

      <div data-tour="transaction-table" className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Waktu (WIB)</th>
              <th className="px-3 py-2">Barang</th>
              <th className="px-3 py-2">Metode</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  Belum ada transaksi pada periode ini.
                </td>
              </tr>
            )}
            {sales.map((s) => (
              <tr key={s.id} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="text-foreground">{formatWibDateTime(s.paidAt ?? s.createdAt)}</div>
                  <div className="text-xs text-muted-foreground">{s.cashier.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground/80">{s.transactionNumber}</div>
                </td>
                <td className="min-w-[16rem] px-3 py-2">
                  <ul className="space-y-0.5">
                    {s.items.slice(0, MAX_LINES).map((i) => {
                      const qty = Number(i.quantity);
                      const line = qty * Number(i.unitPriceAtSale) - Number(i.discountAmount);
                      return (
                        <li key={i.id} className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 text-foreground">
                            {i.productNameSnapshot}
                            <span className="text-muted-foreground"> · {qty.toLocaleString("id-ID", { maximumFractionDigits: 3 })} × {formatRupiah(Number(i.unitPriceAtSale))}</span>
                          </span>
                          <span className="shrink-0 tabular-nums text-foreground">{formatRupiah(line)}</span>
                        </li>
                      );
                    })}
                    {s.items.length > MAX_LINES && (
                      <li className="text-xs text-muted-foreground">+ {s.items.length - MAX_LINES} barang lain (lihat Detail)</li>
                    )}
                  </ul>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{s.paymentMethod === "CASH" ? "Tunai" : "Cashless"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-foreground tabular-nums">
                  {formatRupiah(Number(s.grandTotal))}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge tone={STATUS_TONE[s.status] ?? "neutral"}>{STATUS_LABEL[s.status] ?? s.status}</StatusBadge>
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

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Halaman {page} dari {pages} · {total} transaksi</span>
          <span className="flex gap-2">
            {page > 1 && <Link href={pageHref(page - 1)} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">Sebelumnya</Link>}
            {page < pages && <Link href={pageHref(page + 1)} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">Berikutnya</Link>}
          </span>
        </div>
      )}
    </div>
  );
}
