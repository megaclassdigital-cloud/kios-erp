export interface KnownProductRef {
  id: string;
  name: string;
  sku: string;
  /** Active barcode values only: a retired code is never reused, but it is
   * not a "this product already exists" signal either. */
  activeBarcodes: string[];
}

export type DuplicateKind = "BARCODE" | "SKU";

export interface Duplicate {
  kind: DuplicateKind;
  product: KnownProductRef;
}

const normalizeSku = (sku: string) => sku.trim().toUpperCase();

/**
 * The cases that can never be a deliberate second record: the very same
 * barcode (the database refuses it anyway) or the very same SKU. Goods that
 * are already there get more stock through Barang Masuk.
 *
 * Look-alike barcodes and similar names are *not* decided here: they are
 * reminders the user may wave off (see similar-products.ts).
 */
export function findDuplicate(
  existing: KnownProductRef[],
  candidate: { sku?: string; barcode?: string }
): Duplicate | null {
  const barcode = candidate.barcode?.trim();
  if (barcode) {
    const hit = existing.find((p) => p.activeBarcodes.some((b) => b.trim() === barcode));
    if (hit) return { kind: "BARCODE", product: hit };
  }
  if (candidate.sku?.trim()) {
    const sku = normalizeSku(candidate.sku);
    const hit = existing.find((p) => normalizeSku(p.sku) === sku);
    if (hit) return { kind: "SKU", product: hit };
  }
  return null;
}

const FIELD: Record<DuplicateKind, string> = { BARCODE: "Barcode ini", SKU: "SKU ini" };

/** The sentence shown to whoever tried to add it again. */
export function duplicateMessage(d: Duplicate): string {
  return `${FIELD[d.kind]} sudah dipakai produk "${d.product.name}" di Master Produk. Untuk menambah stoknya, gunakan menu Barang Masuk.`;
}
