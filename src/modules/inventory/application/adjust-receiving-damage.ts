import Decimal from "decimal.js";
import type { Db } from "@/shared/infrastructure/transaction-manager";
import { RECEIVE_DAMAGE } from "../repository/inventory-repository";
import { moveStock } from "./move-stock";

/**
 * Moves the damaged count of a receiving by `damagedDelta` (new minus old):
 * a DAMAGE movement of -delta with the same reference the original damage
 * used, so the history's running damaged total (the sum of these) stays equal
 * to what was last entered. More damaged takes stock off; fewer gives it back.
 */
export async function adjustReceivingDamage(
  tx: Db,
  product: { productId: string; productName: string },
  damagedDelta: string,
  referenceId: string,
  actorId: string,
  label: string
): Promise<void> {
  const delta = new Decimal(damagedDelta);
  if (delta.isZero()) return;
  await moveStock(tx, product, delta.negated().toString(), RECEIVE_DAMAGE, referenceId, actorId, `Koreksi rusak ${label}: ${delta.isPositive() ? "+" : ""}${delta.toString()}`, "DAMAGE");
}

/** Positive stock moves first, so a correction that both gives back damaged
 * units and removes received ones is judged on its net effect, not refused
 * halfway. */
export const damagedGivesBackStock = (damagedDelta: string) => new Decimal(damagedDelta).isNegative();
