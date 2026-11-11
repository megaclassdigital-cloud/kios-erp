import { wibYmd } from "@/shared/format/wib";

function pad(n: number, width: number): string {
  return n.toString().padStart(width, "0");
}

function todayCompact(date: Date): string {
  // The shop's day (WIB), so the number's date matches the date on the receipt.
  const { year, month, day } = wibYmd(date);
  return `${year}${pad(month, 2)}${pad(day, 2)}`;
}

/** Formats a concurrency-safe daily counter (see DailyCounterRepository)
 * into a human-readable transaction number, e.g. TRX-20260906-000001. */
export function formatTransactionNumber(prefix: string, date: Date, sequence: number): string {
  return `${prefix}-${todayCompact(date)}-${pad(sequence, 6)}`;
}

export function dailyCounterScope(prefix: string, date: Date): string {
  return `${prefix}:${todayCompact(date)}`;
}
