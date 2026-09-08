function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export function CashCashlessWidget({ cash, cashless }: { cash: number; cashless: number }) {
  const total = cash + cashless;
  const cashPct = total > 0 ? (cash / total) * 100 : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Cash vs Cashless (Hari Ini)</h2>
      {total === 0 ? (
        <p className="text-sm text-gray-500">Belum ada transaksi hari ini.</p>
      ) : (
        <>
          <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="bg-blue-500" style={{ width: `${cashPct}%` }} />
            <div className="bg-emerald-500" style={{ width: `${100 - cashPct}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <span className="flex items-center gap-1.5 text-gray-700">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Cash · {formatRupiah(cash)}
            </span>
            <span className="flex items-center gap-1.5 text-gray-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Cashless · {formatRupiah(cashless)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
