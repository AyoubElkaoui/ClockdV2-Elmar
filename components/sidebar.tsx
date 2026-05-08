"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Cable,
  ChevronLeft,
  ChevronRight,
  CircleUser,
  FileClock,
  HelpCircle,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { MiniCalendar } from "@/components/mini-calendar";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/entries", label: "Uren reviewen", icon: ListChecks },
  { href: "/geschiedenis", label: "Geschiedenis", icon: History },
  { href: "/statistieken", label: "Statistieken", icon: BarChart3 },
  { href: "/medewerkers", label: "Medewerkers", icon: Users },
  { href: "/account", label: "Mijn account", icon: CircleUser },
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/mappings", label: "Mappings", icon: Cable, adminOnly: true },
  { href: "/logs", label: "Logs", icon: FileClock, adminOnly: true },
  { href: "/settings", label: "Instellingen", icon: Settings, adminOnly: true },
];

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export function Sidebar({
  user,
  logoutAction,
  onClose,
}: {
  user: SidebarUser;
  logoutAction: () => void | Promise<void>;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = user.role === "ADMIN";
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const initials = (user.name || user.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] dark:border-slate-800 dark:bg-slate-900",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 overflow-hidden focus:outline-none"
          aria-label="Naar dashboard"
        >
          {collapsed ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <Image
                src="/elmar-logo.png"
                alt="Elmar"
                width={28}
                height={28}
                className="h-7 w-7 object-contain dark:brightness-0 dark:invert"
              />
            </div>
          ) : (
            <Image
              src="/elmar-logo.png"
              alt="Elmar Services"
              width={140}
              height={40}
              priority
              className="h-9 w-auto object-contain dark:brightness-0 dark:invert"
            />
          )}
        </Link>
        <div className="flex items-center gap-1">
          {/* Bell alleen tonen op desktop (mobile heeft eigen topbar) */}
          {!collapsed && (
            <div className="hidden lg:block">
              <NotificationBell />
            </div>
          )}
          {/* Collapse knop — alleen desktop */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:inline-flex"
            aria-label="Sidebar in-/uitklappen"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
          {/* Sluit-knop — alleen mobile */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
              aria-label="Menu sluiten"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {!collapsed && (
          <div className="mt-6">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Kalender
            </p>
            <MiniCalendar />
          </div>
        )}
      </nav>

      <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "justify-end",
          )}
        >
          <ThemeToggle />
        </div>

        {!collapsed && (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {initials || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user.name || user.email || "Gebruiker"}
              </p>
              <p className="truncate text-xs capitalize text-slate-500 dark:text-slate-400">
                {(user.role || "").toLowerCase() || "gebruiker"}
              </p>
            </div>
          </div>
        )}

        <form action={logoutAction}>
          <button
            type="submit"
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",
              collapsed && "justify-center px-2",
            )}
            title={collapsed ? "Uitloggen" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Uitloggen</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
