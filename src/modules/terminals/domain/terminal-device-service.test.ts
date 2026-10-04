import { describe, expect, it } from "vitest";
import { TerminalDeviceService } from "./terminal-device-service";

const service = new TerminalDeviceService();
const observed = { medianIntervalMs: 10, codeLength: 13, terminator: "enter" };

describe("TerminalDeviceService.classifyScanner", () => {
  it("treats a terminal with nothing on record as unregistered", () => {
    expect(service.classifyScanner(observed, null).kind).toBe("unregistered");
  });

  it("accepts timing that drifts within normal run-to-run variance", () => {
    expect(
      service.classifyScanner(observed, { medianIntervalMs: 22, terminator: "enter" }).kind
    ).toBe("known");
  });

  it("flags a scanner whose speed is far outside the recorded profile", () => {
    const verdict = service.classifyScanner(observed, { medianIntervalMs: 30, terminator: "enter" });
    expect(verdict.kind).toBe("changed");
  });

  it("flags a different suffix even when the speed matches", () => {
    const verdict = service.classifyScanner(observed, { medianIntervalMs: 10, terminator: "tab" });
    expect(verdict.kind).toBe("changed");
  });

  it("does not flag a profile saved without timing", () => {
    expect(
      service.classifyScanner(observed, { medianIntervalMs: null, terminator: null }).kind
    ).toBe("known");
  });
});

describe("TerminalDeviceService.describe", () => {
  it("summarizes a scan for the confirmation prompt", () => {
    expect(service.describe(observed)).toBe("13 karakter · jeda 10ms · suffix ENTER");
  });

  it("spells out a scanner that sends no suffix at all", () => {
    expect(service.describe({ ...observed, terminator: "idle" })).toContain("tanpa suffix");
  });
});
