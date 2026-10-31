import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusPill } from "@/components/os";
import { cn, fmtDollar } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { Meta } from "./kit";
import { fmtDate } from "./utils";
import { scheduleVariance } from "./schedule";

type Project = Database["public"]["Tables"]["projects"]["Row"];

const DAY = 86_400_000;
const toDate = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`);

const BAR_TONE: Record<string, { track: string; fill: string; text: string; dot: string }> = {
  "On Track": { track: "border-success/40 bg-success/15", fill: "bg-success", text: "text-success", dot: "bg-success" },
  "At Risk": { track: "border-warning/45 bg-warning/15", fill: "bg-warning", text: "text-warning", dot: "bg-warning" },
  Behind: { track: "border-destructive/50 bg-destructive/15", fill: "bg-destructive", text: "text-destructive", dot: "bg-destructive" },
  Complete: { track: "border-info/35 bg-info/10", fill: "bg-info/70", text: "text-info", dot: "bg-info" },
};
const toneOf = (s: string) => BAR_TONE[s] ?? BAR_TONE["On Track"];

const ROW_H = 52;
const BAR_H = 22;

export function Gantt({ projects }: { projects: Project[] }) {
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(960);

  // Fit the timeline to the panel at 100%; zoom stretches it from there.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const label = parseFloat(getComputedStyle(el).getPropertyValue("--gantt-label")) * parseFloat(getComputedStyle(document.documentElement).fontSize || "16");
      setAvail(Math.max(320, el.clientWidth - (Number.isFinite(label) ? label : 240)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const withDates = useMemo(
    () => projects
      .filter((p) => p.start_date && p.end_date)
      .sort((a, b) => a.start_date!.localeCompare(b.start_date!)),
    [projects],
  );

  const { min, totalDays } = useMemo(() => {
    if (withDates.length === 0) return { min: new Date(), totalDays: 1 };
    const starts = withDates.map((p) => toDate(p.start_date!).getTime());
    const ends = withDates.map((p) => toDate(p.end_date!).getTime());
    const today = Date.now();
    const lo = Math.min(...starts, today);
    const hi = Math.max(...ends, today);
    const pad = Math.max(((hi - lo) / DAY) * 0.04, 14) * DAY;
    const minD = new Date(lo - pad);
    minD.setDate(1);
    const maxD = new Date(hi + pad);
    return { min: minD, totalDays: Math.max(1, Math.round((maxD.getTime() - minD.getTime()) / DAY)) };
  }, [withDates]);

  // On phones keep at least ~1px/day so bars stay legible; otherwise fit the panel.
  const width = Math.round(Math.max(avail, Math.min(totalDays, 720)) * zoom);
  const x = (d: Date) => ((d.getTime() - min.getTime()) / DAY / totalDays) * width;

  const months = useMemo(() => {
    const out: { key: string; label: string; left: number; year: boolean }[] = [];
    const c = new Date(min.getFullYear(), min.getMonth(), 1);
    const end = min.getTime() + totalDays * DAY;
    while (c.getTime() <= end) {
      const left = ((c.getTime() - min.getTime()) / DAY / totalDays) * width;
      out.push({
        key: `${c.getFullYear()}-${c.getMonth()}`,
        label: c.getMonth() === 0 ? String(c.getFullYear()) : c.toLocaleDateString("en-US", { month: "short" }),
        left,
        year: c.getMonth() === 0,
      });
      c.setMonth(c.getMonth() + 1);
    }
    return out;
  }, [min, totalDays, width]);

  const todayX = x(new Date());
  const step = zoom < 0.75 ? 3 : zoom < 1.25 ? 2 : 1; // thin month labels when zoomed out

  const scrollToToday = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, todayX - el.clientWidth / 3), behavior: "smooth" });
  };

  const selected = withDates.find((p) => p.id === selectedId) ?? null;

  if (withDates.length === 0) return null;

  return (
    <div className="space-y-0">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
          {Object.entries(BAR_TONE).map(([k, t]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-4 rounded-[3px] border", t.track)}>
                <span className={cn("block h-full w-1/2 rounded-l-[2px]", t.fill)} />
              </span>
              {k === "Behind" ? "Behind · critical" : k}
            </span>
          ))}
          <span className="flex items-center gap-1.5"><span className="h-3 border-l border-dashed border-primary" />Today</span>
          <span className="hidden items-center gap-1.5 md:flex"><span className="h-2 w-2 rotate-45 bg-foreground/70" />Milestone</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Zoom out" disabled={zoom <= 0.5}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-11 text-center font-mono text-[11px] tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Zoom in" disabled={zoom >= 3}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="xs" className="ml-1" onClick={scrollToToday}>
            <CalendarDays /> Today
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="relative overflow-x-auto border-t [--gantt-label:8.5rem] sm:[--gantt-label:15rem]">
        <div className="relative" style={{ width: `calc(var(--gantt-label) + ${width}px)` }}>
          {/* Header */}
          <div className="sticky top-0 z-20 flex h-9 border-b bg-surface-1/95 backdrop-blur">
            <div className="sticky left-0 z-10 flex w-[var(--gantt-label)] shrink-0 items-center border-r bg-surface-1 px-4">
              <span className="ss-eyebrow text-[9.5px]">Project</span>
            </div>
            <div className="relative" style={{ width }}>
              {months.map((mo, i) => (
                <span
                  key={mo.key}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 pl-1.5 font-mono text-[10.5px] uppercase tracking-wider",
                    mo.year ? "font-semibold text-foreground" : "text-muted-foreground",
                    !mo.year && i % step !== 0 && "hidden",
                  )}
                  style={{ left: mo.left }}
                >
                  {mo.label}
                </span>
              ))}
              <span
                className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-widest text-primary-foreground"
                style={{ left: todayX }}
              >
                Today
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="relative">
            {/* Grid + today overlay */}
            <div className="pointer-events-none absolute inset-y-0 left-[var(--gantt-label)]" style={{ width }} aria-hidden>
              {months.map((mo) => (
                <div key={mo.key} className={cn("absolute inset-y-0 w-px", mo.year ? "bg-border-strong" : "bg-border/50")} style={{ left: mo.left }} />
              ))}
              <div className="absolute inset-y-0 z-10 border-l border-dashed border-primary" style={{ left: todayX }} />
              <div className="absolute inset-y-0 bg-foreground/[0.02]" style={{ left: 0, width: Math.max(0, todayX) }} />
            </div>

            {withDates.map((p, i) => {
              const s = toDate(p.start_date!);
              const e = toDate(p.end_date!);
              const left = x(s);
              const w = Math.max(6, x(e) - left);
              const t = toneOf(p.status);
              const days = Math.round((e.getTime() - s.getTime()) / DAY);
              const milestone = days <= 1;
              const v = scheduleVariance(p);
              const isSel = selectedId === p.id;
              const labelInside = w > 64;
              return (
                <div
                  key={p.id}
                  className={cn("group relative flex border-b border-border/50 last:border-b-0", isSel && "bg-primary/[0.05]")}
                  style={{ height: ROW_H }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(isSel ? null : p.id)}
                    className={cn(
                      "sticky left-0 z-10 flex w-[var(--gantt-label)] shrink-0 items-center gap-2.5 border-r bg-card px-4 text-left transition-colors hover:bg-surface-2",
                      isSel && "bg-surface-2",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.dot)} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium leading-tight">{p.name}</span>
                      <span className="block truncate font-mono text-[10.5px] tabular-nums text-muted-foreground">
                        {p.status === "Complete" ? "Complete" : (
                          <>
                            {p.progress}%
                            <span className={cn("ml-1.5 hidden sm:inline", v.gap < -10 ? "text-destructive" : v.gap < -3 ? "text-warning" : "text-success")}>
                              {v.gap >= 0 ? "+" : "−"}{Math.abs(v.gap)} pts vs plan
                            </span>
                          </>
                        )}
                      </span>
                    </span>
                  </button>

                  <div className="relative" style={{ width }}>
                    {milestone ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={`${p.name} milestone`}
                            onClick={() => setSelectedId(isSel ? null : p.id)}
                            className={cn("absolute h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-[2px] border-2 border-background", t.fill)}
                            style={{ left, top: ROW_H / 2 - 7 }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{p.name} · {fmtDate(p.start_date, true)}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setSelectedId(isSel ? null : p.id)}
                            aria-label={`${p.name}: ${p.progress}% complete, ${fmtDate(p.start_date)} to ${fmtDate(p.end_date, true)}`}
                            className={cn(
                              "absolute overflow-hidden rounded-[5px] border text-left transition-[box-shadow,filter] duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              t.track,
                              isSel && "ring-2 ring-primary/60 ring-offset-1 ring-offset-background",
                              p.status === "Behind" && "shadow-[0_0_0_1px_hsl(var(--destructive)/0.25),0_6px_18px_-8px_hsl(var(--destructive)/0.6)]",
                            )}
                            style={{ left, width: w, top: (ROW_H - BAR_H) / 2, height: BAR_H }}
                          >
                            <span className={cn("absolute inset-y-0 left-0 transition-[width] duration-700 ease-out-expo", t.fill)} style={{ width: `${p.progress}%` }} />
                            {labelInside && (
                              <span className="relative z-10 block truncate px-2 font-mono text-[10.5px] font-medium leading-[20px] tabular-nums text-foreground mix-blend-normal">
                                {p.progress}%
                              </span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{p.name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{fmtDate(p.start_date)} → {fmtDate(p.end_date, true)} · {days}d</p>
                            <p className="text-xs text-muted-foreground">{p.progress}% complete · {p.status}{p.project_manager ? ` · ${p.project_manager}` : ""}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!milestone && !labelInside && (
                      <span className="absolute font-mono text-[10.5px] tabular-nums text-muted-foreground" style={{ left: left + w + 6, top: ROW_H / 2 - 7 }}>
                        {p.progress}%
                      </span>
                    )}
                    {/* finish milestone */}
                    {!milestone && (
                      <span
                        className={cn("absolute h-2 w-2 -translate-x-1/2 rotate-45 rounded-[1px]", p.status === "Complete" ? "bg-info/70" : "bg-foreground/70")}
                        style={{ left: left + w, top: (ROW_H - BAR_H) / 2 + BAR_H + 3 }}
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selected && (
        <div className="animate-slide-up border-t bg-surface-2/30 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold">{selected.name}</h3>
                <StatusPill status={selected.status} tone={selected.status === "Complete" ? "info" : undefined} />
              </div>
              <p className="text-xs text-muted-foreground">{selected.location ?? "—"}{selected.project_manager ? ` · ${selected.project_manager}` : ""}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setSelectedId(null)} aria-label="Close details">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Meta label="Window" mono>{fmtDate(selected.start_date)} → {fmtDate(selected.end_date, true)}</Meta>
            <Meta label="Progress vs plan" mono>{selected.progress}% / {scheduleVariance(selected).elapsed}%</Meta>
            <Meta label="Budget" mono>{fmtDollar(Number(selected.spent))} / {fmtDollar(Number(selected.budget))}</Meta>
            <Meta label="Team" mono>{selected.team_size} people</Meta>
          </div>
        </div>
      )}
    </div>
  );
}
