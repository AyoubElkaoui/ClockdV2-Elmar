import Link from "next/link";
import { Role, TimeEntryStatus } from "@prisma/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDistinctEmployees, listEntries } from "@/lib/entries";
import { requireSession } from "@/lib/guards";
import { EntriesFilters } from "./filters";
import { EntriesTable, type EntryRow } from "./entries-table";

type SearchParams = Promise<{
  status?: string;
  employeeId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: string;
}>;

function parseStatus(value?: string): TimeEntryStatus | undefined {
  if (!value) return undefined;
  return (Object.values(TimeEntryStatus) as string[]).includes(value)
    ? (value as TimeEntryStatus)
    : undefined;
}

export default async function EntriesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const status = parseStatus(params.status);

  const [entries, employees] = await Promise.all([
    listEntries({
      page,
      status,
      employeeId: params.employeeId,
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(params.to) : undefined,
      search: params.search,
    }),
    getDistinctEmployees(),
  ]);

  const rows: EntryRow[] = entries.rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    employeeName: r.employeeName,
    projectName: r.projectName,
    hours: r.hours,
    description: r.description,
    status: r.status,
    errorMessage: r.errorMessage,
  }));

  const canReview = session.user.role === Role.ADMIN || session.user.role === Role.REVIEWER;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Uren reviewen
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Bekijk en (bulk) goed- of afkeuren van urenregistraties.
        </p>
      </div>

      <EntriesFilters
        initial={{
          status: params.status,
          employeeId: params.employeeId,
          from: params.from,
          to: params.to,
          search: params.search,
        }}
        employees={employees}
      />

      <EntriesTable rows={rows} canReview={canReview} />

      <Pagination page={entries.page} pageCount={entries.pageCount} total={entries.total} searchParams={params} />
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  searchParams,
}: {
  page: number;
  pageCount: number;
  total: number;
  searchParams: Record<string, string | undefined>;
}) {
  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") params.set(k, v);
    }
    params.set("page", String(targetPage));
    return `/entries?${params.toString()}`;
  }
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-slate-500 dark:text-slate-400">
        Pagina {page} van {pageCount} — {total} registraties
      </div>
      <div className="flex gap-2">
        <Link
          href={buildHref(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page <= 1 && "pointer-events-none opacity-50",
          )}
        >
          Vorige
        </Link>
        <Link
          href={buildHref(Math.min(pageCount, page + 1))}
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
