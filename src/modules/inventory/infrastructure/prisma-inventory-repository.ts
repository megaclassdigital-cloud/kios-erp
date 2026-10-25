import Decimal from "decimal.js";
import type { StockMovement } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type {
  InventoryRepository,
  RecordMovementInput,
  StockOutRow,
} from "../repository/inventory-repository";
import { RECEIVE_DAMAGE, STOCK_IN_EDIT } from "../repository/inventory-repository";
import { STOCK_OUT_REFERENCE } from "../domain/stock-out";

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

  async damagedByReference(referenceIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (referenceIds.length === 0) return map;
    const groups = await this.db.stockMovement.groupBy({
      by: ["referenceId", "productId"],
      where: { referenceType: RECEIVE_DAMAGE, referenceId: { in: referenceIds } },
      _sum: { quantity: true },
    });
    for (const g of groups) {
      // Stored as a negative movement; callers want the positive count.
      map.set(`${g.referenceId}:${g.productId}`, new Decimal((g._sum.quantity ?? 0).toString()).negated().toString());
    }
    return map;
  }

  async listStockOut(start: Date, end: Date): Promise<StockOutRow[]> {
    const rows = await this.db.stockMovement.findMany({
      where: { referenceType: STOCK_OUT_REFERENCE, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true, sku: true, baseUnit: true } },
        actor: { select: { name: true } },
      },
    });
    return rows.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      productName: m.product.name,
      sku: m.product.sku,
      unit: m.product.baseUnit,
      quantity: new Decimal(m.quantity.toString()).negated().toString(),
      movementType: m.movementType,
      note: m.note,
      actorName: m.actor.name,
    }));
  }
}
