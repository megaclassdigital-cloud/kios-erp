"use client";

import { useMemo } from "react";
import { ExpiryService } from "@/modules/inventory/domain/expiry-service";

const service = new ExpiryService();

/**
 * "Masih 312 hari lagi" under the date field, updating as it is typed.
 *
 * A raw date is hard to judge at a glance while unpacking a delivery — 2027-02-14
 * means nothing until you have done the subtraction. The countdown does the
 * subtraction, so a wrong year (the classic typo: this year instead of next)
 * shows up immediately as a number that looks wrong, before the goods are on
 * the shelf and the till starts trusting it.
 *
 * Uses the same ExpiryService as the till and the stock list, so a date that
 * reads "kedaluwarsa dalam 5 hari" here reads the same everywhere else.
 */
export function ExpiryCountdown({ value, warnDays = 30 }: { value: string; warnDays?: number }) {
  const info = useMemo(() => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const now = new Date();
    const status = service.classify(date, warnDays, now);
    return { status, days: service.daysUntil(date, now) };
  }, [value, warnDays]);

  if (!info) {
    return (
      <span className="mt-1 block text-[11px] text-muted-foreground">
        Isi dari kemasan batch ini
      </span>
    );
  }

  const tone =
    info.status === "KEDALUWARSA"
      ? "text-destructive"
      : info.status === "MENDEKATI"
        ? "text-warning-foreground"
        : "text-success";

  return (
    <span className={`mt-1 block text-[11px] font-medium ${tone}`}>
      {service.describe(info.status, info.days)}
    </span>
  );
}
