import type { PositionInput } from "../domain/consignment";

export interface DropRecord {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  createdAt: Date;
  note: string | null;
  items: { id: string; productId: string; productName: string; quantity: string; unitCost: string; quantityReturned: string; onHand: string }[];
}

export interface PaymentRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: string;
  paidAt: Date;
  note: string | null;
}

export interface ConsignmentRepository {
  /** Everything the positions are computed from. */
  positionData(): Promise<PositionInput>;
  listDrops(limit: number): Promise<DropRecord[]>;
  listPayments(limit: number): Promise<PaymentRecord[]>;
}
