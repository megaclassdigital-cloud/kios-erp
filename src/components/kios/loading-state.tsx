import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton row/card placeholders for client-fetched sections (TanStack
 * Query loading states) — most of the app's data comes from RSC fetches
 * that never show a spinner, but pages that add client-side fetching on
 * top (hover-prefetch, polling) need a consistent placeholder shape. */
export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}
