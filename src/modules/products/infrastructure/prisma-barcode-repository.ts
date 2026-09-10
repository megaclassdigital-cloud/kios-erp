import type { BarcodeSource, ProductBarcode } from "@prisma/client";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import type { BarcodeRepository, ResolvedBarcode } from "../repository/barcode-repository";

const RESOLVE_PRODUCT_SELECT = {
  id: true,
  name: true,
  productType: true,
  serviceType: true,
  serviceProvider: true,
  purchasePrice: true,
  sellingPrice: true,
  currentStock: true,
  minimumStock: true,
  trackInventory: true,
  active: true,
} as const;

export class PrismaBarcodeRepository implements BarcodeRepository {
  constructor(private readonly db: Db) {}

  async findByValue(barcodeValue: string): Promise<ProductBarcode | null> {
    return this.db.productBarcode.findUnique({ where: { barcodeValue } });
  }

  async resolveBarcode(barcodeValue: string): Promise<ResolvedBarcode | null> {
    const row = await this.db.productBarcode.findUnique({
      where: { barcodeValue },
      select: {
        id: true,
        barcodeValue: true,
        barcodeType: true,
        status: true,
        productId: true,
        product: { select: RESOLVE_PRODUCT_SELECT },
      },
    });
    if (!row) return null;
    return {
      ...row,
      product: row.product
        ? {
            ...row.product,
            purchasePrice: row.product.purchasePrice.toString(),
            sellingPrice: row.product.sellingPrice.toString(),
            currentStock: row.product.currentStock.toString(),
          }
        : null,
    };
  }

  async create(input: {
    productId: string;
    barcodeValue: string;
    barcodeType: string;
    unit: string;
    conversionFactor: string;
    source: BarcodeSource;
  }): Promise<ProductBarcode> {
    return this.db.productBarcode.create({ data: input });
  }

  async retire(id: string): Promise<ProductBarcode> {
    return this.db.productBarcode.update({
      where: { id },
      data: { status: "RETIRED", retiredAt: new Date() },
    });
  }

  /**
   * Atomic counter via a single-row upsert+increment (Postgres executes the
   * UPDATE...RETURNING atomically), avoiding the SELECT MAX()+1 race the PRD
   * explicitly forbids (section 35).
   */
  async nextInternalSequence(): Promise<bigint> {
    const row = await this.db.barcodeSequence.upsert({
      where: { id: 1 },
      create: { id: 1, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    return row.lastValue;
  }
}
