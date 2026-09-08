import type { PeriodKey } from "./resolve-period";

const PRESETS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "7d", label: "7 Hari" },
  { key: "30d", label: "30 Hari" },
];

/** Server-rendered period picker — presets are plain links, custom range is
 * a native GET form. No client JS needed (PRD 54 period selector). */
export function PeriodSelector({
  basePath,
  active,
  extraParams,
  presets = PRESETS,
}: {
  basePath: string;
  active: PeriodKey;
  extraParams?: Record<string, string>;
  presets?: { key: PeriodKey; label: string }[];
}) {
  const qs = new URLSearchParams(extraParams);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
      {presets.map((p) => {
        const params = new URLSearchParams(qs);
        params.set("period", p.key);
        return (
          <a
            key={p.key}
            href={`${basePath}?${params.toString()}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active === p.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {p.label}
          </a>
        );
      })}
      <form method="get" action={basePath} className="flex min-w-0 flex-wrap items-center gap-1.5">
        {Object.entries(Object.fromEntries(qs)).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input type="hidden" name="period" value="custom" />
        <input type="date" name="from" required className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <span className="text-gray-400">—</span>
        <input type="date" name="to" required className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <button
          type="submit"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            active === "custom" ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Custom
        </button>
      </form>
    </div>
  );
}
