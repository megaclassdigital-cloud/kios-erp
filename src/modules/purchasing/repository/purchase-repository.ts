import type { Purchase } from "@prisma/client";

export interface CreatePurchaseInput {
  purchaseNumber: string;
  supplierId: string;
  invoiceNumber?: string;
  receivedById: string;
  totalAmount: string;
  items: {
    productId: string;
    quantity: string;
    purchasePrice: string;
    subtotal: string;
  }[];
}

/** One received line, flattened with the receipt it belongs to. Money and
 * quantities are decimal strings so nothing downstream rounds through float. */
export interface ReceivedItemRow {
  receivedAt: Date;
  purchaseNumber: string;
  invoiceNumber: string | null;
  supplierName: string;
  receivedByName: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: string;
  /** Frozen on the line when it was received, not the product's current price. */
  purchasePrice: string;
  subtotal: string;
}

export interface PurchaseRepository {
  create(input: CreatePurchaseInput): Promise<Purchase>;
  listRecent(limit: number): Promise<Purchase[]>;
  /** Lines of confirmed receipts whose confirmation time is in [start, end],
   * newest receipt first. */
  listReceivedItems(start: Date, end: Date): Promise<ReceivedItemRow[]>;
}
