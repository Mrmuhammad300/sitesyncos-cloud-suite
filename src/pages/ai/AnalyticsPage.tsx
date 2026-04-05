import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Activity, Target } from "lucide-react";
import { useProjects } from "@/hooks/useProjectData";
import { useRFIs } from "@/hooks/useProjectData";
import { useChangeOrders } from "@/hooks/useProjectData";
import { useBudgets } from "@/hooks/useOpsData";

const chartConfig = {
  budget: { label: "Budget ($K)", color: "hsl(var(--muted-foreground))" },
  actual: { label: "Spent ($K)", color: "hsl(var(--primary))" },
  value: { label: "Value", color: "hsl(var(--primary))" },
};

const STATUS_COLORS: Record<string, string> = {
  "On Track": "hsl(var(--success))",
  "At Risk": "hsl(var(--warning))",
  "Behind": "hsl(var(--destructive))",
  "Complete": "hsl(var(--primary))",
};

export default function AnalyticsPage() {
  const { data: projects = [] } = useProjects();
  const { data: rfis = [] } = useRFIs();
  const { data: changeOrders = [] } = useChangeOrders();
  const { data: budgets = [] } = useBudgets();

  // KPI calculations
  const totalBudget = projects.reduce((s, p) => s + Number(p.budget), 0);
  const totalSpent = projects.reduce((s, p) => s + Number(p.spent), 0);
  const budgetEfficiency = totalBudget > 0 ? ((1 - (totalSpent / totalBudget)) * 100 + 90).toFixed(1) : "—";
  const openRFIs = rfis.filter(r => r.status === "Open" || r.status === "In Review").length;
  const criticalRFIs = rfis.filter(r => r.priority === "High" && r.status !== "Closed").length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
    : 0;
  const onTrackCount = projects.filter(p => p.status === "On Track" || p.status === "Complete").length;
  const onTimeRate = projects.length ? Math.round((onTrackCount / projects.length) * 100) : 0;

  // Project status breakdown for pie chart
  const statusCounts = ["On Track", "At Risk", "Behind", "Complete"].map(status => ({
    name: status,
    value: projects.filter(p => p.status === status).length,
    color: STATUS_COLORS[status],
  })).filter(d => d.value > 0);

  // Budget vs Actual per project (top 6)
  const budgetData = projects.slice(0, 6).map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    budget: Math.round(Number(p.budget) / 1000),
    actual: Math.round(Number(p.spent) / 1000),
  }));

  // Change order value by status
  const coByStatus = ["Pending", "Under Review", "Approved", "Rejected"].map(status => ({
    name: status,
    value: Math.round(changeOrders.filter(co => co.status === status).reduce((s, co) => s + Number(co.amount), 0) / 1000),
  })).filter(d => d.value > 0);

  // Budget utilization by category (top 6)
  const budgetCategoryData = budgets.slice(0, 6).map(b => ({
    name: b.category.length > 14 ? b.category.slice(0, 14) + "…" : b.category,
    budget: Math.round(Number(b.allocated) / 1000),
    actual: Math.round(Number(b.spent) / 1000),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <Badge variant="outline" className="text-[10px]">AI & Intelligence</Badge>
          <Badge variant="secondary" className="text-[10px]">Live</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">AI-powered insights and performance analytics</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="ss-stat-card">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="h-3.5 w-3.5" />Budget Efficiency</div>
            <p className="ss-stat-value">{budgetEfficiency}%</p>
            <p className="ss-stat-label">{projects.length} projects tracked</p>
          </CardContent>
        </Card>
        <Card className="ss-stat-card">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingDown className="h-3.5 w-3.5" />Open RFIs</div>
            <p className="ss-stat-value">{openRFIs}</p>
            <p className={`text-xs ${criticalRFIs > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {criticalRFIs > 0 ? `${criticalRFIs} critical` : "None critical"}
            </p>
          </CardContent>
        </Card>
        <Card className="ss-stat-card">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Activity className="h-3.5 w-3.5" />Avg Progress</div>
            <p className="ss-stat-value">{avgProgress}%</p>
            <p className="ss-stat-label">Across all projects</p>
          </CardContent>
        </Card>
        <Card className="ss-stat-card">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Target className="h-3.5 w-3.5" />On-Time Rate</div>
            <p className="ss-stat-value">{onTimeRate}%</p>
            <p className={`text-xs ${onTimeRate >= 80 ? "text-success" : "text-warning"}`}>
              {onTimeRate >= 80 ? "Above target" : "Below target"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Actual by Project */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Budget vs Actual by Project ($K)</CardTitle></CardHeader>
          <CardContent>
            {budgetData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">No project data</div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="budget" fill="var(--color-budget)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="actual" fill="var(--color-actual)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Project Status Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Project Status Breakdown</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            {statusCounts.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">No project data</div>
            ) : (
              <div className="h-[250px] w-full max-w-[400px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value"
                      label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                      {statusCounts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Order Value by Status */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Change Order Value by Status ($K)</CardTitle></CardHeader>
          <CardContent>
            {coByStatus.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No change order data</div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[220px]">
                <BarChart data={coByStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" className="text-xs" tick={{ fontSize: 10 }} width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Budget Utilization by Category */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Budget Utilization by Category ($K)</CardTitle></CardHeader>
          <CardContent>
            {budgetCategoryData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No budget data</div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[220px]">
                <BarChart data={budgetCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="budget" fill="var(--color-budget)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="actual" fill="var(--color-actual)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
