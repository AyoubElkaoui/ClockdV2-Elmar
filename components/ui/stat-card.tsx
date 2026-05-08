import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = "bg-blue-600",
  tone,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBgColor?: string;
  tone?: "warn";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white",
            iconBgColor,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p
            className={cn(
              "mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100",
              tone === "warn" && "text-amber-600 dark:text-amber-400",
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
