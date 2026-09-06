import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaProductRepository } from "../infrastructure/prisma-product-repository";
import { PrismaBarcodeRepository } from "../infrastructure/prisma-barcode-repository";
import { BarcodeDomainService } from "../domain/barcode-domain-service";
import { BarcodeValue } from "@/shared/barcode/barcode-value";

export class BarcodeNotFoundError extends Error {}
export class ProductNotSellableError extends Error {}

/**
 * SCAN -> NORMALIZE -> FIND -> VALIDATE ACTIVE -> VALIDATE SELLABLE
 * (PRD 11). Read-only: never mutates stock — cart/stock changes only
 * happen at checkout time (PRD 15).
 */
export class ResolveBarcodeUseCase {
  async execute(rawBarcode: string) {
    const normalized = BarcodeValue.normalize(rawBarcode).toString();
    const barcodes = new PrismaBarcodeRepository(prisma);
    const products = new PrismaProductRepository(prisma);
    const domain = new BarcodeDomainService();

    const barcode = await barcodes.findByValue(normalized);
    if (!barcode) {
      throw new BarcodeNotFoundError("Barcode tidak terdaftar.");
    }
    domain.assertNotRetired(barcode.status);

    const product = await products.findById(barcode.productId);
    if (!product) {
      throw new BarcodeNotFoundError("Barcode tidak terdaftar.");
    }
    if (!product.active) {
      throw new ProductNotSellableError("Produk sedang tidak aktif.");
    }

    return {
      product,
      barcode,
    };
  }
}
