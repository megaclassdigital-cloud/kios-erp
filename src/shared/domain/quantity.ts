import Decimal from "decimal.js";

/** Quantity value object for stock/cart amounts. Signed use is intentional
 * for StockMovement deltas; call assertPositive() where a strictly positive
 * quantity is required (cart lines, receiving lines). */
export class Quantity {
  private readonly value: Decimal;

  private constructor(value: Decimal) {
    this.value = value;
  }

  static of(value: Decimal | string | number): Quantity {
    return new Quantity(new Decimal(value));
  }

  assertPositive(): Quantity {
    if (this.value.lte(0)) {
      throw new Error("Quantity must be greater than zero");
    }
    return this;
  }

  add(other: Quantity): Quantity {
    return new Quantity(this.value.plus(other.value));
  }

  subtract(other: Quantity): Quantity {
    return new Quantity(this.value.minus(other.value));
  }

  negate(): Quantity {
    return new Quantity(this.value.negated());
  }

  isGreaterThanOrEqual(other: Quantity): boolean {
    return this.value.gte(other.value);
  }

  toDecimal(): Decimal {
    return this.value;
  }

  toNumber(): number {
    return this.value.toNumber();
  }
}
