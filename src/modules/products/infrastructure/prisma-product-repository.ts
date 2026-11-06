import type { Db } from "@/shared/infrastructure/transaction-manager";
import type {
  CreateProductInput,
  ProductRepository,
  ProductListItem,
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
        serviceType: input.serviceType ?? undefined,
        serviceProvider: input.serviceProvider ?? undefined,
        baseUnit: input.baseUnit,
        purchasePrice: input.purchasePrice,
        sellingPrice: input.sellingPrice,
        minimumStock: input.minimumStock,
        trackInventory: input.trackInventory,
        expiryDate: input.expiryDate ?? undefined,
        expiryWarnDays: input.expiryWarnDays ?? undefined,
        isConsignment: input.isConsignment ?? false,
        consignorId: input.isConsignment ? (input.consignorId ?? null) : null,
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

  async findByIds(ids: string[]): Promise<ProductWithBarcodes[]> {
    if (ids.length === 0) return [];
    return this.db.product.findMany({
      where: { id: { in: ids } },
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
  }): Promise<ProductListItem[]> {
    const products = await this.db.product.findMany({
      where: {
        // Deleted products are gone from every list; their rows stay for history.
        deletedAt: null,
        categoryId: filter.categoryId,
        active: filter.active,
        name: filter.search
          ? { contains: filter.search, mode: "insensitive" }
          : undefined,
      },
      include: { barcodes: true, category: true },
      orderBy: { name: "asc" },
    });

    if (!filter.lowStock) return products;
    return products.filter(
      (p) => Number(p.currentStock) <= p.minimumStock
    );
  }

  /** Whether the product has ever been dropped off on consignment. */
  async hasConsignmentHistory(id: string): Promise<boolean> {
    return (await this.db.consignmentItem.count({ where: { productId: id } })) > 0;
  }

  /** Active physical products with what a picker lists. Small shop, a few
   * hundred rows: filtering happens in memory (see product-search.ts), which
   * is what allows word order and typo tolerance. */
  async listForSearch(options: { consignment?: "only" | "exclude"; consignorId?: string } = {}) {
    const rows = await this.db.product.findMany({
      where: {
        deletedAt: null,
        active: true,
        trackInventory: true,
        ...(options.consignment === "only" ? { isConsignment: true } : options.consignment === "exclude" ? { isConsignment: false } : {}),
        ...(options.consignorId ? { consignorId: options.consignorId } : {}),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        baseUnit: true,
        currentStock: true,
        sellingPrice: true,
        purchasePrice: true,
        barcodes: { where: { status: "ACTIVE" }, select: { barcodeValue: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      baseUnit: r.baseUnit,
      currentStock: r.currentStock.toString(),
      sellingPrice: r.sellingPrice.toString(),
      purchasePrice: r.purchasePrice.toString(),
      barcodes: r.barcodes.map((b) => b.barcodeValue),
    }));
  }

  /** Every live product with just what a duplicate check compares. */
  async listForDuplicateCheck() {
    const rows = await this.db.product.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, sku: true, barcodes: { where: { status: "ACTIVE" }, select: { barcodeValue: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      activeBarcodes: r.barcodes.map((b) => b.barcodeValue),
    }));
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
