"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertTriangle, Cable, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveMapping, type MappingFormState } from "./actions";

export type MappingFormValues = {
  id?: string;
  clockwiseProjectId: string;
  clockwiseProjectName: string;
  syntessProjectCode: string;
  syntessProjectName?: string | null;
  syntessWorkGcId?: number | null;
  isActive: boolean;
};

type SyntessProject = {
  gcId: number;
  gcCode: string;
  gcOmschrijving: string;
};

type Props = {
  trigger: React.ReactNode;
  initial?: MappingFormValues;
  title: string;
  syntessProjects: SyntessProject[];
  isDemo: boolean;
};

export function MappingDialog({
  trigger,
  initial,
  title,
  syntessProjects,
  isDemo,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    MappingFormState | undefined,
    FormData
  >(saveMapping, undefined);
  const closedRef = useRef(false);

  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<SyntessProject | null>(
    initial?.syntessWorkGcId
      ? (syntessProjects.find((p) => p.gcId === initial.syntessWorkGcId) ?? null)
      : null,
  );

  useEffect(() => {
    if (state?.ok && !closedRef.current) {
      closedRef.current = true;
      setOpen(false);
    }
    if (!open) closedRef.current = false;
  }, [state, open]);

  const filtered = syntessProjects.filter(
    (p) =>
      p.gcCode.toLowerCase().includes(search.toLowerCase()) ||
      p.gcOmschrijving.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Koppel een Clockwise project aan een Syntess Atrium project.
          </DialogDescription>
        </DialogHeader>

        {isDemo && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Firebird niet geconfigureerd — onderstaande projecten zijn demo-data.
              Vul de Firebird-instellingen in om echte AT_WERK projecten te laden.
            </span>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          <div className="space-y-1.5">
            <Label htmlFor="clockwiseProjectId">Clockwise project-ID</Label>
            <Input
              id="clockwiseProjectId"
              name="clockwiseProjectId"
              defaultValue={initial?.clockwiseProjectId}
              required
              placeholder="bv. proj-101"
            />
            {state?.fieldErrors?.clockwiseProjectId && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.clockwiseProjectId}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clockwiseProjectName">Clockwise projectnaam</Label>
            <Input
              id="clockwiseProjectName"
              name="clockwiseProjectName"
              defaultValue={initial?.clockwiseProjectName}
              required
              placeholder="bv. Renovatie kantoorpand Utrecht"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Syntess Atrium project (AT_WERK)</Label>

            {selectedProject ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {selectedProject.gcCode}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {selectedProject.gcOmschrijving}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Wijzigen
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Zoek op code of naam..."
                    className="pl-9"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  {filtered.length === 0 ? (
                    <p className="p-3 text-center text-sm text-slate-500">
                      Geen projecten gevonden.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filtered.map((p) => (
                        <li key={p.gcId}>
                          <button
                            type="button"
                            onClick={() => setSelectedProject(p)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                              <Cable className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {p.gcCode}
                              </p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {p.gcOmschrijving}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {selectedProject && (
              <>
                <input
                  type="hidden"
                  name="syntessProjectCode"
                  value={selectedProject.gcCode}
                />
                <input
                  type="hidden"
                  name="syntessProjectName"
                  value={selectedProject.gcOmschrijving}
                />
                <input
                  type="hidden"
                  name="syntessWorkGcId"
                  value={selectedProject.gcId}
                />
              </>
            )}

            {!selectedProject && (
              <>
                <input type="hidden" name="syntessProjectCode" value="" />
                <input type="hidden" name="syntessWorkGcId" value="" />
              </>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={initial?.isActive ?? true}
              className="size-4 rounded"
            />
            <span className="text-slate-700 dark:text-slate-300">
              Actief (betrekken bij export)
            </span>
          </label>

          {state && !state.ok && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || !selectedProject}
            >
              {isPending ? "Opslaan..." : "Opslaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
