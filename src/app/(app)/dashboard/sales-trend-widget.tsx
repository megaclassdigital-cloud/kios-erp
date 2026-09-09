import { MiniBarChart } from "../mini-bar-chart";
import { PeriodSelector } from "../laporan/period-selector";
import type { PeriodKey } from "../laporan/resolve-period";

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export function SalesTrendWidget({
  activePeriod,
  series,
}: {
  activePeriod: PeriodKey;
  series: { label: string; value: number }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Tren Penjualan</h2>
        <PeriodSelector
          basePath="/dashboard"
          active={activePeriod}
          presets={[
            { key: "7d", label: "7 Hari" },
            { key: "30d", label: "30 Hari" },
          ]}
        />
      </div>
      {series.every((s) => s.value === 0) ? (
        <p className="text-sm text-muted-foreground">Belum ada penjualan pada periode ini.</p>
      ) : (
        <MiniBarChart data={series} formatValue={formatRupiah} />
      )}
    </div>
  );
}
