import Decimal from "decimal.js";

/**
 * Money value object. Always backed by Decimal — never a JS float — so
 * currency math never suffers binary floating point rounding error (PRD 65).
 */
export class Money {
  private readonly amount: Decimal;

  private constructor(amount: Decimal) {
    if (amount.isNegative()) {
      throw new Error("Money amount cannot be negative");
    }
    this.amount = amount;
  }

  static fromDecimal(value: Decimal | string | number): Money {
    return new Money(new Decimal(value));
  }

  static zero(): Money {
    return new Money(new Decimal(0));
  }

  add(other: Money): Money {
    return new Money(this.amount.plus(other.amount));
  }

  subtract(other: Money): Money {
    return new Money(this.amount.minus(other.amount));
  }

  multiply(factor: Decimal | string | number): Money {
    return new Money(this.amount.times(factor));
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.amount.gte(other.amount);
  }

  toDecimal(): Decimal {
    return this.amount;
  }

  toNumber(): number {
    return this.amount.toNumber();
  }

  toString(): string {
    return this.amount.toFixed(2);
  }
}
