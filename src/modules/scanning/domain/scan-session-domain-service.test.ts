import { describe, expect, it } from "vitest";
import { ScanSessionDomainService } from "./scan-session-domain-service";

describe("ScanSessionDomainService", () => {
  it("generates a 6-character code from the readable alphabet only", () => {
    const domain = new ScanSessionDomainService();
    const code = domain.generateCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it("computes an expiry 30 minutes from the given time", () => {
    const domain = new ScanSessionDomainService();
    const from = new Date("2026-01-01T00:00:00Z");
    expect(domain.computeExpiry(from).toISOString()).toBe("2026-01-01T00:30:00.000Z");
  });

  it("treats a session as expired once past expiresAt", () => {
    const domain = new ScanSessionDomainService();
    const session = { expiresAt: new Date("2026-01-01T00:00:00Z"), disconnectedAt: null };
    expect(domain.isExpired(session, new Date("2026-01-01T00:00:01Z"))).toBe(true);
    expect(domain.isExpired(session, new Date("2025-12-31T23:59:59Z"))).toBe(false);
  });

  it("treats a manually disconnected session as expired regardless of expiresAt", () => {
    const domain = new ScanSessionDomainService();
    const session = { expiresAt: new Date("2099-01-01T00:00:00Z"), disconnectedAt: new Date() };
    expect(domain.isExpired(session)).toBe(true);
  });
});
