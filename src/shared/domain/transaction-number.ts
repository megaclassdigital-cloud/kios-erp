function pad(n: number, width: number): string {
  return n.toString().padStart(width, "0");
}

function todayCompact(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}`;
}

/** Formats a concurrency-safe daily counter (see DailyCounterRepository)
 * into a human-readable transaction number, e.g. TRX-20260906-000001. */
export function formatTransactionNumber(prefix: string, date: Date, sequence: number): string {
  return `${prefix}-${todayCompact(date)}-${pad(sequence, 6)}`;
}

export function dailyCounterScope(prefix: string, date: Date): string {
  return `${prefix}:${todayCompact(date)}`;
}
