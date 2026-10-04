/**
 * The stable id of *this physical machine*, minted once in the browser and
 * kept in localStorage. It is the only link between a till and its
 * PosTerminal row — the browser cannot read anything about the hardware
 * itself, so the machine has to carry its own name tag.
 *
 * Losing it (cleared site data, different browser) is harmless by design:
 * the terminal simply registers again as a new one. That is why nothing
 * important is keyed off it beyond the hardware profile, which is a
 * convenience record, never an authorization or an audit trail.
 */
const STORAGE_KEY = "kios-erp.terminal-device-key";

/** Falls back to a per-tab value when storage is unavailable (private
 * window, blocked site data) so the POS still works — it just re-registers
 * as a fresh terminal instead of throwing. */
let inMemoryKey: string | null = null;

export function getTerminalDeviceKey(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const minted = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, minted);
    return minted;
  } catch {
    inMemoryKey ??= crypto.randomUUID();
    return inMemoryKey;
  }
}
