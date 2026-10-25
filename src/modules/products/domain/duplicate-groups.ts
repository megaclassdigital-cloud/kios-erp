export interface AuditProduct {
  id: string;
  name: string;
  sku: string;
  activeBarcodes: string[];
  stock: string;
  createdAt: Date;
  /** How many sale lines and receiving lines point at this product. */
  saleLines: number;
  receivingLines: number;
}

export type DuplicateReason = "NAMA" | "SKU";

export interface DuplicateGroup {
  reason: DuplicateReason;
  /** The shared normalized value, for display. */
  key: string;
  products: AuditProduct[];
  /** The record with the most history (then the oldest): the one to keep. */
  keepId: string;
}

/** "ABC Kopi Susu 200 mL" and "abc kopisusu 200ml" are the same item typed
 * twice: compare on letters and digits only. */
const squash = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

function pickKeeper(products: AuditProduct[]): string {
  const weight = (p: AuditProduct) => p.saleLines + p.receivingLines;
  return [...products].sort((a, b) => weight(b) - weight(a) || a.createdAt.getTime() - b.createdAt.getTime())[0].id;
}

/**
 * Groups of live products that look like the same item entered more than once.
 * Barcodes cannot repeat (the database refuses it), so the duplicates that can
 * exist are by name or SKU spelling. Read-only: it only reports -- which record
 * to keep and what to do with the stock is for a person to decide.
 */
export function findDuplicateGroups(products: AuditProduct[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const seen = new Set<string>();

  const collect = (reason: DuplicateReason, keyOf: (p: AuditProduct) => string) => {
    const buckets = new Map<string, AuditProduct[]>();
    for (const p of products) {
      const key = keyOf(p);
      if (!key) continue;
      buckets.set(key, [...(buckets.get(key) ?? []), p]);
    }
    for (const [key, members] of buckets) {
      if (members.length < 2) continue;
      // The same pair can match by both name and SKU; report it once.
      const signature = members.map((m) => m.id).sort().join("|");
      if (seen.has(signature)) continue;
      seen.add(signature);
      groups.push({ reason, key: members[0][reason === "NAMA" ? "name" : "sku"], products: members, keepId: pickKeeper(members) });
    }
  };

  collect("NAMA", (p) => squash(p.name));
  collect("SKU", (p) => squash(p.sku));
  return groups;
}
