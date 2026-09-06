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
  listMovementsForProduct(productId: string): Promise<StockMovement[]>;
}
