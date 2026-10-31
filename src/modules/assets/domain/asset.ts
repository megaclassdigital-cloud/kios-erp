import Decimal from "decimal.js";
import type { AssetCondition } from "@prisma/client";

export class InvalidAssetError extends Error {}

export const CONDITION_LABEL: Record<AssetCondition, string> = {
  BAIK: "Baik",
  PERLU_PERBAIKAN: "Perlu perbaikan",
  RUSAK: "Rusak",
  DIJUAL: "Sudah dijual",
  HILANG: "Hilang",
};

export interface AssetInput {
  name: string;
  category: string;
  quantity: number | string;
  purchasePrice: string;
  purchaseDate: string;
  condition: AssetCondition;
  note?: string;
}

export interface CleanAsset {
  name: string;
  category: string;
  quantity: number;
  purchasePrice: string;
  purchaseDate: Date;
  condition: AssetCondition;
  note: string | null;
}

/** Validates and tidies what was typed. Kept pure so every rule is tested. */
export function cleanAsset(input: AssetInput, now = new Date()): CleanAsset {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) throw new InvalidAssetError("Nama aset wajib diisi.");
  // That the category exists is checked against the saved list by the use case.
  const category = input.category.trim();
  if (!category) throw new InvalidAssetError("Pilih kategori aset dari daftar.");

  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) throw new InvalidAssetError("Jumlah harus bilangan bulat, minimal 1.");

  let price: Decimal;
  try {
    price = new Decimal(input.purchasePrice);
  } catch {
    throw new InvalidAssetError("Harga beli harus berupa angka.");
  }
  if (!price.isFinite() || price.lt(0)) throw new InvalidAssetError("Harga beli tidak boleh negatif.");
  if (price.decimalPlaces() > 2) throw new InvalidAssetError("Harga beli maksimal 2 angka di belakang koma.");

  const date = new Date(input.purchaseDate);
  if (Number.isNaN(date.getTime())) throw new InvalidAssetError("Tanggal beli tidak valid.");
  if (date.getTime() > now.getTime() + 24 * 60 * 60 * 1000) throw new InvalidAssetError("Tanggal beli tidak boleh di masa depan.");

  return {
    name,
    category,
    quantity,
    purchasePrice: price.toFixed(2),
    purchaseDate: date,
    condition: input.condition,
    note: input.note?.trim() || null,
  };
}

export interface AssetRow {
  category: string;
  condition: AssetCondition;
  quantity: number;
  purchasePrice: string;
}

export interface AssetSummary {
  totalUnits: number;
  /** Sum of quantity x purchase price (acquisition value, no depreciation). */
  totalValue: string;
  byCategory: { category: string; units: number; value: string }[];
  byCondition: { condition: AssetCondition; units: number }[];
  /** Units that need attention: rusak or perlu perbaikan. */
  needsAttentionUnits: number;
}

export const assetValue = (a: Pick<AssetRow, "quantity" | "purchasePrice">) => new Decimal(a.purchasePrice).times(a.quantity);

/**
 * The recap. Assets that were sold or lost are not part of what the shop owns
 * any more, so they stay in the list (history) but not in the totals.
 */
export function summarizeAssets(rows: AssetRow[]): AssetSummary {
  const owned = rows.filter((r) => r.condition !== "DIJUAL" && r.condition !== "HILANG");

  let totalValue = new Decimal(0);
  const cat = new Map<string, { units: number; value: Decimal }>();
  for (const r of owned) {
    const value = assetValue(r);
    totalValue = totalValue.plus(value);
    const c = cat.get(r.category) ?? { units: 0, value: new Decimal(0) };
    cat.set(r.category, { units: c.units + r.quantity, value: c.value.plus(value) });
  }

  const cond = new Map<AssetCondition, number>();
  for (const r of rows) cond.set(r.condition, (cond.get(r.condition) ?? 0) + r.quantity);

  return {
    totalUnits: owned.reduce((n, r) => n + r.quantity, 0),
    totalValue: totalValue.toFixed(2),
    byCategory: [...cat.entries()]
      .map(([category, v]) => ({ category, units: v.units, value: v.value.toFixed(2) }))
      .sort((a, b) => Number(b.value) - Number(a.value)),
    byCondition: [...cond.entries()].map(([condition, units]) => ({ condition, units })),
    needsAttentionUnits: (cond.get("RUSAK") ?? 0) + (cond.get("PERLU_PERBAIKAN") ?? 0),
  };
}

/** A category name as typed: tidy spacing, never empty, short enough to read in a table. */
export function cleanCategoryName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) throw new InvalidAssetError("Nama kategori wajib diisi.");
  if (name.length > 40) throw new InvalidAssetError("Nama kategori maksimal 40 huruf.");
  return name;
}
