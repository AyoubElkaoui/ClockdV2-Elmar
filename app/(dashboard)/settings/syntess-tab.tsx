"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Database, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { testFirebirdConnection, type SettingsActionState } from "./actions";

type Props = {
  host: string;
  port: string;
  database: string;
  user: string;
  canTest: boolean;
};

export function SyntessTab({ host, port, database, user, canTest }: Props) {
  const [state, setState] = useState<SettingsActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  const isConfigured = !!host && !!database && !!user;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <header className="mb-4 flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              isConfigured
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
            }`}
          >
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Syntess Atrium — Firebird
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isConfigured
                ? "Credentials geladen vanuit omgevingsvariabelen"
                : "Vul FIREBIRD_* variabelen in je .env of Vercel in"}
            </p>
          </div>
          {state && (
            <span
              className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                state.ok
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
              }`}
            >
              {state.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {state.ok ? "Verbinding OK" : "Verbinding mislukt"}
            </span>
          )}
        </header>

        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Info label="Host" value={host || "Niet ingesteld"} missing={!host} />
          <Info label="Port" value={port} />
          <Info label="Database" value={database || "Niet ingesteld"} missing={!database} />
          <Info label="Gebruiker" value={user || "Niet ingesteld"} missing={!user} />
        </dl>

        {!isConfigured && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            Stel de volgende omgevingsvariabelen in:{" "}
            <code className="font-mono">FIREBIRD_HOST</code>,{" "}
            <code className="font-mono">FIREBIRD_DATABASE</code>,{" "}
            <code className="font-mono">FIREBIRD_USER</code>,{" "}
            <code className="font-mono">FIREBIRD_PASSWORD</code>
          </div>
        )}

        {canTest && isConfigured && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await testFirebirdConnection();
                  setState(result);
                  if (result.ok) toast.success(result.message);
                  else toast.error(result.message);
                })
              }
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {isPending ? "Testen..." : "Test verbinding"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function Info({
  label,
  value,
  missing,
}: {
  label: string;
  value: string;
  missing?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd
        className={`mt-1 font-mono text-sm ${
          missing
            ? "text-amber-600 dark:text-amber-400"
            : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
