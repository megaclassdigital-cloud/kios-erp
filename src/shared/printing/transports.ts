/**
 * Getting ESC/POS bytes from the browser to a thermal printer.
 *
 *  - USB  (WebUSB): printer plugged into the tablet through a USB-C adapter.
 *    After one permission tap it prints instantly, with no dialog.
 *  - RawBT: a free Android app that owns the Bluetooth (or USB) printer; the
 *    page hands it the bytes through a link. Works with ordinary Bluetooth
 *    printers, which a web page cannot reach by itself.
 *  - Bluetooth (Web Bluetooth): straight from the browser, but only for
 *    printers that speak Bluetooth Low Energy.
 *
 * All of it needs Chrome or Edge on Android, over HTTPS. The code is thin and
 * defensive on purpose: it cannot be exercised without the hardware.
 */

// Minimal ambient types: WebUSB and Web Bluetooth are not in TypeScript's DOM lib.
interface UsbEndpoint { endpointNumber: number; direction: "in" | "out"; type: string }
interface UsbAlternate { interfaceClass: number; endpoints: UsbEndpoint[] }
interface UsbInterface { interfaceNumber: number; alternates: UsbAlternate[]; alternate: UsbAlternate }
interface UsbDevice {
  vendorId: number;
  productId: number;
  productName?: string;
  opened: boolean;
  configuration: { interfaces: UsbInterface[] } | null;
  open(): Promise<void>;
  selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  transferOut(endpoint: number, data: BufferSource): Promise<{ status: string }>;
  close(): Promise<void>;
}
interface UsbApi {
  getDevices(): Promise<UsbDevice[]>;
  requestDevice(options: { filters: object[] }): Promise<UsbDevice>;
}
interface BleCharacteristic {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValue(data: BufferSource): Promise<void>;
  writeValueWithoutResponse?(data: BufferSource): Promise<void>;
}
interface BleServer {
  connected: boolean;
  getPrimaryServices(): Promise<{ getCharacteristics(): Promise<BleCharacteristic[]> }[]>;
}
interface BleDevice { name?: string; gatt?: { connected: boolean; connect(): Promise<BleServer> } }
interface BluetoothApi {
  requestDevice(options: { acceptAllDevices: boolean; optionalServices: string[] }): Promise<BleDevice>;
}

const nav = () => navigator as unknown as { usb?: UsbApi; bluetooth?: BluetoothApi };
export const supportsUsb = () => typeof navigator !== "undefined" && !!nav().usb;
export const supportsBluetooth = () => typeof navigator !== "undefined" && !!nav().bluetooth;

export class PrintError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- USB
const USB_KEY = "kios-erp.printer.usb";
let usbLink: { device: UsbDevice; endpoint: number } | null = null;

function remember(vendorId: number, productId: number) {
  try {
    window.localStorage.setItem(USB_KEY, JSON.stringify({ vendorId, productId }));
  } catch {
    // Without storage the printer is simply asked for again next time.
  }
}
function remembered(): { vendorId: number; productId: number } | null {
  try {
    return JSON.parse(window.localStorage.getItem(USB_KEY) ?? "null");
  } catch {
    return null;
  }
}

async function openUsb(device: UsbDevice): Promise<{ device: UsbDevice; endpoint: number }> {
  if (!device.opened) await device.open();
  if (!device.configuration) await device.selectConfiguration(1);
  // The printer class (7) interface when there is one, otherwise any interface with a bulk OUT endpoint.
  const candidates = (device.configuration?.interfaces ?? []).flatMap((i) =>
    i.alternates.flatMap((a) => {
      const out = a.endpoints.find((e) => e.direction === "out" && e.type === "bulk");
      return out ? [{ iface: i.interfaceNumber, printerClass: a.interfaceClass === 7, endpoint: out.endpointNumber }] : [];
    })
  );
  const pick = candidates.find((c) => c.printerClass) ?? candidates[0];
  if (!pick) throw new PrintError("Printer USB ini tidak punya jalur cetak yang bisa dipakai.");
  await device.claimInterface(pick.iface);
  return { device, endpoint: pick.endpoint };
}

/** Must be called from a tap: the browser asks which USB device may be used. */
export async function pairUsbPrinter(): Promise<string> {
  const api = nav().usb;
  if (!api) throw new PrintError("Browser ini belum mendukung printer USB. Pakai Chrome atau Edge di Android.");
  const device = await api.requestDevice({ filters: [] });
  usbLink = await openUsb(device);
  remember(device.vendorId, device.productId);
  return device.productName ?? "Printer USB";
}

