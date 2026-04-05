import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fmtDollar } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Building2, DollarSign, HardHat, FileText, Activity, Brain, Sparkles,
  Settings, Shield, TrendingUp, CheckCircle2, ArrowUpRight
} from "lucide-react";
import { AiInsightCard } from "@/components/AiInsightCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useProjects } from "@/hooks/useProjectData";
import { useRFIs } from "@/hooks/useProjectData";
import { useProperties } from "@/hooks/useVaultData";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

function buildCostData(projects: Project[]) {
  const months: { key: string; month: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      month: d.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  const buckets: Record<string, number> = {};
  months.forEach((m) => { buckets[m.key] = 0; });
  projects.forEach((p) => {
    const raw = p.start_date ?? p.created_at;
    const key = raw.slice(0, 7);
    if (buckets[key] !== undefined) {
      buckets[key] += Number(p.spent) / 1e6;
    }
  });
  return months.map((m) => ({
    month: m.month,
    spend: Math.round(buckets[m.key] * 10) / 10,
  }));
}

const STATUS_COLORS: Record<string, string> = {
  "On Track": "hsl(160, 84%, 39%)",
  "At Risk": "hsl(38, 92%, 50%)",
  "Behind": "hsl(0, 84%, 60%)",
  "Complete": "hsl(217, 91%, 60%)",
};

const statusBadgeClass: Record<string, string> = {
  "On Track": "badge-complete",
  "At Risk": "badge-progress",
  "Behind": "badge-overdue",
  "Complete": "badge-active",
};

const fmt = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toLocaleString()}`;

export default function Dashboard() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: rfis = [] } = useRFIs();
  const { data: properties = [] } = useProperties();
  const navigate = useNavigate();

  const costData = buildCostData(projects);
  const activeProjects = projects.filter(p => p.status !== "Complete");
  const portfolioValue = properties.reduce((s, p) => s + Number(p.price), 0);
  const openRFIs = rfis.filter(r => r.status !== "Closed").length;
  const totalSpend = projects.reduce((s, p) => s + Number(p.spent), 0);
  const onTimeRate = projects.length > 0
    ? Math.round((projects.filter(p => p.status === "On Track" || p.status === "Complete").length / projects.length) * 100)
    : 98;

  const statusCounts = ["On Track", "At Risk", "Behind", "Complete"].map(name => ({
    name,
    value: projects.filter(p => p.status === name).length,
    color: STATUS_COLORS[name],
  })).filter(s => s.value > 0);

  const modules = [
    { icon: HardHat, label: "BUILD", sub: "Project Delivery", href: "/build/projects", color: "text-warning" },
    { icon: Settings, label: "OPS", sub: "Asset Management", href: "/ops/cost-dashboard", color: "text-primary" },
    { icon: Shield, label: "VAULT", sub: "Investment Intelligence", href: "/vault/properties", color: "text-primary" },
  ];

  const kpis = [
    { label: "Active Projects", value: projectsLoading ? "—" : `${activeProjects.length}`, icon: HardHat, trend: "+2" },
    { label: "AUM", value: projectsLoading ? "—" : fmt(portfolioValue), icon: DollarSign, trend: null },
    { label: "On-Time Delivery", value: `${onTimeRate}%`, icon: CheckCircle2, trend: null },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Build. Operate. Own.</p>
        </div>
        <Button size="sm" onClick={() => navigate("/build/projects")}
                style={{ background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(217 91% 50%))" }}>
          <HardHat className="h-4 w-4 mr-1.5" /> New Project
        </Button>
      </div>

      {/* Module Cards — matching video's BUILD / OPS / VAULT row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {modules.map((m) => (
          <div key={m.label}
               className="ss-module-card"
               onClick={() => navigate(m.href)}>
            <div className="ss-module-icon">
              <m.icon className={`h-7 w-7 ${m.color}`} />
            </div>
            <span className="text-sm font-bold tracking-widest">{m.label}</span>
            <span className="text-[10px] text-muted-foreground">{m.sub}</span>
          </div>
        ))}
      </div>

      {/* KPI stat row — matching video's 500+ / $2.4B / 98% row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="ss-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="ss-stat-label">{kpi.label}</span>
              <kpi.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="ss-stat-value">{kpi.value}</span>
              {kpi.trend && (
                <span className="text-xs text-success flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" />{kpi.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row — Cost Trends bar chart + AI Agents panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="ss-card lg:col-span-2 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Cost Trends & Schedule Variance
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215 20% 65%)" }} stroke="hsl(217 33% 17%)" />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215 20% 65%)" }} stroke="hsl(217 33% 17%)" tickFormatter={(v) => `$${v}M`} />
              <Tooltip
                contentStyle={{
                  fontSize: 12, borderRadius: 8,
                  background: "hsl(222 41% 10%)", border: "1px solid hsl(217 91% 60% / 0.2)",
                  color: "hsl(213 31% 91%)"
                }}
                formatter={(value: number) => [`$${value}M`, "Spend"]}
              />
              <Bar dataKey="spend" fill="hsl(217 91% 60%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Agents panel — matching video */}
        <div className="ss-card-glow p-5 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">AI Agents</h3>
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 animate-glow-pulse">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Generating weekly report...</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Binary Loom · Processing</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium">Flagging {openRFIs} overdue RFIs...</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Quantum Ledger · Alert</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full border-primary/20 text-primary hover:bg-primary/10"
                  onClick={() => navigate("/ai/agents")}>
            View All Agents
          </Button>
        </div>
      </div>

      {/* AI Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AiInsightCard type="project-health" title="Project Health Assessment" agentName="Binary Loom"
                       icon={<Brain className="h-4 w-4 text-primary" />} />
        <AiInsightCard type="budget-monitor" title="Budget Overrun Monitor" agentName="Quantum Ledger"
                       icon={<Sparkles className="h-4 w-4 text-accent" />} />
      </div>

      {/* Bottom Row — Active Projects + RFI Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="ss-card lg:col-span-3 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Active Projects</h3>
          {projectsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 rounded bg-secondary animate-pulse" />)}
            </div>
          ) : activeProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active projects.</p>
          ) : (
            <div className="space-y-2">
              {activeProjects.slice(0, 5).map((proj) => (
                <div key={proj.id} className="flex items-center gap-4 py-2.5 px-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{proj.name}</p>
                    <p className="text-xs text-muted-foreground">{proj.project_manager ?? "—"} · {fmt(Number(proj.budget))}</p>
                  </div>
                  <span className={statusBadgeClass[proj.status] ?? "badge-closed"}>{proj.status}</span>
                  <div className="w-20 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">{proj.progress}%</span>
                    </div>
                    <Progress value={proj.progress} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RFI Tracker — matching video panel */}
        <div className="ss-card lg:col-span-2 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">RFI Tracker</h3>
          {rfis.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No RFIs yet.</p>
          ) : (
            <div className="space-y-2">
              {rfis.slice(0, 6).map((rfi) => (
                <div key={rfi.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-secondary/20">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{rfi.rfi_number}: {rfi.subject}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {rfi.status === "Answered" ? "Answered" : `Due: ${rfi.due_date ?? "—"}`}
                    </p>
                  </div>
                  <span className={
                    rfi.status === "Answered" ? "badge-complete" :
                    rfi.status === "Open" ? "badge-progress" :
                    rfi.status === "Closed" ? "badge-closed" : "badge-overdue"
                  }>
                    {rfi.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
