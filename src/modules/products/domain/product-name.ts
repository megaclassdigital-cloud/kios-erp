/**
 * Splits a product name into the part that says *what it is* and the part
 * that says *how big*: "Indomie Goreng 70 gr" -> core ["goreng","indomie"],
 * size "70g". Two products with the same core and different sizes are
 * variants, not duplicates; the same core and the same size is a retype.
 *
 * Sizes are normalised so spellings agree: 70g = 70 gr = 70 gram, 1 kg =
 * 1000 g, 0,25 L = 250 ml, "isi 6" / "x6" is a pack count.
 */
export interface ParsedName {
  /** Words of the name without sizes, lower-case, sorted. */
  core: string[];
  /** Normalised sizes, e.g. "70g", "250ml", "x6". Sorted. */
  sizes: string[];
}

const UNIT_TO_BASE: Record<string, { unit: "g" | "ml" | "pcs"; factor: number }> = {
  g: { unit: "g", factor: 1 },
  gr: { unit: "g", factor: 1 },
  gram: { unit: "g", factor: 1 },
  kg: { unit: "g", factor: 1000 },
  ml: { unit: "ml", factor: 1 },
  l: { unit: "ml", factor: 1000 },
  lt: { unit: "ml", factor: 1000 },
  liter: { unit: "ml", factor: 1000 },
  pcs: { unit: "pcs", factor: 1 },
  pc: { unit: "pcs", factor: 1 },
  sachet: { unit: "pcs", factor: 1 },
  sct: { unit: "pcs", factor: 1 },
};

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const UNITS = Object.keys(UNIT_TO_BASE).sort((a, b) => b.length - a.length).join("|");
const SIZE_RE = new RegExp(String.raw`(?:${NUMBER}\s*x\s*)?${NUMBER}\s*(${UNITS})(?![a-z])`, "g");
const PACK_RE = /\b(?:isi\s*(\d+)|x\s*(\d+))\b/g;

const num = (text: string) => Number(text.replace(",", "."));
const trim = (n: number) => String(Math.round(n * 1000) / 1000);

export function parseName(name: string): ParsedName {
  let text = ` ${name.toLowerCase()} `;
  const sizes: string[] = [];

  text = text.replace(SIZE_RE, (_m, multi: string | undefined, amount: string, unit: string) => {
    const base = UNIT_TO_BASE[unit];
    const size = `${trim(num(amount) * base.factor)}${base.unit}`;
    sizes.push(multi ? `${trim(num(multi))}x${size}` : size);
    return " ";
  });
  text = text.replace(PACK_RE, (_m, a: string | undefined, b: string | undefined) => {
    sizes.push(`x${a ?? b}`);
    return " ";
  });

  const core = text
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .sort();
  return { core, sizes: sizes.sort() };
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/** Same word, allowing one typo in a word long enough for that to mean something. */
const sameWord = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 5 && editDistance(a, b) <= 1);

/** Dice similarity of two word lists, tolerant of one-letter typos (0..1). */
export function coreSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const free = [...b];
  let matched = 0;
  for (const word of a) {
    const at = free.findIndex((w) => sameWord(word, w));
    if (at >= 0) {
      matched += 1;
      free.splice(at, 1);
    }
  }
  return (2 * matched) / (a.length + b.length);
}
