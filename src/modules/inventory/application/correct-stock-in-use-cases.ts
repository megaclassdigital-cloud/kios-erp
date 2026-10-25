import Decimal from "decimal.js";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { planCorrection } from "@/modules/purchasing/domain/receiving-correction";
import { PrismaInventoryRepository } from "../infrastructure/prisma-inventory-repository";
import { STOCK_IN_EDIT } from "../repository/inventory-repository";
import { moveStock } from "./move-stock";
import { adjustReceivingDamage, damagedGivesBackStock } from "./adjust-receiving-damage";

export class StockInNotFoundError extends Error {}

/** Stock-in sources that are not supplier receipts. Receipts have their own
 * line (and use cases); everything else that raises stock is one of these. */
const CORRECTABLE = ["INITIAL_STOCK", "STOCK_OPNAME", "ADJUSTMENT"];

interface StockIn {
  movementId: string;
  productId: string;
  productName: string;
  movementType: string;
  /** What the history shows now: the original quantity plus any corrections. */
  effective: Decimal;
  /** Damaged units taken off when this was recorded; never on the shelf. */
  damaged: Decimal;
}

async function loadStockIn(tx: Db, movementId: string): Promise<StockIn> {
  const inventory = new PrismaInventoryRepository(tx);
  const movement = await inventory.findMovement(movementId);
  const isCorrectable =
    movement &&
    CORRECTABLE.includes(movement.movementType) &&
    new Decimal(movement.quantity.toString()).gt(0) &&
    movement.referenceType !== STOCK_IN_EDIT &&
    !movement.referenceType.startsWith("PURCHASE_ITEM_");
  if (!movement || !isCorrectable) throw new StockInNotFoundError("Catatan stok tidak ditemukan.");

  const effective = new Decimal(movement.quantity.toString()).plus(await inventory.sumStockInCorrections(movementId));
  // A row corrected down to nothing is a deleted row.
  if (effective.lte(0)) throw new StockInNotFoundError("Catatan stok ini sudah dihapus.");

  const damaged = new Decimal((await inventory.damagedByReference([movementId])).get(`${movementId}:${movement.productId}`) ?? 0);
  const product = await new PrismaProductRepository(tx).findById(movement.productId);
  return {
    movementId,
    productId: movement.productId,
    productName: product?.name ?? "Produk",
    movementType: movement.movementType,
    effective,
    damaged,
  };
}

/**
 * Correct the quantity of a stock addition that did not come from a supplier
 * (initial stock, opname increase, adjustment).
 *
 * The original movement is never rewritten -- the stock ledger is append-only.
 * The correction is a second movement (referenceType STOCK_IN_EDIT) pointing at
 * it, and the history shows original + corrections. Stock moves by the
 * difference, in the same transaction.
 */
export class UpdateStockInUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(movementId: string, quantity: string, actorId: string, damagedQuantity?: string) {
    return this.txManager.run(async (tx) => {
      const row = await loadStockIn(tx, movementId);
      // Same arithmetic and validation as correcting a received line; the
      // price plays no part here.
      const plan = planCorrection(
        { quantity: row.effective.toString(), purchasePrice: "0", damagedQuantity: row.damaged.toString() },
        { quantity, damagedQuantity }
      );

      const moveQuantity = () =>
        moveStock(
          tx,
          row,
          plan.stockDelta,
          STOCK_IN_EDIT,
          movementId,
          actorId,
          `Koreksi ${row.movementType}: ${row.effective.toString()} → ${plan.quantity}`
        );
      const moveDamage = () => adjustReceivingDamage(tx, row, plan.damagedDelta, movementId, actorId, row.movementType);
      // Give stock back before taking any off, so the net effect is what is judged.
      if (damagedGivesBackStock(plan.damagedDelta)) {
        await moveDamage();
        await moveQuantity();
      } else {
        await moveQuantity();
        await moveDamage();
      }

      await new AuditLogger(tx).record({
        actorId,
        action: "STOCK_IN_UPDATED",
        entityType: "Product",
        entityId: row.productId,
        beforeValue: { quantity: row.effective.toString(), damagedQuantity: row.damaged.toString() },
        afterValue: { quantity: plan.quantity, damagedQuantity: plan.damagedQuantity },
        metadata: { movementId, source: row.movementType },
      });
      return { movementId, stockDelta: plan.stockDelta };
    });
  }
}

/** Delete a stock addition: the goods it added come back off the shelf and the
 * row leaves the history (its effective quantity becomes zero). */
export class DeleteStockInUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(movementId: string, actorId: string) {
    return this.txManager.run(async (tx) => {
      const row = await loadStockIn(tx, movementId);
      // The damaged units were never on the shelf, so only the rest comes back.
      const delta = row.effective.minus(row.damaged).negated().toString();

      await moveStock(tx, row, delta, STOCK_IN_EDIT, movementId, actorId, `Hapus ${row.movementType}: ${delta}`);

      await new AuditLogger(tx).record({
        actorId,
        action: "STOCK_IN_DELETED",
        entityType: "Product",
        entityId: row.productId,
        beforeValue: { quantity: row.effective.toString() },
        metadata: { movementId, source: row.movementType },
      });
      return { movementId, stockDelta: delta };
    });
  }
}
