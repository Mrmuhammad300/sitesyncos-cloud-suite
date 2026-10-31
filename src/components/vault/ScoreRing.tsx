import { cn } from "@/lib/utils";
import { scoreTone } from "./score";

interface ScoreRingProps {
  value: number | null | undefined;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}

const STROKE = {
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
  muted: "stroke-muted-foreground",
} as const;

const TEXT = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
} as const;

/** Compact radial gauge for 0–100 scores (compliance, covenants). */
export function ScoreRing({ value, size = 56, stroke = 5, label, className }: ScoreRingProps) {
  const v = value === null || value === undefined ? null : Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(v);
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-secondary" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (v ?? 0) / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700 ease-out-expo", STROKE[tone])}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn("font-mono text-[13px] font-medium tabular-nums", TEXT[tone])}>{v ?? "—"}</span>
        {label && <span className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
