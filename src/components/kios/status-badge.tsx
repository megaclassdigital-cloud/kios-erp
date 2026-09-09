import { cn } from "@/lib/utils";

const TONE_STYLES = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  destructive: "bg-destructive-soft text-destructive",
  info: "bg-info-soft text-info",
  neutral: "bg-muted text-muted-foreground",
  purple: "bg-accent-purple-soft text-accent-purple",
} as const;

/** Status pill for domain states (Sale.status, Purchase.status, stock
 * level, shift open/closed, role, ...) — shadcn's Badge only ships
 * default/secondary/destructive/outline variants, none of which cover the
 * success/warning/info tones this ERP needs everywhere, so this wraps the
 * same shape with the app's own soft-background tone tokens instead of
 * touching the generated ui/badge.tsx. */
export function StatusBadge({
  tone,
  children,
}: {
  tone: keyof typeof TONE_STYLES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-4xl px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_STYLES[tone]
      )}
    >
      {children}
    </span>
  );
}
