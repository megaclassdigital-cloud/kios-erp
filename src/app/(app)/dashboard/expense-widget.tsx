function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export function ExpenseWidget({
  items,
}: {
  items: { category: string; total: number }[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Pengeluaran Hari Ini per Kategori</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada pengeluaran hari ini.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.category} className="flex justify-between">
              <span className="text-gray-700">{item.category}</span>
              <span className="font-medium text-gray-900">{formatRupiah(item.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
