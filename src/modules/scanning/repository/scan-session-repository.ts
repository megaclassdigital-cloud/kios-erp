import type { ScanEvent, ScanSession } from "@prisma/client";

export interface CreateScanSessionInput {
  code: string;
  createdById: string;
  label?: string;
  expiresAt: Date;
}

export interface ScanSessionRepository {
  create(input: CreateScanSessionInput): Promise<ScanSession>;
  findByCode(code: string): Promise<ScanSession | null>;
  disconnect(id: string): Promise<void>;
  addEvent(sessionId: string, barcodeValue: string): Promise<ScanEvent>;
  /** Events created strictly after `after` (exclusive), oldest first — the
   * desktop polls this with the last event id/timestamp it already has. */
  listEventsSince(sessionId: string, after: Date | null): Promise<ScanEvent[]>;
}
