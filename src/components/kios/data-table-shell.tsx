import { Table } from "@/components/ui/table";

/** Consistent bordered/rounded wrapper around shadcn's <Table> primitives
 * — every hand-rolled `<table>` in the app currently sits directly inside
 * a `rounded-lg border border-gray-200 bg-white` div; this centralizes
 * that shell so adopting it per-page is a wrap, not a rewrite of the
 * columns/rows themselves. */
export function DataTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Table>{children}</Table>
    </div>
  );
}
