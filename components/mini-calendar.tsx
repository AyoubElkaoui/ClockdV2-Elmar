"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function buildGrid(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    days.push(new Date(d));
  }
  return days;
}

const WEEKDAYS = ["m", "d", "w", "d", "v", "z", "z"];

export function MiniCalendar() {
  const router = useRouter();
  const [cursor, setCursor] = useState(() => new Date());
  const today = new Date();

  const days = buildGrid(cursor);

  function pickDay(day: Date) {
    const iso = format(day, "yyyy-MM-dd");
    router.push(`/entries?from=${iso}&to=${iso}`);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor((c) => subMonths(c, 1))}
          aria-label="Vorige maand"
          className="rounded-md p-1 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setCursor(new Date())}
          className="text-xs font-semibold capitalize text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400"
        >
          {format(cursor, "LLLL yyyy", { locale: nl })}
        </button>
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          aria-label="Volgende maand"
          className="rounded-md p-1 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px text-center text-[10px] font-medium uppercase text-slate-400 dark:text-slate-500">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-px">
        {days.map((day) => {
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => pickDay(day)}
              className={cn(
                "aspect-square rounded-md text-xs transition-colors",
                isToday
                  ? "bg-blue-600 font-semibold text-white hover:bg-blue-700"
                  : inMonth
                    ? "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                    : "text-slate-300 hover:bg-slate-200 dark:text-slate-600 dark:hover:bg-slate-700",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
