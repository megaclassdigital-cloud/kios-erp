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
/** Supplier receipts and stock updates. Customer returns are not goods coming
 * in from outside, so they are not part of this history. */
export type StockInSource = "PURCHASE" | "INITIAL_STOCK" | "STOCK_OPNAME" | "ADJUSTMENT";

export interface ReceivedItemRow {
  /** What added the stock. Only PURCHASE rows came through Barang Masuk, so
   * only those can be corrected or deleted here. */
  source: StockInSource;
  /** The purchase line id for a PURCHASE row; the stock movement id otherwise. */
  itemId: string;
  purchaseId: string | null;
  receivedAt: Date;
  /** Receipt number; null for stock that did not come from a supplier. */
  purchaseNumber: string | null;
  invoiceNumber: string | null;
  supplierName: string | null;
  receivedByName: string;
  productName: string;
  sku: string;
  unit: string;
  productId: string;
  quantity: string;
  /** Frozen on the line when it was received, not the product's current price.
   * Null when there was no purchase (initial stock, opname, return). */
  purchasePrice: string | null;
  subtotal: string | null;
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
  /** "purchase" limits the list to supplier receipts; default is every
   * addition to stock. */
  only?: "purchase";
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
  /** Lines of confirmed supplier receipts whose confirmation time is in
   * [start, end], optionally for one product only. */
  listReceivedItems(filter: ReceivedItemFilter): Promise<ReceivedItemRow[]>;
  /** Stock updates in the period (initial stock, opname increases,
   * adjustments), read from the stock ledger. */
  listOtherStockIn(filter: ReceivedItemFilter): Promise<ReceivedItemRow[]>;

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
