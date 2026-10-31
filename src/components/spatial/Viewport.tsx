import { forwardRef, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, Grid, Html } from "@react-three/drei";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScenePalette } from "./sceneTheme";

/* ════════════════════════════════════════════════════════════════════════
   DOM chrome — the frame, floating glass toolbars and readouts around a canvas
   ════════════════════════════════════════════════════════════════════════ */

interface ViewportProps {
  children: ReactNode;
  className?: string;
  /** Overlays rendered above the canvas (use <ViewportSlot>). */
  overlay?: ReactNode;
}

/** Full-bleed canvas frame with blueprint crop marks and legibility vignettes. */
export const Viewport = forwardRef<HTMLDivElement, ViewportProps>(function Viewport({ children, className, overlay }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "ss-card group/vp relative isolate overflow-hidden bg-surface-1 [&:fullscreen]:rounded-none",
        className,
      )}
    >
      <div className="absolute inset-0">{children}</div>
      {/* vignettes keep floating chrome legible on any scene */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/50 to-transparent" />
      {/* crop marks */}
      {["left-2 top-2 border-l border-t", "right-2 top-2 border-r border-t", "left-2 bottom-2 border-l border-b", "right-2 bottom-2 border-r border-b"].map((c) => (
        <span key={c} className={cn("pointer-events-none absolute h-3 w-3 border-primary/50", c)} />
      ))}
      {overlay}
    </div>
  );
});

const SLOT = {
  "top-left": "left-3 top-3 items-start",
  "top-right": "right-3 top-3 items-end",
  "bottom-left": "bottom-3 left-3 items-start",
  "bottom-right": "bottom-3 right-3 items-end",
  "top-center": "left-1/2 top-3 -translate-x-1/2 items-center",
  "bottom-center": "bottom-3 left-1/2 -translate-x-1/2 items-center",
} as const;

export function ViewportSlot({ at, children, className }: { at: keyof typeof SLOT; children: ReactNode; className?: string }) {
  return <div className={cn("pointer-events-none absolute z-10 flex flex-col gap-2 [&>*]:pointer-events-auto", SLOT[at], className)}>{children}</div>;
}

/** Frosted floating toolbar. */
export function GlassBar({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-border/80 bg-background/75 p-0.5 shadow-[0_8px_24px_-12px_hsl(var(--shadow-color)/0.6)] backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface GlassButtonProps {
  icon?: LucideIcon;
  label: string;
  /** Show the text label (hidden below `sm`). */
  showLabel?: boolean;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function GlassButton({ icon: Icon, label, showLabel, active, onClick, disabled }: GlassButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center gap-1.5 rounded-md px-1.5 text-[11.5px] font-medium transition-colors disabled:opacity-40",
        active
          ? "bg-surface-3 text-foreground shadow-[0_0_0_1px_hsl(var(--border-strong))]"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {Icon && <Icon className={cn("h-3.5 w-3.5", active && "text-mod-spatial")} />}
      {showLabel && <span className="hidden pr-0.5 sm:inline">{label}</span>}
    </button>
  );
}

export function GlassDivider() {
  return <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />;
}

/** Mono instrument readout chip. */
export const Readout = forwardRef<HTMLDivElement, { children: ReactNode; className?: string }>(function Readout({ children, className }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 rounded-md border border-border/80 bg-background/75 px-2 py-1 font-mono text-[10.5px] tabular-nums text-muted-foreground backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
});

/* ════════════════════════════════════════════════════════════════════════
   In-canvas helpers (must render inside <Canvas>)
   ════════════════════════════════════════════════════════════════════════ */

/** Writes the live camera position into a DOM node without re-rendering React. */
export function CameraProbe({ target }: { target: RefObject<HTMLElement> }) {
  const frame = useRef(0);
  useFrame(({ camera }) => {
    frame.current = (frame.current + 1) % 6;
    if (frame.current !== 0 || !target.current) return;
    const { x, y, z } = camera.position;
    target.current.textContent = `X ${x.toFixed(2)}  Y ${y.toFixed(2)}  Z ${z.toFixed(2)}`;
  });
  return null;
}

export function AxisGizmo({ palette }: { palette: ScenePalette }) {
  return (
    <GizmoHelper alignment="bottom-right" margin={[56, 56]}>
      <GizmoViewport
        axisColors={[palette.destructive, palette.success, palette.info]}
        labelColor={palette.background}
        axisHeadScale={0.9}
      />
    </GizmoHelper>
  );
}

export function SceneGrid({ palette, size = 40 }: { palette: ScenePalette; size?: number }) {
  return (
    <Grid
      args={[size, size]}
      position={[0, -0.001, 0]}
      cellSize={1}
      cellThickness={0.6}
      cellColor={palette.grid}
      sectionSize={5}
      sectionThickness={1}
      sectionColor={palette.gridSection}
      fadeDistance={size * 1.4}
      fadeStrength={1.5}
      infiniteGrid
    />
  );
}

/** Studio lighting that works without an external HDR. */
export function SceneLights({ palette }: { palette: ScenePalette }) {
  return (
    <>
      <color attach="background" args={[palette.canvas]} />
      <fog attach="fog" args={[palette.canvas, 38, 90]} />
      <hemisphereLight args={[palette.foreground, palette.canvas, palette.dark ? 0.55 : 0.8]} />
      <ambientLight intensity={palette.dark ? 0.25 : 0.45} />
      <directionalLight position={[12, 22, 10]} intensity={palette.dark ? 1.4 : 1.2} castShadow />
      <directionalLight position={[-8, 10, -6]} intensity={0.35} color={palette.data} />
    </>
  );
}

export function SceneFallback({ label = "Loading scene" }: { label?: string }) {
  return (
    <Html center>
      <div className="flex items-center gap-2 whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mod-spatial" />
        {label}
      </div>
    </Html>
  );
}
