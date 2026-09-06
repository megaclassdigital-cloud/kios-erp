import type { Sale } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { CreateSaleInput, SaleRepository } from "../repository/sale-repository";

export class PrismaSaleRepository implements SaleRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateSaleInput): Promise<Sale> {
    return this.db.sale.create({
      data: {
        transactionNumber: input.transactionNumber,
        cashierId: input.cashierId,
        shiftId: input.shiftId,
        paymentMethod: input.paymentMethod,
        subtotal: input.subtotal,
        discount: input.discount,
        grandTotal: input.grandTotal,
        cashReceived: input.cashReceived,
        changeAmount: input.changeAmount,
        status: input.status,
        paidAt: input.status === "PAID" ? new Date() : undefined,
        items: { create: input.items },
      },
    });
  }

  async markPaid(id: string): Promise<Sale> {
    return this.db.sale.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
    });
  }

  async findById(id: string): Promise<Sale | null> {
    return this.db.sale.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });
  }

  async listRecent(limit: number, cashierId?: string): Promise<Sale[]> {
    return this.db.sale.findMany({
      where: cashierId ? { cashierId } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { items: true, cashier: true },
    });
  }
}
