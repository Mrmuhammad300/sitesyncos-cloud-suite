import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Building2, DollarSign, HardHat, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, ArrowUpRight, ArrowDownRight, FileText, Users, Activity, Brain, Sparkles
} from "lucide-react";
import { AiInsightCard } from "@/components/AiInsightCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";

const kpis = [
  { label: "Active Projects", value: "24", change: "+3", trend: "up", icon: HardHat, color: "text-primary" },
  { label: "Total Portfolio", value: "$142.8M", change: "+12.4%", trend: "up", icon: Building2, color: "text-success" },
  { label: "Open RFIs", value: "47", change: "-8", trend: "down", icon: FileText, color: "text-warning" },
  { label: "Monthly Spend", value: "$3.2M", change: "+5.1%", trend: "up", icon: DollarSign, color: "text-accent" },
];

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

const projectStatus = [
  { name: "On Track", value: 14, color: "hsl(142, 76%, 36%)" },
  { name: "At Risk", value: 6, color: "hsl(38, 92%, 50%)" },
  { name: "Behind", value: 3, color: "hsl(0, 84%, 60%)" },
  { name: "Complete", value: 1, color: "hsl(221, 83%, 53%)" },
];

const activeProjects = [
  { name: "Skyline Tower Phase II", status: "On Track", progress: 72, budget: "$24.5M", manager: "Sarah Chen" },
  { name: "Harbor View Residences", status: "At Risk", progress: 45, budget: "$18.2M", manager: "Mike Torres" },
  { name: "Metro Center Retrofit", status: "On Track", progress: 88, budget: "$8.7M", manager: "Lisa Park" },
  { name: "Greenfield Industrial", status: "Behind", progress: 31, budget: "$42.1M", manager: "James Wilson" },
  { name: "Oak Creek Mixed-Use", status: "On Track", progress: 56, budget: "$15.8M", manager: "Amy Rodriguez" },
];

const activityFeed = [
  { action: "RFI #2847 submitted", project: "Skyline Tower", user: "John Davis", time: "12 min ago", type: "rfi" },
  { action: "Change Order approved", project: "Harbor View", user: "Sarah Chen", time: "38 min ago", type: "change" },
  { action: "Daily report filed", project: "Metro Center", user: "Mike Torres", time: "1 hr ago", type: "report" },
  { action: "Draw Request #12 submitted", project: "Greenfield", user: "Lisa Park", time: "2 hrs ago", type: "draw" },
  { action: "Punch list item closed", project: "Oak Creek", user: "Amy Rodriguez", time: "3 hrs ago", type: "punch" },
  { action: "AI risk alert generated", project: "Skyline Tower", user: "System", time: "4 hrs ago", type: "ai" },
];

const statusColor: Record<string, string> = {
  "On Track": "bg-success/10 text-success border-success/20",
  "At Risk": "bg-warning/10 text-warning border-warning/20",
  "Behind": "bg-destructive/10 text-destructive border-destructive/20",
  "Complete": "bg-primary/10 text-primary border-primary/20",
};

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back, John. Here's your portfolio overview.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1.5" />
            Export
          </Button>
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
                <span className="text-2xl font-bold">{kpi.value}</span>
                <span className={`flex items-center text-xs font-medium ${kpi.trend === "up" ? "text-success" : "text-destructive"}`}>
                  {kpi.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.change}
                </span>
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
            <CardDescription className="text-xs">Distribution of 24 active projects</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={projectStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {projectStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {projectStatus.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Active Projects Table */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Active Projects</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeProjects.map((proj) => (
                <div key={proj.name} className="flex items-center gap-4 py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{proj.name}</p>
                    <p className="text-xs text-muted-foreground">{proj.manager} · {proj.budget}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColor[proj.status]}`}>
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
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityFeed.map((item, i) => (
                <div key={i} className="flex gap-3 py-1.5">
                  <div className="mt-0.5 h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm truncate">
                      <span className="font-medium">{item.action}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{item.project} · {item.user} · {item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
