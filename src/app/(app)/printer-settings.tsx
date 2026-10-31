"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { printTestPage } from "@/shared/printing/print-receipt";
import { readPrinterConfig, writePrinterConfig, type PrinterConfig, type PrinterMode } from "@/shared/printing/printer-config";
import { pairBluetoothPrinter, pairUsbPrinter, printErrorMessage, supportsBluetooth, supportsUsb } from "@/shared/printing/transports";

const MODES: { mode: PrinterMode; title: string; help: string }[] = [
  { mode: "usb", title: "Printer USB (kabel / adaptor USB-C)", help: "Cetak langsung, tanpa jendela preview. Hubungkan sekali, lalu otomatis." },
  { mode: "rawbt", title: "Printer Bluetooth lewat aplikasi RawBT", help: "Untuk printer Bluetooth biasa. Pasang aplikasi RawBT (gratis) dan pilih printernya di sana." },
  { mode: "bluetooth", title: "Printer Bluetooth langsung (uji coba)", help: "Tanpa aplikasi tambahan, tapi hanya untuk printer Bluetooth jenis BLE. Tidak semua printer bisa." },
  { mode: "browser", title: "Lewat jendela cetak browser (cadangan)", help: "Memakai dialog cetak Android. Lebih lambat karena ada preview." },
];

/** Where and how this device prints receipts. Saved on the device. */
export function PrinterSettingsModal({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<PrinterConfig>(() => readPrinterConfig());
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [usbOk, setUsbOk] = useState(true);
  const [bleOk, setBleOk] = useState(true);

  // Support is read after mount: the server render cannot know the browser.
  useEffect(() => {
    setUsbOk(supportsUsb());
    setBleOk(supportsBluetooth());
  }, []);

  function update(next: Partial<PrinterConfig>) {
    const merged = { ...config, ...next };
    // Automatic printing needs no tap, which only USB and RawBT can do.
    if (merged.mode === "browser" || merged.mode === "bluetooth") merged.autoPrint = false;
    setConfig(merged);
    writePrinterConfig(merged);
  }

  async function connect() {
    setBusy(true);
    setStatus(null);
    try {
      const name = config.mode === "usb" ? await pairUsbPrinter() : await pairBluetoothPrinter();
      setStatus(`Terhubung: ${name}`);
      toast.success(`${name} terhubung.`);
    } catch (error) {
      setStatus(printErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    const outcome = await printTestPage();
    setBusy(false);
    setStatus(outcome.ok ? "Tes cetak dikirim. Cek kertas keluar dari printer." : outcome.message);
  }

  const disabled = (m: PrinterMode) => (m === "usb" && !usbOk) || (m === "bluetooth" && !bleOk);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-5 shadow-xl">
        <h2 className="text-base font-semibold text-foreground">Pengaturan Printer Struk</h2>
        <p className="mt-0.5 mb-3 text-xs text-muted-foreground">Berlaku untuk perangkat ini saja. Setiap tablet kasir punya pengaturannya sendiri.</p>

        <div className="space-y-2">
          {MODES.map((m) => (
            <label key={m.mode} className={`flex items-start gap-2 rounded-lg border p-3 ${config.mode === m.mode ? "border-primary bg-primary-soft" : "border-border"} ${disabled(m.mode) ? "opacity-50" : ""}`}>
              <input type="radio" name="printer-mode" checked={config.mode === m.mode} disabled={disabled(m.mode)} onChange={() => update({ mode: m.mode })} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-foreground">{m.title}</span>
                <span className="block text-[11px] leading-relaxed text-muted-foreground">
                  {m.help}
                  {disabled(m.mode) && " Browser ini belum mendukungnya — pakai Chrome atau Edge di Android."}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-foreground">
            Lebar kertas
            <select value={config.columns} onChange={(e) => update({ columns: e.target.value === "48" ? 48 : 32 })} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
              <option value={32}>58 mm (32 karakter)</option>
              <option value={48}>80 mm (48 karakter)</option>
            </select>
          </label>
          <div className="space-y-1.5 text-xs text-foreground">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={config.autoPrint} disabled={config.mode === "browser" || config.mode === "bluetooth"} onChange={(e) => update({ autoPrint: e.target.checked })} />
              Cetak otomatis setelah bayar
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={config.openDrawer} onChange={(e) => update({ openDrawer: e.target.checked })} />
              Buka laci kas (jika tersambung)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={config.cut} onChange={(e) => update({ cut: e.target.checked })} />
              Potong kertas (hanya printer bergilotin)
            </label>
          </div>
        </div>

        {(config.mode === "usb" || config.mode === "bluetooth") && (
          <button type="button" disabled={busy} onClick={connect} className="mt-3 w-full rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
            {config.mode === "usb" ? "Hubungkan printer USB" : "Cari & hubungkan printer Bluetooth"}
          </button>
        )}
        {config.mode === "rawbt" && (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 text-[11px] text-muted-foreground">
            Pasang RawBT dari Play Store, buka sekali, pilih printer Bluetooth Anda di sana, lalu kembali ke sini dan tekan Tes cetak. Struk dikirim ke RawBT dan tercetak tanpa preview.
          </p>
        )}
        {status && <p className="mt-2 text-xs text-foreground">{status}</p>}

        <div className="mt-4 flex gap-2">
          <button type="button" disabled={busy || config.mode === "browser"} onClick={test} className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
            Tes cetak
          </button>
          <button type="button" onClick={onClose} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
