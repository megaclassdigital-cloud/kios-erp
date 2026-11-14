import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaFinanceReadRepository } from "@/modules/finance/infrastructure/prisma-finance-read-repository";
import type { CashierReport, FinanceReport, InventoryReport, ProductReport, TransactionRecord } from "../domain/report-data";

const num = (v: unknown) => Number(v ?? 0);

/** Reads for the report sheets. Same periods and same snapshots as the pages they mirror. */
export class PrismaReportRepository {
  /** A sale belongs to the day it was paid; one never paid falls back to the day it was started (as on Transaksi). */
  static saleWhere(start: Date, end: Date, cashierId?: string): Prisma.SaleWhereInput {
    return {
      ...(cashierId ? { cashierId } : {}),
      OR: [
        { paidAt: { gte: start, lte: end } },
        { paidAt: null, createdAt: { gte: start, lte: end } },
      ],
    };
  }

  async transactions(start: Date, end: Date, cashierId: string | undefined, limit: number): Promise<{ records: TransactionRecord[]; total: number }> {
    const where = PrismaReportRepository.saleWhere(start, end, cashierId);
    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          transactionNumber: true,
          createdAt: true,
          paidAt: true,
          paymentMethod: true,
          status: true,
          cashier: { select: { name: true } },
          items: { orderBy: { id: "asc" }, select: { productNameSnapshot: true, quantity: true, unitPriceAtSale: true, discountAmount: true } },
        },
      }),
      prisma.sale.count({ where }),
    ]);
    return {
      total,
      records: sales.map((s) => ({
        number: s.transactionNumber,
        at: s.paidAt ?? s.createdAt,
        cashier: s.cashier.name,
        method: s.paymentMethod,
        status: s.status,
        items: s.items.map((i) => ({ name: i.productNameSnapshot, quantity: num(i.quantity), unitPrice: num(i.unitPriceAtSale), discount: num(i.discountAmount) })),
      })),
    };
  }

  async finance(start: Date, end: Date): Promise<FinanceReport> {
    const reads = new PrismaFinanceReadRepository(prisma);
    const [agg, products, expenses, transactions] = await Promise.all([
      reads.summary(start, end),
      reads.productBreakdown(start, end, 5000),
      prisma.expense.findMany({ where: { expenseDate: { gte: start, lte: end } }, orderBy: { expenseDate: "desc" } }),
      prisma.sale.count({ where: { status: "PAID", paidAt: { gte: start, lte: end } } }),
    ]);
    return {
      transactions,
      revenue: num(agg.revenue),
      cogs: num(agg.cogs),
      expense: num(agg.expense),
      cash: num(agg.cash),
      cashless: num(agg.cashless),
      products: products.map((p) => ({ name: p.name, quantity: num(p.quantity), revenue: num(p.revenue), cogs: num(p.cogs) })),
      expenses: expenses.map((e) => ({ date: e.expenseDate, category: e.category, description: e.description ?? "", amount: num(e.amount) })),
    };
  }

  async products(start: Date, end: Date): Promise<ProductReport> {
    const where = { sale: { status: "PAID" as const, paidAt: { gte: start, lte: end } } };
    const [sold, active] = await Promise.all([
      prisma.saleItem.groupBy({ by: ["productId", "productNameSnapshot"], where, _sum: { quantity: true, subtotal: true }, orderBy: { _sum: { subtotal: "desc" } } }),
      prisma.product.findMany({ where: { active: true, productType: "PHYSICAL" }, select: { id: true, name: true, currentStock: true }, orderBy: { name: "asc" } }),
    ]);
    const soldIds = new Set(sold.map((s) => s.productId));
    return {
      sold: sold.map((s) => ({ name: s.productNameSnapshot, quantity: num(s._sum.quantity), total: num(s._sum.subtotal) })),
      neverSold: active.filter((p) => !soldIds.has(p.id)).map((p) => ({ name: p.name, stock: num(p.currentStock) })),
    };
  }

  async inventory(start: Date, end: Date): Promise<InventoryReport> {
    const [movements, opname] = await Promise.all([
      prisma.stockMovement.findMany({ where: { createdAt: { gte: start, lte: end } }, orderBy: { createdAt: "desc" }, take: 5000, include: { product: { select: { name: true } } } }),
      prisma.stockOpnameItem.findMany({
        where: { difference: { not: 0 }, stockOpname: { status: "APPROVED", approvedAt: { gte: start, lte: end } } },
        include: { product: { select: { name: true } }, stockOpname: { select: { opnameNumber: true } } },
        take: 5000,
      }),
    ]);
    return {
      movements: movements.map((m) => ({ at: m.createdAt, product: m.product.name, type: m.movementType, quantity: num(m.quantity) })),
      opname: opname.map((o) => ({ number: o.stockOpname.opnameNumber, product: o.product.name, difference: num(o.difference) })),
    };
  }

  async cashiers(start: Date, end: Date): Promise<CashierReport> {
    const [perCashier, shifts] = await Promise.all([
      prisma.sale.groupBy({ by: ["cashierId"], where: { status: "PAID", paidAt: { gte: start, lte: end } }, _sum: { grandTotal: true }, _count: { id: true }, orderBy: { _sum: { grandTotal: "desc" } } }),
      prisma.cashierShift.findMany({ where: { status: "CLOSED", closedAt: { gte: start, lte: end } }, orderBy: { closedAt: "desc" }, include: { cashier: { select: { name: true } } }, take: 1000 }),
    ]);
    const users = await prisma.user.findMany({ where: { id: { in: perCashier.map((c) => c.cashierId) } }, select: { id: true, name: true } });
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return {
      perCashier: perCashier.map((c) => ({ name: nameById.get(c.cashierId) ?? "-", transactions: c._count.id, revenue: num(c._sum.grandTotal) })),
      shifts: shifts.flatMap((s) =>
        s.closedAt ? [{ cashier: s.cashier.name, closedAt: s.closedAt, expected: num(s.expectedCash), actual: num(s.actualCash), difference: num(s.difference) }] : []
      ),
    };
  }
}
