import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaShiftRepository } from "../infrastructure/prisma-shift-repository";

export class ShiftAlreadyOpenError extends Error {}

export class OpenShiftUseCase {
  async execute(cashierId: string, openingCash: string) {
    const shifts = new PrismaShiftRepository(prisma);
    const existing = await shifts.findOpenForCashier(cashierId);
    if (existing) {
      throw new ShiftAlreadyOpenError("Shift Anda sudah terbuka.");
    }
    return shifts.open(cashierId, openingCash);
  }
}
