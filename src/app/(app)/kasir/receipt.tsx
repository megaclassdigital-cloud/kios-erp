"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { printReceipt } from "@/shared/printing/print-receipt";
import { readPrinterConfig } from "@/shared/printing/printer-config";
import { PrinterSettingsModal } from "../printer-settings";

interface ReceiptItem {
  productNameSnapshot: string;
  quantity: string;
  unitPriceAtSale: string;
  subtotal: string;
  promoType?: string | null;
  promoValue?: string | null;
  discountAmount?: string | null;
  serviceDetail?: {
    phoneNumber?: string | null;
    meterNumber?: string | null;
    customerNumber?: string | null;
  } | null;
}

export interface ReceiptSale {
  transactionNumber: string;
  createdAt: string;
  paidAt?: string | null;
  cashier?: { name: string } | null;
  items: ReceiptItem[];
  subtotal: string;
  discount: string;
  grandTotal: string;
  paymentMethod: "CASH" | "CASHLESS";
  cashReceived?: string | null;
  changeAmount?: string | null;
}

function formatRupiah(value: string | number) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

/** Printable struk (PRD 21). Isolated from the rest of the page by
 * #receipt-print + the @media print rule in globals.css. */
export function Receipt({ sale, onClose }: { sale: ReceiptSale; onClose: () => void }) {
  const date = new Date(sale.paidAt ?? sale.createdAt);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const autoPrinted = useRef(false);

  /** Straight to the thermal printer when one is set up; the browser's dialog otherwise or if it fails. */
  async function print() {
    setPrinting(true);
    const outcome = await printReceipt(sale);
    setPrinting(false);
    if (!outcome.ok) {
      toast.error(outcome.message, {
        action: { label: "Cetak lewat browser", onClick: () => window.print() },
        duration: 10000,
      });
    } else if (outcome.via === "printer") {
      toast.success("Struk dikirim ke printer.");
    }
  }

  // Print once, as soon as the receipt appears, for devices set to do that.
  useEffect(() => {
    if (autoPrinted.current) return;
    autoPrinted.current = true;
    const config = readPrinterConfig();
    if (config.autoPrint && (config.mode === "usb" || config.mode === "rawbt")) void print();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 print:static print:bg-transparent print:p-0">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-lg bg-white shadow-xl print:max-h-none print:overflow-visible print:rounded-none print:shadow-none">
        <div data-print-area className="p-5 font-mono text-xs text-gray-900">
          <p className="text-center text-sm font-semibold">Kios-ERP</p>
          <p className="text-center text-[11px] text-gray-500">Struk Transaksi</p>
          <div className="my-2 border-t border-dashed border-gray-300" />
          <p>No: {sale.transactionNumber}</p>
          <p>
            {date.toLocaleDateString("id-ID")} {date.toLocaleTimeString("id-ID")}
          </p>
          <p>Kasir: {sale.cashier?.name ?? "-"}</p>
          <div className="my-2 border-t border-dashed border-gray-300" />

          {sale.items.map((item, i) => (
            <div key={i} className="mb-1.5">
              <div className="flex justify-between gap-2">
                <span className="min-w-0 break-words">{item.productNameSnapshot}</span>
                <span className="shrink-0 tabular-nums">{formatRupiah(item.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>
                  {Number(item.quantity)} x {formatRupiah(item.unitPriceAtSale)}
                </span>
                {Number(item.discountAmount) > 0 && (
                  <span className="tabular-nums">{formatRupiah(Number(item.quantity) * Number(item.unitPriceAtSale))}</span>
                )}
              </div>
              {Number(item.discountAmount) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>{item.promoType === "PERCENT" ? `Promo ${Number(item.promoValue)}%` : "Promo"}</span>
                  <span className="tabular-nums">-{formatRupiah(item.discountAmount ?? 0)}</span>
                </div>
              )}
              {item.serviceDetail && (
                <p className="text-gray-500">
                  {item.serviceDetail.phoneNumber
                    ? `HP: ${item.serviceDetail.phoneNumber}`
                    : `Meter: ${item.serviceDetail.meterNumber} · Plgn: ${item.serviceDetail.customerNumber}`}
                </p>
              )}
            </div>
          ))}

          <div className="my-2 border-t border-dashed border-gray-300" />
          <div className="flex justify-between">
            <span>{Number(sale.discount) > 0 ? "Harga awal" : "Subtotal"}</span>
            <span>{formatRupiah(sale.subtotal)}</span>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between">
              <span>Promo</span>
              <span>-{formatRupiah(sale.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>{formatRupiah(sale.grandTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Metode</span>
            <span>{sale.paymentMethod === "CASH" ? "Tunai" : "Cashless"}</span>
          </div>
          {sale.paymentMethod === "CASH" && sale.cashReceived && (
            <>
              <div className="flex justify-between">
                <span>Diterima</span>
                <span>{formatRupiah(sale.cashReceived)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kembali</span>
                <span>{formatRupiah(sale.changeAmount ?? 0)}</span>
              </div>
            </>
          )}
          <div className="my-2 border-t border-dashed border-gray-300" />
          <p className="text-center">Terima kasih</p>
        </div>

        <div className="flex gap-2 border-t border-border p-4 print:hidden">
          <button
            onClick={() => void print()}
            disabled={printing}
            className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground disabled:opacity-50"
          >
            {printing ? "Mencetak..." : "Cetak Struk"}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Pengaturan printer"
            title="Pengaturan printer"
            className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            ⚙
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Selesai
          </button>
        </div>
      </div>
      {settingsOpen && <PrinterSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
