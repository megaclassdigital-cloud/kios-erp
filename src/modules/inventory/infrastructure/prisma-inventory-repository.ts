import type { StockMovement } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type {
  InventoryRepository,
  RecordMovementInput,
} from "../repository/inventory-repository";
import { STOCK_IN_EDIT } from "../repository/inventory-repository";

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

  async findMovement(id: string): Promise<StockMovement | null> {
    return this.db.stockMovement.findUnique({ where: { id } });
  }

  async sumStockInCorrections(movementId: string): Promise<string> {
    const sum = await this.db.stockMovement.aggregate({
      where: { referenceType: STOCK_IN_EDIT, referenceId: movementId },
      _sum: { quantity: true },
    });
    return (sum._sum.quantity ?? 0).toString();
  }
}
