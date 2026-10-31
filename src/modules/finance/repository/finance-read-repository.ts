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

export interface FinanceReadRepository {
  summary(start: Date, end: Date): Promise<FinancialAggregate>;
  /** Paid sales grouped by product, biggest revenue first (for the card details). */
  productBreakdown(start: Date, end: Date, limit: number): Promise<ProductBreakdownRow[]>;
}
