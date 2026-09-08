const TABS = [
  { key: "penjualan", label: "Penjualan" },
  { key: "produk", label: "Produk" },
  { key: "inventaris", label: "Inventaris" },
  { key: "kasir", label: "Kasir" },
] as const;

export type ReportTab = (typeof TABS)[number]["key"];

export function TabNav({ active, periodQuery }: { active: ReportTab; periodQuery: string }) {
  return (
    <div className="flex gap-1 border-b border-gray-200">
      {TABS.map((t) => (
        <a
          key={t.key}
          href={`/laporan?tab=${t.key}&${periodQuery}`}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            active === t.key
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          {t.label}
        </a>
      ))}
    </div>
  );
}
