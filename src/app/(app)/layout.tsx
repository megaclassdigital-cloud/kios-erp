import { NavBar } from "./nav-bar";
import { auth } from "@/shared/security/auth";

// Every page under this layout reads the live session/DB (RBAC-scoped
// queries, real-time stock/finance data) — never statically prerenderable.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Role comes from the server so the nav renders correctly-filtered
          tabs on first paint — waiting for client-side useSession() would
          flash an empty (or briefly wrong) nav before hydration. */}
      <NavBar role={session?.user?.role} />
      <main className="flex-1 bg-background p-4 md:p-6">{children}</main>
    </div>
  );
}
