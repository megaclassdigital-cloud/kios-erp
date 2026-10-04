/**
 * Classifies how close a product is to its expiry date.
 *
 * Pure and framework-free, like the stock classifier beside it, so the same
 * rule drives the dashboard count, the stock list and the warning a cashier
 * sees at the till — three screens that must never disagree about whether an
 * item is still sellable.
 *
 * Deliberately not "days until expiry" arithmetic scattered across pages:
 * off-by-one on a date boundary is the easy mistake here, and a product that
 * expires *today* is a different conversation from one that expired
 * yesterday.
 */
export type ExpiryStatus =
  /** No date recorded — a service, or a product added before expiry tracking. */
  | "TIDAK_DIPANTAU"
  /** Past its date. Must not be sold. */
  | "KEDALUWARSA"
  /** Within the product's own warning window. Sell it first. */
  | "MENDEKATI"
  /** Comfortably in date. */
  | "AMAN";

export class ExpiryService {
  /**
   * `now` is injected rather than read from the clock so the boundaries are
   * testable and so a server render and a client render of the same row
   * cannot land on different days.
   */
  classify(expiryDate: Date | null | undefined, warnDays: number, now: Date): ExpiryStatus {
    if (!expiryDate) return "TIDAK_DIPANTAU";

    const days = this.daysUntil(expiryDate, now);
    // Strictly negative: something expiring later today is still sellable
    // today, which is how a shopkeeper treats it.
    if (days < 0) return "KEDALUWARSA";
    if (days <= Math.max(0, warnDays)) return "MENDEKATI";
    return "AMAN";
  }

  /** Whole days from `now` to `expiryDate`, compared date-to-date so a sale
   * at 09:00 and one at 21:00 on the same day agree. */
  daysUntil(expiryDate: Date, now: Date): number {
    const expiry = Date.UTC(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((expiry - today) / 86_400_000);
  }

  /** Wording shared by every surface, so the same state never gets two names. */
  describe(status: ExpiryStatus, days: number): string {
    switch (status) {
      case "KEDALUWARSA":
        return days === -1 ? "Kedaluwarsa kemarin" : `Kedaluwarsa ${Math.abs(days)} hari lalu`;
      case "MENDEKATI":
        if (days === 0) return "Kedaluwarsa hari ini";
        if (days === 1) return "Kedaluwarsa besok";
        return `Kedaluwarsa dalam ${days} hari`;
      case "AMAN":
        return `Masih ${days} hari lagi`;
      case "TIDAK_DIPANTAU":
        return "Tanggal kedaluwarsa belum diisi";
    }
  }
}
