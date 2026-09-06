import type { CashierShift } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { ShiftRepository } from "../repository/shift-repository";

export class PrismaShiftRepository implements ShiftRepository {
  constructor(private readonly db: Db) {}

  async findOpenForCashier(cashierId: string): Promise<CashierShift | null> {
    return this.db.cashierShift.findFirst({
      where: { cashierId, status: "OPEN" },
    });
  }

  async open(cashierId: string, openingCash: string): Promise<CashierShift> {
    return this.db.cashierShift.create({
      data: { cashierId, openingCash, status: "OPEN" },
    });
  }

  async close(
    id: string,
    input: { expectedCash: string; actualCash: string; difference: string }
  ): Promise<CashierShift> {
    return this.db.cashierShift.update({
      where: { id },
      data: {
        status: "CLOSED",
        expectedCash: input.expectedCash,
        actualCash: input.actualCash,
        difference: input.difference,
        closedAt: new Date(),
      },
    });
  }

  async findById(id: string): Promise<CashierShift | null> {
    return this.db.cashierShift.findUnique({ where: { id } });
  }

  async sumSalesForShift(id: string): Promise<{ cash: string; cashless: string }> {
    const sales = await this.db.sale.findMany({
      where: { shiftId: id, status: "PAID" },
      select: { paymentMethod: true, grandTotal: true },
    });
    let cash = 0;
    let cashless = 0;
    for (const sale of sales) {
      const amount = Number(sale.grandTotal);
      if (sale.paymentMethod === "CASH") cash += amount;
      else cashless += amount;
    }
    return { cash: cash.toFixed(2), cashless: cashless.toFixed(2) };
  }
}
