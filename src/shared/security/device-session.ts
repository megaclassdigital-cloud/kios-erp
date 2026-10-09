/**
 * "Is this your permanent device?" -- chosen at every login.
 *
 * The answer is a cookie next to the Auth.js session:
 *   - permanent: lives as long as the session itself, so the login is kept.
 *   - temporary: a *session* cookie (no expiry), which the browser drops when
 *     it is closed. The middleware requires this cookie to exist, so a
 *     temporary device is signed out the moment the browser is closed.
 * Closing just the tab is covered in the browser by DeviceSessionGuard, using
 * sessionStorage, which dies with the tab.
 *
 * Nothing here is a secret and nothing is trusted for authorization: the
 * session JWT still decides who you are. This only decides how long the
 * device is allowed to stay signed in.
 */
export const DEVICE_COOKIE = "kios_device";
export const TAB_MARKER_KEY = "kios.tab";
/** Matches Auth.js's default JWT lifetime (30 days), so "permanent" never
 * outlives the session it belongs to. */
export const PERMANENT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type DeviceKind = "permanent" | "temporary";

/** A missing or unrecognised value means the device question was never
 * answered, which is treated as not signed in (fail closed). */
export function parseDeviceKind(value: string | undefined | null): DeviceKind | null {
  return value === "permanent" || value === "temporary" ? value : null;
}

export function deviceCookieOptions(kind: DeviceKind, secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    // Omitting maxAge is what makes it a session cookie.
    ...(kind === "permanent" ? { maxAge: PERMANENT_MAX_AGE_SECONDS } : {}),
  };
}
