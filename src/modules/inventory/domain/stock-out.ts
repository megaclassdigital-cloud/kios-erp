import Decimal from "decimal.js";
import type { MovementType } from "@prisma/client";

export class InvalidStockOutError extends Error {}

/** Why goods left the shelf without being sold. Each maps to the ledger's own
 * movement type, so reports can tell damage from expiry from a supplier return. */
export const STOCK_OUT_REASONS = {
  RUSAK: { label: "Rusak", movementType: "DAMAGE" as MovementType, noteRequired: false },
  KEDALUWARSA: { label: "Kedaluwarsa", movementType: "EXPIRED" as MovementType, noteRequired: false },
  RETUR_SUPPLIER: { label: "Retur ke supplier", movementType: "RETURN_OUT" as MovementType, noteRequired: false },
  LAINNYA: { label: "Lainnya (pemakaian sendiri, hilang, dll.)", movementType: "ADJUSTMENT" as MovementType, noteRequired: true },
} as const;

export type StockOutReason = keyof typeof STOCK_OUT_REASONS;

export const STOCK_OUT_REFERENCE = "STOCK_OUT";

export interface StockOutInput {
  quantity: string;
  reason: StockOutReason;
  note?: string;
}

export interface PlannedStockOut {
  /** Positive: how much leaves the shelf. */
  quantity: string;
  movementType: MovementType;
  note: string;
}

/** Validates a stock-out and words its ledger note. Pure, so it is tested
 * without a database. */
export function planStockOut(input: StockOutInput): PlannedStockOut {
  const reason = STOCK_OUT_REASONS[input.reason];
  if (!reason) throw new InvalidStockOutError("Alasan pengeluaran tidak dikenal.");

  let quantity: Decimal;
  try {
    quantity = new Decimal(input.quantity);
  } catch {
    throw new InvalidStockOutError("Jumlah harus berupa angka.");
  }
  if (!quantity.isFinite() || quantity.lte(0)) throw new InvalidStockOutError("Jumlah harus lebih dari 0.");
  if (quantity.decimalPlaces() > 3) throw new InvalidStockOutError("Jumlah maksimal 3 angka di belakang koma.");

  const note = input.note?.trim() ?? "";
  if (reason.noteRequired && note === "") throw new InvalidStockOutError("Alasan lainnya wajib dijelaskan di catatan.");

  return {
    quantity: quantity.toString(),
    movementType: reason.movementType,
    note: note ? `${reason.label}: ${note}` : reason.label,
  };
}
