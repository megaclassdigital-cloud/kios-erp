import Decimal from "decimal.js";
import { TransactionManager } from "@/shared/infrastructure/transaction-manager";
import { AuditLogger } from "@/shared/infrastructure/audit-logger";
import { PrismaShiftRepository } from "../infrastructure/prisma-shift-repository";

export class ShiftNotFoundError extends Error {}

/** Expected cash = opening + cash sales during the shift (PRD 53). Cash
 * expenses recorded during a shift are out of MVP scope for the deduction
 * and can be layered on without changing this contract. */
export class CloseShiftUseCase {
  constructor(private readonly txManager = new TransactionManager()) {}

  async execute(shiftId: string, actualCash: string, actorId: string) {
    return this.txManager.run(async (tx) => {
      const shifts = new PrismaShiftRepository(tx);
      const shift = await shifts.findById(shiftId);
      if (!shift || shift.status !== "OPEN") {
        throw new ShiftNotFoundError("Shift tidak ditemukan atau sudah ditutup.");
      }

      const { cash } = await shifts.sumSalesForShift(shiftId);
      const expectedCash = new Decimal(shift.openingCash.toString()).plus(cash);
      const difference = new Decimal(actualCash).minus(expectedCash);

      const closed = await shifts.close(shiftId, {
        expectedCash: expectedCash.toFixed(2),
        actualCash,
        difference: difference.toFixed(2),
      });
      // A cash difference is exactly what an owner wants a trace of.
      await new AuditLogger(tx).record({
        actorId,
        action: "SHIFT_CLOSED",
        entityType: "CashierShift",
        entityId: shiftId,
        afterValue: { expectedCash: expectedCash.toFixed(2), actualCash, difference: difference.toFixed(2) },
      });
      return closed;
    });
  }
}
