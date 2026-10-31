import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/os";
import { cn } from "@/lib/utils";

/* ─── Filter chips ─────────────────────────────────────────────────────────
 * Segmented status filter with live counts. Scrolls horizontally inside
 * itself on narrow screens so it never pushes the page wider. */
interface FilterChipsProps {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  counts?: Record<string, number>;
  label?: string;
  className?: string;
}

export function FilterChips({ options, value, onChange, counts, label = "Filter by status", className }: FilterChipsProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "-mx-1 flex min-w-0 max-w-full items-center gap-0.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((o) => {
        const active = o === value;
        const n = counts?.[o] ?? 0;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-border-strong bg-surface-3 text-foreground shadow-[inset_0_-2px_0_hsl(var(--primary))]"
                : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
              counts && n === 0 && !active && "opacity-60",
            )}
          >
            {o}
            {counts && (
              <span className={cn("font-mono text-[10.5px] tabular-nums", active ? "text-primary" : "text-muted-foreground/80")}>{n}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Hairline-bounded strip for the toolbar row inside a flush Panel. */
export function PanelBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2 border-t px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between", className)}>{children}</div>;
}

/* ─── Loading ─────────────────────────────────────────────────────────── */
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

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/70 border-t" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5" style={{ opacity: 1 - i * 0.12 }}>
          <Shimmer className="hidden h-3 w-16 sm:block" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Shimmer className="h-3 w-1/2" />
            <Shimmer className="h-2.5 w-1/3 opacity-60" />
          </div>
          <Shimmer className="hidden h-5 w-20 rounded-full md:block" />
          <Shimmer className="hidden h-1.5 w-24 rounded-full lg:block" />
          <Shimmer className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

export function BlockSkeleton({ className }: { className?: string }) {
  return <Shimmer className={cn("h-40 w-full rounded-lg", className)} />;
}

/* ─── Empty: filtered-away vs truly empty ─────────────────────────────── */
export function NoResults({ query, onReset, noun = "records" }: { query?: string; onReset: () => void; noun?: string }) {
  return (
    <EmptyState
      compact
      icon={SearchX}
      className="m-4 sm:m-5"
      title="No matches"
      description={query ? <>No {noun} match “{query}” with the current filters.</> : <>No {noun} match the current filter.</>}
      action={<Button variant="outline" size="sm" onClick={onReset}>Clear filters</Button>}
    />
  );
}

/* ─── Dialog building blocks ──────────────────────────────────────────── */
export function DetailGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border", className)}>{children}</dl>;
}

export function DetailItem({ label, children, mono, className }: { label: ReactNode; children: ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={cn("min-w-0 bg-popover px-3.5 py-3", className)}>
      <dt className="ss-eyebrow text-[9.5px]">{label}</dt>
      <dd className={cn("mt-1 truncate text-sm", mono && "font-mono tabular-nums")}>{children}</dd>
    </div>
  );
}

export function FormField({
  label, htmlFor, hint, required, className, children,
}: { label: ReactNode; htmlFor?: string; hint?: ReactNode; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-primary" aria-hidden>*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

/** Small legend swatch used beside custom charts. */
export function LegendDot({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-[2px]", className)} />
      {children}
    </span>
  );
}
