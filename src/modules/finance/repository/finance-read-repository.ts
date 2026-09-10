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

export interface FinanceReadRepository {
  summary(start: Date, end: Date): Promise<FinancialAggregate>;
}
