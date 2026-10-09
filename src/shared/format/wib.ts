/**
 * Dates as the shop sees them (WIB), regardless of where the code runs.
 * The server is in UTC and the browser in the shopkeeper's zone; routing both
 * the screen and the XLSX through here keeps them printing the same minute.
 */
const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function pick(date: Date) {
  const o: Record<string, string> = {};
  for (const p of parts.formatToParts(date)) o[p.type] = p.value;
  return o;
}

/** dd/MM/yyyy */
export function formatWibDate(date: Date): string {
  const p = pick(date);
  return `${p.day}/${p.month}/${p.year}`;
}

/** dd/MM/yyyy HH:mm */
export function formatWibDateTime(date: Date): string {
  const p = pick(date);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}
