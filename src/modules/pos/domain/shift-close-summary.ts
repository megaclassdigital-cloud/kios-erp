import Decimal from "decimal.js";

export interface TakingsInput {
  revenue: string;
  cogs: string;
  transactions: number;
}

export interface ShiftCloseSummaryInput {
  shift: TakingsInput;
  day: TakingsInput;
  dayExpense: string;
  /** Profit is the owner's business: a plain cashier sees takings only. */
  includeProfit: boolean;
}

export interface Takings {
  transactions: number;
  omzet: string;
  /** Omzet minus the cost of what was sold; null when the viewer may not see profit. */
  grossProfit: string | null;
}

export interface ShiftCloseSummary {
  shift: Takings;
  day: Takings & {
    expense: string | null;
    /** Gross profit minus the day's shop expenses, as on the Keuangan page. */
    netProfit: string | null;
  };
}

function takings(t: TakingsInput, includeProfit: boolean): Takings {
  const omzet = new Decimal(t.revenue);
  return {
    transactions: t.transactions,
    omzet: omzet.toFixed(2),
    grossProfit: includeProfit ? omzet.minus(t.cogs).toFixed(2) : null,
  };
}

/** What the shop took and kept, for the shift just closed and for the whole WIB day. */
export function buildShiftCloseSummary(input: ShiftCloseSummaryInput): ShiftCloseSummary {
  const day = takings(input.day, input.includeProfit);
  return {
    shift: takings(input.shift, input.includeProfit),
    day: {
      ...day,
      expense: input.includeProfit ? new Decimal(input.dayExpense).toFixed(2) : null,
      netProfit: day.grossProfit === null ? null : new Decimal(day.grossProfit).minus(input.dayExpense).toFixed(2),
    },
  };
}
