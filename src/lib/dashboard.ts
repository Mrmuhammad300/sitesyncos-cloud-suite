import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type RFI = Database["public"]["Tables"]["rfis"]["Row"];

export const PROJECT_STATUSES = ["On Track", "At Risk", "Behind", "Complete"] as const;

export interface MonthBucket {
  key: string;
  month: string;
  spend: number;
  cumulative: number;
  started: number;
}

/** Twelve trailing months of capital deployment (in $M), bucketed by project start. */
export function buildMonthlySpend(projects: Pick<Project, "spent" | "start_date" | "created_at">[], now = new Date()): MonthBucket[] {
  const months: MonthBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      month: d.toLocaleDateString("en-US", { month: "short" }),
      spend: 0,
      cumulative: 0,
      started: 0,
    });
  }
  const index = new Map(months.map((m) => [m.key, m]));
  for (const p of projects) {
    const raw = p.start_date ?? p.created_at;
    const bucket = raw ? index.get(raw.slice(0, 7)) : undefined;
    if (bucket) {
      bucket.spend += Number(p.spent) / 1e6;
      bucket.started += 1;
    }
  }
  let running = 0;
  for (const m of months) {
    m.spend = Math.round(m.spend * 10) / 10;
    running += m.spend;
    m.cumulative = Math.round(running * 10) / 10;
  }
  return months;
}

export function isRfiOverdue(rfi: Pick<RFI, "status" | "due_date">, today = new Date()): boolean {
  if (!rfi.due_date) return false;
  if (rfi.status === "Closed" || rfi.status === "Answered") return false;
  const due = new Date(rfi.due_date + "T23:59:59");
  return due.getTime() < today.getTime();
}

/** Days until (positive) or since (negative) a due date. */
export function daysUntil(date: string | null | undefined, today = new Date()): number | null {
  if (!date) return null;
  const due = new Date(date + "T00:00:00");
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due.getTime() - start.getTime()) / 86_400_000);
}

export function budgetBurn(p: Pick<Project, "budget" | "spent">): number {
  const budget = Number(p.budget);
  return budget > 0 ? Math.round((Number(p.spent) / budget) * 100) : 0;
}

/** Projects ranked by how urgently they need attention. */
export function attentionScore(p: Pick<Project, "status" | "budget" | "spent" | "progress">): number {
  const statusWeight = p.status === "Behind" ? 3 : p.status === "At Risk" ? 2 : p.status === "Complete" ? -5 : 0;
  const burnGap = budgetBurn(p) - p.progress; // spending faster than progressing
  return statusWeight * 20 + Math.max(0, burnGap);
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
