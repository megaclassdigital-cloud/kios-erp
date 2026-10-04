/**
 * Decides what a terminal should be told about the scanner that just fired,
 * given what it already has on record.
 *
 * The browser is never told which physical device produced a scan, so a
 * "new scanner" can only ever be inferred from how differently it behaves.
 * That inference is deliberately conservative: it may only ever surface a
 * *suggestion* to confirm, never a silent change, because the alternative —
 * quietly rewriting a terminal's hardware record because one scan happened
 * to arrive slowly — would make the record worthless.
 *
 * No framework and no Prisma import here.
 */

export interface ObservedScan {
  medianIntervalMs: number;
  codeLength: number;
  terminator: string;
}

export interface KnownScanner {
  medianIntervalMs: number | null;
  terminator: string | null;
}

export type ScannerVerdict =
  /** Nothing on record for this terminal — offer to connect it. */
  | { kind: "unregistered" }
  /** Behaves like the scanner already on record. */
  | { kind: "known" }
  /** Same terminal, materially different behaviour — likely a different
   * physical unit, so offer to replace the record. */
  | { kind: "changed"; reason: string };

/** A scanner's own timing varies a little run to run (USB polling, system
 * load), so only a gap well outside that noise counts as a different unit. */
const INTERVAL_TOLERANCE_MS = 15;

export class TerminalDeviceService {
  classifyScanner(observed: ObservedScan, known: KnownScanner | null): ScannerVerdict {
    if (!known) return { kind: "unregistered" };

    if (known.terminator && known.terminator !== observed.terminator) {
      return {
        kind: "changed",
        reason: `Suffix berbeda: tercatat "${known.terminator}", terbaca "${observed.terminator}".`,
      };
    }

    if (
      known.medianIntervalMs !== null &&
      Math.abs(known.medianIntervalMs - observed.medianIntervalMs) > INTERVAL_TOLERANCE_MS
    ) {
      return {
        kind: "changed",
        reason: `Kecepatan berbeda: tercatat ${known.medianIntervalMs}ms, terbaca ${observed.medianIntervalMs}ms.`,
      };
    }

    return { kind: "known" };
  }

  /** Human-readable summary shown in the confirmation prompt, so whoever is
   * standing at the till can sanity-check what is about to be saved. */
  describe(observed: ObservedScan): string {
    const suffix =
      observed.terminator === "idle" ? "tanpa suffix" : `suffix ${observed.terminator.toUpperCase()}`;
    return `${observed.codeLength} karakter · jeda ${observed.medianIntervalMs}ms · ${suffix}`;
  }
}
