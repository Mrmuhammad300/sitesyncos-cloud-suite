import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Area, Bar, CartesianGrid, ComposedChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowUpRight, Brain, Building2, CalendarClock, CheckCircle2, CircleDollarSign, FileText,
  HardHat, Plus, Sparkles, Activity, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiInsightCard } from "@/components/AiInsightCard";
import { EmptyState, Meter, Panel, StatCard, StatusPill } from "@/components/os";
import { useProjects, useRFIs } from "@/hooks/useProjectData";
import { useProperties } from "@/hooks/useVaultData";
import { useAuth } from "@/hooks/useAuth";
import { fmtDollar, cn } from "@/lib/utils";
import { CHART, STATUS_CHART_COLOR, axisProps, gridProps, tooltipProps } from "@/lib/chart";
import { MODULES } from "@/lib/modules";
import {
  PROJECT_STATUSES, attentionScore, budgetBurn, buildMonthlySpend, daysUntil, greeting, isRfiOverdue,
} from "@/lib/dashboard";

const LAUNCH = ["build", "ops", "vault", "ledger", "ai", "spatial"] as const;

export default function Dashboard() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: rfis = [], isLoading: rfisLoading } = useRFIs();
  const { data: properties = [], isLoading: propsLoading } = useProperties();
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const m = useMemo(() => {
    const monthly = buildMonthlySpend(projects);
    const active = projects.filter((p) => p.status !== "Complete");
    const aum = properties.reduce((s, p) => s + Number(p.price), 0);
    const spent = projects.reduce((s, p) => s + Number(p.spent), 0);
    const budget = projects.reduce((s, p) => s + Number(p.budget), 0);
    const openRfis = rfis.filter((r) => r.status !== "Closed" && r.status !== "Answered");
    const overdue = openRfis.filter((r) => isRfiOverdue(r));
    const healthy = projects.filter((p) => p.status === "On Track" || p.status === "Complete").length;
    const onTime = projects.length ? Math.round((healthy / projects.length) * 100) : null;
    const atRisk = projects.filter((p) => p.status === "At Risk" || p.status === "Behind");
    const status = PROJECT_STATUSES.map((name) => ({
      name,
      value: projects.filter((p) => p.status === name).length,
      color: STATUS_CHART_COLOR[name],
    }));
    const watchlist = [...active].sort((a, b) => attentionScore(b) - attentionScore(a)).slice(0, 6);
    const rfiQueue = [...openRfis]
      .sort((a, b) => (daysUntil(a.due_date) ?? 999) - (daysUntil(b.due_date) ?? 999))
      .slice(0, 6);
    const occupancy = properties.length
      ? Math.round(properties.reduce((s, p) => s + Number(p.occupancy ?? 0), 0) / properties.length)
      : null;
    return { monthly, active, aum, spent, budget, openRfis, overdue, onTime, atRisk, status, watchlist, rfiQueue, occupancy };
  }, [projects, rfis, properties]);

  const firstName = (profile?.display_name || user?.email?.split("@")[0] || "there").split(/[\s._-]/)[0];
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const loading = projectsLoading || propsLoading;
  const spark = m.monthly.map((x) => x.cumulative);
  const burnPct = m.budget > 0 ? Math.round((m.spent / m.budget) * 100) : 0;

  const moduleStats: Record<string, string> = {
    build: `${m.active.length} active`,
    ops: `${fmtDollar(m.spent)} deployed`,
    vault: `${properties.length} assets`,
    ledger: "Treasury",
    ai: "6 agents online",
    spatial: "BIM workbench",
  };

  return (
    <div className="space-y-6">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="ss-eyebrow flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-[2px] bg-primary" />
              Command center · {today}
            </p>
            <h1 className="ss-display text-balance text-[44px] leading-[0.95] sm:text-[56px]">
              {greeting()}, <span className="italic text-primary">{firstName}</span>.
            </h1>
            <p className="max-w-xl text-pretty text-[15px] text-muted-foreground">
              {loading ? (
                "Syncing your portfolio…"
              ) : (
                <>
                  {m.atRisk.length > 0 ? (
                    <><span className="font-medium text-foreground">{m.atRisk.length} project{m.atRisk.length === 1 ? "" : "s"}</span> need attention</>
                  ) : (
                    <>Every project is <span className="font-medium text-success">on track</span></>
                  )}
                  {m.overdue.length > 0 && (
                    <>, <span className="font-medium text-foreground">{m.overdue.length} RFI{m.overdue.length === 1 ? " is" : "s are"}</span> overdue</>
                  )}
                  , and <span className="font-medium text-foreground">{fmtDollar(m.aum)}</span> is under management.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/ai-assistant")}>
              <Sparkles className="text-mod-ai" /> Ask SiteSync AI
            </Button>
            <Button onClick={() => navigate("/build/projects")}>
              <Plus /> New project
            </Button>
          </div>
        </div>
      </section>

      {/* ── KPI strip ─────────────────────────────────────── */}
      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active projects"
          value={m.active.length}
          icon={HardHat}
          hint={`${projects.length} total`}
          spark={m.monthly.map((x) => x.started)}
          tone="primary"
          loading={loading}
          onClick={() => navigate("/build/projects")}
        />
        <StatCard
          label="Assets under mgmt"
          value={fmtDollar(m.aum)}
          icon={Building2}
          hint={m.occupancy !== null ? `${m.occupancy}% avg occupancy` : `${properties.length} properties`}
          tone="data"
          loading={loading}
          onClick={() => navigate("/vault/properties")}
        />
        <StatCard
          label="Capital deployed"
          value={fmtDollar(m.spent)}
          icon={CircleDollarSign}
          hint={`${burnPct}% of ${fmtDollar(m.budget)} budget`}
          spark={spark}
          tone="success"
          loading={loading}
          onClick={() => navigate("/ops/cost-dashboard")}
        />
        <StatCard
          label="Open RFIs"
          value={rfisLoading ? "—" : m.openRfis.length}
          icon={FileText}
          hint={m.overdue.length ? `${m.overdue.length} overdue` : "None overdue"}
          tone={m.overdue.length ? "warning" : "default"}
          loading={rfisLoading}
          onClick={() => navigate("/build/rfis")}
        />
      </section>

      {/* ── Capital + health ─────────────────────────────── */}
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          eyebrow="Capital deployment"
          title="Trailing 12 months"
          actions={
            <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-primary" /> Monthly spend</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-data" /> Cumulative</span>
            </div>
          }
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={m.monthly} margin={{ top: 10, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={CHART.data} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={CHART.data} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis yAxisId="l" {...axisProps} tickFormatter={(v) => `$${v}M`} width={52} />
                <YAxis yAxisId="r" orientation="right" hide />
                <Tooltip
                  {...tooltipProps}
                  formatter={(v: number, name) => [`$${v}M`, name === "spend" ? "Monthly spend" : "Cumulative"]}
                />
                <Area yAxisId="r" type="monotone" dataKey="cumulative" stroke={CHART.data} strokeWidth={1.75} fill="url(#cumFill)" dot={false} />
                <Bar yAxisId="l" dataKey="spend" fill={CHART.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel eyebrow="Portfolio health" title="Delivery status" actions={
          <Link to="/build/projects" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
        }>
          {projects.length === 0 && !loading ? (
            <EmptyState compact icon={HardHat} title="No projects yet" description="Create your first project to see delivery health." />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="relative mx-auto h-[168px] w-[168px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={m.status.filter((s) => s.value > 0)} dataKey="value" innerRadius={58} outerRadius={80} paddingAngle={3} stroke="none" startAngle={90} endAngle={-270}>
                      {m.status.filter((s) => s.value > 0).map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip {...tooltipProps} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-3xl font-medium tabular-nums">{m.onTime ?? "—"}<span className="text-base text-muted-foreground">%</span></span>
                  <span className="ss-eyebrow mt-0.5">On time</span>
                </div>
              </div>
              <ul className="grid grid-cols-2 gap-2">
                {m.status.map((s) => (
                  <li key={s.name} className="flex items-center justify-between rounded-lg border bg-surface-2/40 px-2.5 py-2">
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-mono text-sm tabular-nums">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </section>

      {/* ── Module launchpad ─────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="ss-eyebrow">Modules</h2>
          <span className="hidden text-xs text-muted-foreground sm:block">
            Press <kbd className="ss-kbd">/</kbd> to jump anywhere
          </span>
        </div>
        <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {LAUNCH.map((key) => {
            const mod = MODULES.find((x) => x.key === key)!;
            return (
              <Link
                key={key}
                to={mod.items[0].url}
                className="ss-card ss-interactive group relative overflow-hidden p-4 hover:-translate-y-0.5"
              >
                <div
                  className={cn("absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40", `bg-${mod.tone}`)}
                />
                <div className="relative flex items-start justify-between">
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", `text-${mod.tone} border-${mod.tone}/25 bg-${mod.tone}/10`)}>
                    <mod.icon className="h-4 w-4" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
                <div className="relative mt-4 space-y-0.5">
                  <p className="text-sm font-semibold">{mod.label}</p>
                  <p className="text-xs text-muted-foreground">{mod.tagline}</p>
                </div>
                <p className="relative mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground/80">{moduleStats[key]}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Watchlist + RFI queue + agents ───────────────── */}
      <section className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          eyebrow="Watchlist"
          title="Projects ranked by attention"
          flush
          actions={<Button variant="ghost" size="xs" asChild><Link to="/build/projects">All projects <ArrowUpRight /></Link></Button>}
        >
          {projectsLoading ? (
            <div className="space-y-2 p-5 pt-0">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>
          ) : m.watchlist.length === 0 ? (
            <div className="p-5 pt-0"><EmptyState compact icon={CheckCircle2} title="Nothing needs attention" description="Active projects will appear here, ranked by risk." /></div>
          ) : (
            <div className="divide-y divide-border/70 border-t">
              <div className="hidden grid-cols-[minmax(0,1fr)_110px_120px_90px] gap-4 px-5 py-2 sm:grid">
                {["Project", "Status", "Budget burn", "Progress"].map((h) => <span key={h} className="ss-eyebrow text-[9.5px]">{h}</span>)}
              </div>
              {m.watchlist.map((p) => {
                const burn = budgetBurn(p);
                return (
                  <Link
                    key={p.id}
                    to="/build/projects"
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3 transition-colors hover:bg-surface-2/50 sm:grid-cols-[minmax(0,1fr)_110px_120px_90px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.location ?? "—"} · {p.project_manager ?? "Unassigned"}
                      </p>
                    </div>
                    <div><StatusPill status={p.status} /></div>
                    <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                      <Meter value={burn} risk className="flex-1" />
                      <span className={cn("w-10 text-right font-mono text-[11px] tabular-nums", burn > p.progress + 15 ? "text-warning" : "text-muted-foreground")}>{burn}%</span>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <Meter value={p.progress} tone="data" className="flex-1" />
                      <span className="w-8 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{p.progress}%</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
          <Panel eyebrow="RFI queue" title="Due soonest" actions={<Button variant="ghost" size="xs" asChild><Link to="/build/rfis">Open <ArrowUpRight /></Link></Button>}>
            {rfisLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}</div>
            ) : m.rfiQueue.length === 0 ? (
              <EmptyState compact icon={FileText} title="Inbox zero" description="No open RFIs. Nice." />
            ) : (
              <ul className="-mx-2 space-y-0.5">
                {m.rfiQueue.map((r) => {
                  const d = daysUntil(r.due_date);
                  const overdue = d !== null && d < 0;
                  return (
                    <li key={r.id}>
                      <Link to="/build/rfis" className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/60">
                        <span className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground">{r.rfi_number}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px]">{r.subject}</span>
                        <span className={cn(
                          "flex shrink-0 items-center gap-1 font-mono text-[11px] tabular-nums",
                          overdue ? "text-destructive" : d !== null && d <= 3 ? "text-warning" : "text-muted-foreground",
                        )}>
                          <CalendarClock className="h-3 w-3" />
                          {d === null ? "—" : overdue ? `${-d}d late` : d === 0 ? "today" : `${d}d`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel glow eyebrow="Agents" title="Live activity" actions={
            <span className="flex items-center gap-1.5 text-[11px] text-success"><span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-success" /> Online</span>
          }>
            <ul className="space-y-3">
              {[
                { icon: Brain, tone: "text-mod-ai bg-mod-ai/10 border-mod-ai/20", title: "Compiling weekly owner report", meta: "Binary Loom · running", live: true },
                { icon: AlertTriangle, tone: "text-warning bg-warning/10 border-warning/20", title: `Flagged ${m.overdue.length} overdue RFI${m.overdue.length === 1 ? "" : "s"}`, meta: "Quantum Ledger · alert" },
                { icon: Zap, tone: "text-data bg-data/10 border-data/20", title: `Reconciled ${fmtDollar(m.spent)} against budget`, meta: "Cost Sentinel · complete" },
                { icon: Activity, tone: "text-success bg-success/10 border-success/20", title: `${m.atRisk.length} schedule risk${m.atRisk.length === 1 ? "" : "s"} under watch`, meta: "Schedule Oracle · monitoring" },
              ].map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", a.tone)}>
                    <a.icon className="h-3.5 w-3.5" />
                    {a.live && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-glow-pulse rounded-full bg-current" />}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="truncate text-[13px] font-medium">{a.title}</p>
                    <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">{a.meta}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link to="/ai/agents">Manage agents</Link>
            </Button>
          </Panel>
        </div>
      </section>

      {/* ── AI insights ──────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <AiInsightCard type="project-health" title="Project health assessment" agentName="Binary Loom" icon={<Brain className="h-4 w-4 text-mod-ai" />} />
        <AiInsightCard type="budget-monitor" title="Budget overrun monitor" agentName="Quantum Ledger" icon={<Sparkles className="h-4 w-4 text-primary" />} />
      </section>
    </div>
  );
}
