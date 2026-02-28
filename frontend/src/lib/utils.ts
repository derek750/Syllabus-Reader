import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the calendar date from an ISO or "yyyy-MM-dd" string as a local Date.
 * Avoids the "off by one day" bug when the DB returns midnight UTC (e.g. 2025-02-27T00:00:00.000Z)
 * and we display in a timezone behind UTC.
 */
export function parseAssignmentDate(dateString: string): Date {
  const s = (dateString ?? "").trim();
  const datePart = s.includes("T") ? s.slice(0, 10) : s.slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return new Date(dateString);
  return new Date(y, m - 1, d);
}

/** Format assignment due date for display (uses calendar date, no timezone shift). */
export function formatAssignmentDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const d = parseAssignmentDate(dateString);
  return d.toLocaleDateString(undefined, options ?? undefined);
}

/** Format due_time from DB ("HH:mm:ss" or "HH:mm") for display (e.g. "2:30 PM"). */
export function formatAssignmentTime(timeString: string | null | undefined): string {
  if (!timeString || !timeString.trim()) return "";
  const part = timeString.trim().slice(0, 5); // "HH:mm"
  const [h, m] = part.split(":").map(Number);
  if (Number.isNaN(h)) return "";
  const d = new Date(2000, 0, 1, h, m ?? 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
