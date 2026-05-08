import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
} from "lucide-react";
import { Role, SyncStatus, TimeEntryStatus } from "@prisma/client";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { WeekOverview } from "@/components/week-overview";
import { cn } from "@/lib/utils";
import { formatDateTime, formatHours } from "@/lib/format";
import { prisma } from "@/lib/prisma";

async function loadReviewerMetrics(userId: string) {
  const [pending, recentActions] = await Promise.all([
    prisma.cv2TimeEntry.aggregate({
      where: { status: TimeEntryStatus.PENDING },
      _sum: { hours: true },
      _count: true,
    }),
    prisma.cv2ReviewAction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
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
  ]);
  return { pending, recentActions };
}

async function loadAdminExtras() {
  const [approved, exported, unmappedEntries, lastSync] = await Promise.all([
    prisma.cv2TimeEntry.aggregate({
      where: { status: TimeEntryStatus.APPROVED },
      _sum: { hours: true },
      _count: true,
    }),
    prisma.cv2TimeEntry.aggregate({
      where: { status: TimeEntryStatus.EXPORTED },
      _sum: { hours: true },
      _count: true,
    }),
    prisma.cv2TimeEntry.count({
      where: {
        OR: [
          { projectId: null },
          {
            projectId: {
              notIn: (
                await prisma.cv2ProjectMapping.findMany({
                  where: { isActive: true },
                  select: { clockwiseProjectId: true },
                })
              ).map((m) => m.clockwiseProjectId),
            },
          },
        ],
      },
    }),
    prisma.cv2SyncLog.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);
  return { approved, exported, unmappedEntries, lastSync };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const isAdmin = session.user.role === Role.ADMIN;
  const firstName = (session.user.name || session.user.email || "").split(/[\s@]/)[0];

  const [reviewer, adminExtras] = await Promise.all([
    loadReviewerMetrics(session.user.id),
    isAdmin ? loadAdminExtras() : Promise.resolve(null),
  ]);

  const pendingHours = reviewer.pending._sum.hours ?? 0;
  const pendingCount = reviewer.pending._count;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {getGreeting()}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Overzicht van wat er wacht op jouw review.
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-sm dark:border-slate-700">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
                Wacht op review
              </p>
              <p className="text-3xl font-bold leading-tight">
                {formatHours(pendingHours)}
              </p>
              <p className="text-xs text-blue-100">
                {pendingCount === 0
                  ? "Alles bijgewerkt."
                  : `${pendingCount} ${pendingCount === 1 ? "registratie" : "registraties"}.`}
              </p>
            </div>
          </div>
          {pendingCount > 0 && (
            <Link
              href="/entries?status=PENDING"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
            >
              Start review
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      <WeekOverview />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Recent door jou verwerkt
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Je laatste goedkeuringen en afwijzingen.
            </p>
          </div>
          <Link
            href="/entries"
            className="hidden text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 sm:inline-flex sm:items-center sm:gap-1"
          >
            Alles bekijken
            <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        {reviewer.recentActions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Je hebt nog niks goedgekeurd of afgewezen.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {reviewer.recentActions.map((action) => (
              <li
                key={action.id}
                className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900"
              >
                <ActionIcon action={action.action} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {action.entry.employeeName}
                    </p>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      •
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {action.entry.projectName ?? "Geen project"}
                    </p>
                    <ActionBadge action={action.action} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatHours(action.entry.hours)} • {formatDateTime(action.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && adminExtras && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Admin overzicht
            </span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              title="Goedgekeurd"
              value={formatHours(adminExtras.approved._sum.hours ?? 0)}
              subtitle={`${adminExtras.approved._count} entries klaar voor export`}
              icon={<CheckCircle2 className="h-5 w-5" />}
              iconBgColor="bg-emerald-600"
            />
            <StatCard
              title="Verzonden naar Syntess"
              value={formatHours(adminExtras.exported._sum.hours ?? 0)}
              subtitle={`${adminExtras.exported._count} entries geëxporteerd`}
              icon={<Send className="h-5 w-5" />}
              iconBgColor="bg-blue-600"
            />
            <StatCard
              title="Zonder projectmapping"
              value={adminExtras.unmappedEntries}
              subtitle={
                adminExtras.unmappedEntries === 0
                  ? "Alles gekoppeld"
                  : "Koppeling ontbreekt"
              }
              icon={<AlertTriangle className="h-5 w-5" />}
              iconBgColor={
                adminExtras.unmappedEntries > 0 ? "bg-amber-500" : "bg-slate-400"
              }
              tone={adminExtras.unmappedEntries > 0 ? "warn" : undefined}
            />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Laatste sync
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Meest recente synchronisatie met Clockwise.
                </p>
              </div>
              {adminExtras.lastSync ? (
                <SyncStatusBadge status={adminExtras.lastSync.status} />
              ) : null}
            </header>

            {adminExtras.lastSync ? (
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <Info
                  label="Gestart"
                  value={formatDateTime(adminExtras.lastSync.startedAt)}
                />
                <Info
                  label="Afgerond"
                  value={
                    adminExtras.lastSync.completedAt
                      ? formatDateTime(adminExtras.lastSync.completedAt)
                      : "—"
                  }
                />
                <Info label="Opgehaald" value={String(adminExtras.lastSync.entriesFetched)} />
                <Info label="Nieuw" value={String(adminExtras.lastSync.entriesCreated)} />
                <Info
                  label="Overgeslagen"
                  value={String(adminExtras.lastSync.entriesSkipped)}
                />
                {adminExtras.lastSync.errorMessage ? (
                  <Info
                    label="Foutmelding"
                    value={adminExtras.lastSync.errorMessage}
                    tone="error"
                  />
                ) : null}
              </dl>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Nog geen sync uitgevoerd. Configureer Clockwise en draai de sync om te starten.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
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
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
      <Clock className="h-5 w-5" />
    </div>
  );
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
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        v.className,
      )}
    >
      {v.label}
    </span>
  );
}

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const variants: Record<SyncStatus, { label: string; className: string }> = {
    RUNNING: {
      label: "Bezig",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    },
    COMPLETED: {
      label: "Voltooid",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
    FAILED: {
      label: "Mislukt",
      className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    },
  };
  const v = variants[status];
  return <Badge className={`${v.className} border-0`}>{v.label}</Badge>;
}

function Info({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "error";
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm font-medium text-slate-900 dark:text-slate-100",
          tone === "error" && "text-red-600 dark:text-red-400",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
