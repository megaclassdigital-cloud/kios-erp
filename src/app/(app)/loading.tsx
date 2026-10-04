import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown the instant a tab is clicked, for every page in this group.
 *
 * Without it, `force-dynamic` meant a navigation rendered nothing at all
 * until the server had finished every query for that page — so the old tab
 * stayed frozen on screen and the app looked stuck. Next.js streams this
 * shell immediately instead, so the nav responds on the click and the
 * content fills in behind it.
 *
 * It does not make the data arrive sooner — that is a network problem, and
 * the database currently sits ~830ms away in Sydney. It stops the wait from
 * looking like a hang.
 *
 * The shape is deliberately generic (title, a row of cards, a table): close
 * enough that content replacing it is not a jolt, vague enough that it does
 * not go stale every time a page is rearranged.
 */
export default function AppLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat halaman…</span>

      <div className="space-y-2">
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
