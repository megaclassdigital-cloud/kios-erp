import Decimal from "decimal.js";
import { parseDamaged } from "@/modules/inventory/domain/receiving-damage";

export interface ReceivedLine {
  quantity: string;
  purchasePrice: string;
  /** Damaged units already taken off stock with this line (default 0). They
   * stay put when the line is corrected, and are not given back on delete. */
  damagedQuantity?: string;
}

export interface LineChange {
  quantity?: string;
  purchasePrice?: string;
  /** New damaged count. "" means none; undefined leaves it as it is. */
  damagedQuantity?: string;
}

export interface PlannedCorrection {
  quantity: string;
  purchasePrice: string;
  subtotal: string;
  /** Change to the product's stock: new quantity minus the quantity that was
   * received. Positive adds stock, negative takes it back. */
  stockDelta: string;
  /** Damaged units after the correction. */
  damagedQuantity: string;
  /** Change to the damaged count (new minus old). Positive takes more stock
   * off, negative gives it back. The shelf moves by stockDelta - damagedDelta
   * overall; the two are recorded as separate movements. */
  damagedDelta: string;
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
  let damaged: Decimal;
  try {
    damaged = parseDamaged(quantity.toString(), change.damagedQuantity ?? current.damagedQuantity);
  } catch (error) {
    throw new InvalidCorrectionError(error instanceof Error ? error.message : "Barang rusak tidak valid.");
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
    damagedQuantity: damaged.toString(),
    damagedDelta: damaged.minus(current.damagedQuantity ?? 0).toString(),
  };
}

/** Deleting a received line takes back everything it added to stock -- the
 * usable part only, since the damaged units were never on the shelf. */
export function deletionDelta(current: ReceivedLine): string {
  return new Decimal(current.quantity).minus(current.damagedQuantity ?? 0).negated().toString();
}

/** Sum of the line subtotals left on a receipt. */
export function receiptTotal(subtotals: string[]): string {
  return subtotals.reduce((sum, s) => sum.plus(s), new Decimal(0)).toFixed(2);
}
