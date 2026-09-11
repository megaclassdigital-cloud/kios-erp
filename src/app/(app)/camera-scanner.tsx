"use client";

import { useEffect, useRef, useState } from "react";
import type { BrowserMultiFormatReader as BrowserMultiFormatReaderType } from "@zxing/browser";
import { playScanBeep } from "@/shared/barcode/scan-feedback";
import { createNativeBarcodeDetector } from "@/shared/barcode/native-barcode-detector";

interface VideoDevice {
  deviceId: string;
  label: string;
}

/**
 * Camera-based barcode scanner (PRD 71: "Camera Scanner jika browser
 * mendukung"). Uses whatever camera the OS/browser this page is running
 * IN already exposes as a video source — the intended usage is opening
 * Kios-ERP directly in the scanning device's own browser (e.g. a phone
 * or tablet used as the kasir terminal), so that device's own camera is
 * available natively, defaulting to the rear/environment-facing one.
 * A desktop can only see an external phone's camera if that phone is
 * running third-party mirroring software (DroidCam etc.) that exposes
 * it to the OS as a regular webcam — there is no way for a browser to
 * reach into another device's camera over USB/network on its own.
 * Always an alternative input path alongside the USB keyboard-emulating
 * scanner, never a replacement for it.
 */
export function CameraScanner({ onScan }: { onScan: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReaderType | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  // Real retail scanners (a dedicated USB/HID device, same pattern as the
  // "Ketik kode lalu Enter" input below) decode exactly once per physical
  // trigger pull and emit one atomic result — there's no ambiguity to
  // resolve. A camera has no trigger, so it must approximate one in
  // software; the reliable, standard way production scanning SDKs do
  // this (Scandit, Dynamsoft, VisionCamera) is two parts: (1) require the
  // same value to decode successfully several frames in a row before
  // accepting it — filters out a single-frame misread or a code merely
  // passing through the frame — then (2) pause briefly and deterministically
  // right after accepting, mirroring a scanner's "decode once, wait for
  // the next trigger pull" behavior, before it can fire again. Both steps
  // depend only on successful decodes (never on the library reporting an
  // empty frame at some assumed rate, which doesn't hold on every device).
  const CONFIRM_FRAMES = 2;
  const POST_SCAN_PAUSE_MS = 600;
  const candidateRef = useRef<{ code: string; streak: number }>({ code: "", streak: 0 });
  const pausedUntilRef = useRef(0);
  // The decode loop below is started once per `open` toggle and lives on
  // as a long-running callback zxing invokes repeatedly — it must always
  // call the *current* onScan (which closes over the latest barcode
  // index/cache), never the one captured when the camera was opened, or
  // every scan after that permanently misses the fast in-memory lookup
  // and falls back to the slow server round trip.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);

    function acceptScan(code: string) {
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      playScanBeep();
      try {
        navigator.vibrate?.(80);
      } catch {
        // Vibration is a nice-to-have; some browsers/contexts reject it
        // outright (e.g. no user-gesture) — ignore.
      }
      onScanRef.current(code);
    }

    /** Shared by both scan engines below: filters a single frame's
     * decoded value (or null, meaning nothing was read this attempt)
     * through the confirm-frames + post-scan-pause dedup logic. */
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
      acceptScan(value);
    }

    /** The fast path: the browser/OS's own hardware-accelerated barcode
     * engine, polled on a plain setTimeout loop — no JS-side frame
     * decoding at all. */
    async function startNativeScan(detector: BarcodeDetector, deviceId: string) {
      if (!videoRef.current) return;
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
            // A single failed detection attempt isn't fatal — some
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
     * (mainly iOS Safari). */
    async function startZxingScan(deviceId: string) {
      const { BrowserMultiFormatReader, BarcodeFormat } = await import("@zxing/browser");
      const { DecodeHintType } = await import("@zxing/library");
      // Retail 1D formats only — our own internal codes are CODE_128
      // (see barcode-value.ts) and every real-world product barcode
      // this store scans is EAN/UPC/CODE_39. zxing's default (no
      // hints) instead runs every decoder it has, including 2D ones
      // (QR/Data Matrix/Aztec/PDF417) and formats like Codabar/ITF/RSS
      // that never appear here, on every single frame — pure wasted
      // work that was stretching each decode attempt out for nothing.
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
        // zxing's own default is a flat 500ms pause between every decode
        // attempt (success or not) — on top of already-slow multi-format
        // decoding, that alone put a hard floor of 1s+ under the 2
        // confirmation frames this app requires before accepting a scan.
        // Purely local/CPU-bound, no network round trip, so it's safe to
        // run much tighter.
        delayBetweenScanAttempts: 100,
        delayBetweenScanSuccess: 100,
      });
      readerRef.current = reader;
      if (!videoRef.current) return;

      // decodeFromVideoDevice only ever requests { deviceId }, leaving
      // resolution/focus up to the browser's own default — often a low
      // capture resolution that makes a barcode's bars blur together at
      // normal scanning distance, forcing several failed decode
      // attempts (each still paying the inter-attempt delay above)
      // before one finally resolves. Asking for a higher resolution and
      // continuous autofocus directly raises the odds any single frame
      // decodes at all. Both are best-effort "ideal"/"advanced" hints —
      // a device that doesn't support them just ignores them rather
      // than failing getUserMedia.
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
          // own try/catch with no isolation — anything thrown here
          // (even something as environment-specific as navigator.vibrate
          // misbehaving on a particular device) gets treated as a fatal
          // decode error and permanently kills the camera stream, with
          // no error surfaced anywhere in this app's own UI. Never let
          // anything here escape.
          try {
            if (cancelled) return;
            handleFrameResult(result ? result.getText() : null);
          } catch (callbackError) {
            console.error("CameraScanner decode callback failed:", callbackError);
          }
        }
      );
      if (cancelled) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
    }

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError(
            "Akses kamera butuh koneksi HTTPS (atau localhost). Buka halaman ini lewat alamat https://, bukan alamat jaringan lokal (http://192.168...)."
          );
          return;
        }
        // Browsers withhold device labels — and some (Firefox) return an
        // empty list entirely — from enumerateDevices() until the origin
        // has been granted camera permission at least once. Request it
        // with a throwaway stream first so a phone connected via
        // mirroring software (or any other external camera) actually
        // shows up, instead of enumeration silently coming back empty.
        // Asking for facingMode "environment" here also tells us — via
        // the resulting track's actual deviceId — which device the OS
        // considers the rear/back camera, so barcode scanning defaults
        // to that instead of the front-facing camera nobody can scan with.
        const permissionStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        const rearDeviceId = permissionStream.getVideoTracks()[0]?.getSettings().deviceId;
        permissionStream.getTracks().forEach((track) => track.stop());
        if (cancelled) return;

        // Device list is needed either way (for the picker dropdown), so
        // enumerate it directly instead of through zxing's helper — that
        // way the native-detector fast path below never needs to import
        // zxing at all.
        const videoDevices = (await navigator.mediaDevices.enumerateDevices())
          .filter((d) => d.kind === "videoinput")
          .map((d) => ({ deviceId: d.deviceId, label: d.label || "Kamera" }));
        if (cancelled) return;
        if (videoDevices.length === 0) {
          setError("Tidak ada kamera yang terdeteksi.");
          return;
        }
        setDevices(videoDevices);

        // Prefer, in order: the user's own last manual pick, the device
        // the browser resolved facingMode "environment" to, a device
        // whose label says "back"/"rear" (some browsers only expose that
        // hint via the label, not via facingMode resolution), then
        // whatever's first.
        const savedId = localStorage.getItem("kios-erp:camera-device-id");
        const selected =
          videoDevices.find((d) => d.deviceId === savedId) ??
          videoDevices.find((d) => d.deviceId === rearDeviceId) ??
          videoDevices.find((d) => /back|rear|environment/i.test(d.label)) ??
          videoDevices[0];
        setDeviceId(selected.deviceId);
        if (!videoRef.current) return;

        // Try the browser/OS's own hardware-accelerated barcode engine
        // first (see barcode-detector.d.ts) — the same class of API a
        // native QRIS-scanning app uses, reading a barcode in a handful
        // of milliseconds regardless of angle/lighting, unlike decoding
        // video frames in pure JS. Falls back to the zxing path below
        // wherever it isn't available (mainly iOS Safari).
        const nativeDetector = await createNativeBarcodeDetector();
        if (nativeDetector) {
          await startNativeScan(nativeDetector, selected.deviceId);
        } else {
          await startZxingScan(selected.deviceId);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error && err.name === "NotAllowedError"
              ? "Izin kamera ditolak. Aktifkan izin kamera untuk browser ini."
              : "Gagal mengakses kamera."
          );
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function switchDevice(id: string) {
    setDeviceId(id);
    localStorage.setItem("kios-erp:camera-device-id", id);
    // Restart the decode loop on the newly selected device.
    controlsRef.current?.stop();
    controlsRef.current = null;
    setOpen(false);
    setTimeout(() => setOpen(true), 50);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        {open ? "Tutup Kamera" : "Gunakan Kamera"}
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-gray-200 p-2">
          {devices.length > 1 && (
            <select
              value={deviceId}
              onChange={(e) => switchDevice(e.target.value)}
              className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          )}
          {error ? (
            <p className="p-2 text-xs text-red-600">{error}</p>
          ) : (
            <div className="relative overflow-hidden rounded-md">
              <video ref={videoRef} className="w-full bg-black" muted playsInline />
              {flash && <div className="pointer-events-none absolute inset-0 bg-green-400/40" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
