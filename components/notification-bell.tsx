"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowRight, Bell, BellOff, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/format";

type NotifItem = {
  id: string;
  employeeName: string;
  projectName: string | null;
  hours: number;
  date: string;
  createdAt: string;
};

type NotifResponse = {
  pendingCount: number;
  items: NotifItem[];
};

const STORAGE_KEY = "clockd_notif_last_seen";
const POLL_INTERVAL = 30_000;

export function NotificationBell({ mobileAlign }: { mobileAlign?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotifResponse | null>(null);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json: NotifResponse = await res.json();
      setData(json);
    } catch {
      // ignore network errors
    }
  }, []);

  useEffect(() => {
    setLastSeen(Number(localStorage.getItem(STORAGE_KEY) || 0));
    fetchNotifs();
    const id = setInterval(fetchNotifs, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = data?.items ?? [];
  const newCount = items.filter(
    (i) => new Date(i.createdAt).getTime() > lastSeen,
  ).length;
  const showBadge = newCount > 0;

  function toggleOpen() {
    if (!open) {
      const ts = Date.now();
      localStorage.setItem(STORAGE_KEY, String(ts));
      setLastSeen(ts);
    }
    setOpen((o) => !o);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Meldingen"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Bell className="h-4 w-4" />
        {showBadge && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
        )}
      </button>

      {open && (
        <div className={cn(
          "absolute top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-800 dark:ring-white/10",
          mobileAlign ? "right-0" : "left-0 lg:left-auto lg:right-0",
        )}>
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Meldingen
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {data
                  ? data.pendingCount === 0
                    ? "Niks te reviewen"
                    : `${data.pendingCount} ${data.pendingCount === 1 ? "registratie" : "registraties"} wacht op review`
                  : "Laden..."}
              </p>
            </div>
            {newCount > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                {newCount} nieuw
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <BellOff className="h-6 w-6 text-slate-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Geen openstaande registraties.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {items.map((item) => {
                  const isNew = new Date(item.createdAt).getTime() > lastSeen;
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/entries?status=PENDING`}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/40",
                          isNew && "bg-blue-50/50 dark:bg-blue-500/5",
                        )}
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {item.employeeName}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {formatHours(item.hours)} uur •{" "}
                            {item.projectName ?? "Geen project"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                            {formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                              locale: nl,
                            })}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {data && data.pendingCount > 0 && (
            <Link
              href="/entries?status=PENDING"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-blue-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-blue-400 dark:hover:bg-slate-900"
            >
              Bekijk alle
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
