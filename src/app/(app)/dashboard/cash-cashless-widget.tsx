function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export function CashCashlessWidget({ cash, cashless }: { cash: number; cashless: number }) {
  const total = cash + cashless;
  const cashPct = total > 0 ? (cash / total) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Cash vs Cashless (Hari Ini)</h2>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada transaksi hari ini.</p>
      ) : (
        <>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            <div className="bg-primary" style={{ width: `${cashPct}%` }} />
            <div className="bg-success" style={{ width: `${100 - cashPct}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <span className="flex items-center gap-1.5 text-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" /> Cash · {formatRupiah(cash)}
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              <span className="h-2 w-2 rounded-full bg-success" /> Cashless · {formatRupiah(cashless)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
