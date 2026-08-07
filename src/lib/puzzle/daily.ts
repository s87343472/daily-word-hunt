/**
 * Daily release helpers (static site).
 *
 * User-facing: open `/` → today's puzzle.
 * "Release" = calendar date in site timezone; only dates <= today are playable.
 * Dated URLs (`/daily/YYYY-MM-DD`) are optional archive/share links for SEO.
 */

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Format a Date as YYYY-MM-DD in an IANA timezone. */
export function formatDateInTimeZone(
  date: Date,
  timeZone: string
): string {
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function puzzlePathForDate(isoDate: string): string {
  return `/puzzles/${isoDate}.json`;
}

export function isValidPuzzleDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Compare YYYY-MM-DD strings lexicographically (valid for ISO dates). */
export function isDateOnOrBefore(a: string, b: string): boolean {
  return a <= b;
}
