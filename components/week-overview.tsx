import { addDays, endOfWeek, format, isSameDay, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { TimeEntryStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function WeekOverview() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const entries = await prisma.cv2TimeEntry.findMany({
    where: {
      date: { gte: weekStart, lte: weekEnd },
    },
    select: { date: true, hours: true, status: true },
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dayEntries = entries.filter((e) => isSameDay(e.date, day));
    const total = dayEntries.reduce((sum, e) => sum + e.hours, 0);
    const pending = dayEntries
      .filter((e) => e.status === TimeEntryStatus.PENDING)
      .reduce((sum, e) => sum + e.hours, 0);
    return { day, total, pending };
  });

  const max = Math.max(1, ...days.map((d) => d.total));
  const totalThisWeek = days.reduce((s, d) => s + d.total, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Deze week
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {format(weekStart, "d MMM", { locale: nl })} —{" "}
              {format(weekEnd, "d MMM yyyy", { locale: nl })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Totaal
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {formatHours(totalThisWeek)} uur
          </p>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-2">
        {days.map(({ day, total, pending }) => {
          const isToday = isSameDay(day, now);
          const heightPct = (total / max) * 100;
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors sm:p-2",
                isToday
                  ? "border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10"
                  : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40",
              )}
            >
              <div
                className={cn(
                  "text-[10px] font-semibold uppercase sm:text-xs",
                  isToday
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-slate-500 dark:text-slate-400",
                )}
              >
                {format(day, "EEE", { locale: nl })}
              </div>
              <div
                className={cn(
                  "text-sm font-medium",
                  isToday
                    ? "text-blue-900 dark:text-blue-200"
                    : "text-slate-700 dark:text-slate-300",
                )}
              >
                {format(day, "d")}
              </div>
              <div className="flex h-10 w-full items-end overflow-hidden rounded-md bg-white dark:bg-slate-800/60 sm:h-12">
                <div
                  className={cn(
                    "w-full rounded-md transition-all",
                    pending > 0
                      ? "bg-gradient-to-t from-amber-400 to-amber-300"
                      : "bg-gradient-to-t from-blue-500 to-blue-400",
                    total === 0 && "opacity-0",
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <div
                className={cn(
                  "text-[10px] tabular-nums sm:text-xs",
                  total === 0
                    ? "text-slate-400 dark:text-slate-600"
                    : "font-semibold text-slate-900 dark:text-slate-100",
                )}
              >
                {total === 0 ? "—" : `${formatHours(total)}u`}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
