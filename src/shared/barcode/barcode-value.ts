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

// "20" is within GS1's 20-29 restricted-circulation prefix range, reserved
// for internal/in-store use and never allocated to real manufacturer
// barcodes — a recognized convention for an internally-minted code.
// The whole value is kept short and all-numeric (10 digits total) so
// jsbarcode's CODE128 renderer can use its numeric "subset C" mode (two
// digits per symbol instead of one character per symbol), roughly halving
// the physical width versus a mixed letter/digit code — the difference
// between a barcode that fits a small thermal label at a scannable module
// width and one that doesn't (PRD 71: printed barcodes must actually scan).
export const INTERNAL_BARCODE_PREFIX = "20";

export function formatInternalBarcode(sequence: bigint): string {
  return `${INTERNAL_BARCODE_PREFIX}${sequence.toString().padStart(8, "0")}`;
}

/** EAN13 requires exactly 13 digits with a valid check digit — most
 * real-world manufacturer barcodes (UPC-A, Code128, non-standard local
 * codes) don't qualify. Rendering those as EAN13 makes jsbarcode throw;
 * detecting the real symbology up front lets the label render as CODE128
 * instead, which can encode any value (PRD 71: barcode lookup/printing
 * must not silently fail just because the input isn't EAN13-shaped). */
export function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  const digits = value.split("").map(Number);
  const checkDigit = digits[12];
  const sum = digits
    .slice(0, 12)
    .reduce((acc, digit, i) => acc + digit * (i % 2 === 0 ? 1 : 3), 0);
  const computed = (10 - (sum % 10)) % 10;
  return computed === checkDigit;
}
