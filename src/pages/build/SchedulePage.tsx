import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, MapPin, User } from "lucide-react";
import { useProjects } from "@/hooks/useProjectData";

const statusColor: Record<string, string> = {
  "On Track": "bg-success/10 text-success border-success/20",
  "At Risk": "bg-warning/10 text-warning border-warning/20",
  "Behind": "bg-destructive/10 text-destructive border-destructive/20",
  "Complete": "bg-primary/10 text-primary border-primary/20",
};

function daysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SchedulePage() {
  const { data: projects = [], isLoading } = useProjects();

  const active = projects.filter(p => p.status !== "Complete");
  const complete = projects.filter(p => p.status === "Complete");
  const onTrack = projects.filter(p => p.status === "On Track").length;
  const atRisk = projects.filter(p => p.status === "At Risk" || p.status === "Behind").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Build</Badge>
            <Badge variant="secondary" className="text-[10px]">Timeline View — v1.1</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Project timelines and milestone tracking. Gantt view coming in v1.1.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Projects</p><p className="text-xl font-bold">{projects.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold text-primary">{active.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">On Track</p><p className="text-xl font-bold text-success">{onTrack}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">At Risk / Behind</p><p className="text-xl font-bold text-warning">{atRisk}</p></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-base font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create projects in the Projects module to see them here.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.href = "/build/projects"}>
              Go to Projects
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Active */}
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active Projects</h2>
              {active.map(proj => {
                const duration = daysBetween(proj.start_date, proj.end_date);
                const elapsed = daysBetween(proj.start_date, new Date().toISOString().slice(0, 10));
                const timeProgress = duration && elapsed !== null
                  ? Math.min(Math.max(Math.round((elapsed / duration) * 100), 0), 100)
                  : null;

                return (
                  <Card key={proj.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold truncate">{proj.name}</p>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColor[proj.status] ?? ""}`}>
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
                              {formatDate(proj.start_date)} — {formatDate(proj.end_date)}
                              {duration ? ` (${duration}d)` : ""}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Completion</span>
                              <span>{proj.progress}%</span>
                            </div>
                            <Progress value={proj.progress} className="h-2" />
                            {timeProgress !== null && (
                              <>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Time elapsed</span>
                                  <span>{timeProgress}%</span>
                                </div>
                                <Progress
                                  value={timeProgress}
                                  className={`h-1.5 ${proj.progress < timeProgress - 10 ? "[&>div]:bg-destructive" : "[&>div]:bg-muted-foreground/40"}`}
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

          {/* Completed */}
          {complete.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Completed</h2>
              {complete.map(proj => (
                <Card key={proj.id} className="opacity-60">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{proj.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(proj.start_date)} — {formatDate(proj.end_date)}
                        {proj.project_manager ? ` · ${proj.project_manager}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${statusColor["Complete"]}`}>Complete</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
