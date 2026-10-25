import { editDistance } from "./product-name";

export interface Searchable {
  name: string;
  sku?: string;
  /** Active barcode values. */
  barcodes?: string[];
}

const tokensOf = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** How well one typed word matches one word of a product, 0 = not at all. */
function wordScore(query: string, word: string): number {
  if (query === word) return 4;
  if (word.startsWith(query)) return 3;
  // "kopi" inside "kopikapal"; short fragments would match everything.
  if (query.length >= 3 && word.includes(query)) return 2;
  // One slipped key in a word long enough for that to mean something.
  if (query.length >= 5 && word.length >= 5 && editDistance(query, word.slice(0, query.length)) <= 1) return 1;
  return 0;
}

/**
 * Finds products by what the person typed: name words in any order ("kecap abc"
 * finds "ABC Kecap Manis"), part of a word ("indo gor"), one typo ("indomi
 * gorng" is two slips and not found, "indomie gorang" is), the SKU, or digits
 * of a barcode. Every typed word must match something, so adding a word only
 * ever narrows the list.
 *
 * Pure and framework-free: the same function runs in the browser over the till's
 * loaded catalog and on the server for the other screens.
 */
export function searchProducts<T extends Searchable>(items: T[], query: string, limit = 10): T[] {
  const typed = tokensOf(query);
  if (typed.length === 0) return [];
  const digitsOnly = /^\d{3,}$/.test(query.trim());

  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    if (digitsOnly) {
      const q = query.trim();
      const hit = (item.barcodes ?? []).some((b) => b.includes(q)) || (item.sku ?? "").includes(q);
      if (hit) scored.push({ item, score: 1 });
      continue;
    }

    const words = [...tokensOf(item.name), ...tokensOf(item.sku ?? "")];
    let total = 0;
    let ok = true;
    for (const q of typed) {
      const best = words.reduce((m, w) => Math.max(m, wordScore(q, w)), 0);
      if (best === 0) {
        ok = false;
        break;
      }
      total += best;
    }
    if (ok) scored.push({ item, score: total });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((s) => s.item);
}
