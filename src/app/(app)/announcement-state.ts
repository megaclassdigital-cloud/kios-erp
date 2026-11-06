/**
 * Remembers, in this tab, which announcement's tutorial is running, so that
 * finishing the tutorial is what completes the announcement -- not merely
 * reading it. sessionStorage survives the navigation to the feature's page and
 * is gone when the tab closes, which is exactly the lifetime wanted.
 */
const KEY = "kios-erp.announcement.tour";

export function markTourPending(announcementKey: string): void {
  try {
    window.sessionStorage.setItem(KEY, announcementKey);
  } catch {
    // Without storage the announcement simply comes back after a reload.
  }
}

export function pendingTourKey(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Called when a guided tour reaches its last step. Records the announcement as completed, once. */
export async function completePendingTour(): Promise<void> {
  const key = pendingTourKey();
  if (!key) return;
  try {
    const res = await fetch("/api/announcements/ack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
    if (res.ok) window.sessionStorage.removeItem(KEY);
  } catch {
    // Left pending: the next completed tour (or a reload) tries again.
  }
}
