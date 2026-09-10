import { prisma } from "@/shared/infrastructure/prisma";
import { PrismaBarcodeRepository } from "../infrastructure/prisma-barcode-repository";
import { BarcodeDomainService } from "../domain/barcode-domain-service";
import { BarcodeValue } from "@/shared/barcode/barcode-value";

export class BarcodeNotFoundError extends Error {}
export class ProductNotSellableError extends Error {}

/**
 * SCAN -> NORMALIZE -> FIND -> VALIDATE ACTIVE -> VALIDATE SELLABLE
 * (PRD 11). Read-only: never mutates stock — cart/stock changes only
 * happen at checkout time (PRD 15). One joined query (barcode + product)
 * instead of two sequential round trips — same result semantics either
 * way, including which error fires for a retired vs. never-existed code.
 */
export class ResolveBarcodeUseCase {
  async execute(rawBarcode: string) {
    const normalized = BarcodeValue.normalize(rawBarcode).toString();
    const barcodes = new PrismaBarcodeRepository(prisma);
    const domain = new BarcodeDomainService();

    const resolved = await barcodes.resolveBarcode(normalized);
    if (!resolved || !resolved.product) {
      throw new BarcodeNotFoundError("Barcode tidak terdaftar.");
    }
    domain.assertNotRetired(resolved.status);

    if (!resolved.product.active) {
      throw new ProductNotSellableError("Produk sedang tidak aktif.");
    }

    return {
      product: resolved.product,
      barcode: {
        id: resolved.id,
        barcodeValue: resolved.barcodeValue,
        barcodeType: resolved.barcodeType,
        status: resolved.status,
        productId: resolved.productId,
      },
    };
  }
}
