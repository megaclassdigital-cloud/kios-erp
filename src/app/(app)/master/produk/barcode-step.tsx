"use client";

import { useMemo } from "react";
import { AlertTriangle, Check, ScanLine, Sparkles } from "lucide-react";
import { BarcodeValue, isValidEan13 } from "@/shared/barcode/barcode-value";
import { ScanSources } from "../../scan-sources";

export type BarcodeMode = "EXISTING" | "INTERNAL";

export interface KnownProduct {
  name: string;
  barcodes: { barcodeValue: string; status: string }[];
}

type Feedback =
  | { tone: "ok"; text: string }
  | { tone: "warn"; text: string }
  | { tone: "error"; text: string };

/**
 * Deliberately the first thing the form asks, and deliberately without a
 * default.
 *
 * Before this, "sudah punya barcode pabrik" was an unticked checkbox at the
 * bottom of the form, so the path of least resistance minted a *second*,
 * internal barcode for an item that already had one printed on its
 * packaging. Nothing failed at that moment — it failed later, at the till,
 * when scanning the packaging returned "Barcode tidak terdaftar" and the
 * cashier had a customer waiting. Forcing the choice costs one click and
 * removes that entire class of mistake.
 */
export function BarcodeStep({
  mode,
  onModeChange,
  value,
  onValueChange,
  knownProducts,
}: {
  mode: BarcodeMode | null;
  onModeChange: (mode: BarcodeMode) => void;
  value: string;
  onValueChange: (value: string) => void;
  knownProducts: KnownProduct[];
}) {
  // Checked as the admin types, against the product list already in memory
  // — no round trip, and the clash is named before the form is submitted
  // rather than coming back as "Barcode sudah terhubung dengan produk lain"
  // with no way to tell which product that is.
  const feedback = useMemo<Feedback | null>(() => {
    if (mode !== "EXISTING") return null;
    const raw = value.trim();
    if (!raw) return null;

    let normalized: string;
    try {
      normalized = BarcodeValue.normalize(raw).toString();
    } catch {
      return { tone: "error", text: "Kode barcode tidak valid." };
    }

    const clash = knownProducts.find((p) =>
      p.barcodes.some((b) => b.status === "ACTIVE" && b.barcodeValue === normalized)
    );
    if (clash) {
      return { tone: "error", text: `Barcode ini sudah dipakai produk "${clash.name}".` };
    }

    if (isValidEan13(normalized)) {
      return { tone: "ok", text: "Terbaca sebagai EAN-13 — format barcode pabrik yang standar." };
    }
    return {
      tone: "warn",
      text: `Bukan EAN-13 (${normalized.length} karakter). Tetap bisa disimpan sebagai CODE128 — pastikan kodenya sudah benar.`,
    };
  }, [mode, value, knownProducts]);

  return (
    <fieldset className="rounded-lg border border-border p-3">
      <legend className="px-1 text-xs font-semibold text-muted-foreground">
        LANGKAH 1 — BARCODE
      </legend>
      <p className="mb-3 text-xs text-muted-foreground">
        Lihat dulu kemasan barangnya. Ada barcode tercetak di sana?
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <ModeCard
          active={mode === "EXISTING"}
          onClick={() => onModeChange("EXISTING")}
          icon={<ScanLine className="h-4 w-4" />}
          title="Ya, sudah ada barcode"
          description="Barang pabrikan seperti Indomie, minyak botol, sabun. Scan barcode di kemasannya."
        />
        <ModeCard
          active={mode === "INTERNAL"}
          onClick={() => onModeChange("INTERNAL")}
          icon={<Sparkles className="h-4 w-4" />}
          title="Belum ada, buatkan"
          description="Barang curah atau bungkus sendiri seperti beras literan, gula kiloan. Sistem membuat barcode baru."
        />
      </div>

      {mode === "EXISTING" && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-medium text-foreground" htmlFor="barcode-pabrik">
            Scan atau ketik barcode dari kemasan
          </label>
          <input
            id="barcode-pabrik"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            required
            autoComplete="off"
            placeholder="Arahkan scanner ke sini, atau ketik angkanya"
            className="w-full rounded-md border border-input px-3 py-2 font-mono text-sm tracking-wide focus:border-ring focus:outline-none"
          />
          {feedback && <FeedbackLine feedback={feedback} />}
          <ScanSources label="Barcode Produk" onScan={onValueChange} />
        </div>
      )}

      {mode === "INTERNAL" && (
        <p className="mt-3 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          Barcode akan dibuat otomatis saat produk disimpan, lalu bisa langsung dicetak jadi stiker
          dan ditempel di kemasannya. Kode ini milik toko Anda sendiri dan tidak akan bentrok dengan
          barcode pabrik mana pun.
        </p>
      )}
    </fieldset>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-primary-soft"
          : "border-border bg-card hover:border-border-strong hover:bg-muted"
      }`}
    >
      <span className={`flex items-center gap-1.5 text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>
        {icon}
        {title}
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
    </button>
  );
}

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  const tone =
    feedback.tone === "ok"
      ? "text-success"
      : feedback.tone === "warn"
        ? "text-warning-foreground"
        : "text-destructive";
  const Icon = feedback.tone === "ok" ? Check : AlertTriangle;

  return (
    <p className={`flex items-start gap-1.5 text-xs ${tone}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{feedback.text}</span>
    </p>
  );
}
