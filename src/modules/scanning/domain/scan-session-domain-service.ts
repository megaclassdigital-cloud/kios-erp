const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to read aloud
const CODE_LENGTH = 6;
const SESSION_TTL_MINUTES = 30;

/** Pure pairing-code/expiry logic — no framework, no Prisma (PRD 62). */
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
}

export class ScanSessionNotFoundError extends Error {}
export class ScanSessionExpiredError extends Error {}
