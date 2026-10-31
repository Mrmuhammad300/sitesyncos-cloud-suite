import { cn } from "@/lib/utils";

interface MeterProps {
  value: number;
  max?: number;
  /** Auto-color by thresholds when true (green → amber → red as it fills). */
  risk?: boolean;
  tone?: "primary" | "data" | "success" | "warning" | "destructive" | "info";
  className?: string;
  showLabel?: boolean;
  /** [warn, danger] percentages for `risk` coloring. Default [85, 100]. */
  thresholds?: [number, number];
}

const toneBg = {
  primary: "bg-primary",
  data: "bg-data",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
} as const;

/** Slim progress/utilisation bar with optional tabular label. */
export function Meter({ value, max = 100, risk, tone = "primary", className, showLabel, thresholds = [85, 100] }: MeterProps) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  const t = risk ? (pct >= thresholds[1] ? "destructive" : pct >= thresholds[0] ? "warning" : "success") : tone;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out-expo", toneBg[t])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{Math.round(pct)}%</span>}
    </div>
  );
}
