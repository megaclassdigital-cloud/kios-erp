import Decimal from "decimal.js";
import { Prisma, type Purchase } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { CreatePurchaseInput, PurchaseItemDetail, PurchaseRepository, ReceivedItemFilter, ReceivedItemRow } from "../repository/purchase-repository";

export class PrismaPurchaseRepository implements PurchaseRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreatePurchaseInput): Promise<Purchase> {
    return this.db.purchase.create({
      data: {
        purchaseNumber: input.purchaseNumber,
        supplierId: input.supplierId,
        invoiceNumber: input.invoiceNumber,
        receivedById: input.receivedById,
        totalAmount: input.totalAmount,
        status: "CONFIRMED",
        confirmedAt: new Date(),
        items: { create: input.items },
      },
    });
  }

  async listRecent(limit: number): Promise<Purchase[]> {
    return this.db.purchase.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { items: true, supplier: true },
    });
  }

  async listReceivedItems(filter: ReceivedItemFilter): Promise<ReceivedItemRow[]> {
    const items = await this.db.purchaseItem.findMany({
      where: {
        productId: filter.productId,
        purchase: { status: "CONFIRMED", confirmedAt: { gte: filter.start, lte: filter.end } },
      },
      orderBy: [{ purchase: { confirmedAt: "desc" } }, { purchaseId: "asc" }, { product: { name: "asc" } }],
      include: {
        purchase: { include: { supplier: { select: { name: true } }, receivedBy: { select: { name: true } } } },
        product: { select: { name: true, sku: true, baseUnit: true } },
      },
    });
    if (items.length === 0) return [];

    const balanceAfter = await this.balancesAfterReceiving(
      [...new Set(items.map((i) => i.productId))],
      [...new Set(items.map((i) => i.purchaseId))]
    );

    return items.map((i) => {
      // Two lines of one product in one receipt would share a key; each takes
      // the next balance in ledger order.
      const ledger = balanceAfter.get(`${i.purchaseId}:${i.productId}`)?.shift();
      // Stock before = the running balance just before the original receiving
      // movement. After = before + what the line says now, so a corrected
      // quantity reads as if it had been received that way.
      const stockBefore = ledger ? ledger.balance.minus(ledger.quantity) : new Decimal(0);
      return {
        source: "PURCHASE" as const,
        itemId: i.id,
        purchaseId: i.purchaseId,
        receivedAt: i.purchase.confirmedAt ?? i.purchase.createdAt,
        purchaseNumber: i.purchase.purchaseNumber,
        invoiceNumber: i.purchase.invoiceNumber,
        supplierName: i.purchase.supplier.name,
        receivedByName: i.purchase.receivedBy.name,
        productId: i.productId,
        productName: i.product.name,
        sku: i.product.sku,
        unit: i.product.baseUnit,
        quantity: i.quantity.toString(),
        purchasePrice: i.purchasePrice.toString(),
        subtotal: i.subtotal.toString(),
        expiryDate: i.expiryDate,
        stockBefore: stockBefore.toString(),
        stockAfter: stockBefore.plus(i.quantity.toString()).toString(),
      };
    });
  }

  /** Positive stock movements that are not supplier receipts. A correction
   * made to a receipt (PURCHASE_ITEM_*) is already shown on its own line, so
   * it is left out rather than listed twice. */
  async listOtherStockIn(filter: ReceivedItemFilter): Promise<ReceivedItemRow[]> {
    const productFilter = filter.productId ? Prisma.sql`WHERE "productId" = ${filter.productId}` : Prisma.empty;
    const moves = await this.db.$queryRaw<
      { id: string; productId: string; movementType: string; quantity: Prisma.Decimal; balance: Prisma.Decimal; createdAt: Date; actorId: string }[]
    >`
      SELECT id, "productId", "movementType", quantity, balance, "createdAt", "actorId" FROM (
        SELECT id, "productId", "movementType"::text AS "movementType", "referenceType", quantity, "createdAt", "actorId",
               SUM(quantity) OVER (PARTITION BY "productId" ORDER BY "createdAt", id) AS balance
        FROM stock_movements
        ${productFilter}
      ) ledger
      WHERE "movementType" IN ('INITIAL_STOCK', 'STOCK_OPNAME', 'RETURN_IN', 'ADJUSTMENT')
        AND quantity > 0
        AND "referenceType" NOT LIKE 'PURCHASE_ITEM_%'
        AND "createdAt" >= ${filter.start} AND "createdAt" <= ${filter.end}
      ORDER BY "createdAt" DESC, id`;
    if (moves.length === 0) return [];

    const [products, users] = await Promise.all([
      this.db.product.findMany({
        where: { id: { in: [...new Set(moves.map((m) => m.productId))] } },
        select: { id: true, name: true, sku: true, baseUnit: true },
      }),
      this.db.user.findMany({
        where: { id: { in: [...new Set(moves.map((m) => m.actorId))] } },
        select: { id: true, name: true },
      }),
    ]);
    const productById = new Map(products.map((p) => [p.id, p]));
    const userById = new Map(users.map((u) => [u.id, u.name]));

    return moves.flatMap((m): ReceivedItemRow[] => {
      const product = productById.get(m.productId);
      if (!product) return [];
      const quantity = new Decimal(m.quantity.toString());
      const after = new Decimal(m.balance.toString());
      return [
        {
          source: m.movementType as ReceivedItemRow["source"],
          itemId: m.id,
          purchaseId: null,
          receivedAt: m.createdAt,
          purchaseNumber: null,
          invoiceNumber: null,
          supplierName: null,
          receivedByName: userById.get(m.actorId) ?? "-",
          productId: m.productId,
          productName: product.name,
          sku: product.sku,
          unit: product.baseUnit,
          quantity: quantity.toString(),
          purchasePrice: null,
          subtotal: null,
          expiryDate: null,
          stockBefore: after.minus(quantity).toString(),
          stockAfter: after.toString(),
        },
      ];
    });
  }

  async findItem(itemId: string): Promise<PurchaseItemDetail | null> {
    const i = await this.db.purchaseItem.findUnique({
      where: { id: itemId },
      include: { purchase: { select: { purchaseNumber: true, status: true } }, product: { select: { name: true } } },
    });
    if (!i) return null;
    return {
      id: i.id,
      purchaseId: i.purchaseId,
      purchaseNumber: i.purchase.purchaseNumber,
      purchaseStatus: i.purchase.status,
      productId: i.productId,
      productName: i.product.name,
      quantity: i.quantity.toString(),
      purchasePrice: i.purchasePrice.toString(),
      expiryDate: i.expiryDate,
    };
  }

  async updateItem(
    itemId: string,
    data: { quantity: string; purchasePrice: string; subtotal: string; expiryDate?: Date | null }
  ): Promise<void> {
    await this.db.purchaseItem.update({ where: { id: itemId }, data });
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.db.purchaseItem.delete({ where: { id: itemId } });
  }

  async itemSubtotals(purchaseId: string): Promise<string[]> {
    const items = await this.db.purchaseItem.findMany({ where: { purchaseId }, select: { subtotal: true } });
    return items.map((i) => i.subtotal.toString());
  }

  async setTotal(purchaseId: string, totalAmount: string): Promise<void> {
    await this.db.purchase.update({ where: { id: purchaseId }, data: { totalAmount } });
  }

  async deletePurchase(purchaseId: string): Promise<void> {
    await this.db.purchase.delete({ where: { id: purchaseId } });
  }

  async latestItemForProduct(productId: string): Promise<{ id: string; expiryDate: Date | null } | null> {
    return this.db.purchaseItem.findFirst({
      where: { productId, purchase: { status: "CONFIRMED" } },
      orderBy: [{ purchase: { confirmedAt: "desc" } }, { id: "desc" }],
      select: { id: true, expiryDate: true },
    });
  }

  /**
   * Running stock right after each PURCHASE movement, keyed by
   * "purchaseId:productId". The ledger is the source of truth for stock
   * (Product.currentStock is a projection of it), so a running sum over it is
   * what the shelf held at that moment -- no balance column to keep in step.
   */
  private async balancesAfterReceiving(productIds: string[], purchaseIds: string[]) {
    const rows = await this.db.$queryRaw<
      { referenceId: string; productId: string; quantity: Prisma.Decimal; balance: Prisma.Decimal }[]
    >`
      SELECT "referenceId", "productId", quantity, balance FROM (
        SELECT "referenceId", "productId", "movementType", quantity,
               SUM(quantity) OVER (PARTITION BY "productId" ORDER BY "createdAt", id) AS balance,
               "createdAt", id
        FROM stock_movements
        WHERE "productId" = ANY(${productIds}::text[])
      ) running
      WHERE "movementType" = 'PURCHASE' AND "referenceId" = ANY(${purchaseIds}::text[])
      ORDER BY "createdAt", id`;
    const map = new Map<string, { balance: Decimal; quantity: Decimal }[]>();
    for (const r of rows) {
      const key = `${r.referenceId}:${r.productId}`;
      const list = map.get(key) ?? [];
      list.push({ balance: new Decimal(r.balance.toString()), quantity: new Decimal(r.quantity.toString()) });
      map.set(key, list);
    }
    return map;
  }
}
