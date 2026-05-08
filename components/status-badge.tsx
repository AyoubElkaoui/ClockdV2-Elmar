import { TimeEntryStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STYLES: Record<TimeEntryStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Wacht op review",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  APPROVED: {
    label: "Goedgekeurd",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  REJECTED: {
    label: "Afgewezen",
    className:
      "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  },
  EXPORTED: {
    label: "Verzonden",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  EXPORT_FAILED: {
    label: "Verzending mislukt",
    className: "bg-red-600 text-white dark:bg-red-700",
  },
};

export function StatusBadge({ status }: { status: TimeEntryStatus }) {
  const style = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        style.className,
      )}
    >
      {style.label}
    </span>
  );
}
