import type { Category, Product, ProductBarcode, ProductType, ServiceType } from "@prisma/client";

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  categoryId?: string | null;
  productType: ProductType;
  serviceType?: ServiceType | null;
  serviceProvider?: string | null;
  baseUnit: string;
  purchasePrice: string;
  sellingPrice: string;
  minimumStock: number;
  trackInventory: boolean;
  /** Null for a service, which has nothing to expire. */
  expiryDate?: Date | null;
  expiryWarnDays?: number;
}

export interface UpdateProductInput {
  name?: string;
  categoryId?: string | null;
  purchasePrice?: string;
  sellingPrice?: string;
  minimumStock?: number;
  active?: boolean;
  /** Stamped by the delete flow; never set from an edit form. */
  deletedAt?: Date | null;
  serviceProvider?: string | null;
  expiryDate?: Date | null;
  expiryWarnDays?: number;
}

export type ProductWithBarcodes = Product & { barcodes: ProductBarcode[] };

/** What a list screen or export needs: barcodes plus the category name. */
export type ProductListItem = ProductWithBarcodes & { category: Category | null };

/** Contract only — no Prisma types leak into Application/Domain callers
 * beyond these DTOs (PRD 63). */
export interface ProductRepository {
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product>;
  findById(id: string): Promise<ProductWithBarcodes | null>;
  /** Batched read for checkout/receiving lines — one round trip for N
   * product ids instead of N sequential findById calls. Order is not
   * guaranteed to match `ids`; callers should index by `.id`. */
  findByIds(ids: string[]): Promise<ProductWithBarcodes[]>;
  findBySku(sku: string): Promise<Product | null>;
  list(filter: {
    categoryId?: string;
    active?: boolean;
    lowStock?: boolean;
    search?: string;
  }): Promise<ProductListItem[]>;
  incrementStock(id: string, deltaQuantity: string): Promise<void>;
  /** Atomically decrements stock only if enough is available, returning
   * false (no throw) when it isn't — used to resolve the last-unit race
   * between concurrent cashiers (PRD 73) without explicit row locking. */
  decrementStockIfAvailable(id: string, quantity: string): Promise<boolean>;
}
