"use client";

import { useState } from "react";
import { ScanBarcode } from "lucide-react";
import type { ScannerPrompt } from "./scanner-registry";

/** Inline banner, not a modal: a scan arriving mid-transaction must never
 * block the cashier from finishing the sale in front of them. */
export function ScannerPromptBanner({
  prompt,
  saving,
  onConnect,
  onDismiss,
}: {
  prompt: ScannerPrompt;
  saving: boolean;
  onConnect: (label: string) => void;
  onDismiss: () => void;
}) {
  const [label, setLabel] = useState("Scanner Kasir");

  return (
    <div className="rounded-xl border border-info/30 bg-info-soft p-3 shadow-sm">
      <div className="flex flex-wrap items-start gap-2">
        <ScanBarcode className="mt-0.5 h-5 w-5 shrink-0 text-info" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {prompt.reason ? "Scanner berbeda terdeteksi" : "Scanner terdeteksi"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{prompt.summary}</p>
          {prompt.reason && <p className="mt-0.5 text-xs text-warning-foreground">{prompt.reason}</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          aria-label="Nama scanner"
          className="min-w-0 flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm focus:border-ring focus:outline-none"
        />
        <button
          onClick={() => onConnect(label)}
          disabled={saving}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Hubungkan"}
        </button>
        <button
          onClick={onDismiss}
          disabled={saving}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          Nanti
        </button>
      </div>
    </div>
  );
}
