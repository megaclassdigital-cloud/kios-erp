/** Plain data the report sheets are made from. Money is a number here only because it is going into a spreadsheet cell. */
export interface ReportPeriod {
  label: string;
  start: Date;
  end: Date;
}

export interface ReportContext {
  period: ReportPeriod;
  printedBy: string;
  printedAt: Date;
}

export interface TransactionLine {
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface TransactionRecord {
  number: string;
  at: Date;
  cashier: string;
  method: "CASH" | "CASHLESS";
  status: "PAID" | "PENDING" | "CANCELLED" | "REFUNDED";
  items: TransactionLine[];
}

export interface FinanceReport {
  transactions: number;
  revenue: number;
  cogs: number;
  expense: number;
  cash: number;
  cashless: number;
  products: { name: string; quantity: number; revenue: number; cogs: number }[];
  expenses: { date: Date; category: string; description: string; amount: number }[];
}

export interface ProductReport {
  sold: { name: string; quantity: number; total: number }[];
  neverSold: { name: string; stock: number }[];
}

export interface InventoryReport {
  movements: { at: Date; product: string; type: string; quantity: number }[];
  opname: { number: string; product: string; difference: number }[];
}

export interface CashierReport {
  perCashier: { name: string; transactions: number; revenue: number }[];
  shifts: { cashier: string; closedAt: Date; expected: number; actual: number; difference: number }[];
}
