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
    // Scrolls horizontally on a narrow viewport, like the primary nav —
    // without it the fourth tab lands past the right edge of a phone screen
    // and can't be reached at all.
    <div className="flex gap-1 overflow-x-auto border-b border-border whitespace-nowrap">
      {TABS.map((t) => (
        <a
          key={t.key}
          href={`/laporan?tab=${t.key}&${periodQuery}`}
          className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
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
