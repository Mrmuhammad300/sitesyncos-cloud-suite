import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getRouteMeta } from "@/lib/modules";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Defaults to the module name for the current route. */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /** Optional content rendered under the title row (tabs, filters, meta). */
  children?: ReactNode;
  className?: string;
}

/**
 * The standard top-of-page header. Shows the owning module as a colored
 * eyebrow, a confident title, a one-line description and right-aligned actions.
 */
export function PageHeader({ title, description, eyebrow, actions, children, className }: PageHeaderProps) {
  const { pathname } = useLocation();
  const meta = getRouteMeta(pathname);
  const tone = meta?.module.tone ?? "mod-system";
  const Icon = meta?.item.icon;

  return (
    <header className={cn("relative flex flex-col gap-4 pb-1", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            {Icon && (
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-md border",
                  `text-${tone} border-${tone}/25 bg-${tone}/10`,
                )}
              >
                <Icon className="h-3 w-3" />
              </span>
            )}
            <span className="ss-eyebrow">{eyebrow ?? meta?.module.label ?? "SiteSync"}</span>
          </div>
          <h1 className="text-balance text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[30px]">{title}</h1>
          {description && <p className="max-w-2xl text-pretty text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/*
 * Tailwind safelist — dynamic module tone classes used above.
 * text-mod-build border-mod-build/25 bg-mod-build/10
 * text-mod-ops border-mod-ops/25 bg-mod-ops/10
 * text-mod-vault border-mod-vault/25 bg-mod-vault/10
 * text-mod-ledger border-mod-ledger/25 bg-mod-ledger/10
 * text-mod-ai border-mod-ai/25 bg-mod-ai/10
 * text-mod-spatial border-mod-spatial/25 bg-mod-spatial/10
 * text-mod-system border-mod-system/25 bg-mod-system/10
 * bg-mod-build bg-mod-ops bg-mod-vault bg-mod-ledger bg-mod-ai bg-mod-spatial bg-mod-system
 */
