import Decimal from "decimal.js";

/** Typed by the owner before anything is deleted. Deliberately not "ya" or a
 * button click: this cannot be undone. */
export const RESET_CONFIRMATION = "HAPUS TRANSAKSI";

export class ResetNotConfirmedError extends Error {}

export function assertResetConfirmed(typed: string): void {
  if (typed.trim().toUpperCase() !== RESET_CONFIRMATION) {
    throw new ResetNotConfirmedError(`Ketik "${RESET_CONFIRMATION}" persis untuk melanjutkan.`);
  }
}

/** Net stock effect of the sales and refunds being deleted, for one product:
 * negative for goods sold, positive for goods returned. */
export interface StockEffect {
  productId: string;
  net: string;
}

/**
 * What to put back on the shelf. Deleting a simulated sale means those units
 * were never sold, so each product gets back exactly what the deleted movements
 * took out (net of refunds). Products whose sales and refunds cancel out need
 * nothing.
 */
export function stockRestorePlan(effects: StockEffect[]): { productId: string; give: string }[] {
  return effects
    .map((e) => ({ productId: e.productId, give: new Decimal(e.net).negated() }))
    .filter((e) => !e.give.isZero())
    .map((e) => ({ productId: e.productId, give: e.give.toString() }));
}
