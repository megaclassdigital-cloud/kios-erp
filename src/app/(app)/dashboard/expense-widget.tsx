function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export function ExpenseWidget({
  items,
}: {
  items: { category: string; total: number }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Pengeluaran Hari Ini per Kategori</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada pengeluaran hari ini.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.category} className="flex justify-between gap-2">
              <span className="min-w-0 truncate text-foreground">{item.category}</span>
              <span className="shrink-0 font-medium text-foreground tabular-nums">{formatRupiah(item.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
