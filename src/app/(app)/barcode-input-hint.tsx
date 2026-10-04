/** One sentence under every scan box in the app, so the three input paths
 * never have to be explained per page.
 *
 * It used to say only the camera submits by itself. That stopped being true
 * once the USB wedge scanner was captured page-wide: a scanner configured
 * with no suffix completes on its own idle timeout, exactly like the camera.
 * The only path that still needs Enter is a human typing. */
export function BarcodeInputHint() {
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      Scanner, kamera, dan HP terpasang mengirim otomatis — dan scan tetap tertangkap walau kursor
      sedang di tempat lain. Hanya kalau Anda mengetik kodenya sendiri, tekan Enter.
    </p>
  );
}
