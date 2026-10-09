import { describe, expect, it } from "vitest";
import { deviceCookieOptions, parseDeviceKind, PERMANENT_MAX_AGE_SECONDS } from "./device-session";

describe("parseDeviceKind", () => {
  it("accepts only the two known answers", () => {
    expect(parseDeviceKind("permanent")).toBe("permanent");
    expect(parseDeviceKind("temporary")).toBe("temporary");
  });

  it("treats anything else as unanswered", () => {
    expect(parseDeviceKind(undefined)).toBeNull();
    expect(parseDeviceKind("")).toBeNull();
    expect(parseDeviceKind("yes")).toBeNull();
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
      expect(o.secure).toBe(false);
    }
  });
});