async function sendUsb(bytes: Uint8Array): Promise<void> {
  const api = nav().usb;
  if (!api) throw new PrintError("Browser ini belum mendukung printer USB.");
  const attempt = async () => {
    if (!usbLink) {
      const saved = remembered();
      const granted = await api.getDevices();
      const device = granted.find((d) => !saved || (d.vendorId === saved.vendorId && d.productId === saved.productId)) ?? granted[0];
      if (!device) throw new PrintError("Printer USB belum dihubungkan. Buka Pengaturan Printer lalu tekan Hubungkan.");
      usbLink = await openUsb(device);
    }
    // Small chunks: cheap printers have small buffers.
    for (let i = 0; i < bytes.length; i += 512) {
      const res = await usbLink.device.transferOut(usbLink.endpoint, bytes.slice(i, i + 512));
      if (res.status !== "ok") throw new PrintError("Printer tidak menerima data.");
    }
  };
  try {
    await attempt();
  } catch (error) {
    // A cable moved or the tablet slept: forget the link and try once from scratch.
    usbLink = null;
    if (error instanceof PrintError && error.message.includes("belum dihubungkan")) throw error;
    await attempt();
  }
}

// ---------------------------------------------------------------- RawBT
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Hands the job to the RawBT app. There is no reply, so success only means "sent". */
function sendRawBt(bytes: Uint8Array): void {
  window.location.href = `rawbt:base64,${toBase64(bytes)}`;
}

// ---------------------------------------------------------------- Bluetooth LE
const BLE_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
];
let bleDevice: BleDevice | null = null;
let bleChar: BleCharacteristic | null = null;

async function openBle(device: BleDevice): Promise<BleCharacteristic> {
  const server = await device.gatt!.connect();
  for (const service of await server.getPrimaryServices()) {
    for (const c of await service.getCharacteristics()) if (c.properties.write || c.properties.writeWithoutResponse) return c;
  }
  throw new PrintError("Printer Bluetooth ini tidak bisa dipakai langsung dari browser. Coba lewat aplikasi RawBT.");
}

/** Must be called from a tap. */
export async function pairBluetoothPrinter(): Promise<string> {
  const api = nav().bluetooth;
  if (!api) throw new PrintError("Browser ini belum mendukung Bluetooth langsung. Pakai Chrome atau Edge di Android.");
  bleDevice = await api.requestDevice({ acceptAllDevices: true, optionalServices: BLE_SERVICES });
  bleChar = await openBle(bleDevice);
  return bleDevice.name ?? "Printer Bluetooth";
}

async function sendBle(bytes: Uint8Array): Promise<void> {
  if (!bleDevice) throw new PrintError("Printer Bluetooth belum dihubungkan. Buka Pengaturan Printer lalu tekan Hubungkan.");
  if (!bleChar || !bleDevice.gatt?.connected) bleChar = await openBle(bleDevice);
  for (let i = 0; i < bytes.length; i += 100) {
    const chunk = bytes.slice(i, i + 100);
    if (bleChar.properties.writeWithoutResponse && bleChar.writeValueWithoutResponse) await bleChar.writeValueWithoutResponse(chunk);
    else await bleChar.writeValue(chunk);
    await sleep(20);
  }
}

// ---------------------------------------------------------------- entry
export async function sendToPrinter(mode: "usb" | "rawbt" | "bluetooth", bytes: Uint8Array): Promise<void> {
  if (mode === "usb") return sendUsb(bytes);
  if (mode === "bluetooth") return sendBle(bytes);
  sendRawBt(bytes);
}

/** A sentence a shopkeeper can act on, whatever went wrong inside. */
export function printErrorMessage(error: unknown): string {
  if (error instanceof PrintError) return error.message;
  const name = (error as { name?: string })?.name;
  if (name === "NotFoundError" || name === "AbortError") return "Pemilihan printer dibatalkan.";
  if (name === "SecurityError" || name === "NotAllowedError") return "Izin printer ditolak. Coba hubungkan lagi dari Pengaturan Printer.";
  if (name === "NetworkError" || name === "InvalidStateError") return "Printer terputus. Cek kabel atau daya printer, lalu hubungkan lagi.";
  return "Gagal mencetak. Cek printer, lalu coba lagi.";
}
