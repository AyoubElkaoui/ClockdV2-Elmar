import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock, Send, Users } from "lucide-react";
import { TimeEntryStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/format";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

async function loadMedewerkers() {
  const entries = await prisma.cv2TimeEntry.findMany({
    select: { employeeId: true, employeeName: true, hours: true, status: true },
  });

  const map = new Map<string, {
    employeeId: string;
    employeeName: string;
    pending: number;
    approved: number;
    exported: number;
    totalHours: number;
  }>();

  for (const e of entries) {
    if (!map.has(e.employeeId)) {
      map.set(e.employeeId, {
        employeeId: e.employeeId,
        employeeName: e.employeeName,
        pending: 0, approved: 0, exported: 0, totalHours: 0,
      });
    }
    const m = map.get(e.employeeId)!;
    m.totalHours += e.hours;
    if (e.status === TimeEntryStatus.PENDING) m.pending += 1;
    else if (e.status === TimeEntryStatus.APPROVED) m.approved += 1;
    else if (e.status === TimeEntryStatus.EXPORTED || e.status === TimeEntryStatus.EXPORT_FAILED) m.exported += 1;
  }

  return Array.from(map.values()).sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName, "nl"),
  );
}

const AVATAR_COLORS = ["bg-blue-600","bg-emerald-600","bg-violet-600","bg-amber-500","bg-rose-500","bg-cyan-600","bg-fuchsia-600"];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export default async function MedewerkersPage() {
  await requireSession();
  const medewerkers = await loadMedewerkers();

  const totalPending = medewerkers.reduce((s, m) => s + m.pending, 0);
  const totalHours = medewerkers.reduce((s, m) => s + m.totalHours, 0);
  const totalApproved = medewerkers.reduce((s, m) => s + m.approved, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Medewerkers
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Overzicht van alle medewerkers in het systeem.
        </p>
      </div>

      {/* Stat cards — 2 kolommen op mobile, 3 op desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Medewerkers</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{medewerkers.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white", totalPending > 0 ? "bg-amber-500" : "bg-slate-400")}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Te reviewen</p>
              <p className={cn("text-xl font-bold", totalPending > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100")}>
                {totalPending}
              </p>
            </div>
          </div>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-1 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Totaal uren</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatHours(totalHours)}u</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{totalApproved} goedgekeurd</p>
            </div>
          </div>
        </div>
      </div>

      {medewerkers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nog geen medewerkers</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verschijnen hier na de eerste Clockwise-sync.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {medewerkers.map((m) => (
              <li key={m.employeeId}>
                <Link
                  href={`/medewerkers/${encodeURIComponent(m.employeeId)}`}
                  className="group flex items-center gap-3 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/40"
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                    avatarColor(m.employeeName || m.employeeId),
                  )}>
                    {initials(m.employeeName) || "?"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {m.employeeName}
                    </p>
                    {/* Pills op tweede rij */}
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {m.pending > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                          <Clock className="h-3 w-3" />{m.pending}
                        </span>
                      )}
                      {m.approved > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />{m.approved}
                        </span>
                      )}
                      {m.exported > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                          <Send className="h-3 w-3" />{m.exported}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {formatHours(m.totalHours)}u
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
