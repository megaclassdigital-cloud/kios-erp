import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { PositionInput } from "../domain/consignment";
import type { ConsignmentRepository, DropRecord, PaymentRecord } from "../repository/consignment-repository";

export class PrismaConsignmentRepository implements ConsignmentRepository {
  constructor(private readonly db: Db) {}

  findSupplier(id: string) {
    return this.db.supplier.findUnique({ where: { id } });
  }

  createConsignment(data: { number: string; supplierId: string; receivedById: string; note: string | null; items: { productId: string; quantity: string; unitCost: string }[] }) {
    return this.db.consignment.create({
      data: { number: data.number, supplierId: data.supplierId, receivedById: data.receivedById, note: data.note, items: { create: data.items } },
    });
  }

  findItem(id: string) {
    return this.db.consignmentItem.findUnique({ where: { id }, include: { consignment: true, product: true } });
  }

  async addReturned(itemId: string, quantity: string): Promise<void> {
    await this.db.consignmentItem.update({ where: { id: itemId }, data: { quantityReturned: { increment: quantity } } });
  }

  createPayment(data: { supplierId: string; amount: string; paidAt: Date; note: string | null; createdById: string }) {
    return this.db.consignmentPayment.create({ data });
  }

  async positionData(): Promise<PositionInput> {
    const [consignors, products, items, saleItems, payments] = await Promise.all([
      this.db.supplier.findMany({ where: { OR: [{ consignedProducts: { some: {} } }, { consignments: { some: {} } }] }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      this.db.product.findMany({
        where: { isConsignment: true, consignorId: { not: null }, deletedAt: null },
        select: { id: true, name: true, consignorId: true, currentStock: true },
      }),
      this.db.consignmentItem.findMany({ include: { consignment: { select: { supplierId: true, createdAt: true } } } }),
      // Paid sales of consignment products only; refunded ones are not PAID, so they drop out by themselves.
      this.db.saleItem.findMany({
        where: { product: { isConsignment: true }, sale: { status: "PAID" } },
        select: { productId: true, quantity: true, costPriceAtSale: true, sale: { select: { paidAt: true } } },
      }),
      this.db.consignmentPayment.findMany({ select: { supplierId: true, amount: true } }),
    ]);

    return {
      consignors,
      products: products.map((p) => ({ id: p.id, name: p.name, consignorId: p.consignorId as string, currentStock: p.currentStock.toString() })),
      items: items.map((i) => ({
        productId: i.productId,
        consignorId: i.consignment.supplierId,
        quantity: i.quantity.toString(),
        quantityReturned: i.quantityReturned.toString(),
        unitCost: i.unitCost.toString(),
        droppedAt: i.consignment.createdAt,
      })),
      saleLines: saleItems.flatMap((s) =>
        s.sale.paidAt ? [{ productId: s.productId, quantity: s.quantity.toString(), costPriceAtSale: s.costPriceAtSale.toString(), paidAt: s.sale.paidAt }] : []
      ),
      payments: payments.map((p) => ({ consignorId: p.supplierId, amount: p.amount.toString() })),
    };
  }

  async listDrops(limit: number): Promise<DropRecord[]> {
    const rows = await this.db.consignment.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { supplier: { select: { name: true } }, items: { include: { product: { select: { name: true, currentStock: true } } } } },
    });
    return rows.map((c) => ({
      id: c.id,
      number: c.number,
      supplierId: c.supplierId,
      supplierName: c.supplier.name,
      createdAt: c.createdAt,
      note: c.note,
      items: c.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        quantity: i.quantity.toString(),
        unitCost: i.unitCost.toString(),
        quantityReturned: i.quantityReturned.toString(),
        onHand: i.product.currentStock.toString(),
      })),
    }));
  }

  async listPayments(limit: number): Promise<PaymentRecord[]> {
    const rows = await this.db.consignmentPayment.findMany({ orderBy: { paidAt: "desc" }, take: limit, include: { supplier: { select: { name: true } } } });
    return rows.map((p) => ({ id: p.id, supplierId: p.supplierId, supplierName: p.supplier.name, amount: p.amount.toString(), paidAt: p.paidAt, note: p.note }));
  }
}
