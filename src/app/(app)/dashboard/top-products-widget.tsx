function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export function TopProductsWidget({
  items,
}: {
  items: { productId: string; name: string; qty: number; total: number }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Produk Terlaris Hari Ini</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada penjualan hari ini.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.productId} className="flex justify-between">
              <span className="text-foreground">
                {item.name} <span className="text-muted-foreground">×{item.qty}</span>
              </span>
              <span className="font-medium text-foreground tabular-nums">{formatRupiah(item.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
