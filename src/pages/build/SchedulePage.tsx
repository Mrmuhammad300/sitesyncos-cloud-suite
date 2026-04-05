import { useState, useMemo, useRef, useCallback } from "react";
import { fmtDollar } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarDays, MapPin, User, BarChart2, List, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useProjects } from "@/hooks/useProjectData";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

const STATUS_CONFIG: Record<string, { bar: string; badge: string; label: string }> = {
  "On Track": { bar: "bg-primary", badge: "badge-active", label: "On Track" },
  "At Risk":  { bar: "bg-warning", badge: "badge-progress", label: "At Risk" },
  "Behind":   { bar: "bg-destructive", badge: "badge-overdue", label: "Behind" },
  "Complete": { bar: "bg-success", badge: "badge-complete", label: "Complete" },
};

function parseDate(d: string | null): Date | null {
  return d ? new Date(d) : null;
}
function formatDate(d: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" });
}
function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/* ─── Interactive Gantt ─── */
interface GanttProps { projects: Project[] }

function GanttChart({ projects }: GanttProps) {
  const [zoom, setZoom] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const withDates = useMemo(
    () => projects.filter((p) => p.start_date && p.end_date),
    [projects]
  );

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (withDates.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 1 };
    const starts = withDates.map((p) => parseDate(p.start_date)!);
    const ends = withDates.map((p) => parseDate(p.end_date)!);
    const min = new Date(Math.min(...starts.map((d) => d.getTime())));
    const max = new Date(Math.max(...ends.map((d) => d.getTime())));
    // Add 5% padding on each side
    const pad = Math.max(daysBetween(min, max) * 0.05, 7);
    min.setDate(min.getDate() - pad);
    max.setDate(max.getDate() + pad);
    return { minDate: min, maxDate: max, totalDays: Math.max(daysBetween(min, max), 1) };
  }, [withDates]);

  const months = useMemo(() => {
    const result: { label: string; leftPct: number }[] = [];
    const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (cursor <= maxDate) {
      const pct = (daysBetween(minDate, cursor) / totalDays) * 100;
      if (pct >= 0 && pct <= 100) {
        result.push({
          label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          leftPct: pct,
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }, [minDate, maxDate, totalDays]);

  const today = new Date();
  const todayPct = Math.min(Math.max((daysBetween(minDate, today) / totalDays) * 100, 0), 100);
  const chartWidth = Math.max(640, 640 * zoom);
  const ROW_H = 40;
  const BAR_H = 24;
  const BAR_Y_OFFSET = (ROW_H - BAR_H) / 2;

  if (withDates.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        Add start and end dates to projects to see the Gantt chart.
      </div>
    );
  }

  const scrollToToday = () => {
    if (!scrollRef.current) return;
    const containerW = scrollRef.current.clientWidth;
    const scrollTarget = (todayPct / 100) * chartWidth - containerW / 2;
    scrollRef.current.scrollTo({ left: scrollTarget, behavior: "smooth" });
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={scrollToToday}>
          <CalendarDays className="h-3 w-3 mr-1" /> Today
        </Button>
      </div>

      <div ref={scrollRef} className="overflow-x-auto rounded-lg border bg-card">
        <div style={{ width: chartWidth }} className="min-w-full">
          {/* SVG arrow marker definition */}
          <svg width="0" height="0" className="absolute">
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" className="fill-muted-foreground" />
              </marker>
            </defs>
          </svg>

          {/* Month header */}
          <div className="relative h-8 border-b bg-muted/30 ml-48" style={{ width: `calc(100% - 12rem)` }}>
            {months.map((m) => (
              <span
                key={m.label}
                className="absolute text-[11px] text-muted-foreground font-semibold select-none top-1/2 -translate-y-1/2"
                style={{ left: `${m.leftPct}%`, transform: `translateX(-50%) translateY(-50%)` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid lines */}
          <div className="relative" style={{ height: withDates.length * ROW_H }}>
            {/* Vertical month grid lines */}
            {months.map((m) => (
              <div
                key={`grid-${m.label}`}
                className="absolute top-0 bottom-0 w-px bg-border/50"
                style={{ left: `calc(12rem + ${m.leftPct}% * (100% - 12rem) / 100)` }}
              />
            ))}

            {/* Today marker */}
            <div
              className="gantt-today"
              style={{ left: `calc(12rem + (100% - 12rem) * ${todayPct / 100})` }}
            />

            {/* Row stripes + bars */}
            {withDates.map((proj, i) => {
              const start = parseDate(proj.start_date)!;
              const end = parseDate(proj.end_date)!;
              const leftPct = (daysBetween(minDate, start) / totalDays) * 100;
              const widthPct = Math.max((daysBetween(start, end) / totalDays) * 100, 0.5);
              const config = STATUS_CONFIG[proj.status] ?? STATUS_CONFIG["On Track"];
              const isHovered = hoveredId === proj.id;
              const isSelected = selectedId === proj.id;
              const isCritical = proj.status === "Behind";
              const isMilestone = daysBetween(start, end) <= 1;
              const isDelayed = proj.status === "At Risk";

              return (
                <div
                  key={proj.id}
                  className={`flex items-center h-[${ROW_H}px] ${i % 2 === 0 ? '' : 'bg-muted/20'} ${isSelected ? 'bg-primary/5' : ''}`}
                  style={{ height: ROW_H }}
                >
                  {/* Label column */}
                  <div className="w-48 shrink-0 px-3 flex items-center gap-2 border-r bg-card">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate leading-tight">{proj.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{proj.project_manager ?? "—"}</p>
                    </div>
                  </div>

                  {/* Bar area */}
                  <div className="relative flex-1" style={{ height: ROW_H }}>
                    {isMilestone ? (
                      /* Milestone diamond */
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="gantt-milestone cursor-pointer"
                            style={{
                              left: `${leftPct}%`,
                              top: ROW_H / 2 - 8,
                            }}
                            onClick={() => setSelectedId(selectedId === proj.id ? null : proj.id)}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-semibold">{proj.name}</p>
                          <p>{formatDate(proj.start_date, { month: "short", day: "numeric" })}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      /* Task bar */
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`gantt-bar cursor-pointer ${isCritical ? 'bg-destructive' : isDelayed ? 'bg-warning' : config.bar} ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              top: BAR_Y_OFFSET,
                              height: BAR_H,
                              borderRadius: 4,
                              opacity: isHovered ? 1 : 0.9,
                            }}
                            onMouseEnter={() => setHoveredId(proj.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={() => setSelectedId(selectedId === proj.id ? null : proj.id)}
                          >
                            {/* Progress fill */}
                            <div
                              className="absolute inset-y-0 left-0 rounded-l bg-black/20"
                              style={{ width: `${proj.progress}%`, borderRadius: 4 }}
                            />
                            {widthPct > 6 && (
                              <span className="relative z-10 px-2 text-[10px] text-white font-semibold leading-[24px] truncate block">
                                {proj.progress}%
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold text-sm">{proj.name}</p>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p>{formatDate(proj.start_date, { month: "short", day: "numeric" })} → {formatDate(proj.end_date, { month: "short", day: "numeric", year: "numeric" })}</p>
                              <p>Progress: {proj.progress}% · Status: {proj.status}</p>
                              {proj.project_manager && <p>PM: {proj.project_manager}</p>}
                              <p>Budget: {fmtDollar(proj.budget)} · Spent: {fmtDollar(proj.spent)}</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 px-3 py-2.5 border-t bg-muted/20">
            {Object.entries(STATUS_CONFIG).map(([status, { bar }]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`h-3 w-6 rounded-sm ${bar}`} />
                <span className="text-[11px] text-muted-foreground font-medium">{status}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-0 border-l-2 border-dashed border-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rotate-45 bg-success rounded-sm" />
              <span className="text-[11px] text-muted-foreground font-medium">Milestone</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected project detail */}
      {selectedId && (() => {
        const proj = withDates.find(p => p.id === selectedId);
        if (!proj) return null;
        const config = STATUS_CONFIG[proj.status] ?? STATUS_CONFIG["On Track"];
        return (
          <Card className="animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold">{proj.name}</h3>
                    <Badge variant="outline" className={`text-[10px] ${config.badge}`}>{proj.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><p className="text-muted-foreground">Duration</p><p className="font-medium">{formatDate(proj.start_date, { month: "short", day: "numeric" })} — {formatDate(proj.end_date, { month: "short", day: "numeric" })}</p></div>
                    <div><p className="text-muted-foreground">Progress</p><p className="font-medium">{proj.progress}%</p></div>
                    <div><p className="text-muted-foreground">Budget</p><p className="font-medium">${(proj.budget / 1e6).toFixed(1)}M</p></div>
                    <div><p className="text-muted-foreground">Team</p><p className="font-medium">{proj.team_size} members</p></div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>✕</Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

/* ─── Timeline (list) view ─── */
function TimelineView({ projects }: { projects: Project[] }) {
  const active = projects.filter((p) => p.status !== "Complete");
  const complete = projects.filter((p) => p.status === "Complete");

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Active Projects</h2>
          {active.map((proj) => {
            const duration = proj.start_date && proj.end_date
              ? daysBetween(parseDate(proj.start_date)!, parseDate(proj.end_date)!)
              : null;
            const elapsed = proj.start_date
              ? daysBetween(parseDate(proj.start_date)!, new Date())
              : null;
            const timePct = duration && elapsed !== null
              ? Math.min(Math.max(Math.round((elapsed / duration) * 100), 0), 100)
              : null;
            const config = STATUS_CONFIG[proj.status] ?? STATUS_CONFIG["On Track"];

            return (
              <Card key={proj.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold truncate">{proj.name}</p>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${config.badge}`}>
                          {proj.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                        {proj.project_manager && (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{proj.project_manager}</span>
                        )}
                        {proj.location && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{proj.location}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(proj.start_date, { month: "short", day: "numeric" })} — {formatDate(proj.end_date, { month: "short", day: "numeric", year: "numeric" })}
                          {duration ? ` (${duration}d)` : ""}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Completion</span><span>{proj.progress}%</span>
                        </div>
                        <Progress value={proj.progress} className="h-2" />
                        {timePct !== null && (
                          <>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Time elapsed</span><span>{timePct}%</span>
                            </div>
                            <Progress
                              value={timePct}
                              className={`h-1.5 ${proj.progress < timePct - 10 ? "[&>div]:bg-destructive" : "[&>div]:bg-muted-foreground/40"}`}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {complete.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Completed</h2>
          {complete.map((proj) => (
            <Card key={proj.id} className="opacity-60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{proj.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(proj.start_date, { month: "short", day: "numeric" })} — {formatDate(proj.end_date, { month: "short", day: "numeric", year: "numeric" })}
                    {proj.project_manager ? ` · ${proj.project_manager}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${STATUS_CONFIG["Complete"].badge}`}>Complete</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */
export default function SchedulePage() {
  const { data: projects = [], isLoading } = useProjects();
  const navigate = useNavigate();

  const active = projects.filter((p) => p.status !== "Complete");
  const onTrack = projects.filter((p) => p.status === "On Track").length;
  const atRisk = projects.filter((p) => p.status === "At Risk" || p.status === "Behind").length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Build</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Project Gantt chart and milestone tracking.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Projects</p>
            <p className="text-xl font-bold">{projects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-xl font-bold text-primary">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">On Track</p>
            <p className="text-xl font-bold text-success">{onTrack}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">At Risk</p>
            <p className="text-xl font-bold text-warning">{atRisk}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-base font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create projects to see them on the Gantt chart.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/build/projects")}>
              Go to Projects
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="gantt">
          <TabsList className="mb-4">
            <TabsTrigger value="gantt" className="gap-1.5">
              <BarChart2 className="h-3.5 w-3.5" />Gantt Chart
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-3.5 w-3.5" />Timeline List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gantt">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Project Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <GanttChart projects={projects} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <TimelineView projects={projects} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
