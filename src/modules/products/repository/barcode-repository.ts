import type { BarcodeSource, ProductBarcode } from "@prisma/client";

export interface BarcodeRepository {
  findByValue(barcodeValue: string): Promise<ProductBarcode | null>;
  create(input: {
    productId: string;
    barcodeValue: string;
    barcodeType: string;
    unit: string;
    conversionFactor: string;
    source: BarcodeSource;
  }): Promise<ProductBarcode>;
  retire(id: string): Promise<ProductBarcode>;
  nextInternalSequence(): Promise<bigint>;
}
