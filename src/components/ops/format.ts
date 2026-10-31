/** Formatting + date helpers shared by the Ops pages. */

const DAY = 86_400_000;

/** Whole days from today (local midnight) until `d`. Negative = in the past. */
export function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  const t = new Date(d.length <= 10 ? `${d}T00:00:00` : d).getTime();
  if (Number.isNaN(t)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((t - today.getTime()) / DAY);
}

/** Whole days since `d` (positive for past dates). */
export function daysSince(d: string | null | undefined): number | null {
  const n = daysUntil(d);
  return n === null ? null : -n;
}

/** "Mar 4, 2026" — compact, unambiguous. */
export function fmtDate(d: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  if (!d) return "—";
  const t = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
  if (Number.isNaN(t.getTime())) return d;
  return t.toLocaleDateString("en-US", opts);
}

/** "in 12d" / "3d ago" / "today". */
export function relDays(n: number | null): string {
  if (n === null) return "—";
  if (n === 0) return "today";
  if (n > 0) return n >= 365 ? `in ${(n / 365).toFixed(1)}y` : `in ${n}d`;
  const a = -n;
  return a >= 365 ? `${(a / 365).toFixed(1)}y ago` : `${a}d ago`;
}

/** Exact currency, no cents: $1,234,567 */
export function fmtMoney(v: number): string {
  const sign = v < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(v)).toLocaleString("en-US")}`;
}

/** Utilisation percentage, guarded against /0. */
export function pctOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Parse "3.4 MB" / "512 KB" → bytes. Returns 0 when unparseable. */
export function parseSize(s: string | null | undefined): number {
  if (!s) return 0;
  const m = /([\d.]+)\s*(B|KB|MB|GB|TB)/i.exec(s);
  if (!m) return 0;
  const mult: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
  return Number(m[1]) * (mult[m[2].toUpperCase()] ?? 1);
}

export function fmtBytes(b: number): string {
  if (b <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

/** Status filter options: the canonical list plus anything present in the data. */
export function statusOptions(canonical: readonly string[], present: Iterable<string>): string[] {
  const out = ["All", ...canonical.filter((s) => s !== "All")];
  for (const s of present) if (s && !out.includes(s)) out.push(s);
  return out;
}

export function countBy<T>(rows: T[], key: (r: T) => string): Record<string, number> {
  const c: Record<string, number> = { All: rows.length };
  for (const r of rows) { const k = key(r); c[k] = (c[k] ?? 0) + 1; }
  return c;
}
