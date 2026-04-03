import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Building2, DollarSign, HardHat, FileText, ArrowUpRight, ArrowDownRight,
  Activity, Brain, Sparkles
} from "lucide-react";
import { AiInsightCard } from "@/components/AiInsightCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useProjects } from "@/hooks/useProjectData";
import { useRFIs } from "@/hooks/useProjectData";
import { useProperties } from "@/hooks/useVaultData";

const revenueData = [
  { month: "Jul", budget: 2400, actual: 2200 },
  { month: "Aug", budget: 2800, actual: 2900 },
  { month: "Sep", budget: 3200, actual: 2800 },
  { month: "Oct", budget: 3000, actual: 3100 },
  { month: "Nov", budget: 3500, actual: 3400 },
  { month: "Dec", budget: 3800, actual: 3200 },
  { month: "Jan", budget: 4000, actual: 3900 },
  { month: "Feb", budget: 3600, actual: 3800 },
  { month: "Mar", budget: 4200, actual: 4100 },
];

const STATUS_COLORS: Record<string, string> = {
  "On Track": "hsl(142, 76%, 36%)",
  "At Risk": "hsl(38, 92%, 50%)",
  "Behind": "hsl(0, 84%, 60%)",
  "Complete": "hsl(221, 83%, 53%)",
};

const statusBadge: Record<string, string> = {
  "On Track": "bg-success/10 text-success border-success/20",
  "At Risk": "bg-warning/10 text-warning border-warning/20",
  "Behind": "bg-destructive/10 text-destructive border-destructive/20",
  "Complete": "bg-primary/10 text-primary border-primary/20",
};

const fmt = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toLocaleString()}`;

export default function Dashboard() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: rfis = [] } = useRFIs();
  const { data: properties = [] } = useProperties();

  const activeProjects = projects.filter(p => p.status !== "Complete");
  const portfolioValue = properties.reduce((s, p) => s + Number(p.price), 0);
  const openRFIs = rfis.filter(r => r.status !== "Closed").length;
  const monthlySpend = activeProjects.reduce((s, p) => s + Number(p.spent), 0);

  const statusCounts = ["On Track", "At Risk", "Behind", "Complete"].map(name => ({
    name,
    value: projects.filter(p => p.status === name).length,
    color: STATUS_COLORS[name],
  })).filter(s => s.value > 0);

  const kpis = [
    { label: "Active Projects", value: String(activeProjects.length), icon: HardHat, color: "text-primary" },
    { label: "Total Portfolio", value: fmt(portfolioValue), icon: Building2, color: "text-success" },
    { label: "Open RFIs", value: String(openRFIs), icon: FileText, color: "text-warning" },
    { label: "Total Spend", value: fmt(monthlySpend), icon: DollarSign, color: "text-accent" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your portfolio overview.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm">
            <HardHat className="h-4 w-4 mr-1.5" />
            New Project
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                {projectsLoading
                  ? <div className="h-7 w-16 rounded bg-muted animate-pulse" />
                  : <span className="text-2xl font-bold">{kpi.value}</span>
                }
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Budget vs Actual Spend</CardTitle>
            <CardDescription className="text-xs">Monthly comparison across all projects</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(220,13%,91%)" }} />
                <Area type="monotone" dataKey="budget" stroke="hsl(221, 83%, 53%)" fill="url(#budgetGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="actual" stroke="hsl(262, 83%, 58%)" fill="url(#actualGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Project Status</CardTitle>
            <CardDescription className="text-xs">
              {projects.length > 0 ? `Distribution of ${projects.length} projects` : "No projects yet"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {statusCounts.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {statusCounts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {statusCounts.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name} ({s.value})
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-12">No project data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AiInsightCard
          type="project-health"
          title="Project Health Assessment"
          agentName="Binary Loom"
          icon={<Brain className="h-4 w-4 text-primary" />}
        />
        <AiInsightCard
          type="budget-monitor"
          title="Budget Overrun Monitor"
          agentName="Quantum Ledger"
          icon={<Sparkles className="h-4 w-4 text-accent" />}
        />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Active Projects Table */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Active Projects</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}
              </div>
            ) : activeProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active projects.</p>
            ) : (
              <div className="space-y-3">
                {activeProjects.slice(0, 5).map((proj) => (
                  <div key={proj.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{proj.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {proj.project_manager ?? "—"} · {fmt(Number(proj.budget))}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${statusBadge[proj.status] ?? ""}`}>
                      {proj.status}
                    </Badge>
                    <div className="w-24 shrink-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">{proj.progress}%</span>
                      </div>
                      <Progress value={proj.progress} className="h-1.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RFI Summary */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent RFIs</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {rfis.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No RFIs yet.</p>
            ) : (
              <div className="space-y-3">
                {rfis.slice(0, 6).map((rfi) => (
                  <div key={rfi.id} className="flex gap-3 py-1.5">
                    <div className="mt-0.5 h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{rfi.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {rfi.rfi_number} · {rfi.priority} · {rfi.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
