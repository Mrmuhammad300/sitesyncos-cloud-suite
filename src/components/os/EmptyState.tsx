import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

/** Friendly zero-state with a blueprint motif. Always offer a next step via `action`. */
export function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        className,
      )}
    >
      <div className="ss-blueprint pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
      {Icon && (
        <div className="relative">
          <div className="absolute inset-0 -m-3 rounded-2xl bg-primary/10 blur-xl" />
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border bg-surface-2 text-muted-foreground">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      )}
      <div className="relative space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="relative mt-1">{action}</div>}
    </div>
  );
}
