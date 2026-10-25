export interface ServiceDetailInput {
  phoneNumber?: string;
  meterNumber?: string;
  customerNumber?: string;
}

export interface CartLine {
  lineId: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  trackInventory: boolean;
  productType: "PHYSICAL" | "SERVICE";
  serviceType?: "PULSA" | "TOKEN_LISTRIK" | null;
  serviceProvider?: string | null;
  serviceDetail?: ServiceDetailInput;
  /** Promo the cashier gave on this line. `unitPrice` stays the original. */
  promo?: { type: "NOMINAL" | "PERCENT"; value: string };
}

export interface OpenShift {
  id: string;
  openingCash: string;
  openedAt: string;
}
