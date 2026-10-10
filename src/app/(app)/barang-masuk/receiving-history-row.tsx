"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatWibDateTime } from "@/shared/format/wib";
import { stockInLabel } from "@/modules/purchasing/domain/stock-in-source";

export interface HistoryItem {
  source: "PURCHASE" | "INITIAL_STOCK" | "STOCK_OPNAME" | "RETURN_IN" | "ADJUSTMENT";
  itemId: string;
  purchaseId: string | null;
  receivedAt: string;
  purchaseNumber: string | null;
  invoiceNumber: string | null;
  supplierName: string | null;
  productName: string;
  sku: string;
  unit: string;
  quantity: string;
  purchasePrice: string | null;
  subtotal: string | null;
  expiryDate: string | null;
  stockBefore: string;
  stockAfter: string;
}

const rupiah = (v: string | null) => (v === null ? "-" : `Rp${Number(v).toLocaleString("id-ID")}`);
const qty = (v: string) => Number(v).toLocaleString("id-ID");
const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const dateLabel = (iso: string) => formatWibDateTime(new Date(iso)).slice(0, 10);
const input = "w-full min-w-16 rounded border border-input px-2 py-1 text-sm";

async function call(url: string, init: RequestInit): Promise<void> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Gagal menyimpan perubahan.");
  }
}

/**
 * One line of the receiving history, which can be corrected or deleted in
 * place. The server moves the stock (edit 5 -> 6 adds 1; delete takes the
 * whole quantity back), so this only sends what the user typed and refreshes.
 */
export function HistoryRow({
  row,
  canEdit,
  onChanged,
}: {
  row: HistoryItem;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [quantity, setQuantity] = useState(row.quantity);
  const [price, setPrice] = useState(row.purchasePrice ?? "");
  const [expiry, setExpiry] = useState(dateInput(row.expiryDate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = `/api/receiving/items/${row.itemId}`;

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      toast.success(done);
      setMode("view");
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(
      () =>
        call(url, {
          method: "PATCH",
          body: JSON.stringify({ quantity, purchasePrice: price, expiryDate: expiry || null }),
        }),
      "Barang masuk diperbarui. Stok ikut disesuaikan."
    );
  const remove = () =>
    run(() => call(url, { method: "DELETE" }), `Dihapus. Stok ${row.productName} dikurangi ${qty(row.quantity)}.`);

  const delta = Number(quantity || 0) - Number(row.quantity);

  // Stock that did not come through a supplier receipt (initial stock, opname,
  // return, adjustment) is shown for the record; it is changed where it came
  // from, not here.
  if (row.source !== "PURCHASE") {
    return (
      <tr className="border-t border-border">
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatWibDateTime(new Date(row.receivedAt))}</td>
        <td className="px-3 py-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{stockInLabel(row.source)}</span>
        </td>
        <td className="px-3 py-2 text-muted-foreground">null</td>
        <td className="px-3 py-2 text-foreground">{row.productName}</td>
        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted-foreground">{qty(row.stockBefore)}</td>
        <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-success">
          +{qty(row.quantity)} {row.unit}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-foreground">{qty(row.stockAfter)}</td>
        <td className="px-3 py-2 text-right text-muted-foreground">-</td>
        <td className="px-3 py-2 text-muted-foreground">-</td>
        <td className="px-3 py-2 text-right text-muted-foreground">-</td>
        <td className="px-3 py-2"></td>
      </tr>
    );
  }

  if (mode === "edit") {
    return (
      <tr className="border-t border-border bg-primary-soft/40 align-top">
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatWibDateTime(new Date(row.receivedAt))}</td>
        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{row.purchaseNumber}</td>
        <td className="px-3 py-2">{row.supplierName ?? "null"}</td>
        <td className="px-3 py-2">{row.productName}</td>
        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{qty(row.stockBefore)}</td>
        <td className="px-3 py-2">
          <input aria-label="Jumlah" type="number" step="any" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={input} />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {delta === 0 ? "Stok tidak berubah" : `Stok ${delta > 0 ? "+" : ""}${qty(String(delta))}`}
          </span>
        </td>
        <td className="px-3 py-2 text-right tabular-nums">{qty(String(Number(row.stockBefore) + Number(quantity || 0)))}</td>
        <td className="px-3 py-2">
          <input aria-label="Harga beli" type="number" step="any" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className={input} />
        </td>
        <td className="px-3 py-2">
          <input aria-label="Kedaluwarsa" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={input} />
        </td>
        <td className="px-3 py-2 text-right font-medium tabular-nums">{rupiah(String(Number(quantity || 0) * Number(price || 0)))}</td>
        <td className="px-3 py-2">
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
              <button disabled={busy} onClick={save} className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">
                {busy ? "Menyimpan..." : "Simpan"}
              </button>
              <button disabled={busy} onClick={() => { setMode("view"); setError(null); }} className="text-xs text-muted-foreground hover:underline">
                Batal
              </button>
            </div>
            {error && <span className="max-w-48 text-right text-[11px] text-destructive">{error}</span>}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className="border-t border-border">
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatWibDateTime(new Date(row.receivedAt))}</td>
        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-foreground">
          {row.purchaseNumber}
          {row.invoiceNumber && <span className="block font-sans text-muted-foreground">Inv. {row.invoiceNumber}</span>}
        </td>
        <td className="px-3 py-2 text-foreground">{row.supplierName ?? "null"}</td>
        <td className="px-3 py-2 text-foreground">{row.productName}</td>
        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted-foreground">{qty(row.stockBefore)}</td>
        <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-success">
          +{qty(row.quantity)} {row.unit}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-foreground">{qty(row.stockAfter)}</td>
        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{rupiah(row.purchasePrice)}</td>
        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{row.expiryDate ? dateLabel(row.expiryDate) : "-"}</td>
        <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">{rupiah(row.subtotal)}</td>
        <td className="whitespace-nowrap px-3 py-2 text-right">
          {canEdit && mode === "view" && (
            <>
              <button onClick={() => setMode("edit")} className="mr-3 text-xs text-primary hover:underline">Ubah</button>
              <button onClick={() => setMode("delete")} className="text-xs text-destructive hover:underline">Hapus</button>
            </>
          )}
        </td>
      </tr>
      {mode === "delete" && (
        <tr className="bg-destructive-soft/50">
          <td colSpan={11} className="px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-foreground">
                Hapus <b>{row.productName}</b> ({qty(row.quantity)} {row.unit}) dari {row.purchaseNumber}? Stok produk akan
                berkurang {qty(row.quantity)}.
                {error && <span className="ml-2 text-destructive">{error}</span>}
              </span>
              <span className="flex gap-2">
                <button disabled={busy} onClick={remove} className="rounded bg-destructive px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                  {busy ? "Menghapus..." : "Ya, hapus"}
                </button>
                <button disabled={busy} onClick={() => { setMode("view"); setError(null); }} className="rounded border border-border px-3 py-1.5 text-xs">
                  Batal
                </button>
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
