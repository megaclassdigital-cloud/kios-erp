import type { StockOpname } from "@prisma/client";

export interface StockOpnameLineInput {
  productId: string;
  systemQty: string;
  physicalQty: string;
  difference: string;
}

export interface StockOpnameRepository {
  create(startedById: string, opnameNumber: string): Promise<StockOpname>;
  submit(id: string, items: StockOpnameLineInput[]): Promise<StockOpname>;
  approve(id: string, approvedById: string): Promise<StockOpname>;
  findById(id: string): Promise<
    | (StockOpname & {
        items: { productId: string; systemQty: unknown; physicalQty: unknown; difference: unknown }[];
      })
    | null
  >;
}
