import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { TimeEntryStatus } from "@prisma/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTime, formatHours } from "@/lib/format";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

type SearchParams = Promise<{
  action?: string;
  page?: string;
}>;

function parseAction(value?: string): TimeEntryStatus | undefined {
  if (value === "APPROVED") return TimeEntryStatus.APPROVED;
  if (value === "REJECTED") return TimeEntryStatus.REJECTED;
  return undefined;
}

const FILTERS: { label: string; value?: TimeEntryStatus }[] = [
  { label: "Alles" },
  { label: "Goedgekeurd", value: TimeEntryStatus.APPROVED },
  { label: "Afgewezen", value: TimeEntryStatus.REJECTED },
];

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const action = parseAction(params.action);
  const page = Math.max(1, Number(params.page) || 1);

  const where = {
    userId: session.user.id,
    ...(action ? { action } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.cv2ReviewAction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        entry: {
          select: {
            employeeName: true,
            projectName: true,
            hours: true,
            date: true,
          },
        },
      },
    }),
    prisma.cv2ReviewAction.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Geschiedenis
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Alle urenregistraties die jij hebt goedgekeurd of afgewezen.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = (action ?? undefined) === f.value;
          const href = f.value ? `/geschiedenis?action=${f.value}` : "/geschiedenis";
          return (
            <Link
              key={f.label}
              href={href}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Nog niks verwerkt in deze categorie.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 p-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/40"
              >
                <ActionIcon action={r.action} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {r.entry.employeeName}
                    </p>
                    <span className="text-slate-400">•</span>
                    <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                      {r.entry.projectName ?? "Geen project"}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatHours(r.entry.hours)} uur • {formatDateTime(r.createdAt)}
                    {r.reason ? ` • Reden: ${r.reason}` : ""}
                  </p>
                </div>
                <ActionBadge action={r.action} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} total={total} action={action} />
    </div>
  );
}

function ActionIcon({ action }: { action: TimeEntryStatus }) {
  if (action === TimeEntryStatus.APPROVED) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
        <CheckCircle2 className="h-5 w-5" />
      </div>
    );
  }
  if (action === TimeEntryStatus.REJECTED) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
        <XCircle className="h-5 w-5" />
      </div>
    );
  }
  return null;
}

function ActionBadge({ action }: { action: TimeEntryStatus }) {
  const map: Partial<Record<TimeEntryStatus, { label: string; className: string }>> = {
    APPROVED: {
      label: "Goedgekeurd",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
    REJECTED: {
      label: "Afgewezen",
      className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    },
  };
  const v = map[action];
  if (!v) return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
        v.className,
      )}
    >
      {v.label}
    </span>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  action,
}: {
  page: number;
  pageCount: number;
  total: number;
  action?: TimeEntryStatus;
}) {
  const query = (p: number) => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    params.set("page", String(p));
    return `/geschiedenis?${params.toString()}`;
  };
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-slate-500 dark:text-slate-400">
        Pagina {page} van {pageCount} — {total} items
      </div>
      <div className="flex gap-2">
        <Link
          href={query(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page <= 1 && "pointer-events-none opacity-50",
          )}
        >
          Vorige
        </Link>
        <Link
          href={query(Math.min(pageCount, page + 1))}
          aria-disabled={page >= pageCount}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page >= pageCount && "pointer-events-none opacity-50",
          )}
        >
          Volgende
        </Link>
      </div>
    </div>
  );
}
