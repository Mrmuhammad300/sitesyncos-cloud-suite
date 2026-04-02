import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Brain, ShieldCheck, DollarSign, FileSearch, Zap } from "lucide-react";

const agents = [
  { name: "Risk Sentinel", desc: "Monitors project risk factors and triggers early warnings.", icon: ShieldCheck, status: "active", lastRun: "2 min ago" },
  { name: "Cost Optimizer", desc: "Analyzes budgets and recommends cost-saving measures.", icon: DollarSign, status: "active", lastRun: "15 min ago" },
  { name: "Compliance Checker", desc: "Validates documents against regulatory requirements.", icon: FileSearch, status: "idle", lastRun: "1 hour ago" },
  { name: "Schedule Predictor", desc: "Forecasts delays using weather, labor, and supply data.", icon: Brain, status: "active", lastRun: "5 min ago" },
  { name: "Quality Inspector", desc: "Flags quality issues from daily report patterns.", icon: Zap, status: "idle", lastRun: "3 hours ago" },
];

const statusStyle: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  idle: "bg-muted text-muted-foreground",
};

export default function AgentsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">AI Agents</h1>
            <Badge variant="outline" className="text-[10px]">AI & Intelligence</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Multi-agent orchestration for risk, cost, and compliance</p>
        </div>
        <Button size="sm" variant="outline"><Bot className="h-4 w-4 mr-1" />Deploy Agent</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(a => (
          <Card key={a.name} className="group hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <a.icon className="h-5 w-5 text-primary" />
                </div>
                <Badge className={statusStyle[a.status]}>{a.status}</Badge>
              </div>
              <CardTitle className="text-base mt-3">{a.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{a.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Last run: {a.lastRun}</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs">Configure</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
