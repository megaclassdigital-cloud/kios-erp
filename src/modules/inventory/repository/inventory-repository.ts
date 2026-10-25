import type { MovementType, StockMovement } from "@prisma/client";

export interface RecordMovementInput {
  productId: string;
  quantity: string; // signed: positive = in, negative = out
  movementType: MovementType;
  referenceType: string;
  referenceId: string;
  actorId: string;
  note?: string;
}

export interface StockOutRow {
  id: string;
  createdAt: Date;
  productName: string;
  sku: string;
  unit: string;
  /** Positive: how much left the shelf. */
  quantity: string;
  movementType: MovementType;
  note: string | null;
  actorName: string;
}

export interface InventoryRepository {
  recordMovement(input: RecordMovementInput): Promise<StockMovement>;
  /** Batched insert for checkout/receiving/opname lines that each need
   * their own movement row — one round trip instead of one per item. */
  recordMovements(inputs: RecordMovementInput[]): Promise<void>;
  listMovementsForProduct(productId: string): Promise<StockMovement[]>;
  findMovement(id: string): Promise<StockMovement | null>;
  /** Sum of the corrections already made to one stock-in movement (signed). */
  sumStockInCorrections(movementId: string): Promise<string>;
  /** Damaged units recorded against receiving references, keyed
   * "referenceId:productId" (positive numbers). */
  /** Manual stock-outs (Pengeluaran Barang) created in [start, end], newest first. */
  listStockOut(start: Date, end: Date): Promise<StockOutRow[]>;
  damagedByReference(referenceIds: string[]): Promise<Map<string, string>>;
}

/** Reference type of the movement that corrects an earlier stock-in. */
export const STOCK_IN_EDIT = "STOCK_IN_EDIT";

/** Reference type of the DAMAGE movement that takes damaged units off a
 * receiving straight away. Its referenceId is the purchase id (supplier
 * receipt) or the stock-in movement id (initial stock). */
export const RECEIVE_DAMAGE = "RECEIVE_DAMAGE";
