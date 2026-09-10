import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaStockListRepository } from "../infrastructure/prisma-stock-list-repository";

export class GetStockListUseCase {
  async execute() {
    const repo = new PrismaStockListRepository(prisma);
    return repo.list();
  }
}
