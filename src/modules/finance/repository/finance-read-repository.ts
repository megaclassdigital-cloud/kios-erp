/** Small aggregate object, not arrays of rows — the database does the
 * SUM/GROUP BY, the application never pulls thousands of sale items into
 * Node just to add them up. All fields are decimal strings (never float). */
export interface FinancialAggregate {
  revenue: string;
  cogs: string;
  cash: string;
  cashless: string;
  expense: string;
}

/** One product's share of the period's sales, from the stored price/cost snapshots. */
export interface ProductBreakdownRow {
  name: string;
  quantity: string;
  revenue: string;
  cogs: string;
}

/** Takings of a period or a shift, from the same snapshots as the finance page. */
export interface SalesTotals {
  revenue: string;
  cogs: string;
  transactions: number;
}

export interface FinanceReadRepository {
  /** Paid sales in a period (by payment time), optionally only one cashier's. */
  periodTotals(start: Date, end: Date, cashierId?: string): Promise<SalesTotals>;
  /** Paid sales rung up on one cashier shift. */
  shiftTotals(shiftId: string): Promise<SalesTotals>;
  summary(start: Date, end: Date): Promise<FinancialAggregate>;
  /** Paid sales grouped by product, biggest revenue first (for the card details). */
  productBreakdown(start: Date, end: Date, limit: number): Promise<ProductBreakdownRow[]>;
}
