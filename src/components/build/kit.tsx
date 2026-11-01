/**
 * Page-level building blocks shared by the Build module (Projects, RFIs,
 * Submittals, Change Orders, Daily Reports, Punch List). Everything here is
 * token-only and composes the primitives in `@/components/os`.
 */
import type { ReactNode } from "react";
import { CalendarClock, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { StatusPill, type StatusTone } from "@/components/os";
import { cn } from "@/lib/utils";
import { urgencyOf } from "./utils";

/* ─── Loading ─────────────────────────────────────────────────────────── */

const shimmer =
  "animate-shimmer rounded-md bg-[linear-gradient(90deg,hsl(var(--muted))_0%,hsl(var(--surface-3))_50%,hsl(var(--muted))_100%)] bg-[length:200%_100%]";

export function Shimmer({ className }: { className?: string }) {
  return <div className={cn(shimmer, className)} />;
}

/** Skeleton rows that keep the real table's column rhythm while loading. */
export function SkeletonRows({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <TableRow key={r} className="hover:bg-transparent">
          {Array.from({ length: cols }, (_, c) => (
            <TableCell key={c}>
              <Shimmer className={cn("h-3.5", c === 0 ? "w-4" : c === 2 ? "w-[70%] min-w-24" : "w-[55%] min-w-12")} />
              {c === 2 && <Shimmer className="mt-1.5 h-2.5 w-[40%] min-w-16" />}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Mobile list skeleton. */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/70 border-t">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-2 px-4 py-3.5">
          <Shimmer className="h-3.5 w-2/3" />
          <Shimmer className="h-2.5 w-1/3" />
          <div className="flex gap-2 pt-1">
            <Shimmer className="h-4 w-16 rounded-full" />
            <Shimmer className="h-4 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Forms ───────────────────────────────────────────────────────────── */

interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, required, hint, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-primary" aria-hidden>*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

/* ─── Status ──────────────────────────────────────────────────────────── */

interface StatusSelectProps {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  tones?: Partial<Record<string, StatusTone>>;
  label?: string;
}

/** Inline status editor: a StatusPill that opens a select. */
export function StatusSelect({ value, options, onChange, tones, label = "Change status" }: StatusSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="h-auto w-auto gap-1 rounded-full border-0 bg-transparent p-0 shadow-none hover:border-0 focus:ring-0 focus-visible:ring-2 focus-visible:ring-ring [&>span]:!line-clamp-none [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-40 hover:[&>svg]:opacity-100"
      >
        <span className="flex">
          <StatusPill status={value} tone={tones?.[value]} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((s) => (
          <SelectItem key={s} value={s}>
            <StatusPill status={s} tone={tones?.[s]} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const PRIORITY_LEVEL: Record<string, number> = { Emergency: 4, Critical: 4, High: 3, Medium: 2, Low: 1 };
const PRIORITY_TONE: Record<number, string> = { 4: "text-destructive", 3: "text-destructive", 2: "text-warning", 1: "text-muted-foreground" };

/** Signal-bar priority glyph + label. Reads at a glance, colorblind-safe via bar count. */
export function PriorityMark({ priority, className }: { priority: string; className?: string }) {
  const lvl = PRIORITY_LEVEL[priority] ?? 1;
  const max = priority === "Emergency" || priority === "Critical" ? 4 : 3;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", PRIORITY_TONE[lvl], className)}>
      <span className="flex h-3 items-end gap-[2px]" aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={cn("w-[3px] rounded-[1px]", i < lvl ? "bg-current" : "bg-border-strong")}
            style={{ height: `${((i + 1) / max) * 100}%` }}
          />
        ))}
      </span>
      {priority}
    </span>
  );
}

/* ─── Dates ───────────────────────────────────────────────────────────── */

const URGENCY_CLASS = {
  late: "border-destructive/30 bg-destructive/10 text-destructive",
  today: "border-warning/30 bg-warning/10 text-warning",
  soon: "border-warning/20 bg-warning/[0.06] text-warning",
  later: "border-border bg-transparent text-muted-foreground",
  none: "border-transparent bg-transparent text-muted-foreground/60",
  done: "border-transparent bg-transparent text-muted-foreground/70",
} as const;

/** Due-date chip: "3d late" · "today" · "in 2d" · "Mar 14". */
export function DueChip({ date, done, className }: { date: string | null | undefined; done?: boolean; className?: string }) {
  const { urgency, days } = urgencyOf(date, done);
  const label =
    urgency === "none" ? "No date"
      : urgency === "late" ? `${-days!}d late`
        : urgency === "today" ? "Due today"
          : urgency === "soon" ? `in ${days}d`
            : new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
        URGENCY_CLASS[urgency],
        className,
      )}
      title={date ?? undefined}
    >
      {urgency === "done" ? <Check className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
      {urgency === "done" && date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : label}
    </span>
  );
}

/* ─── Visual summaries ────────────────────────────────────────────────── */

const SEG_BG: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  primary: "bg-primary",
  data: "bg-data",
  neutral: "bg-muted-foreground/40",
};

export interface Segment {
  key: string;
  label: string;
  value: number;
  tone: StatusTone;
}

/**
 * A pipeline strip: one stacked bar plus a clickable legend. Clicking a
 * segment calls `onSelect` so it can drive the table's status filter.
 */
export function SegmentBar({
  segments, active, onSelect, className,
}: { segments: Segment[]; active?: string; onSelect?: (key: string) => void; className?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex h-2 w-full gap-[3px] overflow-hidden rounded-full">
        {total === 0 ? (
          <div className="h-full w-full rounded-full bg-secondary" />
        ) : (
          segments.filter((s) => s.value > 0).map((s) => (
            <div
              key={s.key}
              className={cn("h-full transition-[opacity,flex-grow] duration-500 ease-out-expo first:rounded-l-full last:rounded-r-full", SEG_BG[s.tone], active && active !== s.key && "opacity-25")}
              style={{ flexGrow: s.value }}
              title={`${s.label}: ${s.value}`}
            />
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {segments.map((s) => {
          const on = active === s.key;
          return (
            <button
              key={s.key}
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(on ? "all" : s.key)}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs transition-colors",
                on ? "border-border-strong bg-surface-2 text-foreground" : "border-transparent text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
                !onSelect && "cursor-default",
              )}
            >
              <span className={cn("h-2 w-2 rounded-[3px]", SEG_BG[s.tone])} />
              {s.label}
              <span className="font-mono tabular-nums text-foreground">{s.value}</span>
              {total > 0 && <span className="hidden font-mono text-[10.5px] tabular-nums text-muted-foreground/70 sm:inline">{Math.round((s.value / total) * 100)}%</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const RING_STROKE: Record<string, string> = {
  primary: "stroke-primary",
  data: "stroke-data",
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
  info: "stroke-info",
};

/** Circular progress ring with centered content. */
export function ProgressRing({
  value, size = 64, stroke = 6, tone = "success", children, className,
}: { value: number; size?: number; stroke?: number; tone?: keyof typeof RING_STROKE; children?: ReactNode; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
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
          strokeDashoffset={c * (1 - pct / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700 ease-out-expo", RING_STROKE[tone])}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** Label/value pair used in detail dialogs. */
export function Meta({ label, children, mono }: { label: ReactNode; children: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0 space-y-1 rounded-lg border bg-surface-2/40 px-3 py-2.5">
      <p className="ss-eyebrow text-[9.5px]">{label}</p>
      <p className={cn("truncate text-sm", mono && "font-mono tabular-nums")}>{children}</p>
    </div>
  );
}
