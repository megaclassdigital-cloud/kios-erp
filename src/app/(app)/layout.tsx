import { NavBar } from "./nav-bar";
import { TourProvider } from "./tour/tour-provider";
import { TourOverlay } from "./tour/tour-overlay";
import { cookies } from "next/headers";
import { auth } from "@/shared/security/auth";
import { DEVICE_COOKIE, parseDeviceKind } from "@/shared/security/device-session";
import { DeviceSessionGuard } from "./device-session-guard";

// Every page under this layout reads the live session/DB (RBAC-scoped
// queries, real-time stock/finance data) — never statically prerenderable.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const device = parseDeviceKind((await cookies()).get(DEVICE_COOKIE)?.value);

  return (
    // The tour wraps both the nav and the page: the "?" that starts it lives
    // in the header, the steps it highlights live in the page.
    <DeviceSessionGuard temporary={device === "temporary"}>
    <TourProvider>
      <div className="flex min-h-screen flex-col">
        {/* Role comes from the server so the nav renders correctly-filtered
            tabs on first paint — waiting for client-side useSession() would
            flash an empty (or briefly wrong) nav before hydration. */}
        <NavBar role={session?.user?.role} />
        <main className="flex-1 bg-background p-4 md:p-6">{children}</main>
      </div>
      <TourOverlay />
    </TourProvider>
    </DeviceSessionGuard>
  );
}
