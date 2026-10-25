import { barcodeKeys } from "./barcode-similarity";

export interface AuditProduct {
  id: string;
  name: string;
  sku: string;
  activeBarcodes: string[];
  /** Barcodes taken out of use; they still count as a similarity signal. */
  retiredBarcodes?: string[];
  stock: string;
  createdAt: Date;
  /** How many sale lines and receiving lines point at this product. */
  saleLines: number;
  receivingLines: number;
}

export type DuplicateReason = "BARCODE" | "NAMA" | "SKU";

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

  // Barcode first, and the strongest signal: products that share any barcode
  // key are one group (chained, so A~B and B~C all land together).
  const collectByBarcode = () => {
    const parent = new Map<string, string>();
    const find = (id: string): string => {
      const up = parent.get(id) ?? id;
      return up === id ? id : find(up);
    };
    const owner = new Map<string, string>();
    for (const p of products) {
      for (const code of [...p.activeBarcodes, ...(p.retiredBarcodes ?? [])]) {
        for (const key of barcodeKeys(code)) {
          const first = owner.get(key);
          if (first === undefined) owner.set(key, p.id);
          else parent.set(find(p.id), find(first));
        }
      }
    }
    const buckets = new Map<string, AuditProduct[]>();
    for (const p of products) {
      if (![...p.activeBarcodes, ...(p.retiredBarcodes ?? [])].some((c) => barcodeKeys(c).length)) continue;
      const root = find(p.id);
      buckets.set(root, [...(buckets.get(root) ?? []), p]);
    }
    for (const members of buckets.values()) {
      if (members.length < 2) continue;
      seen.add(members.map((m) => m.id).sort().join("|"));
      const shared = members.flatMap((m) => [...m.activeBarcodes, ...(m.retiredBarcodes ?? [])]);
      groups.push({ reason: "BARCODE", key: [...new Set(shared)].slice(0, 4).join(" ≈ "), products: members, keepId: pickKeeper(members) });
    }
  };

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

  collectByBarcode();
  collect("NAMA", (p) => squash(p.name));
  collect("SKU", (p) => squash(p.sku));
  return groups;
}
