import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaPosCatalogRepository } from "../infrastructure/prisma-pos-catalog-repository";

/** Bulk read for the client-side barcode index (PRD/perf: known-product
 * scans should resolve from memory, not a network round trip). Never the
 * source of truth for checkout — that still revalidates server-side. */
export class GetPosCatalogUseCase {
  async execute() {
    const repo = new PrismaPosCatalogRepository(prisma);
    return repo.getActiveCatalog();
  }
}
