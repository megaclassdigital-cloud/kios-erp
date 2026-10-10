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

export interface InventoryRepository {
  recordMovement(input: RecordMovementInput): Promise<StockMovement>;
  /** Batched insert for checkout/receiving/opname lines that each need
   * their own movement row — one round trip instead of one per item. */
  recordMovements(inputs: RecordMovementInput[]): Promise<void>;
  listMovementsForProduct(productId: string): Promise<StockMovement[]>;
  findMovement(id: string): Promise<StockMovement | null>;
  /** Sum of the corrections already made to one stock-in movement (signed). */
  sumStockInCorrections(movementId: string): Promise<string>;
}

/** Reference type of the movement that corrects an earlier stock-in. */
export const STOCK_IN_EDIT = "STOCK_IN_EDIT";
