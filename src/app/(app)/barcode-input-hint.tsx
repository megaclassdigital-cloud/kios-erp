/** The keyboard-emulating USB scanner (and manual typing) needs Enter to
 * submit — the camera scanner submits automatically as soon as it decodes
 * a code. Surfacing that distinction here so the input's own placeholder
 * text never claims "lalu Enter" applies to both input modes. */
export function BarcodeInputHint() {
  return (
    <p className="mt-1 text-xs text-gray-400">
      Kamera memindai dan mengirim otomatis — tidak perlu menekan Enter.
    </p>
  );
}
