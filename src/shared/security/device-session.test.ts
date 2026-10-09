import { describe, expect, it } from "vitest";
import {
  CONFIRM_WINDOW_MS,
  PERMANENT_MAX_AGE_SECONDS,
  REFRESH_AFTER_MS,
  TEMPORARY_IDLE_MS,
  decideDevice,
  deviceCookieOptions,
  issueDeviceCookie,
  readDeviceCookie,
} from "./device-session";

const SECRET = "test-secret";
const T0 = 1_800_000_000_000;

describe("device cookie", () => {
  it("round-trips kind and issue time", async () => {
    const v = await issueDeviceCookie("temporary", SECRET, T0);
    expect(await readDeviceCookie(v, SECRET)).toEqual({ kind: "temporary", issuedAt: T0 });
  });

  it("rejects a tampered timestamp, kind, or secret", async () => {
    const v = await issueDeviceCookie("temporary", SECRET, T0);
    const [kind, , sig] = v.split(".");
    expect(await readDeviceCookie(`${kind}.${T0 + 1}.${sig}`, SECRET)).toBeNull();
    expect(await readDeviceCookie(`permanent.${T0}.${sig}`, SECRET)).toBeNull();
    expect(await readDeviceCookie(v, "other-secret")).toBeNull();
  });

  it("rejects missing, malformed, or unsignable values", async () => {
    expect(await readDeviceCookie(undefined, SECRET)).toBeNull();
    expect(await readDeviceCookie("", SECRET)).toBeNull();
    expect(await readDeviceCookie("permanent", SECRET)).toBeNull();
    expect(await readDeviceCookie("permanent.abc.sig", SECRET)).toBeNull();
    expect(await readDeviceCookie(await issueDeviceCookie("permanent", SECRET, T0), undefined)).toBeNull();
  });
});

describe("decideDevice", () => {
  const base = { secret: SECRET, loginAt: T0 - 24 * 3600_000 };

  it("lets a permanent device through without touching the cookie", async () => {
    const cookieValue = await issueDeviceCookie("permanent", SECRET, T0 - 20 * 24 * 3600_000);
    expect(await decideDevice({ ...base, cookieValue, nowMs: T0 })).toEqual({ action: "allow" });
  });

  it("lets a recently active temporary device through without a rewrite", async () => {
    const cookieValue = await issueDeviceCookie("temporary", SECRET, T0);
    expect(await decideDevice({ ...base, cookieValue, nowMs: T0 + REFRESH_AFTER_MS - 1 })).toEqual({ action: "allow" });
  });

  it("slides the idle clock forward once the stamp is stale", async () => {
    const cookieValue = await issueDeviceCookie("temporary", SECRET, T0);
    const d = await decideDevice({ ...base, cookieValue, nowMs: T0 + 10 * 60_000 });
    expect(d.action).toBe("allow");
    expect(d.action === "allow" && d.refresh).toBeTruthy();
    const refreshed = await readDeviceCookie(d.action === "allow" ? d.refresh : null, SECRET);
    expect(refreshed).toEqual({ kind: "temporary", issuedAt: T0 + 10 * 60_000 });
  });

  it("keeps a temporary device signed in across a tab closed by accident (inside the hour)", async () => {
    const cookieValue = await issueDeviceCookie("temporary", SECRET, T0);
    expect((await decideDevice({ ...base, cookieValue, nowMs: T0 + TEMPORARY_IDLE_MS - 1 })).action).toBe("allow");
  });

  it("signs a temporary device out after an hour idle", async () => {
    const cookieValue = await issueDeviceCookie("temporary", SECRET, T0);
    expect(await decideDevice({ ...base, cookieValue, nowMs: T0 + TEMPORARY_IDLE_MS + 1 })).toEqual({ action: "reject" });
  });

  it("asks the question right after a password login", async () => {
    expect(await decideDevice({ secret: SECRET, cookieValue: undefined, loginAt: T0 - 60_000, nowMs: T0 })).toEqual({
      action: "confirm",
    });
  });

  it("does NOT let a closed browser answer without the password", async () => {
    // The temporary cookie vanished with the browser; the old session is stale.
    const d = await decideDevice({ secret: SECRET, cookieValue: undefined, loginAt: T0 - CONFIRM_WINDOW_MS - 1, nowMs: T0 });
    expect(d).toEqual({ action: "reject" });
  });

  it("rejects old sessions that predate the question (no loginAt)", async () => {
    expect(await decideDevice({ secret: SECRET, cookieValue: undefined, loginAt: undefined, nowMs: T0 })).toEqual({ action: "reject" });
  });

  it("fails closed when the secret is missing", async () => {
    const cookieValue = await issueDeviceCookie("permanent", SECRET, T0);
    expect(await decideDevice({ secret: undefined, cookieValue, loginAt: T0, nowMs: T0 })).toEqual({ action: "reject" });
  });

  it("treats a forged cookie like no cookie", async () => {
    expect(await decideDevice({ secret: SECRET, cookieValue: `permanent.${T0}.forged`, loginAt: T0 - 24 * 3600_000, nowMs: T0 })).toEqual({
      action: "reject",
    });
  });
});

describe("deviceCookieOptions", () => {
  it("makes a permanent device last as long as the session", () => {
    expect(deviceCookieOptions("permanent", true).maxAge).toBe(PERMANENT_MAX_AGE_SECONDS);
  });

  it("makes a temporary device a session cookie, with no expiry", () => {
    expect("maxAge" in deviceCookieOptions("temporary", true)).toBe(false);
  });

  it("is always httpOnly and lax", () => {
    for (const kind of ["permanent", "temporary"] as const) {
      const o = deviceCookieOptions(kind, false);
      expect(o.httpOnly).toBe(true);
      expect(o.sameSite).toBe("lax");
    }
  });
});
