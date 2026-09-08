"use client";

import { useState } from "react";

interface SaleDetail {
  transactionNumber: string;
  createdAt: string;
  paidAt: string | null;
  cashier: { name: string };
  paymentMethod: string;
  status: string;
  subtotal: string;
  discount: string;
  grandTotal: string;
  cashReceived: string | null;
  changeAmount: string | null;
  items: {
    id: string;
    productNameSnapshot: string;
    quantity: string;
    unitPriceAtSale: string;
    costPriceAtSale: string;
    subtotal: string;
    serviceDetail?: {
      phoneNumber?: string | null;
      meterNumber?: string | null;
      customerNumber?: string | null;
    } | null;
  }[];
  payments: { method: string; status: string; amount: string; providerRef: string | null }[];
}

interface StockMovement {
  id: string;
  product: { name: string };
  movementType: string;
  quantity: string;
  createdAt: string;
}

function formatRupiah(value: string) {
  return `Rp${Number(value).toLocaleString("id-ID")}`;
}

/** PRD 47: transaction detail — price/cost snapshot per item plus stock
 * movement references, opened on demand so the list view stays light. */
export function TransactionDetailButton({ saleId }: { saleId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ sale: SaleDetail; stockMovements: StockMovement[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (data) return;
    setLoading(true);
    const res = await fetch(`/api/transactions/${saleId}`);
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Gagal memuat detail transaksi.");
      return;
    }
    setData(json);
  }

  return (
    <>
      <button onClick={handleOpen} className="text-xs text-blue-600 hover:underline">
        Detail
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Detail Transaksi</h2>
              <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Tutup
              </button>
            </div>

            {loading && <p className="text-sm text-gray-500">Memuat...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {data && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  <p>No: {data.sale.transactionNumber}</p>
                  <p>Kasir: {data.sale.cashier.name}</p>
                  <p>Metode: {data.sale.paymentMethod}</p>
                  <p>Status: {data.sale.status}</p>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="text-left text-xs text-gray-500">
                    <tr>
                      <th className="py-1">Produk</th>
                      <th className="py-1">Qty</th>
                      <th className="py-1">Harga Jual</th>
                      <th className="py-1">HPP</th>
                      <th className="py-1">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sale.items.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="py-1.5 text-gray-900">
                          {item.productNameSnapshot}
                          {item.serviceDetail && (
                            <p className="text-xs text-gray-400">
                              {item.serviceDetail.phoneNumber
                                ? `HP: ${item.serviceDetail.phoneNumber}`
                                : `Meter: ${item.serviceDetail.meterNumber} · Plgn: ${item.serviceDetail.customerNumber}`}
                            </p>
                          )}
                        </td>
                        <td className="py-1.5 text-gray-500">{Number(item.quantity)}</td>
                        <td className="py-1.5 text-gray-500">{formatRupiah(item.unitPriceAtSale)}</td>
                        <td className="py-1.5 text-gray-500">{formatRupiah(item.costPriceAtSale)}</td>
                        <td className="py-1.5 font-medium text-gray-900">{formatRupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
                  <span>Grand Total</span>
                  <span>{formatRupiah(data.sale.grandTotal)}</span>
                </div>

                <div>
                  <h3 className="mb-1 text-xs font-semibold text-gray-500">MUTASI STOK TERKAIT</h3>
                  {data.stockMovements.length === 0 ? (
                    <p className="text-xs text-gray-400">Tidak ada mutasi stok (semua item layanan).</p>
                  ) : (
                    <ul className="space-y-1 text-xs text-gray-600">
                      {data.stockMovements.map((m) => (
                        <li key={m.id} className="flex justify-between">
                          <span>
                            {m.product.name} · {m.movementType}
                          </span>
                          <span className={Number(m.quantity) < 0 ? "text-red-600" : "text-green-700"}>
                            {Number(m.quantity) > 0 ? "+" : ""}
                            {Number(m.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
