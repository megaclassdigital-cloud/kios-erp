import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { moveStock } from "@/modules/inventory/application/move-stock";
import { PrismaPurchaseRepository } from "../infrastructure/prisma-purchase-repository";
import { deletionDelta, planCorrection, receiptTotal } from "../domain/receiving-correction";
import type { PurchaseItemDetail } from "../repository/purchase-repository";
import type { Db } from "@/shared/infrastructure/transaction-manager";

export class ReceivedItemNotFoundError extends Error {}

export interface CorrectItemRequest {
  quantity?: string;
  purchasePrice?: string;
  /** undefined = leave alone, null = clear the date on this line. */
  expiryDate?: Date | null;
}

async function requireItem(tx: Db, itemId: string): Promise<PurchaseItemDetail> {
  const item = await new PrismaPurchaseRepository(tx).findItem(itemId);
  if (!item || item.purchaseStatus !== "CONFIRMED") {
    throw new ReceivedItemNotFoundError("Baris barang masuk tidak ditemukan.");
  }
  return item;
}

/** Keeps the receipt header honest after a line changed or went. */
async function resyncReceipt(tx: Db, purchaseId: string) {
  const purchases = new PrismaPurchaseRepository(tx);
  const subtotals = await purchases.itemSubtotals(purchaseId);
  if (subtotals.length === 0) await purchases.deletePurchase(purchaseId);
  else await purchases.setTotal(purchaseId, receiptTotal(subtotals));
}

/**
 * Correct a received line: change its quantity, price or expiry.
 *
 * Quantity 5 -> 6 puts stock up by 1 (a StockMovement of +1 and the same on
 * the projection), exactly as if 6 had been received. The receipt total and
 * the audit trail follow in the same transaction.
 */
export class UpdateReceivedItemUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(itemId: string, req: CorrectItemRequest, actorId: string) {
    return this.txManager.run(async (tx) => {
      const purchases = new PrismaPurchaseRepository(tx);
      const item = await requireItem(tx, itemId);
      const plan = planCorrection(item, req);

      await purchases.updateItem(itemId, {
        quantity: plan.quantity,
        purchasePrice: plan.purchasePrice,
        subtotal: plan.subtotal,
        ...(req.expiryDate !== undefined ? { expiryDate: req.expiryDate } : {}),
      });

      await moveStock(
        tx,
        item,
        plan.stockDelta,
        "PURCHASE_ITEM_EDIT",
        item.id,
        actorId,
        `Koreksi barang masuk ${item.purchaseNumber}: ${item.quantity} → ${plan.quantity}`
      );

      // The product carries the date of the latest delivery, so correcting
      // that delivery's date corrects the product's too.
      if (req.expiryDate) {
        const latest = await purchases.latestItemForProduct(item.productId);
        if (latest?.id === itemId) {
          await new PrismaProductRepository(tx).update(item.productId, { expiryDate: req.expiryDate });
        }
      }

      await resyncReceipt(tx, item.purchaseId);

      await new AuditLogger(tx).record({
        actorId,
        action: "PURCHASE_ITEM_UPDATED",
        entityType: "Product",
        entityId: item.productId,
        beforeValue: { quantity: item.quantity, purchasePrice: item.purchasePrice, expiryDate: item.expiryDate?.toISOString() ?? null },
        afterValue: { quantity: plan.quantity, purchasePrice: plan.purchasePrice, expiryDate: (req.expiryDate === undefined ? item.expiryDate : req.expiryDate)?.toISOString() ?? null },
        metadata: { purchaseNumber: item.purchaseNumber, purchaseItemId: itemId },
      });

      return { itemId, stockDelta: plan.stockDelta };
    });
  }
}

/**
 * Delete a received line: everything it added comes back off the shelf, the
 * line leaves the history, and a receipt left with no lines goes with it. The
 * stock ledger keeps both the original receiving and the reversal.
 */
export class DeleteReceivedItemUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(itemId: string, actorId: string) {
    return this.txManager.run(async (tx) => {
      const purchases = new PrismaPurchaseRepository(tx);
      const item = await requireItem(tx, itemId);
      const wasLatest = (await purchases.latestItemForProduct(item.productId))?.id === itemId;

      // Stock first: if it cannot be taken back, nothing else has changed.
      await moveStock(
        tx,
        item,
        deletionDelta(item),
        "PURCHASE_ITEM_DELETE",
        item.id,
        actorId,
        `Hapus barang masuk ${item.purchaseNumber}: -${item.quantity}`
      );
      await purchases.deleteItem(itemId);
      await resyncReceipt(tx, item.purchaseId);

      // The product's date came from this delivery; fall back to the one
      // before it, when that one recorded a date.
      if (wasLatest) {
        const previous = await purchases.latestItemForProduct(item.productId);
        if (previous?.expiryDate) {
          await new PrismaProductRepository(tx).update(item.productId, { expiryDate: previous.expiryDate });
        }
      }

      await new AuditLogger(tx).record({
        actorId,
        action: "PURCHASE_ITEM_DELETED",
        entityType: "Product",
        entityId: item.productId,
        beforeValue: { quantity: item.quantity, purchasePrice: item.purchasePrice, expiryDate: item.expiryDate?.toISOString() ?? null },
        metadata: { purchaseNumber: item.purchaseNumber, purchaseItemId: itemId },
      });

      return { itemId, stockDelta: deletionDelta(item) };
    });
  }
}
