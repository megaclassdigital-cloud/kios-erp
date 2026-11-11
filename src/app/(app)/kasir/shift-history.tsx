"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { buildReceiptBytes, type PrintableSale } from "@/shared/printing/receipt-escpos";
import type { ShiftSalesSummary } from "@/modules/pos/domain/shift-sales-summary";
import { ThermalPrintButton } from "../thermal-print-button";
import { formatWibTime } from "@/shared/format/wib";

interface SaleLine {
  productNameSnapshot: string;
  isConsignment?: boolean;
  quantity: string;
  unitPriceAtSale: string;
  discountAmount: string;
  promoType: string | null;
  promoValue: string | null;
  subtotal: string;
  serviceDetail: { phoneNumber: string | null; meterNumber: string | null; customerNumber: string | null } | null;
}
interface ShiftSale extends PrintableSale {
  id: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  items: SaleLine[];
}

const rupiah = (v: string | number) => `Rp${Math.round(Number(v)).toLocaleString("id-ID")}`;
const qty = (v: string) => Number(v).toLocaleString("id-ID", { maximumFractionDigits: 3 });
const STATUS: Record<ShiftSale["status"], { label: string; className: string }> = {
  PAID: { label: "Lunas", className: "bg-success-soft text-success" },
  PENDING: { label: "Menunggu pembayaran", className: "bg-warning-soft text-warning-foreground" },
  REFUNDED: { label: "Direfund", className: "bg-destructive-soft text-destructive" },
  CANCELLED: { label: "Dibatalkan", className: "bg-muted text-muted-foreground" },
};

/**
 * Every transaction of this shift, under the till: what was sold, at what
 * price, how many, and the total. It belongs to the shift, so it is still
 * there after a reload or a change of tablet, and it refreshes when a sale
 * completes. (The Transaksi tab keeps the all-shifts view.)
 */
export function ShiftHistory({ shiftId, refreshKey }: { shiftId: string; refreshKey: number }) {
  const [sales, setSales] = useState<ShiftSale[] | null>(null);
  const [summary, setSummary] = useState<ShiftSalesSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/pos/shifts/${shiftId}/sales`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Riwayat shift belum bisa dimuat.");
      setSales(data.sales);
      setSummary(data.summary);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [shiftId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section data-tour="shift-history" className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Riwayat Transaksi Shift Ini</h2>
        <button onClick={() => void load().then(() => toast.success("Riwayat diperbarui."))} className="text-xs text-primary hover:underline">
          Muat ulang
        </button>
      </div>

      {summary && (
        <p className="text-xs text-muted-foreground">
          <b className="text-foreground">{summary.paidCount}</b> transaksi lunas · <b className="text-foreground">{qty(summary.unitsSold)}</b> barang terjual · total{" "}
          <b className="text-foreground">{rupiah(summary.paidTotal)}</b> (tunai {rupiah(summary.cashTotal)}, non-tunai {rupiah(summary.cashlessTotal)})
          {summary.otherCount > 0 && ` · ${summary.otherCount} lainnya belum lunas / dibatalkan / direfund`}
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!sales && !error && <p className="text-sm text-muted-foreground">Memuat...</p>}
      {sales?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Belum ada transaksi di shift ini. Transaksi yang selesai muncul di sini.</p>}

      <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
        {sales?.map((sale) => {
          const status = STATUS[sale.status];
          return (
            <article key={sale.id} className="rounded-lg border border-border">
              <header className="flex flex-wrap items-center justify-between gap-2 bg-muted px-3 py-2 text-xs">
                <span className="font-mono text-foreground">{sale.transactionNumber}</span>
                <span className="text-muted-foreground">
                  {formatWibTime(new Date(sale.paidAt ?? sale.createdAt))} · {sale.paymentMethod === "CASH" ? "Tunai" : "Non-tunai"}
                </span>
                <span className={`rounded-full px-2 py-0.5 font-medium ${status.className}`}>{status.label}</span>
              </header>

              <table className="w-full text-sm">
                <thead className="text-left text-[11px] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1">Barang</th>
                    <th className="px-2 py-1 text-right">Qty</th>
                    <th className="px-2 py-1 text-right">Harga</th>
                    <th className="px-3 py-1 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item, i) => (
                    <tr key={i} className="border-t border-border/60 align-top">
                      <td className="px-3 py-1.5 text-foreground">
                        {item.productNameSnapshot}
                        {item.isConsignment && <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 align-middle text-[10px] font-medium text-muted-foreground">Titipan</span>}
                        {item.serviceDetail && (
                          <span className="block text-[11px] text-muted-foreground">
                            {item.serviceDetail.phoneNumber ? `HP: ${item.serviceDetail.phoneNumber}` : `Meter: ${item.serviceDetail.meterNumber} · Plgn: ${item.serviceDetail.customerNumber}`}
                          </span>
                        )}
                        {Number(item.discountAmount) > 0 && (
                          <span className="block text-[11px] text-success">
                            {item.promoType === "PERCENT" ? `Promo ${Number(item.promoValue)}%` : "Promo"} −{rupiah(item.discountAmount)}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{qty(item.quantity)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-muted-foreground">{rupiah(item.unitPriceAtSale)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium tabular-nums">{rupiah(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  {Number(sale.discount) > 0 && <>Harga awal {rupiah(sale.subtotal)} · Promo −{rupiah(sale.discount)} · </>}
                  {sale.paymentMethod === "CASH" && sale.cashReceived && <>Diterima {rupiah(sale.cashReceived)} · Kembali {rupiah(sale.changeAmount ?? 0)}</>}
                </span>
                <span className="flex items-center gap-3">
                  <b className="text-sm text-foreground">Total {rupiah(sale.grandTotal)}</b>
                  {sale.status === "PAID" && (
                    <ThermalPrintButton
                      label="Cetak"
                      className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                      build={(c) => buildReceiptBytes(sale, { columns: c.columns, cut: c.cut, openDrawer: false })}
                    />
                  )}
                </span>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
