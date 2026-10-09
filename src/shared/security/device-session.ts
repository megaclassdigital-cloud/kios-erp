/**
 * "Is this your permanent device?" -- asked at every login, enforced on the
 * server.
 *
 * The answer is a signed cookie (`kios_device`) kept beside the Auth.js
 * session. Its value is `<kind>.<issuedAtMs>.<signature>`:
 *   - permanent: kept as long as the session (30 days). Nothing else to check.
 *   - temporary: a *session* cookie, so closing the browser drops it, and it
 *     carries a timestamp the middleware refreshes on every request. If the
 *     device is idle for more than an hour the login is ended. An hour, not
 *     "the moment the tab closes", so a tab closed by accident does not throw
 *     anyone out -- but a computer left behind is locked within the hour.
 *
 * The signature (HMAC over AUTH_SECRET) stops anyone editing the timestamp to
 * stay in forever. The session JWT still decides *who* you are; this only
 * decides how long a device may stay signed in.
 *
 * Uses Web Crypto only, so it runs in the Edge middleware as well as Node.
 */
export const DEVICE_COOKIE = "kios_device";
/** Matches Auth.js's default JWT lifetime (30 days). */
export const PERMANENT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
/** A temporary device is signed out after this long without a request. */
export const TEMPORARY_IDLE_MS = 60 * 60 * 1000;
/** How long after a password login the device question may still be answered
 * without typing the password again. */
export const CONFIRM_WINDOW_MS = 10 * 60 * 1000;
/** The idle clock is only rewritten when this stale, to avoid a Set-Cookie on
 * every single request. */
export const REFRESH_AFTER_MS = 60 * 1000;

export type DeviceKind = "permanent" | "temporary";

const encoder = new TextEncoder();

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  let bin = "";
  for (const b of mac) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function issueDeviceCookie(kind: DeviceKind, secret: string, nowMs: number): Promise<string> {
  const payload = `${kind}.${nowMs}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function readDeviceCookie(
  value: string | undefined | null,
  secret: string | undefined
): Promise<{ kind: DeviceKind; issuedAt: number } | null> {
  if (!value || !secret) return null;
  const [kind, issued, signature, ...rest] = value.split(".");
  if (rest.length > 0 || (kind !== "permanent" && kind !== "temporary")) return null;
  const issuedAt = Number(issued);
  if (!Number.isFinite(issuedAt) || !signature) return null;
  if (!safeEqual(signature, await sign(`${kind}.${issued}`, secret))) return null;
  return { kind, issuedAt };
}

export type DeviceDecision =
  /** Let the request through; `refresh` is a new cookie value to set, if any. */
  | { action: "allow"; refresh?: string }
  /** Signed in a moment ago but the question is unanswered: ask it. */
  | { action: "confirm" }
  /** Not allowed: end the session and send the user to the login form. */
  | { action: "reject" };

/**
 * The whole policy in one place, so it can be tested without a browser.
 * `loginAt` is when the password was last typed (from the session token).
 */
export async function decideDevice(input: {
  cookieValue: string | undefined;
  loginAt: number | undefined;
  secret: string | undefined;
  nowMs: number;
}): Promise<DeviceDecision> {
  const { cookieValue, loginAt, secret, nowMs } = input;
  const device = await readDeviceCookie(cookieValue, secret);

  if (device) {
    if (device.kind === "permanent") return { action: "allow" };
    if (nowMs - device.issuedAt > TEMPORARY_IDLE_MS) return { action: "reject" };
    if (nowMs - device.issuedAt > REFRESH_AFTER_MS && secret) {
      return { action: "allow", refresh: await issueDeviceCookie("temporary", secret, nowMs) };
    }
    return { action: "allow" };
  }

  // No usable answer. Either a login that has not answered yet, or a browser
  // that was closed (which wiped a temporary device's cookie). Only the first
  // may answer without a password -- otherwise closing the browser would not
  // sign anyone out.
  if (secret && loginAt !== undefined && nowMs - loginAt <= CONFIRM_WINDOW_MS) return { action: "confirm" };
  return { action: "reject" };
}

export function deviceCookieOptions(kind: DeviceKind, secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    // Omitting maxAge is what makes a temporary device's cookie a session cookie.
    ...(kind === "permanent" ? { maxAge: PERMANENT_MAX_AGE_SECONDS } : {}),
  };
}

/** Auth.js's session cookie, under both of its names (plain and __Secure-). */
export const SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];
