import Decimal from "decimal.js";

export interface TakingsInput {
  revenue: string;
  cogs: string;
  transactions: number;
  cash: string;
  cashless: string;
}

export interface ShiftCloseSummaryInput {
  shift: TakingsInput;
  day: TakingsInput;
  /** Shop expenses dated today (they belong to the day, not to a shift). */
  dayExpense: string;
}

/** The same elements as the Keuangan page, in the same words. */
export interface Takings {
  transactions: number;
  omzet: string;
  cogs: string;
  grossProfit: string;
  cash: string;
  cashless: string;
}

export interface ShiftCloseSummary {
  shift: Takings;
  day: Takings & {
    expense: string;
    /** Gross profit minus the day's shop expenses, as on the Keuangan page. */
    netProfit: string;
  };
}

function takings(t: TakingsInput): Takings {
  const omzet = new Decimal(t.revenue);
  return {
    transactions: t.transactions,
    omzet: omzet.toFixed(2),
    cogs: new Decimal(t.cogs).toFixed(2),
    grossProfit: omzet.minus(t.cogs).toFixed(2),
    cash: new Decimal(t.cash).toFixed(2),
    cashless: new Decimal(t.cashless).toFixed(2),
  };
}

/** What the shop took and kept, for the shift just closed and for the whole WIB day. */
export function buildShiftCloseSummary(input: ShiftCloseSummaryInput): ShiftCloseSummary {
  const day = takings(input.day);
  return {
    shift: takings(input.shift),
    day: {
      ...day,
      expense: new Decimal(input.dayExpense).toFixed(2),
      netProfit: new Decimal(day.grossProfit).minus(input.dayExpense).toFixed(2),
    },
  };
}
