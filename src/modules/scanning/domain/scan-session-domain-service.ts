const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to read aloud
const CODE_LENGTH = 6;
const SESSION_TTL_MINUTES = 30;

// The connected phone pings roughly every 4s (heartbeat, plus every scan
// it submits). Two missed beats is a reasonable margin for a single slow
// network round trip without also taking many seconds to notice a phone
// that's actually gone (locked screen, closed tab, walked out of range).
const HEARTBEAT_STALE_MS = 9000;

/** Pure pairing-code/expiry/claim logic — no framework, no Prisma (PRD 62). */
export class ScanSessionDomainService {
  generateCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
  }

  computeExpiry(from: Date = new Date()): Date {
    return new Date(from.getTime() + SESSION_TTL_MINUTES * 60 * 1000);
  }

  isExpired(session: { expiresAt: Date; disconnectedAt: Date | null }, now: Date = new Date()): boolean {
    return session.disconnectedAt !== null || session.expiresAt.getTime() <= now.getTime();
  }

  /** True once a connected phone hasn't been heard from (heartbeat or an
   * actual scan) for longer than a couple of missed beats — the signal
   * both sides use to notice a silently dropped connection instead of
   * assuming "still connected" forever once paired. */
  isStale(session: { lastSeenAt: Date | null }, now: Date = new Date()): boolean {
    if (!session.lastSeenAt) return false;
    return now.getTime() - session.lastSeenAt.getTime() > HEARTBEAT_STALE_MS;
  }

  /** A code locks to the first phone that connects (PRD: one physical
   * pairing per customer session, never two devices sharing a code) —
   * but a claim that's gone stale (the original phone silently dropped)
   * is treated as abandoned and can be reclaimed by scanning the same
   * QR again, rather than requiring the cashier to mint a brand new code. */
  canClaim(session: { claimedAt: Date | null; lastSeenAt: Date | null }, now: Date = new Date()): boolean {
    if (!session.claimedAt) return true;
    return this.isStale(session, now);
  }
}

export class ScanSessionNotFoundError extends Error {}
export class ScanSessionExpiredError extends Error {}
export class ScanSessionAlreadyClaimedError extends Error {}
