"use client";

import { useEffect, useRef, useState } from "react";
import type { BrowserMultiFormatReader as BrowserMultiFormatReaderType } from "@zxing/browser";

interface VideoDevice {
  deviceId: string;
  label: string;
}

/**
 * Camera-based barcode scanner (PRD 71: "Camera Scanner jika browser
 * mendukung"). A browser can't detect a phone connected over USB as a
 * distinct device — what it CAN do is treat any camera the OS already
 * exposes as a video source (a built-in webcam, or a phone running
 * camera-mirroring software so Windows/macOS sees it as a webcam) as a
 * scanner. This lists those devices, lets the user pick one, and decodes
 * barcodes continuously from the live feed as an alternative input path
 * to the USB keyboard-emulating scanner — never a replacement for it.
 */
export function CameraScanner({ onScan }: { onScan: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReaderType | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);

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
        const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
        permissionStream.getTracks().forEach((track) => track.stop());
        if (cancelled) return;

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (cancelled) return;
        if (videoDevices.length === 0) {
          setError("Tidak ada kamera yang terdeteksi.");
          return;
        }
        setDevices(videoDevices.map((d) => ({ deviceId: d.deviceId, label: d.label || "Kamera" })));

        const savedId = localStorage.getItem("kios-erp:camera-device-id");
        const selected = videoDevices.find((d) => d.deviceId === savedId) ?? videoDevices[0];
        setDeviceId(selected.deviceId);

        if (!videoRef.current) return;
        const controls = await reader.decodeFromVideoDevice(
          selected.deviceId,
          videoRef.current,
          (result) => {
            if (!result) return;
            const code = result.getText();
            const now = Date.now();
            // Debounce: the same code sits in frame for many decode cycles —
            // only forward it once every 1.5s so it isn't scanned repeatedly.
            if (lastScanRef.current.code === code && now - lastScanRef.current.at < 1500) return;
            lastScanRef.current = { code, at: now };
            onScan(code);
          }
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
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
        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
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
            <video ref={videoRef} className="w-full rounded-md bg-black" muted playsInline />
          )}
        </div>
      )}
    </div>
  );
}
