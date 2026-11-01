import { BrandMark } from "./BrandMark";

/** Inline route-level loader shown while a lazy page chunk downloads. */
export function RouteLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em]">Loading module</span>
      </div>
    </div>
  );
}

/** Full-screen boot screen used before the session is known. */
export function BootScreen({ label = "Establishing secure session" }: { label?: string }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background" role="status">
      <div className="ss-blueprint absolute inset-0 opacity-70 [mask-image:radial-gradient(circle_at_center,black,transparent_65%)]" />
      <div className="relative flex flex-col items-center gap-5">
        <BrandMark className="h-12 w-12" animated />
        <div className="h-px w-40 overflow-hidden bg-border">
          <div className="h-full w-1/3 animate-[shimmer_1.4s_linear_infinite] bg-gradient-to-r from-transparent via-primary to-transparent bg-[length:200%_100%]" />
        </div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
