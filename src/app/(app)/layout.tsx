import { NavBar } from "./nav-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1 bg-gray-50 p-4 md:p-6">{children}</main>
    </div>
  );
}
