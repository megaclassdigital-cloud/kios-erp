export interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  trackInventory: boolean;
}

export interface OpenShift {
  id: string;
  openingCash: string;
  openedAt: string;
}
