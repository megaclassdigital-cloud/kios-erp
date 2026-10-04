"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getTerminalDeviceKey } from "@/shared/barcode/terminal-device-key";
import { TerminalDeviceService } from "@/modules/terminals/domain/terminal-device-service";
import type { WedgeScan } from "@/shared/barcode/keyboard-wedge";

const deviceService = new TerminalDeviceService();

export interface ScannerPrompt {
  summary: string;
  reason: string | null;
  observed: WedgeScan["stats"];
}

/**
 * Detect -> confirm -> save, for the scanner attached to this till.
 *
 * Detection is never silent: a scan whose rhythm does not match what the
 * terminal has on record only ever raises a prompt. Writing a hardware
 * profile without someone at the machine confirming it would make the
 * record untrustworthy the first time one scan happened to arrive slowly.
 */
export function useScannerRegistry() {
  const [prompt, setPrompt] = useState<ScannerPrompt | null>(null);
  const [saving, setSaving] = useState(false);
  const deviceKeyRef = useRef<string | null>(null);
  // Re-prompting on every single scan would be unusable, so one dismissal
  // silences it for the rest of this page's life.
  const silencedRef = useRef(false);

  useEffect(() => {
    const deviceKey = getTerminalDeviceKey();
    deviceKeyRef.current = deviceKey;
    void fetch("/api/terminals/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceKey, name: "Terminal Kasir" }),
    }).catch(() => {
      // Registration is bookkeeping, never a precondition for selling.
    });
  }, []);

  const reportScan = useCallback(async (scan: WedgeScan) => {
    const deviceKey = deviceKeyRef.current;
    if (!deviceKey || silencedRef.current) return;

    try {
      const res = await fetch("/api/terminals/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceKey,
          medianIntervalMs: Math.round(scan.stats.medianIntervalMs),
          codeLength: scan.stats.length,
          terminator: scan.stats.terminator,
        }),
      });
      if (!res.ok) return;
      const { verdict } = await res.json();
      if (verdict.kind === "known") return;

      setPrompt({
        summary: deviceService.describe({
          medianIntervalMs: Math.round(scan.stats.medianIntervalMs),
          codeLength: scan.stats.length,
          terminator: scan.stats.terminator,
        }),
        reason: verdict.kind === "changed" ? verdict.reason : null,
        observed: scan.stats,
      });
    } catch {
      // A failed lookup must never interrupt the sale in progress.
    }
  }, []);

  async function connect(label: string) {
    const deviceKey = deviceKeyRef.current;
    if (!deviceKey || !prompt) return;
    setSaving(true);
    try {
      const res = await fetch("/api/terminals/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceKey,
          kind: "SCANNER",
          label,
          observed: {
            medianIntervalMs: Math.round(prompt.observed.medianIntervalMs),
            codeLength: prompt.observed.length,
            terminator: prompt.observed.terminator,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Gagal menyimpan scanner.");
        return;
      }
      toast.success("Scanner tersimpan untuk terminal ini.");
      setPrompt(null);
    } finally {
      setSaving(false);
    }
  }

  function dismiss() {
    silencedRef.current = true;
    setPrompt(null);
  }

  return { prompt, saving, reportScan, connect, dismiss };
}
