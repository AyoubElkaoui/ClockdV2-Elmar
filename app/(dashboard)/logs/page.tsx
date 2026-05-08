import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileClock,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { SyncStatus } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;

async function loadSyncLogs() {
  return prisma.cv2SyncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: PAGE_SIZE,
  });
}

async function loadAuditLogs() {
  return prisma.cv2AuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: { user: { select: { name: true, email: true } } },
  });
}

function humanizeAction(action: string) {
  const map: Record<string, string> = {
    CLOCKWISE_SYNC_MANUAL: "Handmatige sync gestart",
    CLOCKWISE_OAUTH_COMPLETED: "Clockwise OAuth voltooid",
    EXPORT_BATCH: "Batch export uitgevoerd",
    MAPPING_CREATED: "Projectmapping aangemaakt",
    MAPPING_UPDATED: "Projectmapping gewijzigd",
    MAPPING_DELETED: "Projectmapping verwijderd",
    USER_CREATED: "Gebruiker aangemaakt",
    USER_UPDATED: "Gebruiker gewijzigd",
    PROFILE_UPDATED: "Profiel bijgewerkt",
    PASSWORD_CHANGED: "Wachtwoord gewijzigd",
    ENTRY_BULK_APPROVED: "Entries goedgekeurd",
    ENTRY_BULK_REJECTED: "Entries afgewezen",
  };
  return map[action] ?? action.replace(/_/g, " ").toLowerCase();
}

export default async function LogsPage() {
  await requireSession();
  const [syncLogs, auditLogs] = await Promise.all([loadSyncLogs(), loadAuditLogs()]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Logs
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Synchronisatiehistorie en audit trail — laatste {PAGE_SIZE} events per categorie.
        </p>
      </div>

      <Tabs defaultValue="sync">
        <TabsList className="border-b border-slate-200 bg-transparent p-0 dark:border-slate-700">
          {[
            { value: "sync", label: "Sync logs" },
            { value: "audit", label: "Audit trail" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:text-slate-400"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="sync" className="mt-5">
          {syncLogs.length === 0 ? (
            <EmptyState label="Nog geen sync uitgevoerd." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {syncLogs.map((log) => (
                  <li key={log.id} className="flex items-start gap-4 p-4">
                    <SyncIcon status={log.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <SyncStatusBadge status={log.status} />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(log.startedAt)}
                        </span>
                        {log.completedAt && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            → {formatDateTime(log.completedAt)}
                          </span>
                        )}
                      </div>
                      {log.status !== SyncStatus.FAILED && (
                        <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
                          <span>
                            <b className="text-slate-900 dark:text-slate-100">
                              {log.entriesFetched}
                            </b>{" "}
                            opgehaald
                          </span>
                          <span>
                            <b className="text-slate-900 dark:text-slate-100">
                              {log.entriesCreated}
                            </b>{" "}
                            nieuw
                          </span>
                          <span>
                            <b className="text-slate-900 dark:text-slate-100">
                              {log.entriesSkipped}
                            </b>{" "}
                            overgeslagen
                          </span>
                        </div>
                      )}
                      {log.errorMessage && (
                        <p className="mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
                          {log.errorMessage}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-5">
          {auditLogs.length === 0 ? (
            <EmptyState label="Nog geen audit events." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {auditLogs.map((log) => (
                  <li key={log.id} className="flex items-start gap-4 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {humanizeAction(log.action)}
                        </p>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          door{" "}
                          <b className="text-slate-700 dark:text-slate-300">
                            {log.user?.name ?? log.user?.email ?? "systeem"}
                          </b>
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>{formatDateTime(log.createdAt)}</span>
                        <span className="font-mono">
                          {log.entityType}
                          {log.entityId ? ` ${log.entityId.slice(0, 8)}…` : ""}
                        </span>
                      </div>
                      {(log.newValue ?? log.oldValue) && (
                        <p className="mt-1 truncate font-mono text-xs text-slate-400 dark:text-slate-500">
                          {JSON.stringify(log.newValue ?? log.oldValue)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SyncIcon({ status }: { status: SyncStatus }) {
  const base = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg";
  if (status === SyncStatus.COMPLETED)
    return (
      <div className={cn(base, "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400")}>
        <CheckCircle2 className="h-5 w-5" />
      </div>
    );
  if (status === SyncStatus.RUNNING)
    return (
      <div className={cn(base, "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400")}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  return (
    <div className={cn(base, "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400")}>
      <AlertTriangle className="h-5 w-5" />
    </div>
  );
}

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const map = {
    COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    RUNNING: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };
  const label = { COMPLETED: "Voltooid", RUNNING: "Bezig", FAILED: "Mislukt" };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", map[status])}>
      {label[status]}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <FileClock className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
