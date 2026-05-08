import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Coffee,
  Euro,
  FileText,
  History,
  MapPin,
  Package,
  TimerReset,
  User,
  XCircle,
} from "lucide-react";
import { Role, TimeEntryStatus } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDateTime, formatHours } from "@/lib/format";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { reviewEntry } from "../actions";

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-600",
  "bg-fuchsia-600",
];
function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function formatTime(date: Date | null) {
  return date ? format(date, "HH:mm") : "—";
}

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const canReview =
    session.user.role === Role.ADMIN || session.user.role === Role.REVIEWER;

  const entry = await prisma.cv2TimeEntry.findUnique({
    where: { id },
    include: {
      reviewActions: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
  if (!entry) notFound();

  const isPending = entry.status === TimeEntryStatus.PENDING;
  const totalMinutes =
    entry.startTime && entry.endTime
      ? Math.round((entry.endTime.getTime() - entry.startTime.getTime()) / 60000)
      : null;

  return (
    <div className="space-y-5">
      <Link
        href="/entries"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar uren
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white",
              avatarColor(entry.employeeName || entry.id),
            )}
          >
            {initials(entry.employeeName) || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
              {entry.employeeName}
            </p>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {entry.projectName ?? "Geen project"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Totaal
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatHours(entry.hours)} uur
            </p>
          </div>
          <StatusBadge status={entry.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <Panel title="Tijd & datum" icon={<Calendar className="h-4 w-4" />}>
            <Field
              icon={<Calendar className="h-4 w-4" />}
              label="Datum"
              value={format(entry.date, "EEEE d MMMM yyyy", { locale: nl })}
            />
            <Field
              icon={<Clock className="h-4 w-4" />}
              label="Begintijd"
              value={formatTime(entry.startTime)}
            />
            <Field
              icon={<Clock className="h-4 w-4" />}
              label="Eindtijd"
              value={formatTime(entry.endTime)}
            />
            <Field
              icon={<Coffee className="h-4 w-4" />}
              label="Pauze"
              value={
                typeof entry.breakMinutes === "number" && entry.breakMinutes > 0
                  ? `${entry.breakMinutes} min`
                  : "Geen"
              }
            />
            <Field
              icon={<TimerReset className="h-4 w-4" />}
              label="Bruto duur"
              value={
                totalMinutes
                  ? `${Math.floor(totalMinutes / 60)} u ${totalMinutes % 60} min`
                  : "—"
              }
            />
            <Field
              icon={<Clock className="h-4 w-4" />}
              label="Geboekte uren"
              value={`${formatHours(entry.hours)} uur`}
            />
          </Panel>

          <Panel title="Werklocatie & materiaal" icon={<MapPin className="h-4 w-4" />}>
            <Field
              icon={<MapPin className="h-4 w-4" />}
              label="Locatie"
              value={entry.workLocation ?? "Niet opgegeven"}
              wide
            />
            <Field
              icon={<Package className="h-4 w-4" />}
              label="Gebruikte materialen"
              value={entry.materials ?? "Geen materiaal geregistreerd"}
              wide
            />
          </Panel>

          <Panel title="Onkosten & reisafstand" icon={<Euro className="h-4 w-4" />}>
            <Field
              icon={<Euro className="h-4 w-4" />}
              label="Onkosten"
              value={
                typeof entry.expenses === "number"
                  ? new Intl.NumberFormat("nl-NL", {
                      style: "currency",
                      currency: "EUR",
                    }).format(entry.expenses)
                  : "Geen"
              }
            />
            <Field
              icon={<MapPin className="h-4 w-4" />}
              label="Kilometers"
              value={
                typeof entry.kilometers === "number"
                  ? `${entry.kilometers.toLocaleString("nl-NL")} km`
                  : "Niet geregistreerd"
              }
            />
            {entry.expensesDescription && (
              <Field
                icon={<FileText className="h-4 w-4" />}
                label="Toelichting onkosten"
                value={entry.expensesDescription}
                wide
              />
            )}
          </Panel>

          {entry.description && (
            <Panel
              title="Omschrijving werkzaamheden"
              icon={<FileText className="h-4 w-4" />}
            >
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {entry.description}
              </p>
            </Panel>
          )}

          {entry.errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <p className="font-semibold">Foutmelding bij export</p>
              <p className="mt-1">{entry.errorMessage}</p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {canReview && isPending && (
            <ReviewPanel entryId={entry.id} />
          )}

          <Panel
            title="Activiteit"
            icon={<History className="h-4 w-4" />}
            compact
          >
            <Timeline entry={entry} />
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
  compact,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {icon}
        </span>
        {title}
      </header>
      <div className={compact ? "" : "grid gap-x-6 gap-y-3 sm:grid-cols-2"}>
        {children}
      </div>
    </section>
  );
}

function Field({
  icon,
  label,
  value,
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className="text-slate-400">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}

function ReviewPanel({ entryId }: { entryId: string }) {
  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm dark:border-blue-500/30 dark:bg-blue-500/5">
      <header className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
        <CheckCircle2 className="h-4 w-4" />
        Beoordelen
      </header>
      <p className="mb-4 text-xs text-blue-900/70 dark:text-blue-200/70">
        Geef goedkeuring of wijs deze registratie af. Een reden is verplicht bij afwijzen.
      </p>
      <form action={reviewEntry} className="space-y-3">
        <input type="hidden" name="entryIds" value={entryId} />
        <div className="space-y-1.5">
          <Label htmlFor="reason" className="text-xs">
            Reden (verplicht bij afwijzen)
          </Label>
          <Input
            id="reason"
            name="reason"
            placeholder="bv. verkeerd project geselecteerd"
            maxLength={500}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            name="action"
            value="REJECTED"
            variant="outline"
            className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Afwijzen
          </Button>
          <Button
            type="submit"
            name="action"
            value="APPROVED"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Goedkeuren
          </Button>
        </div>
      </form>
    </section>
  );
}

function Timeline({
  entry,
}: {
  entry: {
    createdAt: Date;
    exportedAt: Date | null;
    status: TimeEntryStatus;
    reviewActions: {
      id: string;
      action: TimeEntryStatus;
      reason: string | null;
      createdAt: Date;
      user: { name: string | null; email: string | null } | null;
    }[];
  };
}) {
  type Item = {
    key: string;
    icon: React.ReactNode;
    color: string;
    label: string;
    detail?: string;
    when: Date;
  };

  const items: Item[] = [
    {
      key: "created",
      icon: <Clock className="h-3.5 w-3.5" />,
      color:
        "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
      label: "Binnengekomen vanuit Clockwise",
      when: entry.createdAt,
    },
    ...entry.reviewActions.map((a) => ({
      key: a.id,
      icon:
        a.action === TimeEntryStatus.APPROVED ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        ),
      color:
        a.action === TimeEntryStatus.APPROVED
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
      label:
        a.action === TimeEntryStatus.APPROVED
          ? `Goedgekeurd door ${a.user?.name ?? a.user?.email ?? "onbekend"}`
          : `Afgewezen door ${a.user?.name ?? a.user?.email ?? "onbekend"}`,
      detail: a.reason ?? undefined,
      when: a.createdAt,
    })),
  ];

  if (entry.exportedAt) {
    items.push({
      key: "exported",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
      label: "Verzonden naar Syntess Atrium",
      when: entry.exportedAt,
    });
  }

  items.sort((a, b) => b.when.getTime() - a.when.getTime());

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Nog geen activiteit.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.key} className="flex gap-3">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              item.color,
            )}
          >
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {item.label}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatDateTime(item.when)}
            </p>
            {item.detail && (
              <p className="mt-1 rounded-md bg-slate-100 px-2 py-1 text-xs italic text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                “{item.detail}”
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
