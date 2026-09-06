import Decimal from "decimal.js";
import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaShiftRepository } from "../infrastructure/prisma-shift-repository";

export class ShiftNotFoundError extends Error {}

/** Expected cash = opening + cash sales during the shift (PRD 53). Cash
 * expenses recorded during a shift are out of MVP scope for the deduction
 * and can be layered on without changing this contract. */
export class CloseShiftUseCase {
  async execute(shiftId: string, actualCash: string) {
    const shifts = new PrismaShiftRepository(prisma);
    const shift = await shifts.findById(shiftId);
    if (!shift || shift.status !== "OPEN") {
      throw new ShiftNotFoundError("Shift tidak ditemukan atau sudah ditutup.");
    }

    const { cash } = await shifts.sumSalesForShift(shiftId);
    const expectedCash = new Decimal(shift.openingCash.toString()).plus(cash);
    const difference = new Decimal(actualCash).minus(expectedCash);

    return shifts.close(shiftId, {
      expectedCash: expectedCash.toFixed(2),
      actualCash,
      difference: difference.toFixed(2),
    });
  }
}
