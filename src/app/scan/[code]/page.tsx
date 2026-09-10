"use client";

import { useEffect, useRef, useState } from "react";
import { use } from "react";
import { playScanBeep } from "@/shared/barcode/scan-feedback";

type Status = "loading" | "invalid" | "ready" | "denied" | "disconnected";

/**
 * Pure barcode-sensor mode (no nav, no other chrome — this route sits
 * outside the (app) layout group entirely). Point a phone at this URL
 * (via the QR code shown on the pairing page) and it does exactly one
 * thing: decode barcodes and send them, continuously, with a flash +
 * vibration per scan like a real handheld scanner. Nothing to configure,
 * nothing to tap between scans.
 */
export default function ScanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [status, setStatus] = useState<Status>("loading");
  const [label, setLabel] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  // Dedup by presence, not by time — see camera-scanner.tsx for why: a
  // product held in view for a couple of seconds must submit exactly
  // once, not once per debounce window.
  const lastAcceptedRef = useRef<string | null>(null);
  const missStreakRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const res = await fetch(`/api/scan-session/${code}`);
      if (cancelled) return;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error ?? "Kode sesi tidak valid.");
        setStatus("invalid");
        return;
      }
      const data = await res.json();
      setLabel(data.label ?? null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMessage("Akses kamera butuh HTTPS. Buka tautan ini lewat https://, bukan alamat jaringan lokal.");
        setStatus("denied");
        return;
      }

      try {
        const permissionStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        const rearDeviceId = permissionStream.getVideoTracks()[0]?.getSettings().deviceId;
        permissionStream.getTracks().forEach((track) => track.stop());
        if (cancelled) return;

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const target =
          devices.find((d) => d.deviceId === rearDeviceId) ??
          devices.find((d) => /back|rear|environment/i.test(d.label)) ??
          devices[0];
        if (!target || !videoRef.current) return;

        setStatus("ready");
        const controls = await reader.decodeFromVideoDevice(target.deviceId, videoRef.current, (result) => {
          if (cancelled) return;
          if (!result) {
            missStreakRef.current += 1;
            if (missStreakRef.current >= 2) lastAcceptedRef.current = null;
            return;
          }
          missStreakRef.current = 0;
          const value = result.getText();
          if (lastAcceptedRef.current === value) return;
          lastAcceptedRef.current = value;
          submitScan(value);
        });
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error && err.name === "NotAllowedError"
              ? "Izin kamera ditolak. Aktifkan izin kamera untuk browser ini lalu muat ulang."
              : "Gagal mengakses kamera."
          );
          setStatus("denied");
        }
      }
    }

    async function submitScan(barcodeValue: string) {
      setFlash(true);
      setTimeout(() => setFlash(false), 250);
      playScanBeep();
      if (navigator.vibrate) navigator.vibrate(80);

      const res = await fetch(`/api/scan-session/${code}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcodeValue }),
      });
      if (res.ok) {
        setCount((c) => c + 1);
      } else if (res.status === 404 || res.status === 400) {
        // session expired/disconnected mid-scan
        controlsRef.current?.stop();
        setStatus("disconnected");
      }
    }

    init();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [code]);

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
      />

      {flash && <div className="absolute inset-0 bg-green-400/40" />}

      <div className="relative flex items-center justify-between bg-black/60 px-4 py-3 text-sm">
        <span>{label ? `Terhubung: ${label}` : "Kios-ERP Scanner"}</span>
        <span className="font-semibold">{count} terkirim</span>
      </div>

      {status === "ready" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-56 w-56 rounded-2xl border-4 border-white/70" />
        </div>
      )}

      {(status === "loading" || status === "invalid" || status === "denied" || status === "disconnected") && (
        <div className="relative flex flex-1 items-center justify-center p-6 text-center">
          {status === "loading" && <p>Menghubungkan...</p>}
          {status !== "loading" && (
            <div>
              <p className="text-base font-medium">
                {status === "disconnected" ? "Sesi diputuskan dari layar utama." : errorMessage}
              </p>
            </div>
          )}
        </div>
      )}

      {status === "ready" && (
        <p className="relative mt-auto bg-black/60 p-3 text-center text-xs text-white/70">
          Arahkan kamera ke barcode — otomatis terkirim, tidak perlu menekan apa pun.
        </p>
      )}
    </div>
  );
}
