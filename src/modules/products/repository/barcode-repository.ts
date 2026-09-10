import type { BarcodeSource, ProductBarcode } from "@prisma/client";

/** Narrow product projection for the POS/receiving/opname barcode-resolve
 * hot path — only the fields those screens actually read, not the full
 * Product row (no description/category/timestamps). */
export interface ResolvedBarcodeProduct {
  id: string;
  name: string;
  productType: "PHYSICAL" | "SERVICE";
  serviceType: "PULSA" | "TOKEN_LISTRIK" | null;
  serviceProvider: string | null;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: string;
  minimumStock: number;
  trackInventory: boolean;
  active: boolean;
}

export interface ResolvedBarcode {
  id: string;
  barcodeValue: string;
  barcodeType: string;
  status: "ACTIVE" | "RETIRED";
  productId: string;
  product: ResolvedBarcodeProduct | null;
}

export interface BarcodeRepository {
  findByValue(barcodeValue: string): Promise<ProductBarcode | null>;
  /** Single joined read for the scan hot path — barcode + its product in
   * one round trip instead of findByValue then findById separately.
   * Deliberately NOT filtered by status: a retired barcode must still be
   * returned so the caller can distinguish "retired" from "never
   * existed" and give the right error message for each (unchanged from
   * the previous two-query behavior). */
  resolveBarcode(barcodeValue: string): Promise<ResolvedBarcode | null>;
  create(input: {
    productId: string;
    barcodeValue: string;
    barcodeType: string;
    unit: string;
    conversionFactor: string;
    source: BarcodeSource;
  }): Promise<ProductBarcode>;
  retire(id: string): Promise<ProductBarcode>;
  nextInternalSequence(): Promise<bigint>;
}
