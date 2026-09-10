/** One entry per ACTIVE barcode (a product can carry more than one — e.g.
 * a manufacturer code plus an internal one) so the client can index by
 * barcode value directly. Deliberately narrow: only what the POS cart
 * actually reads, not a full Product row. This is a performance read
 * cache, never the source of truth — checkout always re-validates price/
 * stock/active status against the database (PRD: never trust the
 * browser for the final sale). */
export interface PosCatalogItem {
  barcode: string;
  productId: string;
  name: string;
  sellingPrice: string;
  currentStock: string;
  minimumStock: number;
  productType: "PHYSICAL" | "SERVICE";
  serviceType: "PULSA" | "TOKEN_LISTRIK" | null;
  serviceProvider: string | null;
  trackInventory: boolean;
}

export interface PosCatalogRepository {
  getActiveCatalog(): Promise<PosCatalogItem[]>;
}
