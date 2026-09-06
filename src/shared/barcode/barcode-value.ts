/**
 * BarcodeValue value object: normalizes and validates raw scanner input
 * before it is ever used to look up a product (PRD 12-13, 71).
 */
export class BarcodeValue {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static normalize(raw: string): BarcodeValue {
    const trimmed = raw.trim().replace(/[\r\n]/g, "");
    if (trimmed.length === 0) {
      throw new InvalidBarcodeError("Barcode tidak boleh kosong.");
    }
    if (trimmed.length > 64) {
      throw new InvalidBarcodeError("Barcode tidak valid.");
    }
    return new BarcodeValue(trimmed);
  }

  toString(): string {
    return this.value;
  }
}

export class InvalidBarcodeError extends Error {}

export const INTERNAL_BARCODE_PREFIX = "KERP";

export function formatInternalBarcode(sequence: bigint): string {
  return `${INTERNAL_BARCODE_PREFIX}${sequence.toString().padStart(12, "0")}`;
}
