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
  location: string | null;
  note: string | null;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  /** Who made the last change, when it was not the creator. */
  updatedByName: string | null;
}

export interface AssetRepository {
  list(): Promise<AssetRecord[]>;
  findById(id: string): Promise<AssetRecord | null>;
  create(data: CleanAsset, actorId: string): Promise<AssetRecord>;
  update(id: string, data: CleanAsset, actorId: string): Promise<AssetRecord>;
  /** Stamps deletedAt; the row stays for history. */
  softDelete(id: string, actorId: string): Promise<void>;
}
