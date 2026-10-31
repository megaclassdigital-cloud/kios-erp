import type { AssetCondition } from "@prisma/client";
import type { CleanAsset } from "../domain/asset";

export interface AssetRecord {
  id: string;
  name: string;
  category: string;
  quantity: number;
  purchasePrice: string;
  purchaseDate: Date;
  condition: AssetCondition;
  note: string | null;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  /** Who made the last change, when it was not the creator. */
  updatedByName: string | null;
}

export interface AssetCategoryRecord {
  id: string;
  name: string;
  /** Assets (not deleted) using this category. */
  assetCount: number;
}

export interface AssetRepository {
  listCategories(): Promise<AssetCategoryRecord[]>;
  categoryExists(name: string): Promise<boolean>;
  findCategory(id: string): Promise<AssetCategoryRecord | null>;
  createCategory(name: string): Promise<AssetCategoryRecord>;
  /** Renames the category and every asset that uses it, together. */
  renameCategory(id: string, newName: string): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  list(): Promise<AssetRecord[]>;
  findById(id: string): Promise<AssetRecord | null>;
  create(data: CleanAsset, actorId: string): Promise<AssetRecord>;
  update(id: string, data: CleanAsset, actorId: string): Promise<AssetRecord>;
  /** Stamps deletedAt; the row stays for history. */
  softDelete(id: string, actorId: string): Promise<void>;
}
