"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Clock, Power } from "lucide-react";
import type { CartLine, OpenShift, ServiceDetailInput } from "./types";
import { PaymentModal } from "./payment-modal";
import { ServiceDetailModal } from "./service-detail-modal";
import { CameraScanner } from "../camera-scanner";
import { DeviceScannerPairing } from "../device-scanner-pairing";
import { BarcodeInputHint } from "../barcode-input-hint";
import { InventoryService } from "@/modules/inventory/domain/inventory-service";
import { PageHeader } from "@/components/kios/page-header";
import { StatusBadge } from "@/components/kios/status-badge";

const inventoryService = new InventoryService();

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

/** "2j 15m" style — ticks every minute, computed from the shift's own
 * openedAt rather than tracked separately, so it survives a page refresh. */
function useShiftDuration(openedAt: string) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function update() {
      const ms = Date.now() - new Date(openedAt).getTime();
      const totalMinutes = Math.max(0, Math.floor(ms / 60000));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setLabel(hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`);
    }
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [openedAt]);
  return label;
}

export function PosTerminal({ shift, onShiftClosed }: { shift: OpenShift; onShiftClosed: () => void }) {
  const shiftId = shift.id;
  const { data: session } = useSession();
  const duration = useShiftDuration(shift.openedAt);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [barcode, setBarcode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  // Bumped once per completed sale — a paired phone rotates to a fresh
  // code/QR when this changes, so one physical pairing spans exactly one
  // customer's transaction rather than an entire shift.
  const [completedSaleCount, setCompletedSaleCount] = useState(0);
  const [pendingService, setPendingService] = useState<{
    id: string;
    name: string;
    sellingPrice: string;
    serviceType: "PULSA" | "TOKEN_LISTRIK";
    serviceProvider: string | null;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const grandTotal = cart.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const raw = barcode;
    setBarcode("");
    await processBarcode(raw);
  }

  async function processBarcode(raw: string) {
    if (!raw.trim()) return;

    const res = await fetch("/api/barcodes/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: raw }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setScanError(data.error ?? "Barcode tidak terdaftar.");
      inputRef.current?.focus();
      return;
    }

    setScanError(null);
    const product = data.product;

    if (product.productType === "SERVICE") {
      setPendingService({
        id: product.id,
        name: product.name,
        sellingPrice: product.sellingPrice,
        serviceType: product.serviceType,
        serviceProvider: product.serviceProvider,
      });
      return;
    }

    // Warn right when the item is scanned — not only once the cashier
    // reaches payment — so there's still time to check the shelf or tell
    // the customer before the transaction is finished. Computed from the
    // cart snapshot at scan time, outside setCart, since a state updater
    // must stay a pure function (React can invoke it twice in dev).
    if (product.trackInventory) {
      const existingQty = cart.find((l) => l.productId === product.id)?.quantity ?? 0;
      const remaining = Number(product.currentStock) - (existingQty + 1);
      const status = inventoryService.classifyStock(remaining, product.minimumStock);
      if (status === "HABIS") {
        toast.warning(`Stok ${product.name} akan habis setelah transaksi ini.`);
      } else if (status === "MENIPIS") {
        toast.warning(`Stok ${product.name} menipis — sisa ${remaining} setelah transaksi ini.`);
      }
    }

    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          lineId: product.id,
          productId: product.id,
          name: product.name,
          unitPrice: Number(product.sellingPrice),
          quantity: 1,
          trackInventory: product.trackInventory,
          productType: "PHYSICAL",
        },
      ];
    });
    inputRef.current?.focus();
  }

  function addServiceLine(detail: ServiceDetailInput) {
    if (!pendingService) return;
    setCart((prev) => [
      ...prev,
      {
        lineId: crypto.randomUUID(),
        productId: pendingService.id,
        name: pendingService.name,
        unitPrice: Number(pendingService.sellingPrice),
        quantity: 1,
        trackInventory: false,
        productType: "SERVICE",
        serviceType: pendingService.serviceType,
        serviceProvider: pendingService.serviceProvider,
        serviceDetail: detail,
      },
    ]);
    setPendingService(null);
    inputRef.current?.focus();
  }

  function updateQty(lineId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(lineId: string) {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId));
  }

  async function closeShift() {
    const actualCash = window.prompt("Masukkan jumlah kas aktual saat ini:");
    if (actualCash === null) return;
    const res = await fetch("/api/pos/shifts/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId, actualCash }),
    });
    if (res.ok) onShiftClosed();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kasir / POS"
        description="Scan barcode, cari barang, dan selesaikan transaksi dengan cepat."
        actions={
          <>
            <StatusBadge tone="success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Shift Aktif
            </StatusBadge>
            <span className="text-sm text-muted-foreground">
              Kasir: <span className="font-medium text-foreground">{session?.user?.name ?? "..."}</span>
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Durasi: {duration || "..."}
            </span>
            <button
              onClick={closeShift}
              className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive-soft px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20"
            >
              <Power className="h-4 w-4" />
              Tutup Shift
            </button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <form onSubmit={handleScan} className="rounded-xl border border-border bg-card p-3 shadow-sm md:col-span-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                SCAN BARCODE — siap menerima input scanner
              </label>
              <input
                ref={inputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 text-lg tracking-wide focus:border-ring focus:outline-none"
                placeholder="Ketik kode lalu Enter"
                autoComplete="off"
              />
            </form>
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <p className="mb-1 text-xs font-medium text-muted-foreground">SCANNER KAMERA</p>
              <CameraScanner onScan={processBarcode} />
            </div>
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <p className="mb-1 text-xs font-medium text-muted-foreground">DEVICE SCANNER</p>
              <DeviceScannerPairing label="Kasir" onScan={processBarcode} resetSignal={completedSaleCount} />
            </div>
          </div>
          <BarcodeInputHint />
          {scanError && (
            <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">
              {scanError}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Produk</th>
                <th className="px-3 py-2">Harga</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Subtotal</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    Keranjang kosong. Silakan scan produk.
                  </td>
                </tr>
              )}
              {cart.map((line) => (
                <tr key={line.lineId} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">
                    {line.name}
                    {line.serviceDetail && (
                      <p className="text-xs text-muted-foreground">
                        {line.serviceDetail.phoneNumber
                          ? `HP: ${line.serviceDetail.phoneNumber}`
                          : `Meter: ${line.serviceDetail.meterNumber} · Plgn: ${line.serviceDetail.customerNumber}`}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{formatRupiah(line.unitPrice)}</td>
                  <td className="px-3 py-2">
                    {line.productType === "SERVICE" ? (
                      <span className="text-muted-foreground">1</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(line.lineId, -1)}
                          className="h-9 w-9 shrink-0 rounded border border-border text-muted-foreground hover:bg-muted"
                        >
                          −
                        </button>
                        <span className="w-6 text-center">{line.quantity}</span>
                        <button
                          onClick={() => updateQty(line.lineId, 1)}
                          className="h-9 w-9 shrink-0 rounded border border-border text-muted-foreground hover:bg-muted"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium text-foreground tabular-nums">
                    {formatRupiah(line.unitPrice * line.quantity)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => removeLine(line.lineId)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

        <div className="space-y-3">
          {flash && (
            <div className="rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
              {flash}
            </div>
          )}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Ringkasan Transaksi</h2>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatRupiah(grandTotal)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
              <span>Total</span>
              <span className="tabular-nums">{formatRupiah(grandTotal)}</span>
            </div>
            <button
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0}
              className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              Bayar
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Informasi Shift</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Kasir</dt>
                <dd className="font-medium text-foreground">{session?.user?.name ?? "..."}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Mulai Shift</dt>
                <dd className="text-foreground tabular-nums">
                  {new Date(shift.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Durasi</dt>
                <dd className="text-foreground tabular-nums">{duration || "..."}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Modal Awal</dt>
                <dd className="text-foreground tabular-nums">{formatRupiah(Number(shift.openingCash))}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {pendingService && (
        <ServiceDetailModal
          product={pendingService}
          onCancel={() => {
            setPendingService(null);
            inputRef.current?.focus();
          }}
          onConfirm={addServiceLine}
        />
      )}

      {showPayment && (
        <PaymentModal
          shiftId={shiftId}
          cart={cart}
          grandTotal={grandTotal}
          onClose={() => setShowPayment(false)}
          onSuccess={(message) => {
            setFlash(message);
            setCart([]);
            setShowPayment(false);
            setCompletedSaleCount((n) => n + 1);
            inputRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
