export interface SearchableProduct {
  name: string;
  sku: string;
  barcodes: { barcodeValue: string }[];
}

/**
 * The Master Produk search box rule: name, SKU, or any barcode, case
 * insensitive. One function so the table on screen and the XLSX export of
 * "what I am looking at" can never disagree about which products match.
 */
export function filterProducts<T extends SearchableProduct>(products: T[], search: string): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcodes.some((b) => b.barcodeValue.toLowerCase().includes(q))
  );
}
