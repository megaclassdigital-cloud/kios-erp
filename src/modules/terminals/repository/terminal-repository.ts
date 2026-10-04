import type { TerminalDeviceKind } from "@prisma/client";

export interface TerminalDeviceRecord {
  kind: TerminalDeviceKind;
  label: string;
  medianIntervalMs: number | null;
  codeLength: number | null;
  terminator: string | null;
  connectedAt: Date;
  lastUsedAt: Date | null;
}

export interface TerminalRecord {
  id: string;
  deviceKey: string;
  name: string;
  lastSeenAt: Date;
  devices: TerminalDeviceRecord[];
}

export interface AttachDeviceInput {
  terminalId: string;
  kind: TerminalDeviceKind;
  label: string;
  medianIntervalMs?: number | null;
  codeLength?: number | null;
  terminator?: string | null;
}

export interface TerminalRepository {
  findByDeviceKey(deviceKey: string): Promise<TerminalRecord | null>;
  /** Registers the terminal, or refreshes lastSeenAt when it already
   * exists — called on every POS load, so it must be idempotent. */
  register(deviceKey: string, name: string): Promise<TerminalRecord>;
  /** Replaces whatever device of that kind the terminal had: confirming a
   * new scanner supersedes the old record rather than piling up. */
  attachDevice(input: AttachDeviceInput): Promise<TerminalRecord>;
  touchDevice(terminalId: string, kind: TerminalDeviceKind): Promise<void>;
  listAll(): Promise<TerminalRecord[]>;
}
