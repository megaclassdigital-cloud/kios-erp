import Decimal from "decimal.js";

export interface ReceivedLine {
  quantity: string;
  purchasePrice: string;
}

export interface LineChange {
  quantity?: string;
  purchasePrice?: string;
}

export interface PlannedCorrection {
  quantity: string;
  purchasePrice: string;
  subtotal: string;
  /** Change to the product's stock: new quantity minus the quantity that was
   * received. Positive adds stock, negative takes it back. */
  stockDelta: string;
}

export class InvalidCorrectionError extends Error {}

/** `new Decimal("abc")` throws its own error type; a typo in a field should
 * read as a plain message, not as a library error. */
function toDecimal(value: string, label: string): Decimal {
  try {
    return new Decimal(value);
  } catch {
    throw new InvalidCorrectionError(`${label} harus berupa angka.`);
  }
}

/**
 * What correcting one received line means, as numbers.
 *
 * Receiving 5 and then correcting it to 6 must leave the shelf exactly as if
 * 6 had been received: stock +1, subtotal 6 x price. Deleting is the same rule
 * with a new quantity of zero (see deletionDelta). Kept pure so the arithmetic
 * is tested without a database.
 */
export function planCorrection(current: ReceivedLine, change: LineChange): PlannedCorrection {
  const quantity = toDecimal(change.quantity ?? current.quantity, "Jumlah");
  const price = toDecimal(change.purchasePrice ?? current.purchasePrice, "Harga beli");

  if (!quantity.isFinite() || quantity.lte(0)) {
    throw new InvalidCorrectionError("Jumlah harus lebih dari 0. Untuk membatalkan, hapus barisnya.");
  }
  if (quantity.decimalPlaces() > 3) {
    throw new InvalidCorrectionError("Jumlah maksimal 3 angka di belakang koma.");
  }
  if (!price.isFinite() || price.lt(0)) {
    throw new InvalidCorrectionError("Harga beli tidak boleh negatif.");
  }
  if (price.decimalPlaces() > 2) {
    throw new InvalidCorrectionError("Harga beli maksimal 2 angka di belakang koma.");
  }

  return {
    quantity: quantity.toString(),
    purchasePrice: price.toFixed(2),
    subtotal: quantity.times(price).toFixed(2),
    stockDelta: quantity.minus(current.quantity).toString(),
  };
}

/** Deleting a received line takes back everything it added. */
export function deletionDelta(current: ReceivedLine): string {
  return new Decimal(current.quantity).negated().toString();
}

/** Sum of the line subtotals left on a receipt. */
export function receiptTotal(subtotals: string[]): string {
  return subtotals.reduce((sum, s) => sum.plus(s), new Decimal(0)).toFixed(2);
}
