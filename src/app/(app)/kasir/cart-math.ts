import Decimal from "decimal.js";
import { promoAmount } from "@/modules/pos/domain/promo";
import type { CartLine } from "./types";

/** Harga awal of a line: original price x quantity, before any promo. */
export const lineGross = (line: CartLine) => line.unitPrice * line.quantity;

/** Rupiah the promo takes off a line. The server recomputes this from the
 * stored price; this mirror only drives what the cashier sees. */
export function lineDiscount(line: CartLine): number {
  try {
    return promoAmount(new Decimal(lineGross(line)), line.promo).toNumber();
  } catch {
    return 0;
  }
}

/** Harga akhir of a line, after its promo. */
export const lineNet = (line: CartLine) => lineGross(line) - lineDiscount(line);

export function cartTotals(cart: CartLine[]) {
  const gross = cart.reduce((acc, l) => acc + lineGross(l), 0);
  const discount = cart.reduce((acc, l) => acc + lineDiscount(l), 0);
  return { gross, discount, net: gross - discount };
}

/** After a quantity change, a nominal promo can no longer exceed the line. */
export function clampPromo(line: CartLine): CartLine {
  if (line.promo?.type !== "NOMINAL") return line;
  const gross = lineGross(line);
  return Number(line.promo.value) > gross ? { ...line, promo: { type: "NOMINAL", value: String(gross) } } : line;
}

export function promoLabel(line: CartLine): string | null {
  if (!line.promo) return null;
  return line.promo.type === "PERCENT" ? `Promo ${Number(line.promo.value)}%` : "Promo";
}
