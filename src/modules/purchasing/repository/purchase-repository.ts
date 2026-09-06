import type { Purchase } from "@prisma/client";

export interface CreatePurchaseInput {
  purchaseNumber: string;
  supplierId: string;
  invoiceNumber?: string;
  receivedById: string;
  totalAmount: string;
  items: {
    productId: string;
    quantity: string;
    purchasePrice: string;
    subtotal: string;
  }[];
}

export interface PurchaseRepository {
  create(input: CreatePurchaseInput): Promise<Purchase>;
  listRecent(limit: number): Promise<Purchase[]>;
}
