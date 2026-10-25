import Decimal from "decimal.js";

export class InvalidDamageError extends Error {}

/**
 * Damaged units that arrived with a delivery (or with the initial stock of a
 * new product). They were counted in, but they are not sellable, so they come
 * straight back off: 45 received with 5 damaged leaves 40 on the shelf, and the
 * history keeps both numbers.
 *
 * Returns the damaged quantity as a Decimal (0 when none was entered).
 */
export function parseDamaged(received: string, damaged: string | undefined | null): Decimal {
  if (damaged === undefined || damaged === null || damaged.trim() === "") return new Decimal(0);
  let value: Decimal;
  try {
    value = new Decimal(damaged);
  } catch {
    throw new InvalidDamageError("Jumlah barang rusak harus berupa angka.");
  }
  if (!value.isFinite() || value.lt(0)) throw new InvalidDamageError("Jumlah barang rusak tidak boleh negatif.");
  if (value.decimalPlaces() > 3) throw new InvalidDamageError("Jumlah barang rusak maksimal 3 angka di belakang koma.");
  if (value.gt(received)) {
    throw new InvalidDamageError(`Barang rusak (${value}) tidak boleh lebih banyak dari jumlah yang diterima (${received}).`);
  }
  return value;
}

/** What actually lands on the shelf: received minus damaged. */
export function usableQuantity(received: string, damaged: string): string {
  return new Decimal(received).minus(damaged).toString();
}
