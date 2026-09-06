import type { PaymentMethod, Sale, SaleStatus } from "@prisma/client";

export interface CreateSaleInput {
  transactionNumber: string;
  cashierId: string;
  shiftId: string;
  paymentMethod: PaymentMethod;
  subtotal: string;
  discount: string;
  grandTotal: string;
  cashReceived?: string;
  changeAmount?: string;
  status: SaleStatus;
  items: {
    productId: string;
    productNameSnapshot: string;
    quantity: string;
    unitPriceAtSale: string;
    costPriceAtSale: string;
    subtotal: string;
  }[];
}

export interface SaleRepository {
  create(input: CreateSaleInput): Promise<Sale>;
  markPaid(id: string): Promise<Sale>;
  findById(id: string): Promise<Sale | null>;
  /** cashierId scopes results to one cashier's own shifts (PRD 4: kasir may
   * only see their own transactions). Omit it for the owner/admin/monitoring
   * view, which sees every cashier. */
  listRecent(limit: number, cashierId?: string): Promise<Sale[]>;
}
