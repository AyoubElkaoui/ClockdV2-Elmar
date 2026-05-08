"use client";

import { useActionState, useState, useTransition } from "react";
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import { runSyncNow, saveClockwiseConfig, type SettingsActionState } from "./actions";

type Props = {
  connected: boolean;
  baseUrl: string;
  clientId: string;
  syncInterval: number;
  tokenExpiresAt: Date | null;
  lastSyncAt: Date | null;
  canManage: boolean;
};

export function ClockwiseTab({
  connected,
  baseUrl,
  clientId,
  syncInterval,
  tokenExpiresAt,
  lastSyncAt,
  canManage,
}: Props) {
  const [state, formAction, isPending] = useActionState<
    SettingsActionState | undefined,
    FormData
  >(saveClockwiseConfig, undefined);
  const [isSyncing, startSync] = useTransition();
  const [isTesting, startTest] = useTransition();
  const [testResult, setTestResult] = useState<SettingsActionState | null>(null);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <header className="mb-4 flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              connected
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
            }`}
          >
            {connected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Verbindingsstatus
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {connected ? "Verbonden met Clockwise" : "Nog niet verbonden"}
            </p>
          </div>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              connected
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {connected ? "Actief" : "Inactief"}
          </span>
        </header>

        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Info
            label="Access token geldig tot"
            value={tokenExpiresAt ? formatDateTime(tokenExpiresAt) : "—"}
          />
          <Info
            label="Laatste sync"
            value={lastSyncAt ? formatDateTime(lastSyncAt) : "Nog niet gesynchroniseerd"}
          />
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          {canManage && (
            <a href="/api/clockwise/auth">
              <Button variant={connected ? "outline" : "default"} size="sm">
                <Wifi className="mr-1.5 h-4 w-4" />
                {connected ? "Opnieuw autoriseren" : "Verbind met Clockwise"}
              </Button>
            </a>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={isSyncing}
            onClick={() =>
              startSync(async () => {
                const result = await runSyncNow();
                if (result?.ok) toast.success(result.message);
                else toast.error(result?.message ?? "Sync mislukt");
              })
            }
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Bezig..." : "Sync nu"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isTesting}
            onClick={() =>
              startTest(async () => {
                const response = await fetch("/api/settings/test-clockwise", {
                  method: "POST",
                });
                const data = await response.json();
                const result: SettingsActionState = {
                  ok: Boolean(data.ok),
                  message: data.ok
                    ? `Token geldig tot ${data.tokenExpiresAt ?? "?"}`
                    : `Test mislukt: ${data.error ?? "onbekende fout"}`,
                };
                setTestResult(result);
                if (result.ok) toast.success(result.message);
                else toast.error(result.message);
              })
            }
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {isTesting ? "Testen..." : "Test verbinding"}
          </Button>
        </div>
      </section>

      {canManage && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <header className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Clockwise credentials
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                OAuth2 client gegevens voor de API-koppeling.
              </p>
            </div>
          </header>
          <form action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Base URL" name="baseUrl" defaultValue={baseUrl} />
              <Field label="Client ID" name="clientId" defaultValue={clientId} />
              <Field
                label="Client secret"
                name="clientSecret"
                type="password"
                defaultValue=""
                placeholder="Laat leeg om ongewijzigd te laten"
              />
              <div className="space-y-1.5">
                <Label htmlFor="syncInterval" className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  Sync interval (minuten)
                </Label>
                <Input
                  id="syncInterval"
                  name="syncInterval"
                  type="number"
                  defaultValue={String(syncInterval)}
                  min={5}
                  max={60}
                />
              </div>
            </div>
            {state && (
              <p
                className={`text-sm ${state.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}
                role="status"
              >
                {state.message}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={name}
        className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </div>
  );
}
