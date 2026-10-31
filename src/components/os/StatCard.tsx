import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

export type Tone = "default" | "primary" | "data" | "success" | "warning" | "destructive" | "info";

const toneText: Record<Tone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  data: "text-data",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
};

const toneStroke: Record<Tone, string> = {
  default: "hsl(var(--muted-foreground))",
  primary: "hsl(var(--primary))",
  data: "hsl(var(--data))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  info: "hsl(var(--info))",
};

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: LucideIcon;
  /** Percent or absolute change. Positive renders green unless `invertDelta`. */
  delta?: number | null;
  deltaLabel?: ReactNode;
  /** Treat a positive delta as bad (e.g. costs, overdue counts). */
  invertDelta?: boolean;
  hint?: ReactNode;
  tone?: Tone;
  spark?: number[];
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * KPI tile. Mono tabular numerals, optional sparkline, and a delta chip.
 */
export function StatCard({
  label, value, icon: Icon, delta, deltaLabel, invertDelta, hint, tone = "default",
  spark, loading, className, onClick,
}: StatCardProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const good = hasDelta && (invertDelta ? delta! < 0 : delta! > 0);
  const bad = hasDelta && (invertDelta ? delta! > 0 : delta! < 0);
  const DeltaIcon = !hasDelta || delta === 0 ? Minus : delta! > 0 ? ArrowUpRight : ArrowDownRight;
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={cn(
        "ss-card group flex min-h-[116px] flex-col justify-between gap-3 p-4 text-left",
        onClick && "ss-interactive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="ss-eyebrow leading-4">{label}</span>
        {Icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-surface-2 text-muted-foreground transition-colors group-hover:text-foreground">
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          {loading ? (
            <div className="h-7 w-24 animate-shimmer rounded-md bg-[linear-gradient(90deg,hsl(var(--muted))_0%,hsl(var(--surface-3))_50%,hsl(var(--muted))_100%)] bg-[length:200%_100%]" />
          ) : (
            <div className={cn("truncate font-mono text-[22px] font-medium sm:text-[26px] leading-none tracking-[-0.03em] tabular-nums", toneText[tone])}>
              {value}
            </div>
          )}
          {(hasDelta || hint) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {hasDelta && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-md px-1 py-px font-mono text-[11px] font-medium tabular-nums",
                    good && "bg-success/10 text-success",
                    bad && "bg-destructive/10 text-destructive",
                    !good && !bad && "bg-muted text-muted-foreground",
                  )}
                >
                  <DeltaIcon className="h-3 w-3" />
                  {Math.abs(delta!)}
                  {deltaLabel ?? "%"}
                </span>
              )}
              {hint && <span className="truncate text-muted-foreground">{hint}</span>}
            </div>
          )}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline data={spark} stroke={toneStroke[tone === "default" ? "primary" : tone]} className="hidden h-9 w-20 shrink-0 sm:block" />
        )}
      </div>
    </Comp>
  );
}
