import Decimal from "decimal.js";
import { Money } from "@/shared/domain/money";

export interface CartLine {
  productId: string;
  productName: string;
  quantity: Decimal;
  unitPrice: Decimal;
  costPrice: Decimal;
  trackInventory: boolean;
}

export interface CheckoutTotals {
  subtotal: Money;
  discount: Money;
  grandTotal: Money;
}

/** Pure cart math — no persistence, no framework (PRD 62). */
export class CheckoutDomainService {
  computeTotals(lines: CartLine[], discount: Decimal = new Decimal(0)): CheckoutTotals {
    const subtotal = lines.reduce(
      (acc, line) => acc.add(Money.fromDecimal(line.unitPrice).multiply(line.quantity)),
      Money.zero()
    );
    const discountMoney = Money.fromDecimal(discount);
    const grandTotal = subtotal.subtract(discountMoney);
    return { subtotal, discount: discountMoney, grandTotal };
  }

  computeChange(cashReceived: Decimal, grandTotal: Money): Money {
    const received = Money.fromDecimal(cashReceived);
    if (!received.isGreaterThanOrEqual(grandTotal)) {
      throw new InsufficientCashError("Uang diterima tidak mencukupi.");
    }
    return received.subtract(grandTotal);
  }
}

export class InsufficientCashError extends Error {}
export class InsufficientStockError extends Error {}
export class EmptyCartError extends Error {}
export class ShiftNotOpenError extends Error {}
