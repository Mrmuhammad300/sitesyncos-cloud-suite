import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { Activity, BarChart3, CircleDollarSign, FileQuestion, FileText, HardHat, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/os";
import { ChartLegend, Shimmer } from "@/components/ai/primitives";
import { useChangeOrders, useProjects, useRFIs } from "@/hooks/useProjectData";
import { useBudgets } from "@/hooks/useOpsData";
import { CHART, STATUS_CHART_COLOR, axisProps, gridProps, tooltipProps } from "@/lib/chart";
import { PROJECT_STATUSES, budgetBurn } from "@/lib/dashboard";
import { fmtDollar } from "@/lib/utils";

const CO_TONE: Record<string, string> = {
  approved: CHART.success,
  pending: CHART.warning,
  "under review": CHART.info,
  "in review": CHART.info,
  rejected: CHART.destructive,
};
const CO_ORDER = ["Pending", "Under Review", "In Review", "Approved", "Rejected"];

const RFI_STATUSES = [
  { key: "Open", color: CHART.warning },
  { key: "Pending", color: CHART.info },
  { key: "In Review", color: CHART.data },
  { key: "Answered", color: CHART.success },
  { key: "Closed", color: CHART.muted },
] as const;
const PRIORITIES = ["High", "Medium", "Low"] as const;

const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const money = (v: number) => fmtDollar(v);

export default function AnalyticsPage() {
  const { data: projects = [], isLoading: pLoading } = useProjects();
  const { data: rfis = [], isLoading: rLoading } = useRFIs();
  const { data: changeOrders = [], isLoading: coLoading } = useChangeOrders();
  const { data: budgets = [], isLoading: bLoading } = useBudgets();

  const m = useMemo(() => {
    // KPI calculations
    const totalBudget = projects.reduce((s, p) => s + Number(p.budget), 0);
    const totalSpent = projects.reduce((s, p) => s + Number(p.spent), 0);
    const consumed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : null;
    const openRFIs = rfis.filter((r) => r.status === "Open" || r.status === "In Review").length;
    const criticalRFIs = rfis.filter((r) => r.priority === "High" && r.status !== "Closed").length;
    const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
    const onTrackCount = projects.filter((p) => p.status === "On Track" || p.status === "Complete").length;
    const onTimeRate = projects.length ? Math.round((onTrackCount / projects.length) * 100) : 0;

    // Project status breakdown
    const statusCounts = PROJECT_STATUSES.map((status) => ({
      name: status,
      value: projects.filter((p) => p.status === status).length,
      color: STATUS_CHART_COLOR[status],
    }));

    // Budget vs actual per project (bullet rows, $M)
    const budgetData = [...projects]
      .sort((a, b) => Number(b.budget) - Number(a.budget))
      .slice(0, 8)
      .map((p) => ({
        name: p.name,
        label: short(p.name, 18),
        budget: Number(p.budget),
        actual: Number(p.spent),
        burn: budgetBurn(p),
      }));

    // Burn vs progress
    const burnData = projects.map((p) => ({
      name: p.name,
      progress: p.progress,
      burn: budgetBurn(p),
      budget: Number(p.budget),
      status: p.status,
    }));
    const ahead = burnData.filter((d) => d.status !== "Complete" && d.burn > d.progress + 5).length;

    // Change order value by status ($)
    const rank = (s: string) => (CO_ORDER.includes(s) ? CO_ORDER.indexOf(s) : CO_ORDER.length);
    const coStatuses = Array.from(new Set(changeOrders.map((co) => co.status))).sort((a, b) => rank(a) - rank(b));
    const coByStatus = coStatuses
      .map((status) => {
        const rows = changeOrders.filter((co) => co.status === status);
        return {
          name: status,
          value: rows.reduce((s, co) => s + Number(co.amount), 0),
          count: rows.length,
          color: CO_TONE[status.toLowerCase()] ?? CHART.muted,
        };
      })
      .filter((d) => d.count > 0);
    const coNet = coByStatus.reduce((s, d) => s + d.value, 0);

    // Budget utilization by category
    const budgetCategoryData = [...budgets]
      .sort((a, b) => Number(b.allocated) - Number(a.allocated))
      .slice(0, 8)
      .map((b) => ({
        name: b.category,
        label: short(b.category, 16),
        budget: Number(b.allocated),
        actual: Number(b.spent),
        util: Number(b.allocated) > 0 ? Math.round((Number(b.spent) / Number(b.allocated)) * 100) : 0,
      }));

    // RFI pipeline: priority × status
    const rfiStack = PRIORITIES.map((priority) => {
      const row: Record<string, number | string> = { priority };
      for (const s of RFI_STATUSES) row[s.key] = rfis.filter((r) => r.priority === priority && r.status === s.key).length;
      return row;
    });
    const rfiStatusesPresent = RFI_STATUSES.filter((s) => rfis.some((r) => r.status === s.key));

    return {
      totalBudget, totalSpent, consumed, openRFIs, criticalRFIs, avgProgress, onTimeRate, statusCounts, budgetData,
      burnData, ahead, coByStatus, coNet, budgetCategoryData, rfiStack, rfiStatusesPresent,
    };
  }, [projects, rfis, changeOrders, budgets]);

  const bulletH = (n: number) => Math.max(n, 1) * 38 + 24;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Portfolio performance across cost, schedule and coordination — computed live from project data."
        actions={
          <>
            <span className="hidden items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-success sm:flex">
              <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-success" />Live
            </span>
            <Button variant="outline" asChild>
              <Link to="/ai-assistant"><Sparkles className="text-mod-ai" />Ask about this</Link>
            </Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Budget consumed"
          value={m.consumed === null ? "—" : `${m.consumed.toFixed(1)}%`}
          icon={CircleDollarSign}
          hint={`${money(m.totalSpent)} of ${money(m.totalBudget)}`}
          tone="data"
          loading={pLoading}
        />
        <StatCard
          label="Open RFIs"
          value={m.openRFIs}
          icon={FileQuestion}
          hint={m.criticalRFIs > 0 ? `${m.criticalRFIs} high priority` : "None critical"}
          tone={m.criticalRFIs > 0 ? "warning" : "default"}
          loading={rLoading}
        />
        <StatCard label="Avg progress" value={`${m.avgProgress}%`} icon={Activity} hint={`${projects.length} projects tracked`} loading={pLoading} />
        <StatCard
          label="On-time rate"
          value={`${m.onTimeRate}%`}
          icon={Target}
          hint={m.onTimeRate >= 80 ? "Above 80% target" : "Below 80% target"}
          tone={projects.length ? (m.onTimeRate >= 80 ? "success" : "warning") : "default"}
          loading={pLoading}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Budget vs actual by project */}
        <Panel
          className="lg:col-span-8"
          eyebrow="Cost"
          title="Budget vs. spent by project"
          actions={<ChartLegend className="hidden sm:flex" items={[{ label: "Budget", color: CHART.grid }, { label: "Spent", color: CHART.data }]} />}
        >
          {pLoading ? <Shimmer className="h-[300px]" /> : m.budgetData.length === 0 ? (
            <EmptyState compact icon={HardHat} title="No projects yet" description="Budgets and spend will chart here once projects exist." />
          ) : (
            <div style={{ height: bulletH(m.budgetData.length) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.budgetData} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }} barGap={-12} barCategoryGap={10}>
                  <CartesianGrid {...gridProps} vertical horizontal={false} />
                  <XAxis type="number" {...axisProps} tickFormatter={(v) => money(v)} />
                  <YAxis type="category" dataKey="label" {...axisProps} width={112} tick={{ ...axisProps.tick, fontFamily: "inherit", fill: "hsl(var(--foreground))" }} />
                  <Tooltip
                    {...tooltipProps}
                    labelFormatter={(_l, p) => p?.[0]?.payload?.name ?? ""}
                    formatter={(v: number, k) => [money(v), k === "budget" ? "Budget" : "Spent"]}
                  />
                  <Bar dataKey="budget" fill={CHART.grid} radius={4} barSize={12} isAnimationActive={false} />
                  <Bar dataKey="actual" fill={CHART.data} radius={4} barSize={12}>
                    <LabelList dataKey="burn" position="right" formatter={(v: number) => `${v}%`} className="fill-muted-foreground font-mono text-[10.5px]" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* Status donut */}
        <Panel className="lg:col-span-4" eyebrow="Schedule" title="Delivery status">
          {pLoading ? <Shimmer className="h-[300px]" /> : projects.length === 0 ? (
            <EmptyState compact icon={BarChart3} title="No status data" description="Project statuses roll up here." />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="relative mx-auto h-[180px] w-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={m.statusCounts.filter((s) => s.value > 0)} dataKey="value" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={3} stroke="none" startAngle={90} endAngle={-270}>
                      {m.statusCounts.filter((s) => s.value > 0).map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip {...tooltipProps} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-3xl font-medium tabular-nums">{projects.length}</span>
                  <span className="ss-eyebrow mt-0.5">Projects</span>
                </div>
              </div>
              <ul className="grid grid-cols-2 gap-2">
                {m.statusCounts.map((s) => (
                  <li key={s.name} className="flex items-center justify-between rounded-lg border bg-surface-2/40 px-2.5 py-2">
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}
                    </span>
                    <span className="font-mono text-sm tabular-nums">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        {/* Burn vs progress */}
        <Panel
          className="lg:col-span-7"
          eyebrow="Earned value"
          title="Spend vs. progress"
          description={projects.length ? (m.ahead ? `${m.ahead} active project${m.ahead === 1 ? " is" : "s are"} spending ahead of progress` : "Spend is tracking progress across active projects") : undefined}
          actions={<ChartLegend className="hidden sm:flex" items={PROJECT_STATUSES.map((s) => ({ label: s, color: STATUS_CHART_COLOR[s], shape: "dot" as const }))} />}
        >
          {pLoading ? <Shimmer className="h-[280px]" /> : m.burnData.length === 0 ? (
            <EmptyState compact icon={Activity} title="Nothing to plot" description="Each project appears as a point: progress against budget burn." />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 12, left: -12, bottom: 4 }}>
                  <CartesianGrid {...gridProps} vertical />
                  <XAxis type="number" dataKey="progress" name="Progress" domain={[0, 100]} unit="%" {...axisProps} />
                  <YAxis type="number" dataKey="burn" name="Budget burn" domain={[0, 110]} unit="%" {...axisProps} width={48} />
                  <ZAxis type="number" dataKey="budget" range={[60, 360]} />
                  <ReferenceLine
                    segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
                    stroke={CHART.muted}
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                    label={{ value: "spend = progress", position: "insideTopLeft", fill: CHART.muted, fontSize: 10.5 }}
                  />
                  <Tooltip
                    {...tooltipProps}
                    cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--border-strong))" }}
                    content={({ active, payload }) => {
                      const d = active && payload?.[0]?.payload;
                      if (!d) return null;
                      return (
                        <div style={tooltipProps.contentStyle}>
                          <p className="mb-1 text-[12px] font-medium">{d.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {d.progress}% complete · {d.burn}% spent · {money(d.budget)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={m.burnData} fillOpacity={0.85}>
                    {m.burnData.map((d) => <Cell key={d.name} fill={STATUS_CHART_COLOR[d.status] ?? CHART.muted} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* RFI pipeline */}
        <Panel
          className="lg:col-span-5"
          eyebrow="Coordination"
          title="RFIs by priority"
          actions={m.rfiStatusesPresent.length ? <ChartLegend className="hidden sm:flex" items={m.rfiStatusesPresent.map((s) => ({ label: s.key, color: s.color }))} /> : undefined}
        >
          {rLoading ? <Shimmer className="h-[280px]" /> : rfis.length === 0 ? (
            <EmptyState compact icon={FileText} title="No RFIs" description="Open and answered RFIs stack here by priority." />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.rfiStack} margin={{ top: 10, right: 4, left: -24, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="priority" {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip {...tooltipProps} />
                  {m.rfiStatusesPresent.map((s, i) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      stackId="rfi"
                      fill={s.color}
                      radius={i === m.rfiStatusesPresent.length - 1 ? [4, 4, 0, 0] : 0}
                      maxBarSize={56}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* Budget by category */}
        <Panel
          className="lg:col-span-7"
          eyebrow="Cost codes"
          title="Budget utilization by category"
          actions={<ChartLegend className="hidden sm:flex" items={[{ label: "Allocated", color: CHART.grid }, { label: "Spent", color: CHART.primary }]} />}
        >
          {bLoading ? <Shimmer className="h-[300px]" /> : m.budgetCategoryData.length === 0 ? (
            <EmptyState compact icon={CircleDollarSign} title="No budget lines" description="Add budget categories in Ops to track utilization." />
          ) : (
            <div style={{ height: bulletH(m.budgetCategoryData.length) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.budgetCategoryData} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }} barGap={-12} barCategoryGap={10}>
                  <CartesianGrid {...gridProps} vertical horizontal={false} />
                  <XAxis type="number" {...axisProps} tickFormatter={(v) => money(v)} />
                  <YAxis type="category" dataKey="label" {...axisProps} width={112} tick={{ ...axisProps.tick, fontFamily: "inherit", fill: "hsl(var(--foreground))" }} />
                  <Tooltip
                    {...tooltipProps}
                    labelFormatter={(_l, p) => p?.[0]?.payload?.name ?? ""}
                    formatter={(v: number, k) => [money(v), k === "budget" ? "Allocated" : "Spent"]}
                  />
                  <Bar dataKey="budget" fill={CHART.grid} radius={4} barSize={12} isAnimationActive={false} />
                  <Bar dataKey="actual" radius={4} barSize={12}>
                    {m.budgetCategoryData.map((d) => (
                      <Cell key={d.name} fill={d.util >= 95 ? CHART.destructive : d.util >= 85 ? CHART.warning : CHART.primary} />
                    ))}
                    <LabelList dataKey="util" position="right" formatter={(v: number) => `${v}%`} className="fill-muted-foreground font-mono text-[10.5px]" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* Change orders */}
        <Panel
          className="lg:col-span-5"
          eyebrow="Change orders"
          title="Value by status"
          actions={changeOrders.length ? (
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">net <span className="text-foreground">{money(m.coNet)}</span></span>
          ) : undefined}
        >
          {coLoading ? <Shimmer className="h-[220px]" /> : m.coByStatus.length === 0 ? (
            <EmptyState compact icon={FileText} title="No change orders" description="Change order exposure by status will appear here." />
          ) : (
            <ul className="space-y-3.5 pt-1">
              {(() => {
                const max = Math.max(...m.coByStatus.map((d) => Math.abs(d.value)), 1);
                return m.coByStatus.map((d) => (
                  <li key={d.name} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-[2px]" style={{ background: d.color }} />
                        {d.name}
                        <span className="font-mono text-[11px] text-muted-foreground">×{d.count}</span>
                      </span>
                      <span className="font-mono tabular-nums">{money(d.value)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full transition-[width] duration-700 ease-out-expo" style={{ width: `${(Math.abs(d.value) / max) * 100}%`, background: d.color }} />
                    </div>
                  </li>
                ));
              })()}
            </ul>
          )}
        </Panel>
      </section>
    </div>
  );
}
