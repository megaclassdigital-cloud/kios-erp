import type { CashierShift } from "@prisma/client";

export interface ShiftRepository {
  findOpenForCashier(cashierId: string): Promise<CashierShift | null>;
  open(cashierId: string, openingCash: string): Promise<CashierShift>;
  close(
    id: string,
    input: { expectedCash: string; actualCash: string; difference: string }
  ): Promise<CashierShift>;
  findById(id: string): Promise<CashierShift | null>;
  sumSalesForShift(id: string): Promise<{ cash: string; cashless: string }>;
}
