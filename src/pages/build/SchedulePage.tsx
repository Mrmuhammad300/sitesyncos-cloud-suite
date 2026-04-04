import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, MapPin, User, BarChart2, List } from "lucide-react";
import { useProjects } from "@/hooks/useProjectData";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

const STATUS_COLOR: Record<string, { bar: string; badge: string }> = {
  "On Track": { bar: "bg-emerald-500", badge: "bg-success/10 text-success border-success/20" },
  "At Risk":  { bar: "bg-amber-500",   badge: "bg-warning/10 text-warning border-warning/20" },
  "Behind":   { bar: "bg-red-500",     badge: "bg-destructive/10 text-destructive border-destructive/20" },
  "Complete": { bar: "bg-primary",     badge: "bg-primary/10 text-primary border-primary/20" },
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

/* ─── Gantt Bar Chart ─── */
interface GanttProps { projects: Project[] }

function GanttChart({ projects }: GanttProps) {
  const withDates = projects.filter((p) => p.start_date && p.end_date);
  if (withDates.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        Add start and end dates to projects to see the Gantt chart.
      </div>
    );
  }

  // Compute time window
  const allStarts = withDates.map((p) => parseDate(p.start_date)!);
  const allEnds   = withDates.map((p) => parseDate(p.end_date)!);
  const minDate   = new Date(Math.min(...allStarts.map((d) => d.getTime())));
  const maxDate   = new Date(Math.max(...allEnds.map((d) => d.getTime())));
  const totalDays = Math.max(daysBetween(minDate, maxDate), 1);

  // Build month labels
  const months: { label: string; leftPct: number }[] = [];
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cursor <= maxDate) {
    const pct = (daysBetween(minDate, cursor) / totalDays) * 100;
    if (pct >= 0 && pct <= 100) {
      months.push({
        label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        leftPct: pct,
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Today marker
  const today = new Date();
  const todayPct = Math.min(Math.max((daysBetween(minDate, today) / totalDays) * 100, 0), 100);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Month header */}
        <div className="relative h-7 border-b mb-1 ml-40">
          {months.map((m) => (
            <span
              key={m.label}
              className="absolute text-[10px] text-muted-foreground font-medium select-none"
              style={{ left: `${m.leftPct}%`, transform: "translateX(-50%)" }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-1.5">
          {withDates.map((proj) => {
            const start = parseDate(proj.start_date)!;
            const end   = parseDate(proj.end_date)!;
            const leftPct  = (daysBetween(minDate, start) / totalDays) * 100;
            const widthPct = Math.max((daysBetween(start, end) / totalDays) * 100, 0.5);
            const colors   = STATUS_COLOR[proj.status] ?? STATUS_COLOR["On Track"];

            return (
              <div key={proj.id} className="flex items-center gap-0">
                {/* Label */}
                <div className="w-40 shrink-0 pr-3 text-right">
                  <p className="text-xs font-medium truncate">{proj.name}</p>
                  <p className="text-[10px] text-muted-foreground">{proj.status}</p>
                </div>

                {/* Bar track */}
                <div className="relative flex-1 h-8 bg-muted/30 rounded overflow-hidden">
                  {/* Today line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-primary/60 z-10"
                    style={{ left: `${todayPct}%` }}
                  />

                  {/* Project bar */}
                  <div
                    className={`absolute top-1 bottom-1 rounded ${colors.bar} flex items-center px-2 overflow-hidden`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`${proj.name}: ${formatDate(proj.start_date, { month: "short", day: "numeric" })} → ${formatDate(proj.end_date, { month: "short", day: "numeric" })}`}
                  >
                    {widthPct > 8 && (
                      <span className="text-[10px] text-white font-semibold truncate">
                        {proj.progress}%
                      </span>
                    )}
                  </div>

                  {/* Progress fill overlay */}
                  <div
                    className="absolute top-1 bottom-1 rounded bg-black/20"
                    style={{
                      left: `${leftPct}%`,
                      width: `${(widthPct * proj.progress) / 100}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 ml-40">
          {Object.entries(STATUS_COLOR).map(([status, { bar }]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`h-2.5 w-5 rounded-sm ${bar}`} />
              <span className="text-[10px] text-muted-foreground">{status}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-px bg-primary/60" />
            <span className="text-[10px] text-muted-foreground">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Timeline (list) view ─── */
function TimelineView({ projects }: { projects: Project[] }) {
  const active   = projects.filter((p) => p.status !== "Complete");
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
            const colors = STATUS_COLOR[proj.status] ?? STATUS_COLOR["On Track"];

            return (
              <Card key={proj.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold truncate">{proj.name}</p>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${colors.badge}`}>
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
                <Badge variant="outline" className={`text-[10px] ${STATUS_COLOR["Complete"].badge}`}>Complete</Badge>
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

  const active   = projects.filter((p) => p.status !== "Complete");
  const onTrack  = projects.filter((p) => p.status === "On Track").length;
  const atRisk   = projects.filter((p) => p.status === "At Risk" || p.status === "Behind").length;
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
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Projects</p><p className="text-xl font-bold">{projects.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold text-primary">{active.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">On Track</p><p className="text-xl font-bold text-emerald-500">{onTrack}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Progress</p><p className="text-xl font-bold">{avgProgress}%</p></CardContent></Card>
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
