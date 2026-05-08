import { format } from "date-fns";
import { nl } from "date-fns/locale";

export function formatHours(hours: number): string {
  return hours.toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(date: Date | string): string {
  return format(typeof date === "string" ? new Date(date) : date, "d MMM yyyy", { locale: nl });
}

export function formatDateTime(date: Date | string): string {
  return format(typeof date === "string" ? new Date(date) : date, "d MMM yyyy HH:mm", {
    locale: nl,
  });
}
