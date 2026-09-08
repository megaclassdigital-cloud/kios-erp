"use client";

import { useEffect, useRef, useState } from "react";

type ConnState = "idle" | "connecting" | "connected" | "error";

/** Pairs a second device (typically a phone) as a pure barcode scanner for
 * this page. The phone opens /scan/[code] — a bare, chrome-less page with
 * nothing but a camera feed — and every code it decodes lands here via
 * polling, then goes through the exact same onScan callback this page's
 * own CameraScanner already uses. Same drop-in shape as CameraScanner by
 * design, so wiring it in anywhere is a one-line addition. */
export function DeviceScannerPairing({ label, onScan }: { label: string; onScan: (code: string) => void }) {
  const [state, setState] = useState<ConnState>("idle");
  const [code, setCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const lastEventTimeRef = useRef<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failCountRef = useRef(0);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function connect() {
    setState("connecting");
    setError(null);
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

    pollRef.current = setInterval(async () => {
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
        }
        return;
      }
      failCountRef.current = 0;
      const pollData = await pollRes.json();
      for (const event of pollData.events ?? []) {
        onScan(event.barcodeValue);
        lastEventTimeRef.current = new Date(event.createdAt);
      }
      if (pollData.events?.length) {
        setScanCount((c) => c + pollData.events.length);
      }
    }, 1200);
  }

  function disconnect() {
    stopPolling();
    if (code) fetch(`/api/scan-session/${code}`, { method: "DELETE" }).catch(() => {});
    setState("idle");
    setCode(null);
    setQrDataUrl(null);
  }

  useEffect(() => stopPolling, []);

  if (state === "idle" || state === "error") {
    return (
      <div>
        <button
          type="button"
          onClick={connect}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Hubungkan Perangkat Lain
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (state === "connecting") {
    return <p className="text-xs text-gray-400">Membuat sesi...</p>;
  }

  return (
    <div className="rounded-md border border-gray-200 p-3">
      <div className="flex items-start gap-3">
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR untuk pairing perangkat" className="h-28 w-28 shrink-0 rounded" />
        )}
        <div className="min-w-0 flex-1 text-sm">
          <p className="text-gray-600">
            Buka kamera HP dan pindai QR ini, atau ketik kode berikut di HP:
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-widest text-gray-900">{code}</p>
          <p className="mt-1 text-xs text-gray-400">{scanCount} kode diterima dari perangkat ini</p>
          <button
            onClick={disconnect}
            className="mt-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Putuskan
          </button>
        </div>
      </div>
    </div>
  );
}
