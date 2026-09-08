import { prisma } from "@/shared/infrastructure/prisma";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { RefundButton } from "./refund-button";
import { TransactionDetailButton } from "./transaction-detail-button";

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  REFUNDED: "bg-red-100 text-red-700",
};

export default async function TransaksiPage() {
  const session = await auth();
  const seeAll = session ? hasPermission(session.user.role, "transactions.view_all") : false;
  const canRefund = session ? hasPermission(session.user.role, "refund.manage") : false;

  const sales = await prisma.sale.findMany({
    where: seeAll || !session ? undefined : { cashierId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { cashier: true, items: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">
        Transaksi {seeAll ? "(Semua Kasir)" : "(Shift Saya)"}
      </h1>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
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
            {sales.map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-mono text-xs text-gray-700">{s.transactionNumber}</td>
                <td className="px-3 py-2 text-gray-500">{s.createdAt.toLocaleString("id-ID")}</td>
                <td className="px-3 py-2 text-gray-700">{s.cashier.name}</td>
                <td className="px-3 py-2 text-gray-500">{s.items.length} item</td>
                <td className="px-3 py-2 text-gray-500">{s.paymentMethod}</td>
                <td className="px-3 py-2 font-medium text-gray-900">
                  Rp{Number(s.grandTotal).toLocaleString("id-ID")}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status]}`}>
                    {s.status}
                  </span>
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
