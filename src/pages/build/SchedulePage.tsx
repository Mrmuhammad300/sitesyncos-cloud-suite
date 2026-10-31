import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, CalendarClock, CalendarDays, Flag, HardHat, List, MapPin, TrendingDown, User, CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, Meter, PageHeader, Panel, StatCard, StatusPill } from "@/components/os";
import { Shimmer } from "@/components/build/kit";
import { Gantt } from "@/components/build/Gantt";
import { scheduleVariance } from "@/components/build/schedule";
import { daysUntil, fmtDate, daysBetween } from "@/components/build/utils";
import { useProjects } from "@/hooks/useProjectData";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type View = "gantt" | "list";

function VarianceChip({ gap }: { gap: number }) {
  const tone = gap < -10 ? "border-destructive/30 bg-destructive/10 text-destructive"
    : gap < -3 ? "border-warning/30 bg-warning/10 text-warning"
      : "border-success/25 bg-success/10 text-success";
  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums", tone)}>
      {gap >= 0 ? "+" : "−"}{Math.abs(gap)} pts
    </span>
  );
}

/* ─── Timeline (list) view ─── */
function TimelineView({ projects }: { projects: Project[] }) {
  const active = projects
    .filter((p) => p.status !== "Complete")
    .sort((a, b) => scheduleVariance(a).gap - scheduleVariance(b).gap);
  const complete = projects.filter((p) => p.status === "Complete");

  return (
    <div className="divide-y divide-border/70 border-t">
      {active.map((p) => {
        const v = scheduleVariance(p);
        const duration = p.start_date && p.end_date ? daysBetween(p.start_date, p.end_date) : null;
        const left = daysUntil(p.end_date);
        return (
          <div key={p.id} className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center md:gap-8">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <StatusPill status={p.status} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {p.project_manager && <span className="flex items-center gap-1"><User className="h-3 w-3" />{p.project_manager}</span>}
                {p.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</span>}
                <span className="flex items-center gap-1 font-mono tabular-nums">
                  <CalendarDays className="h-3 w-3" />
                  {fmtDate(p.start_date)} → {fmtDate(p.end_date, true)}{duration ? ` · ${duration}d` : ""}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs">
                <span className="text-muted-foreground">Complete</span>
                <Meter value={p.progress} tone="data" />
                <span className="text-right font-mono tabular-nums">{p.progress}%</span>
              </div>
              {v.known && (
                <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Time used</span>
                  <Meter value={v.elapsed} tone={v.gap < -10 ? "destructive" : v.gap < -3 ? "warning" : "info"} />
                  <span className="text-right font-mono tabular-nums text-muted-foreground">{v.elapsed}%</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {v.known ? <VarianceChip gap={v.gap} /> : <span />}
                {left !== null && (
                  <span className={cn("font-mono text-[11px] tabular-nums", left < 0 ? "text-destructive" : left <= 30 ? "text-warning" : "text-muted-foreground")}>
                    {left < 0 ? `${-left}d past finish` : `${left}d to finish`}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {complete.length > 0 && (
        <div className="space-y-2 bg-surface-2/20 px-5 py-4">
          <p className="ss-eyebrow">Completed</p>
          {complete.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{p.name}</span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">{fmtDate(p.end_date, true)}</span>
            </div>
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
  const [view, setView] = useState<View>("gantt");

  const m = useMemo(() => {
    const active = projects.filter((p) => p.status !== "Complete");
    const scheduled = projects.filter((p) => p.start_date && p.end_date);
    const variances = active.map((p) => ({ p, v: scheduleVariance(p) })).filter((x) => x.v.known);
    const behindPlan = variances.filter((x) => x.v.gap < -10);
    const onPlan = variances.filter((x) => x.v.gap >= -3).length;
    const avgGap = variances.length ? Math.round(variances.reduce((s, x) => s + x.v.gap, 0) / variances.length) : 0;
    const upcoming = active
      .map((p) => ({ p, d: daysUntil(p.end_date) }))
      .filter((x): x is { p: Project; d: number } => x.d !== null && x.d >= 0)
      .sort((a, b) => a.d - b.d);
    const worst = [...behindPlan].sort((a, b) => a.v.gap - b.v.gap)[0];
    return { active, scheduled, behindPlan, onPlan, avgGap, next: upcoming[0] ?? null, worst, unscheduled: projects.length - scheduled.length };
  }, [projects]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        description="Every project on one timeline — planned window, work in place, and who is falling behind the clock."
        actions={
          <div className="inline-flex rounded-lg border bg-surface-2/50 p-0.5" role="tablist" aria-label="Schedule view">
            {([["gantt", BarChart3, "Gantt"], ["list", List, "Timeline"]] as const).map(([k, Icon, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={view === k}
                onClick={() => setView(k)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
                  view === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active projects" value={m.active.length} icon={HardHat} tone="primary" hint={`${m.scheduled.length} of ${projects.length} scheduled`} loading={isLoading} />
        <StatCard
          label="On plan"
          value={m.onPlan}
          icon={Flag}
          tone="success"
          hint={`Avg ${m.avgGap >= 0 ? "+" : "−"}${Math.abs(m.avgGap)} pts vs time used`}
          loading={isLoading}
        />
        <StatCard
          label="Behind plan"
          value={m.behindPlan.length}
          icon={TrendingDown}
          tone={m.behindPlan.length ? "destructive" : "success"}
          hint={m.worst ? `${m.worst.p.name.split(" ").slice(0, 2).join(" ")} ${m.worst.v.gap} pts` : "> 10 pts behind the clock"}
          loading={isLoading}
        />
        <StatCard
          label="Next handover"
          value={m.next ? `${m.next.d}d` : "—"}
          icon={CalendarClock}
          tone={m.next && m.next.d <= 30 ? "warning" : "default"}
          hint={m.next ? m.next.p.name : "No upcoming finish dates"}
          loading={isLoading}
        />
      </section>

      {isLoading ? (
        <Panel flush title="Project timeline">
          <div className="space-y-3 border-t p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Shimmer className="h-3.5 w-28 shrink-0 sm:w-48" />
                <Shimmer className="h-5" />
              </div>
            ))}
          </div>
        </Panel>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing to schedule yet"
          description="Create projects with start and end dates and they’ll appear here on a shared timeline."
          action={<Button size="sm" onClick={() => navigate("/build/projects")}>Go to projects</Button>}
        />
      ) : view === "gantt" ? (
        <Panel
          flush
          eyebrow="Gantt"
          title="Project timeline"
          description={
            m.unscheduled > 0
              ? `${m.unscheduled} project${m.unscheduled === 1 ? " has" : "s have"} no dates and ${m.unscheduled === 1 ? "isn’t" : "aren’t"} shown. Fill shows work complete — if it ends left of Today, that job is behind plan.`
              : "Fill shows work complete — if it ends left of Today, that job is behind plan."
          }
        >
          {m.scheduled.length === 0 ? (
            <div className="border-t p-5">
              <EmptyState
                compact
                icon={CalendarX2}
                title="No dated projects"
                description="Add start and end dates to your projects to plot them on the Gantt."
                action={<Button size="sm" variant="outline" onClick={() => navigate("/build/projects")}>Edit projects</Button>}
              />
            </div>
          ) : (
            <Gantt projects={projects} />
          )}
        </Panel>
      ) : (
        <Panel flush eyebrow="Timeline" title="Progress vs time used" description="Sorted by who is furthest behind the clock.">
          <TimelineView projects={projects} />
        </Panel>
      )}
    </div>
  );
}
