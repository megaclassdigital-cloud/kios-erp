import { NextResponse } from "next/server";
import { auth } from "@/shared/security/auth";
import {
  DEVICE_COOKIE,
  SESSION_COOKIE_NAMES,
  decideDevice,
  deviceCookieOptions,
} from "@/shared/security/device-session";

const PUBLIC_PATHS = ["/login"];

export default auth(async (req) => {
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const isAuthApi = path.startsWith("/api/auth");
  if (isPublic || isAuthApi) return NextResponse.next();

  const loginUrl = new URL("/login", req.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", path + req.nextUrl.search);

  if (!req.auth) return NextResponse.redirect(loginUrl);

  // Signed in is not enough: the device question must have been answered, and
  // a temporary device must not have gone idle. See device-session.ts.
  const decision = await decideDevice({
    cookieValue: req.cookies.get(DEVICE_COOKIE)?.value,
    loginAt: req.auth.loginAt,
    secret: process.env.AUTH_SECRET,
    nowMs: Date.now(),
  });

  if (decision.action === "confirm") {
    loginUrl.searchParams.set("confirm", "1");
    return NextResponse.redirect(loginUrl);
  }

  if (decision.action === "reject") {
    // End the session itself, not just this request, or the next visit would
    // find it still valid.
    const res = NextResponse.redirect(loginUrl);
    for (const name of [...SESSION_COOKIE_NAMES, DEVICE_COOKIE]) res.cookies.set(name, "", { path: "/", maxAge: 0 });
    return res;
  }

  const res = NextResponse.next();
  if (decision.refresh) {
    res.cookies.set(DEVICE_COOKIE, decision.refresh, deviceCookieOptions("temporary", process.env.NODE_ENV === "production"));
  }
  return res;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
