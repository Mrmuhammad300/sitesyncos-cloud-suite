import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, ArrowRight, CheckCircle2, CircleDollarSign, Gauge, Layers, Plus, Receipt, TrendingUp, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, Meter, PageHeader, Panel, StatCard, StatusPill } from "@/components/os";
import { BlockSkeleton, LegendDot, Shimmer } from "@/components/ops/OpsKit";
import { useBudgets } from "@/hooks/useOpsData";
import { useProjects, useChangeOrders } from "@/hooks/useProjectData";
import { CHART, axisProps, gridProps, tooltipProps } from "@/lib/chart";
import { cn } from "@/lib/utils";

const fmt = (v: number) => {
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  return a >= 1_000_000 ? `${sign}$${(a / 1_000_000).toFixed(2)}M`
    : a >= 1_000 ? `${sign}$${(a / 1_000).toFixed(0)}K`
    : `${sign}$${a.toLocaleString()}`;
};

const pct = (spent: number, allocated: number) =>
  allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

const riskText = (p: number) =>
  p >= 100 ? "text-destructive" : p >= 80 ? "text-warning" : "text-success";

const riskFill = (p: number) =>
  p >= 100 ? CHART.destructive : p >= 80 ? CHART.warning : CHART.success;

const riskBg = (p: number) =>
  p >= 100 ? "bg-destructive" : p >= 80 ? "bg-warning" : "bg-success";

const PENDING_CO = ["Pending", "Under Review", "In Review"];

