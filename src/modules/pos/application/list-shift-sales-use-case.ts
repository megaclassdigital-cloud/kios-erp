import { prisma } from "@/shared/infrastructure/prisma";
import { ForbiddenError } from "@/shared/security/permissions";
import { PrismaSaleRepository } from "../infrastructure/prisma-sale-repository";
import { PrismaShiftRepository } from "../infrastructure/prisma-shift-repository";
import { summarizeShiftSales } from "../domain/shift-sales-summary";

export class ShiftNotFoundError extends Error {}

/**
 * The sales of one shift with their lines, for the history under the till. A
 * cashier sees only their own shift (PRD 4); someone who monitors shifts
 * (owner, admin) may open any.
 */
export class ListShiftSalesUseCase {
  async execute(shiftId: string, userId: string, canMonitor: boolean) {
    const shift = await new PrismaShiftRepository(prisma).findById(shiftId);
    if (!shift) throw new ShiftNotFoundError("Shift tidak ditemukan.");
    if (shift.cashierId !== userId && !canMonitor) throw new ForbiddenError();

    const sales = await new PrismaSaleRepository(prisma).listByShift(shiftId);
    const consigned = new Set(
      (await prisma.consignmentSale.findMany({ where: { saleId: { in: sales.map((s) => s.id) } }, select: { saleItemId: true } })).map((c) => c.saleItemId)
    );
    const view = sales.map((s) => {
      return {
        id: s.id,
        transactionNumber: s.transactionNumber,
        createdAt: s.createdAt,
        paidAt: s.paidAt,
        status: s.status,
        paymentMethod: s.paymentMethod,
        subtotal: s.subtotal.toString(),
        discount: s.discount.toString(),
        grandTotal: s.grandTotal.toString(),
        cashReceived: s.cashReceived?.toString() ?? null,
        changeAmount: s.changeAmount?.toString() ?? null,
        cashier: s.cashier,
        items: s.items.map((i) => ({
          productNameSnapshot: i.productNameSnapshot,
          isConsignment: consigned.has(i.id),
          quantity: i.quantity.toString(),
          unitPriceAtSale: i.unitPriceAtSale.toString(),
          discountAmount: i.discountAmount.toString(),
          promoType: i.promoType,
          promoValue: i.promoValue?.toString() ?? null,
          subtotal: i.subtotal.toString(),
          serviceDetail: i.serviceDetail,
        })),
      };
    });
    return { sales: view, summary: summarizeShiftSales(view) };
  }
}
