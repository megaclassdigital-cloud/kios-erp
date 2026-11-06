export interface ProductPositionView {
  productId: string;
  name: string;
  received: string;
  returned: string;
  sold: string;
  onHand: string;
  owed: string;
  sellingPrice: string;
  unitCost: string;
  revenue: string;
  margin: string;
}

export interface ConsignorView {
  consignorId: string;
  name: string;
  receivedUnits: string;
  returnedUnits: string;
  soldUnits: string;
  onHandUnits: string;
  soldCost: string;
  revenue: string;
  margin: string;
  paid: string;
  balance: string;
  products: ProductPositionView[];
}

export interface DropView {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  createdAt: string;
  note: string | null;
  items: { id: string; productId: string; productName: string; quantity: string; unitCost: string; quantityReturned: string; onHand: string }[];
}

export interface PaymentView {
  id: string;
  supplierName: string;
  amount: string;
  paidAt: string;
  note: string | null;
}

export interface Overview {
  consignors: ConsignorView[];
  drops: DropView[];
  payments: PaymentView[];
  suppliers: { id: string; name: string }[];
}

export const rupiah = (v: string | number) => `Rp${Math.round(Number(v)).toLocaleString("id-ID")}`;
export const qty = (v: string | number) => Number(v).toLocaleString("id-ID", { maximumFractionDigits: 3 });

export async function send(url: string, method: string, body?: unknown): Promise<{ error: string | null; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { error: null, data };
    return { error: data?.error ?? `Server tidak merespons dengan benar (${res.status}). Muat ulang halaman lalu coba lagi.`, data };
  } catch {
    return { error: "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.", data: {} };
  }
}
