import type { TerminalDeviceKind } from "@prisma/client";
import { PrismaTerminalRepository } from "../infrastructure/prisma-terminal-repository";
import type { TerminalRecord, TerminalRepository } from "../repository/terminal-repository";
import { TerminalDeviceService, type ObservedScan, type ScannerVerdict } from "../domain/terminal-device-service";

const deviceService = new TerminalDeviceService();

/** Called whenever the POS loads: registers this machine the first time and
 * just refreshes lastSeenAt afterwards. */
export class RegisterTerminalUseCase {
  constructor(private readonly repository: TerminalRepository = new PrismaTerminalRepository()) {}

  async execute(deviceKey: string, fallbackName: string): Promise<TerminalRecord> {
    if (!deviceKey.trim()) throw new Error("Device key terminal tidak boleh kosong.");
    return this.repository.register(deviceKey.trim(), fallbackName.trim() || "Terminal Baru");
  }
}

/** Answers "is this the scanner this till already has?" for a scan that just
 * happened. Read-only — connecting is always a separate, confirmed action. */
export class ClassifyTerminalScannerUseCase {
  constructor(private readonly repository: TerminalRepository = new PrismaTerminalRepository()) {}

  async execute(deviceKey: string, observed: ObservedScan): Promise<ScannerVerdict> {
    const terminal = await this.repository.findByDeviceKey(deviceKey);
    if (!terminal) return { kind: "unregistered" };

    const scanner = terminal.devices.find((d) => d.kind === "SCANNER") ?? null;
    const verdict = deviceService.classifyScanner(observed, scanner);

    if (verdict.kind === "known") {
      await this.repository.touchDevice(terminal.id, "SCANNER");
    }
    return verdict;
  }
}

/** Saves the hardware profile — only ever reached from an explicit
 * confirmation by whoever is standing at the terminal. */
export class ConnectTerminalDeviceUseCase {
  constructor(private readonly repository: TerminalRepository = new PrismaTerminalRepository()) {}

  async execute(input: {
    deviceKey: string;
    kind: TerminalDeviceKind;
    label: string;
    observed?: ObservedScan;
  }): Promise<TerminalRecord> {
    const terminal = await this.repository.findByDeviceKey(input.deviceKey);
    if (!terminal) throw new Error("Terminal belum terdaftar.");

    return this.repository.attachDevice({
      terminalId: terminal.id,
      kind: input.kind,
      label: input.label.trim() || "Scanner",
      medianIntervalMs: input.observed?.medianIntervalMs ?? null,
      codeLength: input.observed?.codeLength ?? null,
      terminator: input.observed?.terminator ?? null,
    });
  }
}

export class ListTerminalsUseCase {
  constructor(private readonly repository: TerminalRepository = new PrismaTerminalRepository()) {}

  execute(): Promise<TerminalRecord[]> {
    return this.repository.listAll();
  }
}
