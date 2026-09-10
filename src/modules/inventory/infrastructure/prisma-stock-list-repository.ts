import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { StockListItem, StockListRepository } from "../repository/stock-list-repository";

export class PrismaStockListRepository implements StockListRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<StockListItem[]> {
    const rows = await this.db.product.findMany({
      // PHYSICAL <-> trackInventory:true holds by construction (set only
      // at creation, never changed by the update path) — filtering at
      // the database is equivalent to the old fetch-everything-then-
      // filter-trackInventory-in-JS, minus every service product's row
      // and every field this table doesn't display.
      where: { productType: "PHYSICAL" },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        minimumStock: true,
        sellingPrice: true,
        barcodes: {
          where: { status: "ACTIVE" },
          select: { barcodeValue: true },
          take: 1,
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      primaryBarcode: row.barcodes[0]?.barcodeValue ?? null,
      currentStock: row.currentStock.toString(),
      minimumStock: row.minimumStock,
      sellingPrice: row.sellingPrice.toString(),
    }));
  }
}
