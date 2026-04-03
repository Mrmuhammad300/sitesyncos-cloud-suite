import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Activity, ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle, Brain, Zap } from "lucide-react";
import { toast } from "sonner";

const autonomyColor: Record<string, string> = {
  FullAuto: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  AutoWithAudit: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  DraftWithApproval: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  AdvisoryOnly: "bg-muted text-muted-foreground",
};

const statusIcon: Record<string, React.ReactNode> = {
  Completed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  Failed: <XCircle className="h-4 w-4 text-destructive" />,
  Pending: <Clock className="h-4 w-4 text-amber-500" />,
  Running: <Activity className="h-4 w-4 text-blue-500 animate-pulse" />,
};

export default function AIAssistantPage() {
  const queryClient = useQueryClient();
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});

  const { data: agents } = useQuery({
    queryKey: ["ai_agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_agents").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: executions } = useQuery({
    queryKey: ["agent_executions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_executions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: decisions } = useQuery({
    queryKey: ["agent_decisions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_decisions").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: learningSignals } = useQuery({
    queryKey: ["agent_learning_signals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_learning_signals").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const pendingApprovals = executions?.filter((e) => e.requires_approval && e.approval_status !== "approved" && e.approval_status !== "rejected") ?? [];

  const approvalMutation = useMutation({
    mutationFn: async ({ id, status, feedback }: { id: string; status: "approved" | "rejected"; feedback?: string }) => {
      const { error } = await supabase
        .from("agent_executions")
        .update({ approval_status: status, approval_feedback: feedback ?? null })
        .eq("id", id);
      if (error) throw error;

      const exec = executions?.find((e) => e.id === id);
      if (exec) {
        const { error: sigError } = await supabase.from("agent_learning_signals").insert({
          execution_id: exec.execution_id,
          agent_id: exec.agent_id,
          signal_type: "approval",
          is_positive: status === "approved",
          feedback: feedback ?? null,
        });
        if (sigError) console.error("Learning signal error:", sigError);
      }
    },
    onSuccess: () => {
      toast.success("Decision recorded");
      queryClient.invalidateQueries({ queryKey: ["agent_executions"] });
      queryClient.invalidateQueries({ queryKey: ["agent_learning_signals"] });
    },
  });

  const activeCount = agents?.filter((a) => a.is_active).length ?? 0;
  const completedCount = executions?.filter((e) => e.status === "Completed").length ?? 0;
  const avgConfidence = executions?.length
    ? (executions.reduce((s, e) => s + (Number(e.confidence_score) || 0), 0) / executions.length * 100).toFixed(0)
    : "0";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> AI Command Center
          </h1>
          <p className="text-sm text-muted-foreground">Agent orchestration, Binary Loom decisions & learning feedback</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Active Agents</p>
          <p className="text-2xl font-bold">{activeCount}<span className="text-sm font-normal text-muted-foreground">/{agents?.length ?? 0}</span></p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Executions</p>
          <p className="text-2xl font-bold">{completedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Avg Confidence</p>
          <p className="text-2xl font-bold">{avgConfidence}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Pending Approvals</p>
          <p className="text-2xl font-bold text-amber-500">{pendingApprovals.length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">Agents ({agents?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="binary-loom">Binary Loom</TabsTrigger>
          <TabsTrigger value="approvals">Approvals ({pendingApprovals.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
        </TabsList>

        {/* TAB: Agent Grid */}
        <TabsContent value="agents">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {agents?.map((a) => (
              <Card key={a.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm">{a.name}</CardTitle>
                    <Switch checked={a.is_active} disabled className="scale-75" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={autonomyColor[a.autonomy_level] ?? "bg-muted text-muted-foreground"} variant="outline">
                      {a.autonomy_level}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{a.agent_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB: Binary Loom */}
        <TabsContent value="binary-loom">
          <BinaryLoomTab decisions={decisions ?? []} />
        </TabsContent>

        {/* TAB: Approvals */}
        <TabsContent value="approvals">
          {pendingApprovals.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No pending approvals</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((exec) => (
                <Card key={exec.id}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{exec.agent_id} — {exec.event_type}</p>
                        <p className="text-xs text-muted-foreground">{exec.reasoning}</p>
                        {exec.risk_flags && exec.risk_flags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {exec.risk_flags.map((f, i) => (
                              <Badge key={i} variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />{f}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline">{(Number(exec.confidence_score) * 100).toFixed(0)}%</Badge>
                    </div>
                    <Textarea
                      placeholder="Feedback (optional)..."
                      className="h-16 text-xs"
                      value={feedbackText[exec.id] ?? ""}
                      onChange={(e) => setFeedbackText((p) => ({ ...p, [exec.id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approvalMutation.mutate({ id: exec.id, status: "approved", feedback: feedbackText[exec.id] })}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => approvalMutation.mutate({ id: exec.id, status: "rejected", feedback: feedbackText[exec.id] })}>
                        <XCircle className="h-4 w-4 mr-1" />Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: History */}
        <TabsContent value="history">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{statusIcon[e.status] ?? e.status}</TableCell>
                  <TableCell className="font-medium text-xs">{e.agent_id}</TableCell>
                  <TableCell className="text-xs">{e.event_type}</TableCell>
                  <TableCell><Badge variant="outline">{(Number(e.confidence_score) * 100).toFixed(0)}%</Badge></TableCell>
                  <TableCell className="text-xs">{e.duration_ms ? `${e.duration_ms}ms` : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* TAB: Learning */}
        <TabsContent value="learning">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground">Positive Signals</p>
                <p className="text-2xl font-bold text-emerald-500">{learningSignals?.filter((s) => s.is_positive).length ?? 0}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground">Negative Signals</p>
                <p className="text-2xl font-bold text-destructive">{learningSignals?.filter((s) => !s.is_positive).length ?? 0}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground">Approval Rate</p>
                <p className="text-2xl font-bold">
                  {learningSignals?.length
                    ? ((learningSignals.filter((s) => s.is_positive).length / learningSignals.length) * 100).toFixed(0)
                    : 0}%
                </p>
              </CardContent></Card>
            </div>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Agent</TableHead><TableHead>Type</TableHead><TableHead>Result</TableHead><TableHead>Feedback</TableHead><TableHead>Time</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {learningSignals?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-xs">{s.agent_id}</TableCell>
                    <TableCell className="text-xs">{s.signal_type}</TableCell>
                    <TableCell>{s.is_positive ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{s.feedback ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Binary Loom Sub-component ─── */
function BinaryLoomTab({ decisions }: { decisions: Array<Record<string, unknown>> }) {
  const binaryDecisions = decisions.filter((d) => d.agent_id === "binary-loom" || d.decision_type === "go_no_go");
  const allDecisions = binaryDecisions.length > 0 ? binaryDecisions : decisions;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />Binary Loom — Decision Weaver</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Cross-references budget data with daily reports to produce binary go/no-go classifications across construction workflows.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="pt-3 text-center">
              <p className="text-xs text-muted-foreground">Total Decisions</p>
              <p className="text-xl font-bold">{allDecisions.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-3 text-center">
              <p className="text-xs text-muted-foreground">High Confidence</p>
              <p className="text-xl font-bold text-emerald-500">{allDecisions.filter((d) => Number(d.confidence) > 0.8).length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-3 text-center">
              <p className="text-xs text-muted-foreground">Flagged</p>
              <p className="text-xl font-bold text-amber-500">{allDecisions.filter((d) => ((d.risk_flags as string[]) ?? []).length > 0).length}</p>
            </CardContent></Card>
          </div>
        </CardContent>
      </Card>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Agent</TableHead><TableHead>Type</TableHead><TableHead>Confidence</TableHead><TableHead>Flags</TableHead><TableHead>Human?</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {allDecisions.slice(0, 20).map((d) => (
            <TableRow key={d.id as string}>
              <TableCell className="text-xs font-medium">{d.agent_id as string}</TableCell>
              <TableCell className="text-xs">{d.decision_type as string}</TableCell>
              <TableCell><Badge variant="outline">{(Number(d.confidence) * 100).toFixed(0)}%</Badge></TableCell>
              <TableCell>
                {((d.risk_flags as string[]) ?? []).length > 0 ? (
                  <Badge variant="destructive" className="text-[10px]"><Zap className="h-3 w-3 mr-0.5" />{((d.risk_flags as string[]) ?? []).length}</Badge>
                ) : <span className="text-xs text-muted-foreground">None</span>}
              </TableCell>
              <TableCell>{(d.requires_human as boolean) ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
