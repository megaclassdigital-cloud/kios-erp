"use client";

import { useEffect, useRef, useState } from "react";
import { use } from "react";
import { playScanBeep } from "@/shared/barcode/scan-feedback";
import { createNativeBarcodeDetector } from "@/shared/barcode/native-barcode-detector";

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

        // Try the browser/OS's own hardware-accelerated barcode engine
        // first (see barcode-detector.d.ts) -- this is the same class of
        // API a native QRIS-scanning app uses, and reads a barcode in a
        // handful of milliseconds regardless of angle/lighting, unlike
        // decoding video frames in pure JS. Falls back to the zxing path
        // below wherever it isn't available (mainly iOS Safari).
        const nativeDetector = await createNativeBarcodeDetector();
        if (nativeDetector) {
          await startNativeScan(nativeDetector, rearDeviceId);
        } else {
          await startZxingScan(rearDeviceId);
        }
        if (cancelled) return;

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

    /** Shared by both scan engines below: filters a single frame's
     * decoded value (or null, meaning nothing was read this attempt)
     * through the confirm-frames + post-scan-pause dedup logic (see
     * camera-scanner.tsx), then dispatches a confirmed read to
     * submitScan. */
    function handleFrameResult(value: string | null) {
      if (Date.now() < pausedUntilRef.current) return;
      if (!value) {
        candidateRef.current = { code: "", streak: 0 };
        return;
      }
      candidateRef.current =
        candidateRef.current.code === value
          ? { code: value, streak: candidateRef.current.streak + 1 }
          : { code: value, streak: 1 };
      if (candidateRef.current.streak < CONFIRM_FRAMES) return;

      pausedUntilRef.current = Date.now() + POST_SCAN_PAUSE_MS;
      candidateRef.current = { code: "", streak: 0 };
      submitScan(value);
    }

    async function pickDeviceId(rearDeviceId: string | undefined): Promise<string | undefined> {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
      const target =
        devices.find((d) => d.deviceId === rearDeviceId) ??
        devices.find((d) => /back|rear|environment/i.test(d.label)) ??
        devices[0];
      return target?.deviceId;
    }

    /** The fast path: the browser/OS's own hardware-accelerated barcode
     * engine, polled on a plain setTimeout loop instead of zxing's decode
     * loop entirely -- no JS-side frame decoding at all. */
    async function startNativeScan(detector: BarcodeDetector, rearDeviceId: string | undefined) {
      const deviceId = await pickDeviceId(rearDeviceId);
      if (!deviceId || !videoRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
        },
      });
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setStatus("ready");

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let stopped = false;
      // Assigned before the loop starts (synchronously, no await in
      // between) so the effect's cleanup can always reach this stream —
      // never a window where a stream is live but nothing can stop it.
      controlsRef.current = {
        stop: () => {
          stopped = true;
          if (timeoutId) clearTimeout(timeoutId);
          stream.getTracks().forEach((track) => track.stop());
        },
      };

      async function tick() {
        if (stopped) return;
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const codes = await detector.detect(videoRef.current);
            handleFrameResult(codes[0]?.rawValue ?? null);
          } catch (detectError) {
            // A single failed detection attempt isn't fatal -- some
            // implementations throw on a frame with nothing recognizable
            // in it. Just try again next tick.
            console.error("Native barcode detect failed:", detectError);
          }
        }
        if (!stopped) timeoutId = setTimeout(tick, 80);
      }
      tick();
    }

    /** The fallback path for browsers without the Shape Detection API
     * (mainly iOS Safari) -- the same tuned zxing setup as
     * camera-scanner.tsx: retail-format hints only, a tight inter-attempt
     * delay, and a higher-resolution/continuous-focus stream request. */
    async function startZxingScan(rearDeviceId: string | undefined) {
      const { BrowserMultiFormatReader, BarcodeFormat } = await import("@zxing/browser");
      const { DecodeHintType } = await import("@zxing/library");
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
      const deviceId = await pickDeviceId(rearDeviceId);
      if (!deviceId || !videoRef.current) return;

      setStatus("ready");
      const controls = await reader.decodeFromConstraints(
        {
          video: {
            deviceId: { exact: deviceId },
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
            handleFrameResult(result ? result.getText() : null);
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
