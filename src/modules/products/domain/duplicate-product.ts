export interface KnownProductRef {
  id: string;
  name: string;
  sku: string;
  /** Active barcode values only: a retired code is never reused, but it is
   * not a "this product already exists" signal either. */
  activeBarcodes: string[];
}

export type DuplicateKind = "BARCODE" | "SKU" | "NAME";

export interface Duplicate {
  kind: DuplicateKind;
  product: KnownProductRef;
}

const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
const normalizeSku = (sku: string) => sku.trim().toUpperCase();

/**
 * Whether a product being added is already in Master Produk. Goods that are
 * already there get more stock through Barang Masuk, not a second record --
 * two records split one item's stock, history and price in two.
 *
 * Checked in order of certainty: the same barcode is the same physical item;
 * the same SKU is the same shop code; the same name (ignoring case and
 * spacing) is almost certainly a retype.
 */
export function findDuplicate(
  existing: KnownProductRef[],
  candidate: { name?: string; sku?: string; barcode?: string }
): Duplicate | null {
  const barcode = candidate.barcode?.trim();
  if (barcode) {
    const hit = existing.find((p) => p.activeBarcodes.includes(barcode));
    if (hit) return { kind: "BARCODE", product: hit };
  }
  if (candidate.sku?.trim()) {
    const sku = normalizeSku(candidate.sku);
    const hit = existing.find((p) => normalizeSku(p.sku) === sku);
    if (hit) return { kind: "SKU", product: hit };
  }
  if (candidate.name?.trim()) {
    const name = normalizeName(candidate.name);
    const hit = existing.find((p) => normalizeName(p.name) === name);
    if (hit) return { kind: "NAME", product: hit };
  }
  return null;
}

const FIELD: Record<DuplicateKind, string> = { BARCODE: "Barcode ini", SKU: "SKU ini", NAME: "Nama ini" };

/** The sentence shown to whoever tried to add it again. */
export function duplicateMessage(d: Duplicate): string {
  return `${FIELD[d.kind]} sudah dipakai produk "${d.product.name}" di Master Produk. Untuk menambah stoknya, gunakan menu Barang Masuk.`;
}
