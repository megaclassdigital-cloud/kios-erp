// Ambient types for the Shape Detection API's BarcodeDetector -- not yet
// part of TypeScript's bundled DOM lib. This is the browser's own
// hardware-accelerated barcode engine (the same class of API native
// camera/QRIS apps use under the hood), dramatically faster and more
// reliable at an angle or in poor light than decoding video frames in
// pure JS ever can be. Supported in Chrome/Edge (desktop and Android);
// absent in Safari/iOS and Firefox, where camera-scanner.tsx and
// /scan/[code]/page.tsx fall back to the zxing-based path instead.
// https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API
interface NativeDetectedBarcode {
  rawValue: string;
  format: string;
}

declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  static getSupportedFormats(): Promise<string[]>;
  detect(image: CanvasImageSource): Promise<NativeDetectedBarcode[]>;
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}
