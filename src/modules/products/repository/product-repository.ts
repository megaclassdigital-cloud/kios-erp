import type { Product, ProductBarcode, ProductType, ServiceType } from "@prisma/client";

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
}

export interface UpdateProductInput {
  name?: string;
  categoryId?: string | null;
  purchasePrice?: string;
  sellingPrice?: string;
  minimumStock?: number;
  active?: boolean;
  serviceProvider?: string | null;
}

export type ProductWithBarcodes = Product & { barcodes: ProductBarcode[] };

/** Contract only — no Prisma types leak into Application/Domain callers
 * beyond these DTOs (PRD 63). */
export interface ProductRepository {
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product>;
  findById(id: string): Promise<ProductWithBarcodes | null>;
  findBySku(sku: string): Promise<Product | null>;
  list(filter: {
    categoryId?: string;
    active?: boolean;
    lowStock?: boolean;
    search?: string;
  }): Promise<ProductWithBarcodes[]>;
  incrementStock(id: string, deltaQuantity: string): Promise<void>;
  /** Atomically decrements stock only if enough is available, returning
   * false (no throw) when it isn't — used to resolve the last-unit race
   * between concurrent cashiers (PRD 73) without explicit row locking. */
  decrementStockIfAvailable(id: string, quantity: string): Promise<boolean>;
}
