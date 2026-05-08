import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
} from "lucide-react";
import { TimeEntryStatus } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { formatDate, formatHours } from "@/lib/format";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const AVATAR_COLORS = [
  "bg-blue-600","bg-emerald-600","bg-violet-600",
  "bg-amber-500","bg-rose-500","bg-cyan-600","bg-fuchsia-600",
];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export default async function MedewerkerDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requireSession();
  const { employeeId } = await params;
  const decodedId = decodeURIComponent(employeeId);

  const entries = await prisma.cv2TimeEntry.findMany({
    where: { employeeId: decodedId },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      projectName: true,
      hours: true,
      description: true,
      status: true,
      startTime: true,
      endTime: true,
    },
  });

  if (entries.length === 0) notFound();

  const employeeName = (await prisma.cv2TimeEntry.findFirst({
    where: { employeeId: decodedId },
    select: { employeeName: true },
  }))?.employeeName ?? decodedId;

  const pending = entries.filter((e) => e.status === TimeEntryStatus.PENDING);
  const approved = entries.filter((e) => e.status === TimeEntryStatus.APPROVED);
  const exported = entries.filter((e) => e.status === TimeEntryStatus.EXPORTED || e.status === TimeEntryStatus.EXPORT_FAILED);
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);

  // Groepeer per maand
  const byMonth = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = format(e.date, "MMMM yyyy", { locale: nl });
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(e);
  }

  return (
    <div className="space-y-5">
      <Link
        href="/medewerkers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar medewerkers
      </Link>

      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white",
            avatarColor(employeeName),
          )}
        >
          {initials(employeeName)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {employeeName}
          </h1>
          <p className="font-mono text-sm text-slate-500 dark:text-slate-400">{decodedId}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard
          title="Totaal uren"
          value={`${formatHours(totalHours)}u`}
          subtitle={`${entries.length} registraties`}
          icon={<Clock className="h-5 w-5" />}
          iconBgColor="bg-blue-600"
        />
        <StatCard
          title="Wacht op review"
          value={pending.length}
          subtitle={`${formatHours(pending.reduce((s, e) => s + e.hours, 0))} uur`}
          icon={<Clock className="h-5 w-5" />}
          iconBgColor="bg-amber-500"
          tone={pending.length > 0 ? "warn" : undefined}
        />
        <StatCard
          title="Goedgekeurd"
          value={approved.length}
          subtitle={`${formatHours(approved.reduce((s, e) => s + e.hours, 0))} uur`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBgColor="bg-emerald-600"
        />
        <StatCard
          title="Verzonden"
          value={exported.length}
          subtitle={`${formatHours(exported.reduce((s, e) => s + e.hours, 0))} uur`}
          icon={<Send className="h-5 w-5" />}
          iconBgColor="bg-violet-600"
        />
      </div>

      <div className="space-y-4">
        {Array.from(byMonth.entries()).map(([month, monthEntries]) => (
          <section key={month}>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 capitalize">
              {month}
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {monthEntries.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/entries/${e.id}`}
                      className="group flex items-start gap-4 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/40"
                    >
                      <StatusIcon status={e.status} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {e.projectName ?? "Geen project"}
                          </p>
                          <StatusBadge status={e.status} />
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span>{formatDate(e.date)}</span>
                          {e.startTime && e.endTime && (
                            <span>
                              {format(e.startTime, "HH:mm")} – {format(e.endTime, "HH:mm")}
                            </span>
                          )}
                          {e.description && (
                            <span className="truncate max-w-xs">{e.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatHours(e.hours)}u
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-900/40">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {monthEntries.length} registraties
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {formatHours(monthEntries.reduce((s, e) => s + e.hours, 0))}u totaal
                </span>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: TimeEntryStatus }) {
  const base = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg";
  if (status === TimeEntryStatus.APPROVED)
    return <div className={cn(base, "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400")}><CheckCircle2 className="h-4 w-4" /></div>;
  if (status === TimeEntryStatus.REJECTED)
    return <div className={cn(base, "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400")}><XCircle className="h-4 w-4" /></div>;
  if (status === TimeEntryStatus.EXPORTED || status === TimeEntryStatus.EXPORT_FAILED)
    return <div className={cn(base, "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400")}><Send className="h-4 w-4" /></div>;
  return <div className={cn(base, "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400")}><Clock className="h-4 w-4" /></div>;
}
