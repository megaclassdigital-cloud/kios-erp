import Decimal from "decimal.js";

export type PromoType = "NOMINAL" | "PERCENT";

export interface Promo {
  type: PromoType;
  /** Rupiah for NOMINAL, 0-100 for PERCENT. */
  value: string;
}

export class InvalidPromoError extends Error {}

/**
 * Rupiah taken off a line by a promo. The promo applies to the whole line
 * (quantity x original price), never to the stored price itself, so the
 * original price stays visible: "Rp10.000, promo -Rp1.000, jadi Rp9.000".
 * Rounded to whole Rupiah -- there is no such thing as half a Rupiah at the till.
 */
export function promoAmount(gross: Decimal, promo: Promo | undefined | null): Decimal {
  if (!promo) return new Decimal(0);

  let value: Decimal;
  try {
    value = new Decimal(promo.value);
  } catch {
    throw new InvalidPromoError("Nilai promo harus berupa angka.");
  }
  if (!value.isFinite() || value.lte(0)) throw new InvalidPromoError("Nilai promo harus lebih dari 0.");

  if (promo.type === "PERCENT") {
    if (value.gt(100)) throw new InvalidPromoError("Promo persen maksimal 100%.");
    return gross.times(value).div(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  }
  if (promo.type !== "NOMINAL") throw new InvalidPromoError("Jenis promo tidak dikenal.");

  const amount = value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  if (amount.gt(gross)) throw new InvalidPromoError("Promo tidak boleh lebih besar dari harga barang.");
  return amount;
}
