import type { Purchase } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { CreatePurchaseInput, PurchaseRepository, ReceivedItemRow } from "../repository/purchase-repository";

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

  async listReceivedItems(start: Date, end: Date): Promise<ReceivedItemRow[]> {
    const items = await this.db.purchaseItem.findMany({
      where: { purchase: { status: "CONFIRMED", confirmedAt: { gte: start, lte: end } } },
      orderBy: [{ purchase: { confirmedAt: "desc" } }, { purchaseId: "asc" }, { product: { name: "asc" } }],
      include: {
        purchase: { include: { supplier: { select: { name: true } }, receivedBy: { select: { name: true } } } },
        product: { select: { name: true, sku: true, baseUnit: true } },
      },
    });
    return items.map((i) => ({
      receivedAt: i.purchase.confirmedAt ?? i.purchase.createdAt,
      purchaseNumber: i.purchase.purchaseNumber,
      invoiceNumber: i.purchase.invoiceNumber,
      supplierName: i.purchase.supplier.name,
      receivedByName: i.purchase.receivedBy.name,
      productName: i.product.name,
      sku: i.product.sku,
      unit: i.product.baseUnit,
      quantity: i.quantity.toString(),
      purchasePrice: i.purchasePrice.toString(),
      subtotal: i.subtotal.toString(),
    }));
  }
}