export default function CostDashboardPage() {
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: changeOrders = [] } = useChangeOrders();
  const loading = budgetsLoading || projectsLoading;

  // ── Top-level KPIs ──────────────────────────────────────────────────────────
  const totalAllocated = budgets.reduce((s, b) => s + Number(b.allocated), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallPct = pct(totalSpent, totalAllocated);

  // Approved CO value adds to effective budget
  const approvedCOs = changeOrders.filter((co) => co.status === "Approved");
  const approvedCOValue = approvedCOs.reduce((s, co) => s + Number(co.amount), 0);
  const pendingCOs = changeOrders.filter((co) => PENDING_CO.includes(co.status));
  const pendingCOValue = pendingCOs.reduce((s, co) => s + Number(co.amount), 0);

  // ── Budget by category ──────────────────────────────────────────────────────
  const categoryMap: Record<string, { allocated: number; spent: number }> = {};
  budgets.forEach((b) => {
    if (!categoryMap[b.category]) categoryMap[b.category] = { allocated: 0, spent: 0 };
    categoryMap[b.category].allocated += Number(b.allocated);
    categoryMap[b.category].spent += Number(b.spent);
  });
  const categoryData = Object.entries(categoryMap)
    .map(([cat, d]) => ({
      category: cat,
      allocated: d.allocated,
      spent: d.spent,
      remaining: d.allocated - d.spent,
      pct: pct(d.spent, d.allocated),
    }))
    .sort((a, b) => b.pct - a.pct);
  const maxAllocated = Math.max(1, ...categoryData.map((c) => Math.max(c.allocated, c.spent)));

  // ── Budget by project (using projects table budget/spent) ───────────────────
  const projectData = projects
    .filter((p) => p.budget > 0)
    .map((p) => ({
      name: p.name.length > 20 ? p.name.slice(0, 18) + "…" : p.name,
      fullName: p.name,
      budget: Number(p.budget),
      spent: Number(p.spent),
      pct: pct(Number(p.spent), Number(p.budget)),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  // ── Overrun risk alerts ──────────────────────────────────────────────────────
  const overrunProjects = projects.filter((p) => p.budget > 0 && Number(p.spent) / Number(p.budget) >= 0.8);
  const overBudgetCategories = categoryData.filter((c) => c.pct >= 100);
  const callouts = [
    ...overBudgetCategories.map((c) => ({
      key: `c-${c.category}`, kind: "Category", name: c.category, pct: c.pct, spent: c.spent, budget: c.allocated,
    })),
    ...overrunProjects.map((p) => ({
      key: `p-${p.id}`, kind: "Project", name: p.name, pct: pct(Number(p.spent), Number(p.budget)), spent: Number(p.spent), budget: Number(p.budget),
    })),
  ].sort((a, b) => b.pct - a.pct);
  const overCount = callouts.filter((c) => c.pct >= 100).length;

  // ── Cost-at-completion forecast ──────────────────────────────────────────────
  const costAtCompletion = overallPct > 0
    ? totalSpent + (totalRemaining * (overallPct / 100))
    : totalAllocated;
  const forecastVariance = costAtCompletion - totalAllocated;
  const exposure = totalAllocated + approvedCOValue + pendingCOValue;

  const bridge = [
    { label: "Allocated budget", value: totalAllocated, total: true },
    { label: `Approved change orders · ${approvedCOs.length}`, value: approvedCOValue, tone: "primary" as const },
    { label: `Pending change orders · ${pendingCOs.length}`, value: pendingCOValue, tone: "warning" as const },
  ];
  const maxDelta = Math.max(1, Math.abs(approvedCOValue), Math.abs(pendingCOValue));

  const nothing = !loading && budgets.length === 0 && projects.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Dashboard"
        description="Budget health, utilisation by line and project, and the exposure your change orders add to cost-at-completion."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/build/change-orders"><Layers />Change orders</Link>
            </Button>
            <Button asChild>
              <Link to="/ops/budgets"><Wallet />Manage budgets</Link>
            </Button>
          </>
        }
      />

      {nothing ? (
        <EmptyState
          icon={CircleDollarSign}
          title="No cost data yet"
          description="Add budget lines to start tracking spend, utilisation and forecast cost-at-completion."
          action={<Button asChild><Link to="/ops/budgets"><Plus />Create a budget</Link></Button>}
        />
      ) : (
        <>
          {/* ── KPIs ─────────────────────────────────────────── */}
          <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Total budget"
              value={fmt(totalAllocated)}
              icon={Wallet}
              tone="data"
              hint={`${approvedCOValue >= 0 ? "+" : ""}${fmt(approvedCOValue)} approved COs`}
              loading={loading}
            />
            <StatCard
              label="Spent to date"
              value={fmt(totalSpent)}
              icon={TrendingUp}
              tone={overallPct >= 100 ? "destructive" : overallPct >= 85 ? "warning" : "default"}
              hint={`${overallPct}% of budget`}
              loading={loading}
            />
            <StatCard
              label="Remaining"
              value={fmt(totalRemaining)}
              icon={totalRemaining >= 0 ? CheckCircle2 : AlertTriangle}
              tone={totalRemaining >= 0 ? "success" : "destructive"}
              hint={`${Math.max(0, 100 - overallPct)}% unspent`}
              loading={loading}
            />
            <StatCard
              label="Pending COs"
              value={fmt(pendingCOValue)}
              icon={Receipt}
              tone={pendingCOValue > 0 ? "warning" : "default"}
              hint={`${pendingCOs.length} awaiting approval`}
              loading={loading}
            />
          </section>

          {/* ── Attention callouts ───────────────────────────── */}
          {!loading && callouts.length > 0 && (
            <section aria-label="Budget alerts" className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="ss-eyebrow flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-warning" />
                  Needs attention
                </h2>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {overCount} over · {callouts.length - overCount} approaching
                </span>
              </div>
              <ul className="stagger grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {callouts.map((c) => {
                  const over = c.pct >= 100;
                  return (
                    <li
                      key={c.key}
                      className={cn(
                        "ss-card relative overflow-hidden p-3.5 pl-4",
                        "before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
                        over ? "before:bg-destructive" : "before:bg-warning",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">{c.name}</p>
                          <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">{c.kind}</p>
                        </div>
                        <StatusPill status={over ? "Over budget" : "At Risk"} tone={over ? "destructive" : "warning"} />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Meter value={c.pct} tone={over ? "destructive" : "warning"} className="flex-1" />
                        <span className={cn("font-mono text-xs font-medium tabular-nums", riskText(c.pct))}>{c.pct}%</span>
                      </div>
                      <p className="mt-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {fmt(c.spent)} of {fmt(c.budget)}
                        <span className={cn("ml-2", over ? "text-destructive" : "text-foreground/80")}>
                          {over ? `${fmt(c.spent - c.budget)} over` : `${fmt(c.budget - c.spent)} left`}
                        </span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* ── Budget vs actual + forecast ──────────────────── */}
          <section className="grid grid-cols-1 items-start gap-3 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              eyebrow="Budget vs actual"
              title="Spend by cost category"
              actions={
                <div className="hidden items-center gap-3 sm:flex">
                  <LegendDot className="bg-success">&lt; 80%</LegendDot>
                  <LegendDot className="bg-warning">80–99%</LegendDot>
                  <LegendDot className="bg-destructive">Over</LegendDot>
                </div>
              }
            >
              {loading ? (
                <div className="space-y-4">{[0, 1, 2, 3, 4].map((i) => <Shimmer key={i} className="h-8 w-full" />)}</div>
              ) : categoryData.length === 0 ? (
                <EmptyState
                  compact
                  icon={Wallet}
                  title="No budget lines"
                  description="Project-level spend is shown below. Add budget lines to compare spend by category."
                  action={<Button size="sm" variant="outline" asChild><Link to="/ops/budgets"><Plus />Add budget line</Link></Button>}
                />
              ) : (
                <div className="space-y-1">
                  <div className="hidden grid-cols-[150px_minmax(0,1fr)_150px_96px] gap-4 pb-1 sm:grid">
                    {["Category", "Spent / allocated", "Actual", "Remaining"].map((h, i) => (
                      <span key={h} className={cn("ss-eyebrow text-[9.5px]", i >= 2 && "text-right")}>{h}</span>
                    ))}
                  </div>
                  {categoryData.map((c) => {
                    const trackW = (c.allocated / maxAllocated) * 100;
                    const fillW = c.allocated > 0 ? Math.min(c.spent / c.allocated, 1) * 100 : 0;
                    const overW = c.spent > c.allocated ? ((c.spent - c.allocated) / maxAllocated) * 100 : 0;
                    return (
                      <div
                        key={c.category}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-lg px-2 py-2.5 -mx-2 transition-colors hover:bg-surface-2/50 sm:grid-cols-[150px_minmax(0,1fr)_150px_96px]"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[13px] font-medium">{c.category}</span>
                        </div>
                        <span className={cn("text-right font-mono text-xs font-medium tabular-nums sm:hidden", riskText(c.pct))}>{c.pct}%</span>
                        {/* bullet bar */}
                        <div
                          className="col-span-2 flex h-3 items-center sm:col-span-1"
                          role="img"
                          aria-label={`${c.category}: ${fmt(c.spent)} of ${fmt(c.allocated)} (${c.pct}%)`}
                        >
                          <div className="relative h-3 rounded-[3px] bg-secondary" style={{ width: `${trackW}%` }}>
                            <div
                              className={cn("absolute inset-y-0 left-0 rounded-[3px] transition-[width] duration-700 ease-out-expo", riskBg(c.pct))}
                              style={{ width: `${fillW}%` }}
                            />
                            {/* 80% threshold tick */}
                            <span className="absolute -inset-y-0.5 left-[80%] w-px bg-foreground/25" aria-hidden />
                          </div>
                          {overW > 0 && (
                            <div
                              className="h-3 rounded-r-[3px] bg-destructive/70 [background-image:repeating-linear-gradient(135deg,transparent_0_3px,hsl(var(--background)/0.35)_3px_5px)]"
                              style={{ width: `${overW}%` }}
                            />
                          )}
                        </div>
                        <div className="text-left font-mono text-[11px] tabular-nums text-muted-foreground sm:text-right">
                          <span className="text-foreground">{fmt(c.spent)}</span> / {fmt(c.allocated)}
                          <span className={cn("ml-2 hidden font-medium sm:inline", riskText(c.pct))}>{c.pct}%</span>
                        </div>
                        <div className={cn("text-right font-mono text-[11px] font-medium tabular-nums", c.remaining < 0 ? "text-destructive" : "text-muted-foreground")}>
                          {c.remaining >= 0 ? fmt(c.remaining) : `${fmt(Math.abs(c.remaining))} over`}
                        </div>
                      </div>
                    );
                  })}
                  <p className="pt-2 text-[11px] text-muted-foreground">
                    Bars are drawn to scale against the largest line. The hairline marks the 80% early-warning threshold.
                  </p>
                </div>
              )}
            </Panel>

            <Panel glow eyebrow="Forecast" title="Cost at completion">
              {loading ? (
                <BlockSkeleton className="h-56" />
              ) : (
                <div className="space-y-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="font-mono text-[32px] font-medium leading-none tracking-[-0.03em] tabular-nums">{fmt(costAtCompletion)}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">Projected final cost</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-mono text-sm font-medium tabular-nums", forecastVariance > 0 ? "text-destructive" : "text-success")}>
                        {forecastVariance >= 0 ? "+" : ""}{fmt(forecastVariance)}
                      </p>
                      <p className="text-xs text-muted-foreground">vs. budget</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><Gauge className="h-3.5 w-3.5" />Utilisation</span>
                      <span className={cn("font-mono font-medium tabular-nums", riskText(overallPct))}>{overallPct}%</span>
                    </div>
                    <Meter value={overallPct} risk />
                    <div className="flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
                      <span>{fmt(totalSpent)} spent</span>
                      <span>{fmt(totalAllocated)} allocated</span>
                    </div>
                  </div>

                  {/* Exposure bridge */}
                  <div className="space-y-2 border-t pt-4">
                    <p className="ss-eyebrow">Exposure bridge</p>
                    <ol className="space-y-2.5">
                      {bridge.map((s) => (
                        <li key={s.label} className="space-y-1">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="min-w-0 truncate text-muted-foreground">{s.label}</span>
                            <span className="font-mono tabular-nums">
                              {!s.total && s.value >= 0 ? "+" : ""}{fmt(s.value)}
                            </span>
                          </div>
                          {!s.total && (
                            <div className="h-1.5 rounded-full bg-secondary">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-[width] duration-700 ease-out-expo",
                                  s.value < 0 ? "bg-success" : s.tone === "warning" ? "bg-warning" : "bg-primary",
                                )}
                                style={{ width: `${(Math.abs(s.value) / maxDelta) * 100}%` }}
                              />
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-surface-2/50 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />Total exposure
                      </span>
                      <span className="font-mono text-sm font-medium tabular-nums">
                        {fmt(exposure)}
                        {totalAllocated > 0 && (
                          <span className="ml-1.5 text-[11px] text-muted-foreground">
                            {exposure >= totalAllocated ? "+" : ""}{(((exposure - totalAllocated) / totalAllocated) * 100).toFixed(1)}%
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Panel>
          </section>

          {/* ── Project utilisation ─────────────────────────── */}
          {(loading || projectData.length > 0) && (
            <Panel
              eyebrow="Portfolio"
              title="Budget utilisation by project"
              actions={
                <div className="hidden items-center gap-3 sm:flex">
                  <LegendDot className="bg-success">Under 80%</LegendDot>
                  <LegendDot className="bg-warning">80–99%</LegendDot>
                  <LegendDot className="bg-destructive">100%+</LegendDot>
                </div>
              }
            >
              {loading ? (
                <BlockSkeleton className="h-[260px]" />
              ) : (
                <div className="w-full" style={{ height: Math.max(180, projectData.length * 34 + 30) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectData} layout="vertical" margin={{ left: 0, right: 40, top: 4, bottom: 0 }} barCategoryGap={8}>
                      <CartesianGrid {...gridProps} vertical horizontal={false} />
                      <XAxis
                        type="number"
                        {...axisProps}
                        tickFormatter={(v) => `${v}%`}
                        domain={[0, Math.max(120, ...projectData.map((d) => d.pct))]}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        {...axisProps}
                        tick={{ ...axisProps.tick, fontFamily: "inherit", fill: "hsl(var(--foreground))", width: 400 }}
                        width={136}
                      />
                      <ReferenceLine x={80} stroke={CHART.warning} strokeDasharray="3 3" strokeOpacity={0.6} />
                      <ReferenceLine x={100} stroke={CHART.destructive} strokeDasharray="3 3" strokeOpacity={0.8} />
                      <Tooltip
                        {...tooltipProps}
                        formatter={(v: number, _n, item) => {
                          const d = item?.payload as (typeof projectData)[number] | undefined;
                          return [`${v}% · ${d ? `${fmt(d.spent)} of ${fmt(d.budget)}` : ""}`, "Utilisation"];
                        }}
                        labelFormatter={(_l, p) => (p?.[0]?.payload as (typeof projectData)[number] | undefined)?.fullName ?? _l}
                      />
                      <Bar
                        dataKey="pct"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={18}
                        label={{ position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "Geist Mono, ui-monospace, monospace", formatter: (v: number) => `${v}%` }}
                      >
                        {projectData.map((entry, i) => (
                          <Cell key={i} fill={riskFill(entry.pct)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
