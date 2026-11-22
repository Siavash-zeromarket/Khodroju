import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Add the current value to the front of the list if it's not already present. */
export function withCurrent(list: string[], current?: string): string[] {
  if (current && !list.includes(current)) return [current, ...list];
  return list;
}

/** Convert a Gregorian year number (e.g. 2026) to a Persian year string (e.g. "۱۴۰۵"). */
export function toPersianYear(gregorian: number): string {
  const persianNum = gregorian - 621;
  return String(persianNum).replace(/[0-9]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 1728),
  );
}

/** Convert a Persian year string (e.g. "۱۴۰۵") back to a Gregorian year number (e.g. 2026).
 *  If the input is already Gregorian (e.g. "2025"), it is returned as-is. */
export function fromPersianYear(persian: string): number {
  const hasPersianDigits = /[۰-۹]/.test(persian);
  if (!hasPersianDigits) return Number(persian);
  const english = persian.replace(/[۰-۹]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 1728),
  );
  return Number(english) + 621;
}

/** Format an ISO date string to Persian date with time (e.g. "۱۵ مرداد ۱۴۰۵، ۱۴:۳۰"). */
export function formatPersianDateTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(date);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalise a route param that may arrive percent-encoded and return it only
 *  when it is a UUID. Non-UUID values (e.g. legacy name-based links) yield null
 *  so callers can skip the query instead of hitting a Postgres 22P02 error. */
export function parseUuidParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  try {
    value = decodeURIComponent(value).trim();
  } catch {
    // Malformed escape sequence — keep the raw value.
  }
  return UUID_RE.test(value) ? value : null;
}

/** URL-safe slug from a latin seller name, e.g. "Aria Motors" → "aria-motors". */
export function sellerSlug(sellerName: string): string {
  return sellerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
