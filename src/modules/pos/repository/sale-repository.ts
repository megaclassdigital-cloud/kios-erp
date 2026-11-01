import type { PaymentMethod, Sale, SaleItem, SaleStatus, ServiceSaleDetail, ServiceType } from "@prisma/client";

/** A sale with its lines and who rang it up. */
export type SaleWithLines = Sale & { items: (SaleItem & { serviceDetail: ServiceSaleDetail | null })[]; cashier: { name: string } };

export interface CreateSaleItemServiceDetail {
  serviceType: ServiceType;
  provider?: string | null;
  phoneNumber?: string;
  meterNumber?: string;
  customerNumber?: string;
  nominal: string;
}

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
    promoType?: string;
    promoValue?: string;
    discountAmount?: string;
    serviceDetail?: CreateSaleItemServiceDetail;
  }[];
}

export interface SaleRepository {
  create(input: CreateSaleInput): Promise<Sale>;
  markPaid(id: string): Promise<Sale>;
  findById(id: string): Promise<Sale | null>;
  /** Every sale of one shift, newest first, with its lines (the shift's own history). */
  listByShift(shiftId: string): Promise<SaleWithLines[]>;
  /** cashierId scopes results to one cashier's own shifts (PRD 4: kasir may
   * only see their own transactions). Omit it for the owner/admin/monitoring
   * view, which sees every cashier. */
  listRecent(limit: number, cashierId?: string): Promise<Sale[]>;
}
