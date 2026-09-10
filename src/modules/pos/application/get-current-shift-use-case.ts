import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaShiftRepository } from "../infrastructure/prisma-shift-repository";

/** Read-only lookup used both by the Kasir page's initial server render
 * (avoids a client mount -> fetch waterfall) and by the API route the
 * client calls after opening/closing a shift. */
export class GetCurrentShiftUseCase {
  async execute(cashierId: string) {
    const shifts = new PrismaShiftRepository(prisma);
    return shifts.findOpenForCashier(cashierId);
  }
}
