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
    /** Expiry printed on this delivery; null when none was entered. */
    expiryDate: Date | null;
  }[];
}

/** One received line, flattened with the receipt it belongs to. Money and
 * quantities are decimal strings so nothing downstream rounds through float. */
export interface ReceivedItemRow {
  /** Ids so the history can address one line (and its receipt) to correct it. */
  itemId: string;
  purchaseId: string;
  receivedAt: Date;
  purchaseNumber: string;
  invoiceNumber: string | null;
  supplierName: string;
  receivedByName: string;
  productName: string;
  sku: string;
  unit: string;
  productId: string;
  quantity: string;
  /** Frozen on the line when it was received, not the product's current price. */
  purchasePrice: string;
  subtotal: string;
  /** Expiry this delivery arrived with; null for older receipts or none entered. */
  expiryDate: Date | null;
  /** Product stock immediately before / after this line, from the stock
   * ledger (StockMovement), so it is what the system actually held then. */
  stockBefore: string;
  stockAfter: string;
}

export interface ReceivedItemFilter {
  start: Date;
  end: Date;
  productId?: string;
}

/** One received line with what is needed to correct or remove it. */
export interface PurchaseItemDetail {
  id: string;
  purchaseId: string;
  purchaseNumber: string;
  purchaseStatus: string;
  productId: string;
  productName: string;
  quantity: string;
  purchasePrice: string;
  expiryDate: Date | null;
}

export interface PurchaseRepository {
  create(input: CreatePurchaseInput): Promise<Purchase>;
  listRecent(limit: number): Promise<Purchase[]>;
  /** Lines of confirmed receipts whose confirmation time is in [start, end],
   * newest receipt first, optionally for one product only. */
  listReceivedItems(filter: ReceivedItemFilter): Promise<ReceivedItemRow[]>;

  findItem(itemId: string): Promise<PurchaseItemDetail | null>;
  updateItem(
    itemId: string,
    data: { quantity: string; purchasePrice: string; subtotal: string; expiryDate?: Date | null }
  ): Promise<void>;
  deleteItem(itemId: string): Promise<void>;
  /** Subtotals of the lines still on a receipt. */
  itemSubtotals(purchaseId: string): Promise<string[]>;
  setTotal(purchaseId: string, totalAmount: string): Promise<void>;
  /** Removes a receipt that has no lines left. */
  deletePurchase(purchaseId: string): Promise<void>;
  /** The most recently received line of a product (its date is the one the
   * product itself carries), or null when none is left. */
  latestItemForProduct(productId: string): Promise<{ id: string; expiryDate: Date | null } | null>;
}
