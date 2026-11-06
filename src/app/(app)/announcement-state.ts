/**
 * Which announcements this device has already shown. Stored on the device, so
 * each tablet or computer reads an announcement once, whoever is signed in, and
 * it does not come back on later reloads.
 */
const KEY = "kios-erp.announcements.seen";

/** Within a private window with blocked storage, at least not twice in one visit. */
const inMemory = new Set<string>();

export function seenOnDevice(): Set<string> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set([...(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : []), ...inMemory]);
  } catch {
    return new Set(inMemory);
  }
}

export function markSeenOnDevice(key: string): void {
  inMemory.add(key);
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...seenOnDevice()]));
  } catch {
    // Kept in memory for this visit.
  }
}
