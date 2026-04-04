import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bot, Brain, ShieldCheck, DollarSign, FileSearch, Zap, Activity, Cpu } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Agent = Tables<"ai_agents">;

const TYPE_ICON: Record<string, React.ElementType> = {
  risk: ShieldCheck,
  cost: DollarSign,
  compliance: FileSearch,
  schedule: Brain,
  quality: Zap,
  monitoring: Activity,
};

function agentIcon(agent: Agent): React.ElementType {
  const key = Object.keys(TYPE_ICON).find(
    (k) => agent.agent_type?.toLowerCase().includes(k) || agent.name?.toLowerCase().includes(k)
  );
  return key ? TYPE_ICON[key] : Cpu;
}

const AUTONOMY_STYLE: Record<string, string> = {
  FullAuto: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  AutoWithAudit: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  DraftWithApproval: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  AdvisoryOnly: "bg-muted text-muted-foreground",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AgentsPage() {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["ai_agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_agents").select("*").order("name");
      if (error) throw error;
      return data as Agent[];
    },
  });

  const { data: executions = [] } = useQuery({
    queryKey: ["agent_executions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_executions")
        .select("agent_id, created_at, status")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  // Build last-run map: agent_id → most recent created_at
  const lastRunMap = executions.reduce<Record<string, string>>((acc, e) => {
    if (!acc[e.agent_id]) acc[e.agent_id] = e.created_at;
    return acc;
  }, {});

  const activeCount = agents.filter((a) => a.is_active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">AI Agents</h1>
            <Badge variant="outline" className="text-[10px]">AI & Intelligence</Badge>
            {!isLoading && (
              <Badge variant="secondary" className="text-[10px]">
                {activeCount}/{agents.length} Active
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Multi-agent orchestration for risk, cost, and compliance</p>
        </div>
        <Button size="sm" variant="outline"><Bot className="h-4 w-4 mr-1" />Deploy Agent</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-lg bg-muted mb-3" />
                <div className="h-4 w-32 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-3 w-full bg-muted rounded mb-2" />
                <div className="h-3 w-3/4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No agents configured yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => {
            const Icon = agentIcon(a);
            const lastRun = lastRunMap[a.agent_id];
            return (
              <Card key={a.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={a.is_active} disabled className="scale-75" />
                      <Badge
                        className={a.is_active
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-muted text-muted-foreground"}
                      >
                        {a.is_active ? "active" : "idle"}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-base mt-3">{a.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{a.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    <Badge className={AUTONOMY_STYLE[a.autonomy_level] ?? "bg-muted text-muted-foreground"} variant="outline">
                      {a.autonomy_level}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{a.agent_type}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Last run: {lastRun ? timeAgo(lastRun) : "never"}
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs">Configure</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
