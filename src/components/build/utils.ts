/** Small, framework-free helpers shared by the Build module pages. */
import { daysUntil } from "@/lib/dashboard";

export { daysUntil };

/** "Mar 4" / "Mar 4, 2026" — returns an em dash for empty values. */
export function fmtDate(d: string | null | undefined, withYear = false): string {
  if (!d) return "—";
  const date = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", withYear ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
}

/** Whole days between two ISO dates (b − a). */
export function daysBetween(a: string | Date, b: string | Date): number {
  const da = typeof a === "string" ? new Date(a.length <= 10 ? `${a}T00:00:00` : a) : a;
  const db = typeof b === "string" ? new Date(b.length <= 10 ? `${b}T00:00:00` : b) : b;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export type Urgency = "late" | "today" | "soon" | "later" | "none" | "done";

/** Classifies a due date for the urgency chip. */
export function urgencyOf(due: string | null | undefined, done = false): { urgency: Urgency; days: number | null } {
  if (done) return { urgency: "done", days: daysUntil(due) };
  const d = daysUntil(due);
  if (d === null) return { urgency: "none", days: null };
  if (d < 0) return { urgency: "late", days: d };
  if (d === 0) return { urgency: "today", days: d };
  if (d <= 3) return { urgency: "soon", days: d };
  return { urgency: "later", days: d };
}

/** Signed money, e.g. "+$184K" / "−$122K". */
export function fmtSignedDollar(v: number, fmt: (n: number) => string): string {
  if (v === 0) return fmt(0);
  return `${v > 0 ? "+" : "−"}${fmt(Math.abs(v))}`;
}

/** Last `n` calendar days as YYYY-MM-DD keys, oldest first. */
export function lastNDays(n: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

/** Bucket rows by the day of a date field (created_at etc.) for sparklines. */
export function dailyCounts<T>(rows: T[], pick: (r: T) => string | null | undefined, days = 14): number[] {
  const keys = lastNDays(days);
  const idx = new Map(keys.map((k, i) => [k, i]));
  const out = keys.map(() => 0);
  for (const r of rows) {
    const v = pick(r);
    if (!v) continue;
    const i = idx.get(v.slice(0, 10));
    if (i !== undefined) out[i] += 1;
  }
  return out;
}
