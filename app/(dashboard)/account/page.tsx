import { Shield } from "lucide-react";
import { requireSession } from "@/lib/guards";
import { PasswordForm, ProfileForm } from "./account-forms";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Beheerder",
  REVIEWER: "Reviewer",
  VIEWER: "Kijkers",
};

export default async function AccountPage() {
  const session = await requireSession();
  const user = session.user;
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Mijn account
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Beheer je persoonlijke gegevens en wachtwoord.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-semibold text-white">
          {(user.name || user.email || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {user.name || user.email}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {user.email}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          <Shield className="h-3.5 w-3.5" />
          {roleLabel}
        </span>
      </div>

      <ProfileForm defaultName={user.name ?? ""} email={user.email ?? ""} />
      <PasswordForm />
    </div>
  );
}
