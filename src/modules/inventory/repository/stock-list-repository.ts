/** Narrow projection for the Stok Barang table — id/name/sku/barcode/
 * stock/price only, not a full Product with every barcode and relation.
 * Physical-only is applied at the database, not filtered in JS after
 * fetching every product (service products never carry stock, PRD 46). */
export interface StockListItem {
  id: string;
  name: string;
  sku: string;
  primaryBarcode: string | null;
  currentStock: string;
  minimumStock: number;
  sellingPrice: string;
}

export interface StockListRepository {
  list(): Promise<StockListItem[]>;
}
