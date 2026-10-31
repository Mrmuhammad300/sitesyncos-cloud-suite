import { Check, Loader2, X } from "lucide-react";
import { StatusPill } from "@/components/os";
import { cn } from "@/lib/utils";
import type { BlenderJobStatus } from "@/hooks/useBlenderData";

const STEPS = ["Queued", "Processing", "Ready"] as const;

const DEFAULT_COPY: Record<BlenderJobStatus, string> = {
  pending: "Job queued — waiting for a Blender worker",
  processing: "Blender is building your model",
  completed: "Model ready",
  failed: "Generation failed",
};

interface JobProgressProps {
  status: BlenderJobStatus;
  jobId: string;
  copy?: Partial<Record<BlenderJobStatus, string>>;
  error?: string | null;
  className?: string;
  /** Glass styling for use on top of a viewport. */
  floating?: boolean;
}

/** Three-stage job tracker for Blender MCP jobs: queued → processing → ready. */
export function JobProgress({ status, jobId, copy, error, className, floating }: JobProgressProps) {
  const stage = status === "pending" ? 0 : status === "processing" ? 1 : 2;
  const failed = status === "failed";
  const live = status === "pending" || status === "processing";
  const text = copy?.[status] ?? DEFAULT_COPY[status];

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        floating ? "border-border/80 bg-background/80 shadow-[0_12px_32px_-16px_hsl(var(--shadow-color)/0.7)] backdrop-blur-md" : "bg-surface-2/50",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
              failed ? "border-destructive/30 bg-destructive/10 text-destructive" : status === "completed" ? "border-success/30 bg-success/10 text-success" : "border-mod-spatial/30 bg-mod-spatial/10 text-mod-spatial",
            )}
          >
            {failed ? <X className="h-3.5 w-3.5" /> : status === "completed" ? <Check className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{text}</p>
            <p className="ss-num truncate text-[10.5px] text-muted-foreground">
              JOB #{jobId.slice(0, 8).toUpperCase()}
              {failed && error ? ` · ${error}` : ""}
            </p>
          </div>
        </div>
        <StatusPill status={status} pulse={live} className="capitalize" />
      </div>

      <ol className="mt-3 grid grid-cols-3 gap-1.5">
        {STEPS.map((s, i) => {
          const done = !failed && (i < stage || status === "completed");
          const current = !failed && i === stage && live;
          return (
            <li key={s} className="space-y-1.5">
              <div className="relative h-1 overflow-hidden rounded-full bg-secondary">
                {done && <div className="absolute inset-0 bg-mod-spatial" />}
                {failed && i <= stage && <div className="absolute inset-0 bg-destructive/70" />}
                {current && (
                  <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,hsl(var(--mod-spatial)),transparent)] bg-[length:200%_100%]" />
                )}
              </div>
              <p className={cn("font-mono text-[9.5px] uppercase tracking-[0.14em]", done || current ? "text-foreground" : "text-muted-foreground/70")}>
                {String(i + 1).padStart(2, "0")} {s}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
