import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { PosCatalogItem, PosCatalogRepository } from "../repository/pos-catalog-repository";

export class PrismaPosCatalogRepository implements PosCatalogRepository {
  constructor(private readonly db: Db) {}

  async getActiveCatalog(): Promise<PosCatalogItem[]> {
    const rows = await this.db.productBarcode.findMany({
      where: { status: "ACTIVE", product: { active: true } },
      select: {
        barcodeValue: true,
        product: {
          select: {
            id: true,
            name: true,
            sellingPrice: true,
            currentStock: true,
            minimumStock: true,
            productType: true,
            serviceType: true,
            serviceProvider: true,
            trackInventory: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      barcode: row.barcodeValue,
      productId: row.product.id,
      name: row.product.name,
      sellingPrice: row.product.sellingPrice.toString(),
      currentStock: row.product.currentStock.toString(),
      minimumStock: row.product.minimumStock,
      productType: row.product.productType,
      serviceType: row.product.serviceType,
      serviceProvider: row.product.serviceProvider,
      trackInventory: row.product.trackInventory,
    }));
  }
}
