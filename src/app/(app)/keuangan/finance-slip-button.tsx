"use client";

import { buildSummarySlipBytes, type SlipLine } from "@/shared/printing/label-escpos";
import { formatWibDateTime } from "@/shared/format/wib";
import { ThermalPrintButton } from "../thermal-print-button";

/** The period's figures as a short slip on the receipt printer (the full report stays on A4 / Excel). */
export function FinanceSlipButton({ title, periodLabel, lines }: { title: string; periodLabel: string; lines: SlipLine[] }) {
  return (
    <ThermalPrintButton
      label="Cetak ringkasan"
      build={(c) =>
        buildSummarySlipBytes(
          { title, subtitle: periodLabel, lines, footer: `Dicetak ${formatWibDateTime(new Date())} WIB` },
          { columns: c.columns, cut: c.cut }
        )
      }
    />
  );
}
