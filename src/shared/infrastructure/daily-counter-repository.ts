import type { Db } from "./transaction-manager";
import { dailyCounterScope, formatTransactionNumber } from "@/shared/domain/transaction-number";

/**
 * Concurrency-safe sequential number generator (PRD 20). Backed by a single
 * row per {prefix, day} and an atomic UPDATE...increment, so two concurrent
 * checkouts can never receive the same transaction number.
 */
export class DailyCounterRepository {
  constructor(private readonly db: Db) {}

  async next(prefix: string, date: Date = new Date()): Promise<string> {
    const scope = dailyCounterScope(prefix, date);
    const row = await this.db.dailyCounter.upsert({
      where: { scope },
      create: { scope, counter: 1 },
      update: { counter: { increment: 1 } },
    });
    return formatTransactionNumber(prefix, date, row.counter);
  }
}
