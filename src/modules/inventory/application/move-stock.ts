import Decimal from "decimal.js";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import { PrismaProductRepository } from "@/modules/products/infrastructure/prisma-product-repository";
import { PrismaInventoryRepository } from "../infrastructure/prisma-inventory-repository";

/**
 * Moves a product's stock by `delta` the only legitimate way: a StockMovement
 * row plus the projection update, in the caller's transaction. A decrease is
 * refused when it would take stock below zero -- the goods were already sold,
 * and the shelf cannot hold negative items.
 */
export async function moveStock(
  tx: Db,
  product: { productId: string; productName: string },
  delta: string,
  referenceType: string,
  referenceId: string,
  actorId: string,
  note: string
): Promise<void> {
  const change = new Decimal(delta);
  if (change.isZero()) return;

  const products = new PrismaProductRepository(tx);
  if (change.isNegative()) {
    const ok = await products.decrementStockIfAvailable(product.productId, change.abs().toString());
    if (!ok) {
      const current = await products.findById(product.productId);
      throw new Error(
        `Stok ${product.productName} sekarang ${new Decimal(current?.currentStock.toString() ?? 0).toString()}, ` +
          `tidak cukup untuk dikurangi ${change.abs().toString()} (sebagian sudah terjual atau keluar).`
      );
    }
  } else {
    await products.incrementStock(product.productId, change.toString());
  }

  await new PrismaInventoryRepository(tx).recordMovement({
    productId: product.productId,
    quantity: change.toString(),
    movementType: "ADJUSTMENT",
    referenceType,
    referenceId,
    actorId,
    note,
  });
}
