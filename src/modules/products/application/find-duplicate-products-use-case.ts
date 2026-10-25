import { prisma } from "@/shared/infrastructure/prisma";
import { findDuplicateGroups } from "../domain/duplicate-groups";

/** Read-only scan of Master Produk for items that were entered twice. */
export class FindDuplicateProductsUseCase {
  async execute() {
    const rows = await prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        createdAt: true,
        barcodes: { where: { status: "ACTIVE" }, select: { barcodeValue: true } },
        _count: { select: { saleItems: true, purchaseItems: true } },
      },
    });
    const groups = findDuplicateGroups(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        activeBarcodes: r.barcodes.map((b) => b.barcodeValue),
        stock: r.currentStock.toString(),
        createdAt: r.createdAt,
        saleLines: r._count.saleItems,
        receivingLines: r._count.purchaseItems,
      }))
    );
    return { scanned: rows.length, groups };
  }
}
