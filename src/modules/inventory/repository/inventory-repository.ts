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
}
