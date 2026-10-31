import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  title?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Remove body padding — for tables and full-bleed charts. */
  flush?: boolean;
  /** Accent hairline across the top edge. */
  glow?: boolean;
  id?: string;
}

/** Card with a standard header row. Use for every grouped block of content. */
export function Panel({ title, eyebrow, description, actions, children, className, bodyClassName, flush, glow, id }: PanelProps) {
  const hasHeader = title || eyebrow || actions || description;
  return (
    <section id={id} className={cn(glow ? "ss-card-glow" : "ss-card", "flex flex-col", className)}>
      {hasHeader && (
        <div className={cn("flex items-start justify-between gap-3 px-5 pt-4", flush ? "pb-3" : "pb-1")}>
          <div className="min-w-0 space-y-1">
            {eyebrow && <p className="ss-eyebrow">{eyebrow}</p>}
            {title && <h2 className="truncate text-[14px] font-semibold leading-tight tracking-tight">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className={cn("flex-1", flush ? "" : "p-5 pt-3", !hasHeader && !flush && "pt-5", bodyClassName)}>{children}</div>
    </section>
  );
}
