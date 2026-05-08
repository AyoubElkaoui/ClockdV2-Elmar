import { AlertTriangle, Cable, CheckCircle2, Plus } from "lucide-react";
import { Role } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireSession } from "@/lib/guards";
import { listMappings, listUnmappedClockwiseProjects } from "@/lib/mappings";
import { MappingDialog } from "./mapping-dialog";
import { MappingRowActions } from "./mapping-row-actions";

async function getSyntessProjects() {
  try {
    const isConfigured =
      !!process.env.FIREBIRD_HOST &&
      !!process.env.FIREBIRD_DATABASE &&
      !!process.env.FIREBIRD_USER &&
      !!process.env.FIREBIRD_PASSWORD;

    // Gebruik de route handler logica direct (server-side)
    const { getAtWerkProjects } = await import("@/lib/firebird");
    if (isConfigured) {
      const projects = await getAtWerkProjects();
      return { projects, isDemo: false };
    }
  } catch {
    // fall through
  }

  // Demo fallback
  return {
    isDemo: true,
    projects: [
      { gcId: 300, gcCode: "200.25.7006", gcOmschrijving: "Testproject 7006", werkgrpGcId: 200 },
      { gcId: 301, gcCode: "200.25.7007", gcOmschrijving: "Testproject 7007", werkgrpGcId: 200 },
      { gcId: 302, gcCode: "200.25.7008", gcOmschrijving: "Testproject 7008", werkgrpGcId: 200 },
      { gcId: 303, gcCode: "200.25.7009", gcOmschrijving: "Testproject 7009", werkgrpGcId: 200 },
      { gcId: 304, gcCode: "200.25.7010", gcOmschrijving: "Testproject 7010", werkgrpGcId: 200 },
      { gcId: 305, gcCode: "200.25.7011", gcOmschrijving: "Testproject 7011", werkgrpGcId: 200 },
      { gcId: 306, gcCode: "200.25.7012", gcOmschrijving: "Testproject 7012", werkgrpGcId: 200 },
      { gcId: 307, gcCode: "200.25.7013", gcOmschrijving: "Testproject 7013", werkgrpGcId: 201 },
      { gcId: 308, gcCode: "200.25.7014", gcOmschrijving: "Testproject 7014", werkgrpGcId: 201 },
      { gcId: 309, gcCode: "200.25.7015", gcOmschrijving: "Testproject 7015", werkgrpGcId: 201 },
      { gcId: 310, gcCode: "201.26.8001", gcOmschrijving: "Renovatie Hoofdkantoor", werkgrpGcId: 202 },
      { gcId: 311, gcCode: "201.26.8002", gcOmschrijving: "Installatie Schiphol", werkgrpGcId: 202 },
      { gcId: 312, gcCode: "202.27.9001", gcOmschrijving: "Nieuwbouw Tilburg", werkgrpGcId: 203 },
      { gcId: 313, gcCode: "202.27.9002", gcOmschrijving: "Verbouwing Rotterdam", werkgrpGcId: 203 },
      { gcId: 314, gcCode: "203.28.1001", gcOmschrijving: "Onderhoud Zuidas", werkgrpGcId: 204 },
    ],
  };
}

export default async function MappingsPage() {
  const session = await requireSession();
  const [mappings, unmapped, { projects: syntessProjects, isDemo }] =
    await Promise.all([
      listMappings(),
      listUnmappedClockwiseProjects(),
      getSyntessProjects(),
    ]);

  const canDelete = session.user.role === Role.ADMIN;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Project mappings
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Koppel Clockwise-projecten aan Syntess Atrium (AT_WERK). Entries
            zonder actieve mapping kunnen niet worden geëxporteerd.
          </p>
        </div>
        <MappingDialog
          title="Nieuwe mapping"
          syntessProjects={syntessProjects}
          isDemo={isDemo}
          trigger={
            <button
              className={cn(
                buttonVariants(),
                "shrink-0 inline-flex items-center gap-1.5",
              )}
            >
              <Plus className="h-4 w-4" />
              Nieuwe mapping
            </button>
          }
        />
      </div>

      {unmapped.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {unmapped.length}{" "}
              {unmapped.length === 1
                ? "Clockwise project zonder mapping"
                : "Clockwise projecten zonder mapping"}
            </p>
            <ul className="mt-1 space-y-0.5">
              {unmapped.map((e) => (
                <li
                  key={e.projectId}
                  className="text-xs text-amber-800 dark:text-amber-300"
                >
                  <span className="font-mono">{e.projectId}</span>
                  {e.projectName ? ` — ${e.projectName}` : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {mappings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Cable className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Nog geen mappings
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Voeg je eerste koppeling toe via de knop rechtsboven.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {mappings.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                    <Cable className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {m.clockwiseProjectName}
                      </p>
                      {m.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Actief
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                          Inactief
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Clockwise:{" "}
                      <span className="font-mono">{m.clockwiseProjectId}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Syntess AT_WERK
                    </p>
                    <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {m.syntessProjectCode}
                    </p>
                    {m.syntessProjectName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {m.syntessProjectName}
                      </p>
                    )}
                    {m.syntessWorkGcId && (
                      <p className="font-mono text-xs text-slate-400 dark:text-slate-500">
                        GC_ID: {m.syntessWorkGcId}
                      </p>
                    )}
                  </div>
                </div>

                <MappingRowActions
                  canDelete={canDelete}
                  syntessProjects={syntessProjects}
                  isDemo={isDemo}
                  mapping={{
                    id: m.id,
                    clockwiseProjectId: m.clockwiseProjectId,
                    clockwiseProjectName: m.clockwiseProjectName,
                    syntessProjectCode: m.syntessProjectCode,
                    syntessProjectName: m.syntessProjectName,
                    syntessWorkGcId: m.syntessWorkGcId,
                    isActive: m.isActive,
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
