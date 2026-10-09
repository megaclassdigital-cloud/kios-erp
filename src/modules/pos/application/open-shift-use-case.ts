import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { PrismaShiftRepository } from "../infrastructure/prisma-shift-repository";

export class ShiftAlreadyOpenError extends Error {}

export class OpenShiftUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(cashierId: string, openingCash: string) {
    return this.txManager.run(async (tx) => {
      const shifts = new PrismaShiftRepository(tx);
      const existing = await shifts.findOpenForCashier(cashierId);
      if (existing) {
        throw new ShiftAlreadyOpenError("Shift Anda sudah terbuka.");
      }
      const shift = await shifts.open(cashierId, openingCash);
      await new AuditLogger(tx).record({
        actorId: cashierId,
        action: "SHIFT_OPENED",
        entityType: "CashierShift",
        entityId: shift.id,
        afterValue: { openingCash },
      });
      return shift;
    });
  }
}
