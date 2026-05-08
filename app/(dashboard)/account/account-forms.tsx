"use client";

import { useActionState, useEffect, useRef } from "react";
import { Key, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePassword,
  updateProfile,
  type AccountFormState,
} from "./actions";

const initialState: AccountFormState = {};

export function ProfileForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateProfile,
    initialState,
  );

  useEffect(() => {
    if (state.ok) toast.success(state.ok);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
          <UserCircle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Profiel
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Je basisinformatie.
          </p>
        </div>
      </header>
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Naam</Label>
            <Input
              id="name"
              name="name"
              defaultValue={defaultName}
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres</Label>
            <Input id="email" value={email} disabled />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              E-mail kan alleen door een beheerder worden gewijzigd.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Opslaan..." : "Opslaan"}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePassword,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      formRef.current?.reset();
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          <Key className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Wachtwoord wijzigen
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gebruik minstens 8 tekens.
          </p>
        </div>
      </header>
      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current">Huidig wachtwoord</Label>
          <Input
            id="current"
            name="current"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="next">Nieuw wachtwoord</Label>
            <Input
              id="next"
              name="next"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Bevestig nieuw wachtwoord</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Wijzigen..." : "Wachtwoord wijzigen"}
          </Button>
        </div>
      </form>
    </section>
  );
}
