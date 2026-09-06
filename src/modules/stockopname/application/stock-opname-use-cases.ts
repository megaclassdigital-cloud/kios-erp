import Decimal from "decimal.js";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { DailyCounterRepository } from "@/shared/infrastructure/daily-counter-repository";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { PrismaInventoryRepository } from "@/modules/inventory/infrastructure/prisma-inventory-repository";
import { PrismaStockOpnameRepository } from "../infrastructure/prisma-stock-opname-repository";

/** START STOCK OPNAME (PRD 28). */
export class StartStockOpnameUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(startedById: string) {
    return this.txManager.run(async (tx) => {
      const counters = new DailyCounterRepository(tx);
      const opnames = new PrismaStockOpnameRepository(tx);
      const opnameNumber = await counters.next("SO");
      return opnames.create(startedById, opnameNumber);
    });
  }
}

/** SCAN + INPUT PHYSICAL QTY, then REVIEW -> SUBMIT. System qty is
 * captured at submit time from the live stock projection (PRD 28). */
export class SubmitStockOpnameUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(opnameId: string, lines: { productId: string; physicalQty: string }[]) {
    return this.txManager.run(async (tx) => {
      const products = new PrismaProductRepository(tx);
      const opnames = new PrismaStockOpnameRepository(tx);

      const resolvedLines = await Promise.all(
        lines.map(async (line) => {
          const product = await products.findById(line.productId);
          if (!product) throw new Error("Produk tidak ditemukan.");
          const systemQty = new Decimal(product.currentStock.toString());
          const physicalQty = new Decimal(line.physicalQty);
          return {
            productId: line.productId,
            systemQty: systemQty.toString(),
            physicalQty: physicalQty.toString(),
            difference: physicalQty.minus(systemQty).toString(),
          };
        })
      );

      return opnames.submit(opnameId, resolvedLines);
    });
  }
}

/** APPROVE: writes STOCK_OPNAME movements + adjusts projection — never a
 * bare `product.stock = x` overwrite (PRD 25, 28). */
export class ApproveStockOpnameUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(opnameId: string, approvedById: string) {
    return this.txManager.run(async (tx) => {
      const opnames = new PrismaStockOpnameRepository(tx);
      const products = new PrismaProductRepository(tx);
      const inventory = new PrismaInventoryRepository(tx);
      const audit = new AuditLogger(tx);

      const opname = await opnames.findById(opnameId);
      if (!opname || opname.status !== "SUBMITTED") {
        throw new Error("Stock opname tidak dapat disetujui pada status ini.");
      }

      for (const item of opname.items) {
        const difference = new Decimal(item.difference.toString());
        if (difference.isZero()) continue;
        await inventory.recordMovement({
          productId: item.productId,
          quantity: difference.toString(),
          movementType: "STOCK_OPNAME",
          referenceType: "STOCK_OPNAME",
          referenceId: opname.id,
          actorId: approvedById,
        });
        await products.incrementStock(item.productId, difference.toString());
      }

      const approved = await opnames.approve(opnameId, approvedById);

      await audit.record({
        actorId: approvedById,
        action: "STOCK_OPNAME_APPROVED",
        entityType: "StockOpname",
        entityId: opname.id,
        afterValue: { itemCount: opname.items.length },
      });

      return approved;
    });
  }
}
