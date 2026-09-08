function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export function TopProductsWidget({
  items,
}: {
  items: { productId: string; name: string; qty: number; total: number }[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Produk Terlaris Hari Ini</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada penjualan hari ini.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.productId} className="flex justify-between">
              <span className="text-gray-700">
                {item.name} <span className="text-gray-400">×{item.qty}</span>
              </span>
              <span className="font-medium text-gray-900">{formatRupiah(item.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
