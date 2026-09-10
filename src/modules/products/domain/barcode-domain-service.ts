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

  /** One product, one durable barcode per unit — a second ACTIVE barcode
   * for the same product+unit would leave two live codes resolving to the
   * same line item, splitting which one actually gets scanned/tracked
   * going forward. Retiring the old one first (a deliberate, separate,
   * audited action) is the only way to replace it. */
  assertNoActiveBarcodeForUnit(existing: { barcodeValue: string } | null): void {
    if (existing) {
      throw new DuplicateActiveBarcodeError(
        `Produk ini sudah punya barcode aktif untuk unit tersebut (${existing.barcodeValue}). Retire barcode lama dahulu sebelum menambah yang baru.`
      );
    }
  }
}

export class BarcodeAlreadyLinkedError extends Error {}
export class BarcodeRetiredError extends Error {}
export class DuplicateActiveBarcodeError extends Error {}
