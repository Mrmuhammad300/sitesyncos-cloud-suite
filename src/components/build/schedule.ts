import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

/**
 * Planned vs actual. `elapsed` is the share of the project window that has
 * passed; `gap` is progress minus elapsed in percentage points (negative = behind plan).
 */
export function scheduleVariance(p: Pick<Project, "start_date" | "end_date" | "progress" | "status">, now = new Date()) {
  if (p.status === "Complete") return { elapsed: 100, gap: 0, known: true };
  if (!p.start_date || !p.end_date) return { elapsed: 0, gap: 0, known: false };
  const s = new Date(`${p.start_date}T00:00:00`).getTime();
  const e = new Date(`${p.end_date}T00:00:00`).getTime();
  const span = Math.max(1, e - s);
  const elapsed = Math.round(Math.min(1, Math.max(0, (now.getTime() - s) / span)) * 100);
  return { elapsed, gap: p.progress - elapsed, known: true };
}
