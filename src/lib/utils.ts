import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; text: string }> = {
  New:          { label: "New",          color: "#3b82f6", bg: "bg-blue-100",   text: "text-blue-700" },
  "In Progress":{ label: "In Progress",  color: "#f59e0b", bg: "bg-amber-100",  text: "text-amber-700" },
  "Under Review":{ label: "Under Review",color: "#8b5cf6", bg: "bg-purple-100", text: "text-purple-700" },
  Approved:     { label: "Approved",     color: "#06b6d4", bg: "bg-cyan-100",   text: "text-cyan-700" },
  Completed:    { label: "Completed",    color: "#22c55e", bg: "bg-green-100",  text: "text-green-700" },
  Cancelled:    { label: "Cancelled",    color: "#6b7280", bg: "bg-gray-100",   text: "text-gray-600" },
};

export const STATUSES = Object.keys(STATUS_CONFIG);

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export function isOverdue(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
