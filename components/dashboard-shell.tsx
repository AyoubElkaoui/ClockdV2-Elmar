"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { NotificationBell } from "@/components/notification-bell";

type User = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export function DashboardShell({
  user,
  logoutAction,
  children,
}: {
  user: User;
  logoutAction: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // sluit sidebar bij navigatie op mobile
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // sluit bij Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex min-h-dvh">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — desktop sticky, mobile fixed drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:transition-none ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar
          user={user}
          logoutAction={logoutAction}
          onClose={() => setOpen(false)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Menu openen"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Image
            src="/elmar-logo.png"
            alt="Elmar Services"
            width={120}
            height={34}
            priority
            className="h-8 w-auto object-contain dark:brightness-0 dark:invert"
          />
          <div className="ml-auto">
            <NotificationBell mobileAlign />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
