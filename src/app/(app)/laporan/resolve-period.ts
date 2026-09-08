export type PeriodKey = "today" | "7d" | "30d" | "custom";

export interface ResolvedPeriod {
  key: PeriodKey;
  start: Date;
  end: Date;
  label: string;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** PRD 54: report periods are Today/Weekly/Monthly/Custom, driven entirely
 * by the URL so report pages stay server components with no client JS. */
export function resolvePeriod(searchParams: {
  period?: string;
  from?: string;
  to?: string;
}): ResolvedPeriod {
  const now = new Date();

  if (searchParams.period === "custom" && searchParams.from && searchParams.to) {
    const from = new Date(searchParams.from);
    const to = new Date(searchParams.to);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return { key: "custom", start: startOfDay(from), end: endOfDay(to), label: "Custom" };
    }
  }

  if (searchParams.period === "today") {
    return { key: "today", start: startOfDay(now), end: endOfDay(now), label: "Hari Ini" };
  }

  if (searchParams.period === "30d") {
    const start = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
    return { key: "30d", start, end: endOfDay(now), label: "30 Hari Terakhir" };
  }

  const start = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  return { key: "7d", start, end: endOfDay(now), label: "7 Hari Terakhir" };
}
