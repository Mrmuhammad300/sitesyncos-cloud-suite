/**
 * Shared vocabulary for the AI module. The database has carried two naming
 * schemes over time (`FullAuto` vs `autonomous`, `Completed` vs `completed`),
 * so everything that renders agent state normalizes through here first.
 */
import type { LucideIcon } from "lucide-react";
import {
  Activity, Boxes, Brain, CalendarClock, Cpu, DollarSign, FileSearch, FileText, HardHat, Route, ShieldCheck, Zap,
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import type { StatusTone } from "@/components/os";

/* ─── Autonomy ─────────────────────────────────────────────────────── */

export interface AutonomyInfo {
  /** 1 (advisory) … 4 (fully autonomous) */
  level: 1 | 2 | 3 | 4;
  label: string;
  short: string;
}

const AUTONOMY: Record<string, AutonomyInfo> = {
  fullauto: { level: 4, label: "Fully autonomous", short: "L4 Auto" },
  autonomous: { level: 4, label: "Fully autonomous", short: "L4 Auto" },
  autowithaudit: { level: 3, label: "Auto with audit", short: "L3 Audit" },
  supervised: { level: 3, label: "Supervised", short: "L3 Supervised" },
  draftwithapproval: { level: 2, label: "Draft · needs approval", short: "L2 Approval" },
  approvalrequired: { level: 2, label: "Approval required", short: "L2 Approval" },
  advisoryonly: { level: 1, label: "Advisory only", short: "L1 Advisory" },
  advisory: { level: 1, label: "Advisory only", short: "L1 Advisory" },
};

export function autonomyOf(raw: string | null | undefined): AutonomyInfo {
  const key = (raw ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return AUTONOMY[key] ?? { level: 1, label: raw || "Unspecified", short: raw || "—" };
}

/* ─── Execution status ─────────────────────────────────────────────── */

export type ExecState = "completed" | "failed" | "pending" | "running" | "other";

export function execState(raw: string | null | undefined): ExecState {
  const s = (raw ?? "").toLowerCase();
  if (/(complete|success|done)/.test(s)) return "completed";
  if (/(fail|error)/.test(s)) return "failed";
  if (/(pend|await|queue)/.test(s)) return "pending";
  if (/(run|progress|process)/.test(s)) return "running";
  return "other";
}

export const EXEC_LABEL: Record<ExecState, string> = {
  completed: "Completed",
  failed: "Failed",
  pending: "Pending",
  running: "Running",
  other: "Unknown",
};

export const EXEC_TONE: Record<ExecState, StatusTone> = {
  completed: "success",
  failed: "destructive",
  pending: "warning",
  running: "info",
  other: "neutral",
};

/** Background utility for timeline nodes, keyed by state. */
export const EXEC_DOT: Record<ExecState, string> = {
  completed: "bg-success",
  failed: "bg-destructive",
  pending: "bg-warning",
  running: "bg-info",
  other: "bg-muted-foreground",
};

/* ─── Identity glyphs ──────────────────────────────────────────────── */

const GLYPHS: [RegExp, LucideIcon][] = [
  [/(risk|safety)/, ShieldCheck],
  [/(cost|finance|ledger|budget)/, DollarSign],
  [/(compliance|audit)/, FileSearch],
  [/(schedule|oracle)/, CalendarClock],
  [/(report|loom)/, FileText],
  [/(rfi|route|coordination)/, Route],
  [/(bim|clash|model)/, Boxes],
  [/(quality)/, Zap],
  [/(monitor)/, Activity],
  [/(field|site)/, HardHat],
  [/(decision|reason)/, Brain],
];

export function agentGlyph(agent: { agent_type?: string | null; name?: string | null; agent_id?: string | null }): LucideIcon {
  const hay = `${agent.agent_type ?? ""} ${agent.name ?? ""} ${agent.agent_id ?? ""}`.toLowerCase();
  return GLYPHS.find(([re]) => re.test(hay))?.[1] ?? Cpu;
}

/** Two-letter monogram for compact cells (matrix headers, avatars). */
export function monogram(name: string): string {
  const parts = name.split(/[\s_-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
}

/* ─── Metrics ──────────────────────────────────────────────────────── */

export interface AgentMetrics {
  executions: number | null;
  /** 0…1 */
  successRate: number | null;
  latencyMs: number | null;
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** Read the free-form `ai_agents.metrics` JSON defensively. */
export function readMetrics(metrics: Json | null | undefined): AgentMetrics {
  const m = metrics && typeof metrics === "object" && !Array.isArray(metrics) ? (metrics as Record<string, unknown>) : {};
  let sr = num(m.success_rate ?? m.successRate);
  if (sr !== null && sr > 1) sr = sr / 100;
  return {
    executions: num(m.executions ?? m.total_executions ?? m.runs),
    successRate: sr,
    latencyMs: num(m.avg_latency_ms ?? m.latency_ms ?? m.avgLatencyMs),
  };
}

/* ─── Formatting ───────────────────────────────────────────────────── */

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function fmtLatency(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)}s` : `${Math.round(ms)}ms`;
}

/** Confidence is stored 0…1; tolerate 0…100. Returns a 0…100 integer or null. */
export function confidencePct(v: number | string | null | undefined): number | null {
  const n = num(v);
  if (n === null) return null;
  return Math.round(n > 1 ? n : n * 100);
}

export function humanize(s: string | null | undefined): string {
  if (!s) return "—";
  return s.replace(/[_.]+/g, " ").replace(/\s+/g, " ").trim();
}

/** True when the viewer asked for reduced motion — charts skip their entry animation. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
