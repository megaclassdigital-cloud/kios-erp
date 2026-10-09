import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaProductActivityRepository } from "../infrastructure/prisma-product-activity-repository";
import type { ProductActivity, ProductActivityRepository } from "../repository/product-activity-repository";

export class GetProductActivityUseCase {
  constructor(private readonly activity: ProductActivityRepository = new PrismaProductActivityRepository(prisma)) {}

  /** Keyed by product id; a product with no history is simply absent. */
  execute(productIds: string[]): Promise<Map<string, ProductActivity>> {
    return this.activity.latestFor(productIds);
  }
}
