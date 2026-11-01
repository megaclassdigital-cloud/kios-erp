import Decimal from "decimal.js";

export interface ShiftSaleLike {
  status: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  paymentMethod: "CASH" | "CASHLESS";
  grandTotal: string;
  items: { quantity: string }[];
}

export interface ShiftSalesSummary {
  /** Paid sales: the ones that count as the shift's takings. */
  paidCount: number;
  paidTotal: string;
  cashTotal: string;
  cashlessTotal: string;
  /** Units sold across paid sales. */
  unitsSold: string;
  /** Waiting for a cashless payment, refunded or cancelled: listed, not counted. */
  otherCount: number;
}

/** The shift's takings, from the sales on screen. Only paid sales are money in the till. */
export function summarizeShiftSales(sales: ShiftSaleLike[]): ShiftSalesSummary {
  let paidTotal = new Decimal(0);
  let cash = new Decimal(0);
  let cashless = new Decimal(0);
  let units = new Decimal(0);
  let paidCount = 0;
  for (const s of sales) {
    if (s.status !== "PAID") continue;
    paidCount += 1;
    const total = new Decimal(s.grandTotal);
    paidTotal = paidTotal.plus(total);
    if (s.paymentMethod === "CASH") cash = cash.plus(total);
    else cashless = cashless.plus(total);
    for (const i of s.items) units = units.plus(i.quantity);
  }
  return {
    paidCount,
    paidTotal: paidTotal.toFixed(2),
    cashTotal: cash.toFixed(2),
    cashlessTotal: cashless.toFixed(2),
    unitsSold: units.toString(),
    otherCount: sales.length - paidCount,
  };
}
