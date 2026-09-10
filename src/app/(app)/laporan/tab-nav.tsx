import { LineChart, Package, Boxes, Users } from "lucide-react";

const TABS = [
  { key: "penjualan", label: "Penjualan", icon: LineChart },
  { key: "produk", label: "Produk", icon: Package },
  { key: "inventaris", label: "Inventaris", icon: Boxes },
  { key: "kasir", label: "Kasir", icon: Users },
] as const;

export type ReportTab = (typeof TABS)[number]["key"];

export function TabNav({ active, periodQuery }: { active: ReportTab; periodQuery: string }) {
  return (
    <div className="flex gap-1 border-b border-border">
      {TABS.map((t) => (
        <a
          key={t.key}
          href={`/laporan?tab=${t.key}&${periodQuery}`}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
            active === t.key
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <t.icon className="h-4 w-4" />
          {t.label}
        </a>
      ))}
    </div>
  );
}
