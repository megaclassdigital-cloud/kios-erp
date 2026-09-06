import type { Purchase } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { CreatePurchaseInput, PurchaseRepository } from "../repository/purchase-repository";

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
}
