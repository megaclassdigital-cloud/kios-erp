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
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // See camera-scanner.tsx for the reasoning: require the same value to
  // decode successfully a couple of frames in a row before accepting it
  // (filters out a single-frame misread), then pause briefly and
  // deterministically after accepting — the same decode-once-per-trigger
  // model a real handheld scanner uses.
  const CONFIRM_FRAMES = 2;
  const POST_SCAN_PAUSE_MS = 600;
  const candidateRef = useRef<{ code: string; streak: number }>({ code: "", streak: 0 });
  const pausedUntilRef = useRef(0);

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

        const { BrowserMultiFormatReader, BarcodeFormat } = await import("@zxing/browser");
        const { DecodeHintType } = await import("@zxing/library");
        // See camera-scanner.tsx for the full reasoning: restricting to
        // the retail 1D formats this app actually scans (instead of
        // zxing's default of trying every decoder it has, including 2D
        // ones) and tightening the fixed inter-attempt pause both cut
        // real decode-to-confirm time dramatically. This page had its own
        // separate zxing setup that never got that tuning, which is why
        // the phone path stayed slow after the main terminal camera did not.
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_39,
        ]);
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 100,
          delayBetweenScanSuccess: 100,
        });
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const target =
          devices.find((d) => d.deviceId === rearDeviceId) ??
          devices.find((d) => /back|rear|environment/i.test(d.label)) ??
          devices[0];
        if (!target || !videoRef.current) return;

        setStatus("ready");
        // Same as camera-scanner.tsx: request a higher resolution and
        // continuous autofocus instead of decodeFromVideoDevice's bare
        // { deviceId }, which leaves capture quality at the browser's low
        // default and forces extra failed decode attempts at normal
        // scanning distance. Both are best-effort and degrade gracefully.
        const controls = await reader.decodeFromConstraints(
          {
            video: {
              deviceId: { exact: target.deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
            },
          },
          videoRef.current,
          (result) => {
            // zxing's own decode loop calls this callback from inside its
            // own try/catch with no isolation — anything thrown here gets
            // treated as a fatal decode error and permanently kills the
            // camera stream. Never let anything here escape.
            try {
              if (cancelled) return;
              if (Date.now() < pausedUntilRef.current) return;
              if (!result) {
                candidateRef.current = { code: "", streak: 0 };
                return;
              }
              const value = result.getText();
              candidateRef.current =
                candidateRef.current.code === value
                  ? { code: value, streak: candidateRef.current.streak + 1 }
                  : { code: value, streak: 1 };
              if (candidateRef.current.streak < CONFIRM_FRAMES) return;

              pausedUntilRef.current = Date.now() + POST_SCAN_PAUSE_MS;
              candidateRef.current = { code: "", streak: 0 };
              submitScan(value);
            } catch (callbackError) {
              console.error("Scan decode callback failed:", callbackError);
            }
          }
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;

        // Prove liveness to the desktop side even when nothing is being
        // scanned right now — without this, the only signal a dropped
        // connection ever produced was the *next* scan failing, which
        // could be minutes away (or never, if the cashier gives up first).
        async function heartbeatLoop() {
          if (cancelled) return;
          try {
            const res = await fetch(`/api/scan-session/${code}/heartbeat`, { method: "POST" });
            if (!res.ok && (res.status === 404 || res.status === 400)) {
              controlsRef.current?.stop();
              setStatus("disconnected");
              return;
            }
          } catch {
            // A single failed heartbeat (transient network blip) isn't
            // fatal — only an explicit "session gone" response is.
          }
          if (!cancelled) heartbeatTimeoutRef.current = setTimeout(heartbeatLoop, 4000);
        }
        heartbeatTimeoutRef.current = setTimeout(heartbeatLoop, 4000);
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
      try {
        navigator.vibrate?.(80);
      } catch {
        // Vibration is a nice-to-have; ignore if the browser rejects it.
      }

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
      if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
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
