import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bot, Brain, ShieldCheck, DollarSign, FileSearch, Zap, Activity, Cpu, Play } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

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

// Map agent types to event types understood by the orchestrator
function agentEventType(agent: Agent): string {
  const type = (agent.agent_type ?? "").toLowerCase();
  if (type.includes("risk"))       return "rfi_created";
  if (type.includes("cost"))       return "change_order_created";
  if (type.includes("compliance")) return "compliance_check";
  if (type.includes("schedule"))   return "project_updated";
  if (type.includes("quality"))    return "submittal_submitted";
  return "project_updated";
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
  const qc = useQueryClient();

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

  // Toggle agent active/inactive via orchestrator PATCH
  const toggleAgent = useMutation({
    mutationFn: async ({ agentId, isActive }: { agentId: string; isActive: boolean }) => {
      const { error } = await supabase.functions.invoke("agent-orchestrator/toggle-agent", {
        method: "PATCH",
        body: { agentId, isActive },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_agents"] }),
    onError: (e: Error) => toast.error(`Toggle failed: ${e.message}`),
  });

  // Run a single agent via execute-pipeline
  const runAgent = useMutation({
    mutationFn: async (agent: Agent) => {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator/execute-pipeline", {
        body: { eventType: agentEventType(agent), context: { triggered_by: "manual", agent_id: agent.agent_id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, agent) => {
      toast.success(`Agent "${agent.name}" executed`);
      qc.invalidateQueries({ queryKey: ["agent_executions"] });
    },
    onError: (e: Error) => toast.error(`Execution failed: ${e.message}`),
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
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const active = agents.filter((a) => a.is_active);
            if (!active.length) { toast.info("No active agents to run"); return; }
            active.forEach((a) => runAgent.mutate(a));
          }}
          disabled={runAgent.isPending}
        >
          <Bot className="h-4 w-4 mr-1" />
          {runAgent.isPending ? "Running…" : "Run All Active"}
        </Button>
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
            const isRunning = runAgent.isPending && runAgent.variables?.agent_id === a.agent_id;
            return (
              <Card key={a.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={a.is_active}
                        disabled={toggleAgent.isPending}
                        aria-label={`${a.is_active ? "Deactivate" : "Activate"} ${a.name}`}
                        onCheckedChange={(v) => toggleAgent.mutate({ agentId: a.agent_id, isActive: v })}
                        className="scale-75"
                      />
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
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      disabled={!a.is_active || runAgent.isPending}
                      aria-label={`Run ${a.name}`}
                      onClick={() => runAgent.mutate(a)}
                    >
                      {isRunning ? (
                        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full border border-primary border-t-transparent animate-spin" />Running</span>
                      ) : (
                        <span className="flex items-center gap-1"><Play className="h-3 w-3" />Run</span>
                      )}
                    </Button>
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
