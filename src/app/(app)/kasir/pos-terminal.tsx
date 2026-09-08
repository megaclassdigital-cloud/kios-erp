"use client";

import { useEffect, useRef, useState } from "react";
import type { CartLine, ServiceDetailInput } from "./types";
import { PaymentModal } from "./payment-modal";
import { ServiceDetailModal } from "./service-detail-modal";
import { CameraScanner } from "../camera-scanner";
import { DeviceScannerPairing } from "../device-scanner-pairing";
import { BarcodeInputHint } from "../barcode-input-hint";

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export function PosTerminal({ shiftId, onShiftClosed }: { shiftId: string; onShiftClosed: () => void }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [barcode, setBarcode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
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
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3">
        <form onSubmit={handleScan} className="rounded-lg border border-gray-200 bg-white p-3">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            SCAN BARCODE — siap menerima input scanner
          </label>
          <input
            ref={inputRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-lg tracking-wide focus:border-blue-500 focus:outline-none"
            placeholder="Ketik kode lalu Enter"
            autoComplete="off"
          />
        </form>
        <CameraScanner onScan={processBarcode} />
        <DeviceScannerPairing label="Kasir" onScan={processBarcode} />
        <BarcodeInputHint />
        {scanError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {scanError}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
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
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                    Keranjang kosong. Silakan scan produk.
                  </td>
                </tr>
              )}
              {cart.map((line) => (
                <tr key={line.lineId} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-900">
                    {line.name}
                    {line.serviceDetail && (
                      <p className="text-xs text-gray-400">
                        {line.serviceDetail.phoneNumber
                          ? `HP: ${line.serviceDetail.phoneNumber}`
                          : `Meter: ${line.serviceDetail.meterNumber} · Plgn: ${line.serviceDetail.customerNumber}`}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{formatRupiah(line.unitPrice)}</td>
                  <td className="px-3 py-2">
                    {line.productType === "SERVICE" ? (
                      <span className="text-gray-500">1</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(line.lineId, -1)}
                          className="h-6 w-6 rounded border border-gray-300 text-gray-600"
                        >
                          −
                        </button>
                        <span className="w-6 text-center">{line.quantity}</span>
                        <button
                          onClick={() => updateQty(line.lineId, 1)}
                          className="h-6 w-6 rounded border border-gray-300 text-gray-600"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {formatRupiah(line.unitPrice * line.quantity)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => removeLine(line.lineId)}
                      className="text-xs text-red-600 hover:underline"
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
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {flash}
          </div>
        )}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatRupiah(grandTotal)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
            <span>Grand Total</span>
            <span>{formatRupiah(grandTotal)}</span>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0}
            className="mt-4 w-full rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Bayar
          </button>
        </div>
        <button
          onClick={closeShift}
          className="w-full rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Tutup Shift
        </button>
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
            inputRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
