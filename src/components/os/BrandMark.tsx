import { cn } from "@/lib/utils";

/**
 * SiteSync mark — an isometric structural frame. Three stacked floor plates
 * read as "build / operate / own" and as a building section at once.
 */
export function BrandMark({ className, animated }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden fill="none">
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" className="fill-primary" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" stroke="hsl(0 0% 100% / 0.25)" />
      <g
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={animated ? "[&>path]:animate-draw" : undefined}
      >
        <path d="M16 7.5 24 11.5 16 15.5 8 11.5Z" style={{ ["--len" as string]: 40 }} />
        <path d="M8 15.5 16 19.5 24 15.5" style={{ ["--len" as string]: 24 }} opacity="0.8" />
        <path d="M8 19.5 16 23.5 24 19.5" style={{ ["--len" as string]: 24 }} opacity="0.55" />
        <path d="M16 15.5V24.5" style={{ ["--len" as string]: 10 }} opacity="0.55" />
      </g>
    </svg>
  );
}
