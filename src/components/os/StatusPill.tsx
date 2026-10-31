import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "destructive" | "info" | "neutral" | "primary" | "data";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  destructive: "border-destructive/25 bg-destructive/10 text-destructive",
  info: "border-info/25 bg-info/10 text-info",
  primary: "border-primary/25 bg-primary/10 text-primary",
  data: "border-data/25 bg-data/10 text-data",
  neutral: "border-border bg-muted text-muted-foreground",
};

/**
 * Status vocabulary used across every module. Keys are matched
 * case-insensitively; anything unknown renders neutral.
 */
const STATUS_TONE: Record<string, StatusTone> = {
  // positive / done
  "on track": "success", complete: "success", completed: "success", approved: "success", answered: "success",
  paid: "success", active: "success", compliant: "success", passed: "success", resolved: "success",
  funded: "success", occupied: "success", verified: "success", healthy: "success", success: "success",
  current: "success", released: "success", signed: "success", done: "success", closed: "neutral",
  // in flight
  "in progress": "info", "in review": "info", "under review": "info", submitted: "info", pending: "warning",
  open: "warning", scheduled: "info", processing: "info", running: "info", draft: "neutral", new: "info",
  "awaiting approval": "warning", requested: "info", queued: "neutral",
  // at risk
  "at risk": "warning", warning: "warning", expiring: "warning", "revise and resubmit": "warning",
  "revise & resubmit": "warning", medium: "warning", partial: "warning", vacant: "warning", "on hold": "warning",
  // bad
  behind: "destructive", overdue: "destructive", rejected: "destructive", failed: "destructive",
  expired: "destructive", critical: "destructive", high: "destructive", urgent: "destructive",
  "non-compliant": "destructive", delinquent: "destructive", error: "destructive", blocked: "destructive",
  // misc
  low: "neutral", inactive: "neutral", archived: "neutral", cancelled: "neutral", canceled: "neutral",
};

export function statusTone(status: string | null | undefined): StatusTone {
  if (!status) return "neutral";
  return STATUS_TONE[status.toLowerCase().trim()] ?? "neutral";
}

interface StatusPillProps {
  status: string | null | undefined;
  /** Override the inferred tone. */
  tone?: StatusTone;
  /** Show a pulsing dot (for live/in-flight states). */
  pulse?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function StatusPill({ status, tone, pulse, className, children }: StatusPillProps) {
  const t = tone ?? statusTone(status);
  return (
    <span className={cn("ss-pill", TONE_CLASS[t], className)}>
      <span className="relative flex h-1.5 w-1.5">
        {pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {children ?? status ?? "—"}
    </span>
  );
}
