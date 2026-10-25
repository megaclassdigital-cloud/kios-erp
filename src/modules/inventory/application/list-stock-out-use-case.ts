import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaInventoryRepository } from "../infrastructure/prisma-inventory-repository";

/** Pengeluaran Barang history for a period, newest first. */
export class ListStockOutUseCase {
  async execute(period: { start: Date; end: Date }) {
    return new PrismaInventoryRepository(prisma).listStockOut(period.start, period.end);
  }
}
