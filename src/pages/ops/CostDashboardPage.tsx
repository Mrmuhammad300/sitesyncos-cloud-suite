import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useBudgets } from "@/hooks/useOpsData";
import { useProjects } from "@/hooks/useProjectData";
import { useChangeOrders } from "@/hooks/useProjectData";

const fmt = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M`
  : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K`
  : `$${v.toLocaleString()}`;

const pct = (spent: number, allocated: number) =>
  allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

const utilizationColor = (p: number) =>
  p >= 100 ? "text-destructive" : p >= 80 ? "text-warning" : "text-success";

const barColor = (p: number) =>
  p >= 100 ? "#ef4444" : p >= 80 ? "#f59e0b" : "#22c55e";

export default function CostDashboardPage() {
  const { data: budgets = [] } = useBudgets();
  const { data: projects = [] } = useProjects();
  const { data: changeOrders = [] } = useChangeOrders();

  // ── Top-level KPIs ──────────────────────────────────────────────────────────
  const totalAllocated = budgets.reduce((s, b) => s + Number(b.allocated), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallPct = pct(totalSpent, totalAllocated);

  // Approved CO value adds to effective budget
  const approvedCOValue = changeOrders
    .filter(co => co.status === "Approved")
    .reduce((s, co) => s + Number(co.amount), 0);
  const pendingCOValue = changeOrders
    .filter(co => ["Pending", "Under Review"].includes(co.status))
    .reduce((s, co) => s + Number(co.amount), 0);

  // ── Budget by category ──────────────────────────────────────────────────────
  const categoryMap: Record<string, { allocated: number; spent: number }> = {};
  budgets.forEach(b => {
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

  // ── Budget by project (using projects table budget/spent) ───────────────────
  const projectData = projects
    .filter(p => p.budget > 0)
    .map(p => ({
      name: p.name.length > 20 ? p.name.slice(0, 18) + "…" : p.name,
      budget: Number(p.budget),
      spent: Number(p.spent),
      pct: pct(Number(p.spent), Number(p.budget)),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  // ── Overrun risk alerts ──────────────────────────────────────────────────────
  const overrunProjects = projects.filter(p =>
    p.budget > 0 && Number(p.spent) / Number(p.budget) >= 0.8
  );
  const overBudgetCategories = categoryData.filter(c => c.pct >= 100);

  // ── Cost-at-completion forecast ──────────────────────────────────────────────
  // Simple: total allocated * (1 + overallPct/100 - 1) if trending over, else stable
  const costAtCompletion = overallPct > 0
    ? totalSpent + (totalRemaining * (overallPct / 100))
    : totalAllocated;
  const forecastVariance = costAtCompletion - totalAllocated;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Cost Dashboard</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Ops</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time budget health, utilization, and cost-at-completion forecast.</p>
        </div>
      </div>

      {/* Overrun alerts */}
      {(overBudgetCategories.length > 0 || overrunProjects.length > 0) && (
        <div className="space-y-2">
          {overBudgetCategories.map(c => (
            <Alert key={c.category} variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>{c.category}</strong> is over budget — spent {fmt(c.spent)} of {fmt(c.allocated)} ({c.pct}%)
              </AlertDescription>
            </Alert>
          ))}
          {overrunProjects.filter(p => pct(Number(p.spent), Number(p.budget)) >= 100).map(p => (
            <Alert key={p.id} variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>{p.name}</strong> is over budget — {pct(Number(p.spent), Number(p.budget))}% spent
              </AlertDescription>
            </Alert>
          ))}
          {overrunProjects.filter(p => { const u = pct(Number(p.spent), Number(p.budget)); return u >= 80 && u < 100; }).map(p => (
            <Alert key={p.id} className="py-2 border-warning/50 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm">
                <strong>{p.name}</strong> is approaching budget limit — {pct(Number(p.spent), Number(p.budget))}% spent
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Budget</p>
            </div>
            <p className="text-xl font-bold">{fmt(totalAllocated)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">+{fmt(approvedCOValue)} approved COs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
            <p className={`text-xl font-bold ${utilizationColor(overallPct)}`}>{fmt(totalSpent)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{overallPct}% of budget</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {totalRemaining >= 0
                ? <CheckCircle2 className="h-4 w-4 text-success" />
                : <AlertTriangle className="h-4 w-4 text-destructive" />}
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
            <p className={`text-xl font-bold ${totalRemaining >= 0 ? "text-success" : "text-destructive"}`}>
              {totalRemaining >= 0 ? fmt(totalRemaining) : `-${fmt(Math.abs(totalRemaining))}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{100 - overallPct}% unspent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Pending COs</p>
            </div>
            <p className="text-xl font-bold text-warning">{fmt(pendingCOValue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{changeOrders.filter(co => ["Pending", "Under Review"].includes(co.status)).length} awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall utilization + forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Overall Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Spent vs. Allocated</span>
              <span className={`font-semibold ${utilizationColor(overallPct)}`}>{overallPct}%</span>
            </div>
            <Progress value={Math.min(overallPct, 100)} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{fmt(totalSpent)} spent</span>
              <span>{fmt(totalAllocated)} allocated</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Cost-at-Completion Forecast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{fmt(costAtCompletion)}</p>
                <p className="text-xs text-muted-foreground">projected final cost</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${forecastVariance > 0 ? "text-destructive" : "text-success"}`}>
                  {forecastVariance >= 0 ? "+" : ""}{fmt(forecastVariance)}
                </p>
                <p className="text-xs text-muted-foreground">vs. budget</p>
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
              <span>Change orders (approved): {fmt(approvedCOValue)}</span>
              <span>Pending: {fmt(pendingCOValue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project utilization chart */}
      {projectData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Budget Utilization by Project</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projectData} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
                <XAxis type="number" tickFormatter={v => `${v}%`} domain={[0, Math.max(120, ...projectData.map(d => d.pct))]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "Utilization"]}
                  labelFormatter={(l) => `Project: ${l}`}
                />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                  {projectData.map((entry, i) => (
                    <Cell key={i} fill={barColor(entry.pct)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-success inline-block" />Under 80%</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-warning inline-block" />80–99% (at risk)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-destructive inline-block" />100%+ (over budget)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget category breakdown */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Budget by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {categoryData.map(cat => (
                <div key={cat.category} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cat.category}</span>
                      {cat.pct >= 100 && <Badge variant="destructive" className="text-[9px] px-1 py-0">Over Budget</Badge>}
                      {cat.pct >= 80 && cat.pct < 100 && <Badge variant="outline" className="text-[9px] px-1 py-0 text-warning border-warning/30">At Risk</Badge>}
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${utilizationColor(cat.pct)}`}>{cat.pct}%</span>
                    </div>
                  </div>
                  <Progress value={Math.min(cat.pct, 100)} className="h-1.5 mb-1.5" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{fmt(cat.spent)} spent</span>
                    <span className={cat.remaining < 0 ? "text-destructive" : ""}>
                      {cat.remaining >= 0 ? fmt(cat.remaining) + " remaining" : fmt(Math.abs(cat.remaining)) + " over"}
                    </span>
                    <span>{fmt(cat.allocated)} budget</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {budgets.length === 0 && projects.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No budget data yet. Add budgets in the Budgets module.</p>
        </div>
      )}
    </div>
  );
}
