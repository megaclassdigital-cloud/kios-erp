import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  default: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  destructive: "bg-destructive-soft text-destructive",
  info: "bg-info-soft text-info",
} as const;

/** Replaces the inline `Kpi` component duplicated across dashboard/laporan
 * pages — same bordered-card shape, now on design tokens with an optional
 * icon accent instead of hardcoded gray/white.
 *
 * `interactive` only changes how it looks (hover border, a "Lihat detail"
 * hint): the thing that makes it clickable is the wrapper around it -- a link,
 * a button, or `KpiDetail` -- so the card itself stays a plain server component. */
export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  interactive = false,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: keyof typeof TONE_STYLES;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "h-full min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm",
        interactive && "transition group-hover:border-primary group-hover:shadow-md group-focus-visible:border-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words text-xs text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", TONE_STYLES[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-1 break-words text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {interactive && (
        <p className="mt-1 flex items-center gap-0.5 text-[11px] text-muted-foreground group-hover:text-primary">
          Lihat detail <ChevronRight className="h-3 w-3" />
        </p>
      )}
    </div>
  );
}
