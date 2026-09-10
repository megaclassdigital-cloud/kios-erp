"use client";

import { useEffect, useRef, useState } from "react";

type ConnState = "idle" | "connecting" | "connected" | "error";

/** Pairs a second device (typically a phone) as a pure barcode scanner for
 * this page. The phone opens /scan/[code] — a bare, chrome-less page with
 * nothing but a camera feed — and every code it decodes lands here via
 * polling, then goes through the exact same onScan callback this page's
 * own CameraScanner already uses. Same drop-in shape as CameraScanner by
 * design, so wiring it in anywhere is a one-line addition.
 *
 * `resetSignal`: pass a value that changes once a customer's transaction
 * finishes (e.g. the cart being cleared after payment) — an active
 * pairing is disconnected and a fresh code/QR minted for the next
 * customer, so one physical pairing never spans more than one checkout. */
export function DeviceScannerPairing({
  label,
  onScan,
  resetSignal,
}: {
  label: string;
  onScan: (code: string) => void;
  resetSignal?: unknown;
}) {
  const [state, setState] = useState<ConnState>("idle");
  const [code, setCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Tracks the *live* connection, independent of `state` — a session can
  // exist (QR shown) with nobody having scanned it yet, or with a phone
  // that connected and then silently dropped. These read differently to
  // the cashier ("waiting for a phone" vs "a phone was here and is gone").
  const [phoneConnected, setPhoneConnected] = useState(false);
  const everConnectedRef = useRef(false);
  const lastEventTimeRef = useRef<Date | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef(false);
  const failCountRef = useRef(0);
  // pollOnce below is a self-scheduling loop started once per connect()
  // call and kept alive across renders — it must dispatch through the
  // *current* onScan (which closes over the latest barcode index/cache),
  // not the one captured when the phone first paired, or every relayed
  // scan after that permanently misses the fast in-memory lookup and
  // falls back to the slow server round trip.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  function stopPolling() {
    pollingRef.current = false;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }

  async function connect() {
    setState("connecting");
    setError(null);
    setPhoneConnected(false);
    everConnectedRef.current = false;
    const res = await fetch("/api/scan-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Gagal membuat sesi.");
      setState("error");
      return;
    }

    setCode(data.code);
    setScanCount(0);
    lastEventTimeRef.current = null;
    failCountRef.current = 0;

    const { default: QRCode } = await import("qrcode");
    const url = `${window.location.origin}/scan/${data.code}`;
    setQrDataUrl(await QRCode.toDataURL(url, { width: 200, margin: 1 }));
    setState("connected");

    // A plain setInterval fires on a fixed clock regardless of whether the
    // previous request has resolved yet — if one poll is slow (this
    // environment has seen multi-second API round trips), several ticks
    // end up in flight at once, all reading the same stale cursor, all
    // forwarding the same not-yet-acknowledged event multiple times (one
    // real scan arriving at the cart as many). A self-scheduling loop that
    // only queues the next poll after the current one fully resolves
    // guarantees at most one request — and one cursor update — in flight
    // at any time.
    pollingRef.current = true;
    async function pollOnce() {
      if (!pollingRef.current) return;
      try {
        const qs = lastEventTimeRef.current
          ? `?after=${encodeURIComponent(lastEventTimeRef.current.toISOString())}`
          : "";
        const pollRes = await fetch(`/api/scan-session/${data.code}/events${qs}`);
        if (!pollRes.ok) {
          failCountRef.current += 1;
          if (failCountRef.current >= 5) {
            stopPolling();
            setError("Sesi berakhir. Hubungkan ulang untuk melanjutkan.");
            setState("error");
            return;
          }
        } else {
          failCountRef.current = 0;
          const pollData = await pollRes.json();
          if (pollData.connected) everConnectedRef.current = true;
          setPhoneConnected(Boolean(pollData.connected));
          for (const event of pollData.events ?? []) {
            lastEventTimeRef.current = new Date(event.createdAt);
            onScanRef.current(event.barcodeValue);
          }
          if (pollData.events?.length) {
            setScanCount((c) => c + pollData.events.length);
          }
        }
      } catch {
        failCountRef.current += 1;
      }
      if (pollingRef.current) {
        // A single cashier terminal polling its one active pairing session
        // is negligible load — worth polling faster than the original
        // 1200ms to cut wireless scan-to-cart latency, since every ms
        // here is added on top of the phone's own decode + network time.
        pollTimeoutRef.current = setTimeout(pollOnce, 400);
      }
    }
    pollOnce();
  }

  function disconnect() {
    stopPolling();
    if (code) fetch(`/api/scan-session/${code}`, { method: "DELETE" }).catch(() => {});
    setState("idle");
    setCode(null);
    setQrDataUrl(null);
    setPhoneConnected(false);
  }

  useEffect(() => stopPolling, []);

  // Rotate to a fresh pairing code once a customer's transaction finishes
  // — one physical pairing per customer session, not per shift. Skipped
  // on mount (only fires on a genuine change) and only when a pairing is
  // actually active; an idle "Hubungkan Perangkat Lain" button is left
  // alone so this never auto-connects a phone nobody asked for.
  const isFirstRunRef = useRef(true);
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    if (state === "connected") {
      disconnect();
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  if (state === "idle" || state === "error") {
    return (
      <div>
        <button
          type="button"
          onClick={connect}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          Hubungkan Perangkat Lain
        </button>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (state === "connecting") {
    return <p className="text-xs text-muted-foreground">Membuat sesi...</p>;
  }

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start gap-3">
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR untuk pairing perangkat" className="h-28 w-28 shrink-0 rounded" />
        )}
        <div className="min-w-0 flex-1 text-sm">
          <p className="text-muted-foreground">
            Buka kamera HP dan pindai QR ini, atau ketik kode berikut di HP:
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-widest text-foreground">{code}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                phoneConnected ? "bg-success" : everConnectedRef.current ? "bg-destructive" : "bg-muted-foreground/40"
              }`}
            />
            <span className={phoneConnected ? "text-success" : everConnectedRef.current ? "text-destructive" : "text-muted-foreground"}>
              {phoneConnected
                ? "Terhubung"
                : everConnectedRef.current
                  ? "Terputus — HP tidak merespon"
                  : "Menunggu HP memindai QR..."}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{scanCount} kode diterima dari perangkat ini</p>
          <button
            onClick={disconnect}
            className="mt-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Putuskan
          </button>
        </div>
      </div>
    </div>
  );
}
