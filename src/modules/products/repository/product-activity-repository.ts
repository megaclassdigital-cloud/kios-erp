/** When a product last changed, and how. */
export interface ProductActivity {
  /** Last stock movement of any kind (sale, receiving, opname...). */
  lastStockChange: { at: Date; type: string } | null;
  /** Last edit of the product's own data (price, name, expiry...) or its creation. */
  lastEdit: { at: Date; by: string; created: boolean; changed: string[] } | null;
}

export interface ProductActivityRepository {
  latestFor(productIds: string[]): Promise<Map<string, ProductActivity>>;
}
