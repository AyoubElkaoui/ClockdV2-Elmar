"use client";

import { useActionState, useTransition } from "react";
import { Shield, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";
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
import { addUser, changeUserRole, toggleUserActive, type SettingsActionState } from "./actions";
import { cn } from "@/lib/utils";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Beheerder",
  REVIEWER: "Reviewer",
  VIEWER: "Kijker",
};

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  REVIEWER: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  VIEWER: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

const AVATAR_COLORS = ["bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-amber-500", "bg-rose-500"];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function UsersTab({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [state, formAction, isPending] = useActionState<SettingsActionState | undefined, FormData>(
    addUser,
    undefined,
  );

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Gebruikers</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {users.length} {users.length === 1 ? "gebruiker" : "gebruikers"}
            </p>
          </div>
        </header>
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {users.map((u) => (
            <UserRowItem key={u.id} user={u} isSelf={u.id === currentUserId} />
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <header className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Nieuwe gebruiker
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Voeg een reviewer of beheerder toe.
            </p>
          </div>
        </header>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Naam" name="name" required />
            <Field label="E-mailadres" name="email" type="email" required />
            <Field label="Wachtwoord (min. 8 tekens)" name="password" type="password" required />
            <div className="space-y-1.5">
              <Label
                htmlFor="role"
                className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Rol
              </Label>
              <Select name="role" defaultValue={Role.REVIEWER}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue>
                    {(value) => ROLE_LABELS[value as Role] ?? value ?? "Selecteer rol"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Role).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {isPending ? "Toevoegen..." : "Gebruiker toevoegen"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function UserRowItem({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
          avatarColor(user.name || user.email),
        )}
      >
        {initials(user.name) || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {user.name}
          </p>
          {isSelf && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              jij
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            ROLE_COLORS[user.role],
          )}
        >
          <Shield className="h-3.5 w-3.5" />
          {ROLE_LABELS[user.role]}
        </span>

        <Select
          defaultValue={user.role}
          disabled={isSelf || isPending}
          onValueChange={(value) =>
            startTransition(async () => {
              await changeUserRole(user.id, value as Role);
              toast.success(`Rol gewijzigd naar ${ROLE_LABELS[value as Role]}`);
            })
          }
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue>
              {(value) => value ? "Rol wijzigen" : "Rol wijzigen"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.values(Role).filter((r) => r !== user.role).map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          disabled={isPending || isSelf}
          onClick={() =>
            startTransition(async () => {
              await toggleUserActive(user.id, !user.isActive);
              toast.success(user.isActive ? "Gebruiker gedeactiveerd" : "Gebruiker geactiveerd");
            })
          }
          className={user.isActive ? "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10" : ""}
        >
          {user.isActive ? "Deactiveren" : "Activeren"}
        </Button>
      </div>
    </li>
  );
}

function Field({
  label, name, type = "text", required,
}: {
  label: string; name: string; type?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={name}
        className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {label}
      </Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}
