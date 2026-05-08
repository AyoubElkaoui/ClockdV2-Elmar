"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Inbox, XCircle } from "lucide-react";
import { TimeEntryStatus } from "@prisma/client";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatDate, formatHours } from "@/lib/format";
import { bulkReview, type BulkReviewState } from "./actions";

export type EntryRow = {
  id: string;
  date: string;
  employeeName: string;
  projectName: string | null;
  hours: number;
  description: string | null;
  status: TimeEntryStatus;
  errorMessage: string | null;
};

type Props = {
  rows: EntryRow[];
  canReview: boolean;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

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

export function EntriesTable({ rows, canReview }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, formAction, isPending] = useActionState<
    BulkReviewState | undefined,
    FormData
  >(bulkReview, undefined);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      setSelected(new Set());
    } else {
      toast.error(state.message);
    }
  }, [state]);

  const selectableIds = useMemo(
    () =>
      rows
        .filter((r) => r.status === TimeEntryStatus.PENDING)
        .map((r) => r.id),
    [rows],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleOne(id: string, value: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(value: boolean) {
    setSelected(value ? new Set(selectableIds) : new Set());
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Inbox className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Geen urenregistraties gevonden
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Pas de filters aan of wacht tot er nieuwe binnenkomen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canReview && selected.size > 0 && (
        <form
          action={formAction}
          className="sticky top-3 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm dark:border-blue-500/30 dark:bg-blue-500/10"
        >
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="entryIds" value={id} />
          ))}
          <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
            {selected.size} geselecteerd
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              disabled={isPending}
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              name="action"
              value="REJECTED"
              size="sm"
              variant="outline"
              disabled={isPending}
              className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Afwijzen
            </Button>
            <Button
              type="submit"
              name="action"
              value="APPROVED"
              size="sm"
              disabled={isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Goedkeuren
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {canReview && selectableIds.length > 0 && (
          <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900/40">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={(v) => toggleAll(v === true)}
              aria-label="Selecteer alles"
            />
            <span className="text-slate-600 dark:text-slate-400">
              Selecteer alle {selectableIds.length} reviewbare items op deze pagina
            </span>
          </div>
        )}

        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {rows.map((row) => (
            <EntryRow
              key={row.id}
              row={row}
              canReview={canReview}
              checked={selected.has(row.id)}
              onToggle={(v) => toggleOne(row.id, v)}
              isPending={isPending}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function EntryRow({
  row,
  canReview,
  checked,
  onToggle,
  isPending,
}: {
  row: EntryRow;
  canReview: boolean;
  checked: boolean;
  onToggle: (v: boolean) => void;
  isPending: boolean;
}) {
  const isPending_ = row.status === TimeEntryStatus.PENDING;
  const canSelect = canReview && isPending_;

  return (
    <li
      className={cn(
        "group relative flex items-start gap-3 p-3.5 transition-colors",
        checked
          ? "bg-blue-50/60 dark:bg-blue-500/5"
          : "hover:bg-slate-50 dark:hover:bg-slate-900/40",
      )}
    >
      <Link
        href={`/entries/${row.id}`}
        aria-label={`Details ${row.employeeName}`}
        className="absolute inset-0 z-10"
      />

      {canReview && (
        <div className="relative z-20 pt-1">
          <Checkbox
            checked={checked}
            disabled={!canSelect}
            onCheckedChange={(v) => onToggle(v === true)}
            aria-label={`Selecteer ${row.employeeName}`}
          />
        </div>
      )}

      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
          avatarColor(row.employeeName || row.id),
        )}
      >
        {initials(row.employeeName) || "?"}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            {row.employeeName}
          </p>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {row.projectName ?? "Geen project"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {formatHours(row.hours)} uur
          </span>
          <span>•</span>
          <span>{formatDate(row.date)}</span>
        </div>
        {row.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {row.description}
          </p>
        )}
        {row.errorMessage && (
          <p className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {row.errorMessage}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          <ChevronRight
            className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400"
            aria-hidden="true"
          />
        </div>
        {canReview && isPending_ && (
          <div className="relative z-20 flex gap-1.5">
            <SingleActionButton
              entryId={row.id}
              action="REJECTED"
              disabled={isPending}
            />
            <SingleActionButton
              entryId={row.id}
              action="APPROVED"
              disabled={isPending}
            />
          </div>
        )}
      </div>
    </li>
  );
}

function SingleActionButton({
  entryId,
  action,
  disabled,
}: {
  entryId: string;
  action: "APPROVED" | "REJECTED";
  disabled: boolean;
}) {
  const [, formAction, isPending] = useActionState<
    BulkReviewState | undefined,
    FormData
  >(bulkReview, undefined);

  const isApprove = action === "APPROVED";
  return (
    <form action={formAction}>
      <input type="hidden" name="entryIds" value={entryId} />
      <input type="hidden" name="action" value={action} />
      <button
        type="submit"
        disabled={disabled || isPending}
        title={isApprove ? "Goedkeuren" : "Afwijzen"}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-50",
          isApprove
            ? "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
            : "border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10",
        )}
      >
        {isApprove ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
      </button>
    </form>
  );
}
