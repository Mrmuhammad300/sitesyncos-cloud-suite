import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { humanize } from "./agent-meta";

/* ─── Identity glyph ───────────────────────────────────────────────── */

interface AgentGlyphProps {
  icon: LucideIcon;
  live?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const GLYPH_SIZE = {
  sm: "h-7 w-7 rounded-lg [&>svg]:h-3.5 [&>svg]:w-3.5",
  md: "h-10 w-10 rounded-xl [&>svg]:h-[18px] [&>svg]:w-[18px]",
  lg: "h-12 w-12 rounded-2xl [&>svg]:h-5 [&>svg]:w-5",
} as const;

/** AI identity tile: magenta-tinted, with a live status dot when running. */
export function AgentGlyph({ icon: Icon, live, size = "md", className }: AgentGlyphProps) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center border transition-colors",
        live ? "border-mod-ai/30 bg-mod-ai/10 text-mod-ai" : "border-border bg-surface-2 text-muted-foreground",
        GLYPH_SIZE[size],
        className,
      )}
    >
      <Icon />
      {live !== undefined && (
        <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
          {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />}
          <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-card", live ? "bg-success" : "bg-muted-foreground/50")} />
        </span>
      )}
    </span>
  );
}

/* ─── Autonomy gauge ───────────────────────────────────────────────── */

/** Four-segment gauge for autonomy level (L1 advisory → L4 autonomous). */
export function AutonomyGauge({ level, label, className }: { level: number; label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)} title={label}>
      <div className="flex items-end gap-[3px]" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("w-1.5 rounded-[2px] transition-colors", i <= level ? "bg-mod-ai" : "bg-border")}
            style={{ height: 5 + i * 2.5 }}
          />
        ))}
      </div>
      {label && <span className="truncate text-[11.5px] text-muted-foreground">{label}</span>}
      <span className="sr-only">Autonomy level {level} of 4</span>
    </div>
  );
}

/* ─── Confidence ───────────────────────────────────────────────────── */

function confidenceTone(pct: number | null) {
  if (pct === null) return "text-muted-foreground";
  return pct >= 85 ? "text-success" : pct >= 70 ? "text-foreground" : "text-warning";
}

/** Compact mono % with a hairline bar — for tables and feed rows. */
export function Confidence({ value, className }: { value: number | null; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative h-1 w-10 overflow-hidden rounded-full bg-secondary">
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", value === null ? "" : value >= 85 ? "bg-success" : value >= 70 ? "bg-data" : "bg-warning")}
          style={{ width: `${value ?? 0}%` }}
        />
      </span>
      <span className={cn("w-8 font-mono text-[11px] tabular-nums", confidenceTone(value))}>{value === null ? "—" : `${value}%`}</span>
    </span>
  );
}

/* ─── Risk flags ───────────────────────────────────────────────────── */

export function RiskFlags({ flags, max = 3, className }: { flags: string[] | null | undefined; max?: number; className?: string }) {
  const list = flags ?? [];
  if (!list.length) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {list.slice(0, max).map((f) => (
        <span key={f} className="inline-flex items-center gap-1 rounded-md border border-warning/25 bg-warning/10 px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-warning">
          <AlertTriangle className="h-2.5 w-2.5" />
          {humanize(f)}
        </span>
      ))}
      {list.length > max && <span className="font-mono text-[10px] text-muted-foreground">+{list.length - max}</span>}
    </span>
  );
}

/* ─── Coverage ring ────────────────────────────────────────────────── */

interface RingSegment {
  value: number;
  className: string;
}

interface CoverageRingProps {
  /** 0…100 (used when segments are not given) */
  pct: number;
  /** Optional stacked segments (values are counts; total is their sum). */
  segments?: RingSegment[];
  size?: number;
  stroke?: number;
  className?: string;
  label?: React.ReactNode;
}

/** SVG donut showing coverage. Colors come from Tailwind stroke utilities so it follows the theme. */
export function CoverageRing({ pct, segments, size = 64, stroke = 6, className, label }: CoverageRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments?.reduce((s, x) => s + x.value, 0) ?? 0;
  let offset = 0;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-secondary" />
        {segments && total > 0 ? (
          segments.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeDasharray={`${Math.max(len - (len > 2 ? 1.5 : 0), 0)} ${c}`}
                strokeDashoffset={-offset}
                className={cn("transition-[stroke-dasharray] duration-700 ease-out-expo", s.className)}
              />
            );
            offset += len;
            return el;
          })
        ) : (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(Math.max(0, Math.min(100, pct)) / 100) * c} ${c}`}
            className="stroke-mod-ai transition-[stroke-dasharray] duration-700 ease-out-expo"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label ?? (
          <span className="font-mono text-[13px] font-medium tabular-nums">
            {Math.round(pct)}
            <span className="text-[10px] text-muted-foreground">%</span>
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Chart legend ─────────────────────────────────────────────────── */

export interface LegendItem {
  label: string;
  color: string;
  shape?: "square" | "line" | "dot";
}

/** Consistent legend used in Panel `actions` above every chart. */
export function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground", className)}>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={cn(
              it.shape === "line" ? "h-0.5 w-3 rounded" : it.shape === "dot" ? "h-2 w-2 rounded-full" : "h-2 w-2 rounded-[2px]",
            )}
            style={{ background: it.color }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────────────────── */

export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,hsl(var(--muted))_0%,hsl(var(--surface-3))_50%,hsl(var(--muted))_100%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
