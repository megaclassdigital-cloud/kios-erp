import { formatInternalBarcode } from "@/shared/barcode/barcode-value";

/** Pure domain logic for barcode lifecycle rules (PRD 34-36). No framework,
 * no Prisma import here — only the sequence number crosses the boundary. */
export class BarcodeDomainService {
  formatInternalBarcode(sequence: bigint): string {
    return formatInternalBarcode(sequence);
  }

  assertCanAttach(existingProductId: string | null, targetProductId: string): void {
    if (existingProductId && existingProductId !== targetProductId) {
      throw new BarcodeAlreadyLinkedError(
        "Barcode sudah terhubung dengan produk lain."
      );
    }
  }

  assertNotRetired(status: "ACTIVE" | "RETIRED"): void {
    if (status === "RETIRED") {
      throw new BarcodeRetiredError(
        "Barcode ini sudah tidak aktif dan tidak dapat digunakan kembali."
      );
    }
  }
}

export class BarcodeAlreadyLinkedError extends Error {}
export class BarcodeRetiredError extends Error {}
