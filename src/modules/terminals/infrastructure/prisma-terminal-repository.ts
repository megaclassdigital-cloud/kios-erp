import type { TerminalDeviceKind } from "@prisma/client";
import { prisma } from "@/shared/infrastructure/prisma";
import type {
  AttachDeviceInput,
  TerminalRecord,
  TerminalRepository,
} from "../repository/terminal-repository";

const DEVICE_SELECT = {
  kind: true,
  label: true,
  medianIntervalMs: true,
  codeLength: true,
  terminator: true,
  connectedAt: true,
  lastUsedAt: true,
} as const;

const TERMINAL_SELECT = {
  id: true,
  deviceKey: true,
  name: true,
  lastSeenAt: true,
  devices: { select: DEVICE_SELECT },
} as const;

export class PrismaTerminalRepository implements TerminalRepository {
  async findByDeviceKey(deviceKey: string): Promise<TerminalRecord | null> {
    return prisma.posTerminal.findUnique({
      where: { deviceKey },
      select: TERMINAL_SELECT,
    });
  }

  async register(deviceKey: string, name: string): Promise<TerminalRecord> {
    // Upsert, not create-then-catch: the POS calls this on every load, and
    // two tabs opening at once would otherwise race on the unique deviceKey.
    // The name is only set on create — renaming a till is a deliberate
    // action, never something a page load should undo.
    return prisma.posTerminal.upsert({
      where: { deviceKey },
      create: { deviceKey, name },
      update: { lastSeenAt: new Date() },
      select: TERMINAL_SELECT,
    });
  }

  async attachDevice(input: AttachDeviceInput): Promise<TerminalRecord> {
    await prisma.terminalDevice.upsert({
      where: { terminalId_kind: { terminalId: input.terminalId, kind: input.kind } },
      create: {
        terminalId: input.terminalId,
        kind: input.kind,
        label: input.label,
        medianIntervalMs: input.medianIntervalMs ?? null,
        codeLength: input.codeLength ?? null,
        terminator: input.terminator ?? null,
        lastUsedAt: new Date(),
      },
      update: {
        label: input.label,
        medianIntervalMs: input.medianIntervalMs ?? null,
        codeLength: input.codeLength ?? null,
        terminator: input.terminator ?? null,
        connectedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });

    const terminal = await prisma.posTerminal.findUniqueOrThrow({
      where: { id: input.terminalId },
      select: TERMINAL_SELECT,
    });
    return terminal;
  }

  async touchDevice(terminalId: string, kind: TerminalDeviceKind): Promise<void> {
    // updateMany, not update: a scan can arrive from a terminal whose device
    // record was removed elsewhere, and "last used" is telemetry — never a
    // reason to fail the scan the cashier is in the middle of.
    await prisma.terminalDevice.updateMany({
      where: { terminalId, kind },
      data: { lastUsedAt: new Date() },
    });
  }

  async listAll(): Promise<TerminalRecord[]> {
    return prisma.posTerminal.findMany({
      orderBy: { lastSeenAt: "desc" },
      select: TERMINAL_SELECT,
    });
  }
}
