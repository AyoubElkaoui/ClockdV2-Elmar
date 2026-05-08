"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { TimeEntryStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  initial: {
    status?: string;
    employeeId?: string;
    from?: string;
    to?: string;
    search?: string;
  };
  employees: { employeeId: string; employeeName: string }[];
};

const ALL_VALUE = "__all__";

const STATUS_LABELS: Record<TimeEntryStatus, string> = {
  PENDING: "Wacht op review",
  APPROVED: "Goedgekeurd",
  REJECTED: "Afgewezen",
  EXPORTED: "Verzonden",
  EXPORT_FAILED: "Verzending mislukt",
};

export function EntriesFilters({ initial, employees }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of ["status", "employeeId", "from", "to", "search"] as const) {
      const value = formData.get(key);
      if (typeof value === "string" && value && value !== ALL_VALUE) {
        params.set(key, value);
      }
    }
    startTransition(() => {
      router.push(`/entries${params.size ? `?${params.toString()}` : ""}`);
    });
  }

  return (
    <form
      action={submit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Status">
          <Select name="status" defaultValue={initial.status ?? ALL_VALUE}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value) =>
                  value && value !== ALL_VALUE
                    ? STATUS_LABELS[value as TimeEntryStatus]
                    : "Alle statussen"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Alle statussen</SelectItem>
              {Object.values(TimeEntryStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Medewerker">
          <Select name="employeeId" defaultValue={initial.employeeId ?? ALL_VALUE}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value) => {
                  if (!value || value === ALL_VALUE) return "Iedereen";
                  const match = employees.find((e) => e.employeeId === value);
                  return match?.employeeName || match?.employeeId || value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Iedereen</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.employeeId} value={e.employeeId}>
                  {e.employeeName || e.employeeId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Van">
          <Input type="date" name="from" defaultValue={initial.from ?? ""} />
        </Field>
        <Field label="Tot">
          <Input type="date" name="to" defaultValue={initial.to ?? ""} />
        </Field>
        <Field label="Zoeken">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="search"
                placeholder="Naam, project, omschrijving..."
                defaultValue={initial.search ?? ""}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "..." : "Filter"}
            </Button>
          </div>
        </Field>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </Label>
      {children}
    </div>
  );
}
