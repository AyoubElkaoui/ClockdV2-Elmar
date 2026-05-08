import {
  addWeeks,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { nl } from "date-fns/locale";
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import { TimeEntryStatus } from "@prisma/client";
import { StatCard } from "@/components/ui/stat-card";
import { formatHours } from "@/lib/format";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const WEEKS_BACK = 8;

async function loadCounts(userId: string, since: Date) {
  const [approved, rejected] = await Promise.all([
    prisma.cv2ReviewAction.findMany({
      where: { userId, action: TimeEntryStatus.APPROVED, createdAt: { gte: since } },
      select: { entry: { select: { hours: true } } },
    }),
    prisma.cv2ReviewAction.findMany({
      where: { userId, action: TimeEntryStatus.REJECTED, createdAt: { gte: since } },
      select: { entry: { select: { hours: true } } },
    }),
  ]);
  const sumHours = (rows: { entry: { hours: number } }[]) =>
    rows.reduce((acc, r) => acc + r.entry.hours, 0);
  return {
    approved: { count: approved.length, hours: sumHours(approved) },
    rejected: { count: rejected.length, hours: sumHours(rejected) },
  };
}

async function loadAllTime(userId: string) {
  const [approved, rejected] = await Promise.all([
    prisma.cv2ReviewAction.count({
      where: { userId, action: TimeEntryStatus.APPROVED },
    }),
    prisma.cv2ReviewAction.count({
      where: { userId, action: TimeEntryStatus.REJECTED },
    }),
  ]);
  return { approved, rejected };
}

async function loadWeekBreakdown(userId: string) {
  const now = new Date();
  const firstWeekStart = startOfWeek(subDays(now, (WEEKS_BACK - 1) * 7), {
    weekStartsOn: 1,
  });
  const actions = await prisma.cv2ReviewAction.findMany({
    where: {
      userId,
      createdAt: { gte: firstWeekStart },
      action: { in: [TimeEntryStatus.APPROVED, TimeEntryStatus.REJECTED] },
    },
    select: { createdAt: true, action: true },
  });

  const buckets: { start: Date; approved: number; rejected: number }[] = [];
  for (let i = 0; i < WEEKS_BACK; i++) {
    buckets.push({
      start: addWeeks(firstWeekStart, i),
      approved: 0,
      rejected: 0,
    });
  }
  for (const a of actions) {
    const idx = buckets.findIndex((b, i) => {
      const next = i === buckets.length - 1 ? new Date(8.64e15) : buckets[i + 1].start;
      return a.createdAt >= b.start && a.createdAt < next;
    });
    if (idx === -1) continue;
    if (a.action === TimeEntryStatus.APPROVED) buckets[idx].approved += 1;
    if (a.action === TimeEntryStatus.REJECTED) buckets[idx].rejected += 1;
  }
  return buckets;
}

export default async function StatsPage() {
  const session = await requireSession();
  const userId = session.user.id;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const [week, month, allTime, weekly] = await Promise.all([
    loadCounts(userId, startOfDay(weekStart)),
    loadCounts(userId, startOfDay(monthStart)),
    loadAllTime(userId),
    loadWeekBreakdown(userId),
  ]);

  const maxBucket = Math.max(
    1,
    ...weekly.map((b) => b.approved + b.rejected),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Statistieken
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Hoeveel jij hebt verwerkt en hoe je activiteit verloopt.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          title="Deze week"
          value={week.approved.count + week.rejected.count}
          subtitle={`${formatHours(week.approved.hours + week.rejected.hours)} uur verwerkt`}
          icon={<Activity className="h-6 w-6" />}
          iconBgColor="bg-blue-600"
        />
        <StatCard
          title="Deze maand"
          value={month.approved.count + month.rejected.count}
          subtitle={`${formatHours(month.approved.hours + month.rejected.hours)} uur verwerkt`}
          icon={<Activity className="h-6 w-6" />}
          iconBgColor="bg-violet-600"
        />
        <StatCard
          title="Totaal"
          value={allTime.approved + allTime.rejected}
          subtitle={`${allTime.approved} goedgekeurd • ${allTime.rejected} afgewezen`}
          icon={<Activity className="h-6 w-6" />}
          iconBgColor="bg-emerald-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SplitCard
          title="Goedgekeurd deze maand"
          count={month.approved.count}
          hours={month.approved.hours}
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <SplitCard
          title="Afgewezen deze maand"
          count={month.rejected.count}
          hours={month.rejected.hours}
          tone="danger"
          icon={<XCircle className="h-5 w-5" />}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Activiteit per week
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Aantal verwerkte registraties in de laatste {WEEKS_BACK} weken.
          </p>
        </header>
        <ul className="space-y-2.5">
          {weekly.map((b) => {
            const total = b.approved + b.rejected;
            const pct = (total / maxBucket) * 100;
            return (
              <li key={b.start.toISOString()} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Week {format(b.start, "w", { locale: nl })} —{" "}
                    {format(b.start, "d MMM", { locale: nl })}
                  </span>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">
                    {total === 0
                      ? "Geen activiteit"
                      : `${b.approved} ✓ • ${b.rejected} ✗`}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div className="flex h-full" style={{ width: `${pct}%` }}>
                    {b.approved > 0 && (
                      <div
                        className="h-full bg-emerald-500"
                        style={{
                          width: `${(b.approved / total) * 100}%`,
                        }}
                      />
                    )}
                    {b.rejected > 0 && (
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${(b.rejected / total) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function SplitCard({
  title,
  count,
  hours,
  tone,
  icon,
}: {
  title: string;
  count: number;
  hours: number;
  tone: "success" | "danger";
  icon: React.ReactNode;
}) {
  const styles =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
      : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${styles}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {title}
        </p>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {count}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatHours(hours)} uur
        </p>
      </div>
    </div>
  );
}
