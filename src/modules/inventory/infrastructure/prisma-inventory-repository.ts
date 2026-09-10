import type { StockMovement } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type {
  InventoryRepository,
  RecordMovementInput,
} from "../repository/inventory-repository";

export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly db: Db) {}

  async recordMovement(input: RecordMovementInput): Promise<StockMovement> {
    return this.db.stockMovement.create({ data: input });
  }

  async recordMovements(inputs: RecordMovementInput[]): Promise<void> {
    if (inputs.length === 0) return;
    await this.db.stockMovement.createMany({ data: inputs });
  }

  async listMovementsForProduct(productId: string): Promise<StockMovement[]> {
    return this.db.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });
  }
}
