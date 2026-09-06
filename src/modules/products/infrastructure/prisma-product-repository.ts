import type { Db } from "@/shared/infrastructure/transaction-manager";
import type {
  CreateProductInput,
  ProductRepository,
  ProductWithBarcodes,
  UpdateProductInput,
} from "../repository/product-repository";
import type { Product } from "@prisma/client";

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateProductInput): Promise<Product> {
    return this.db.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        description: input.description,
        categoryId: input.categoryId ?? undefined,
        productType: input.productType,
        baseUnit: input.baseUnit,
        purchasePrice: input.purchasePrice,
        sellingPrice: input.sellingPrice,
        minimumStock: input.minimumStock,
        trackInventory: input.trackInventory,
      },
    });
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    return this.db.product.update({ where: { id }, data: input });
  }

  async findById(id: string): Promise<ProductWithBarcodes | null> {
    return this.db.product.findUnique({
      where: { id },
      include: { barcodes: true },
    });
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.db.product.findUnique({ where: { sku } });
  }

  async list(filter: {
    categoryId?: string;
    active?: boolean;
    lowStock?: boolean;
    search?: string;
  }): Promise<ProductWithBarcodes[]> {
    const products = await this.db.product.findMany({
      where: {
        categoryId: filter.categoryId,
        active: filter.active,
        name: filter.search
          ? { contains: filter.search, mode: "insensitive" }
          : undefined,
      },
      include: { barcodes: true },
      orderBy: { name: "asc" },
    });

    if (!filter.lowStock) return products;
    return products.filter(
      (p) => Number(p.currentStock) <= p.minimumStock
    );
  }

  async incrementStock(id: string, deltaQuantity: string): Promise<void> {
    await this.db.product.update({
      where: { id },
      data: { currentStock: { increment: deltaQuantity } },
    });
  }

  async decrementStockIfAvailable(id: string, quantity: string): Promise<boolean> {
    const result = await this.db.product.updateMany({
      where: { id, currentStock: { gte: quantity } },
      data: { currentStock: { decrement: quantity } },
    });
    return result.count === 1;
  }
}
