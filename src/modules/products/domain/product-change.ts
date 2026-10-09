/** Fields an edit can change, with the wording the UI uses for them. */
const LABELS: Record<string, string> = {
  name: "Nama",
  purchasePrice: "Harga beli",
  sellingPrice: "Harga jual",
  expiryDate: "Kedaluwarsa",
  active: "Status aktif",
};

const MONEY_KEYS = new Set(["purchasePrice", "sellingPrice"]);

function same(key: string, a: unknown, b: unknown): boolean {
  if (MONEY_KEYS.has(key)) return Number(a) === Number(b);
  // A date field stores an instant but means a day.
  if (key === "expiryDate") return String(a ?? "").slice(0, 10) === String(b ?? "").slice(0, 10);
  return a === b;
}

/**
 * Which fields differ between the before/after snapshots an audit entry
 * stores, as human labels. Lets the product list say "Harga jual" instead of
 * only "edited", without anyone reading JSON.
 */
export function changedProductFields(before: unknown, after: unknown): string[] {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  return Object.keys(LABELS).filter((key) => key in a && !same(key, b[key], a[key])).map((key) => LABELS[key]);
}
