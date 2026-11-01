import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, Brain, CheckCircle2, Gauge, GitBranch, History, Inbox, MessageSquarePlus, MessagesSquare, Radio,
  ShieldAlert, ThumbsDown, ThumbsUp, UserCheck, XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, Panel, StatCard, StatusPill } from "@/components/os";
import { AssistantChat } from "@/components/ai/AssistantChat";
import { ApprovalQueue } from "@/components/ai/ApprovalQueue";
import { isPendingApproval } from "@/components/ai/approvals";
import { EXEC_LABEL, EXEC_TONE, confidencePct, execState, fmtLatency, humanize, timeAgo } from "@/components/ai/agent-meta";
import { Confidence, RiskFlags, Shimmer } from "@/components/ai/primitives";

const TABS = ["ask", "approvals", "decisions", "history", "learning"] as const;
type Tab = (typeof TABS)[number];

export default function AIAssistantPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("tab");
  const [tab, setTabState] = useState<Tab>(TABS.includes(initial as Tab) ? (initial as Tab) : "ask");
  const [chatKey, setChatKey] = useState(0);

  const setTab = (t: string) => {
    setTabState(t as Tab);
    const next = new URLSearchParams(params);
    if (t === "ask") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };

  const { data: agents } = useQuery({
    queryKey: ["ai_agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_agents").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: executions, isLoading: execLoading } = useQuery({
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

  const { data: decisions, isLoading: decLoading } = useQuery({
    queryKey: ["agent_decisions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_decisions").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: learningSignals, isLoading: sigLoading } = useQuery({
    queryKey: ["agent_learning_signals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_learning_signals").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const pendingApprovals = executions?.filter(isPendingApproval) ?? [];
  const nameMap = new Map((agents ?? []).map((a) => [a.agent_id, a.name]));
  const nameOf = (id: string) => nameMap.get(id) ?? id;

  const activeCount = agents?.filter((a) => a.is_active).length ?? 0;
  const completedCount = executions?.filter((e) => execState(e.status) === "completed").length ?? 0;
  const avgConfidence = executions?.length
    ? (executions.reduce((s, e) => s + (Number(e.confidence_score) || 0), 0) / executions.length * 100).toFixed(0)
    : "0";

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Ask questions of your live portfolio, and review what your agents decided, flagged and learned."
        actions={
          tab === "ask" ? (
            <Button variant="outline" onClick={() => setChatKey((k) => k + 1)}>
              <MessageSquarePlus />New chat
            </Button>
          ) : undefined
        }
      >
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max">
            <TabsTrigger value="ask"><MessagesSquare className="h-3.5 w-3.5" />Ask</TabsTrigger>
            <TabsTrigger value="approvals">
              <Inbox className="h-3.5 w-3.5" />Approvals
              {pendingApprovals.length > 0 && (
                <span className="rounded-full bg-warning/15 px-1.5 font-mono text-[10px] tabular-nums text-warning">{pendingApprovals.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="decisions"><GitBranch className="h-3.5 w-3.5" />Decisions</TabsTrigger>
            <TabsTrigger value="history"><History className="h-3.5 w-3.5" />History</TabsTrigger>
            <TabsTrigger value="learning"><Brain className="h-3.5 w-3.5" />Learning</TabsTrigger>
          </TabsList>
        </div>
      </PageHeader>

      {tab !== "ask" && (
        <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Active agents" value={<>{activeCount}<span className="text-base text-muted-foreground">/{agents?.length ?? 0}</span></>} icon={Radio} tone={activeCount ? "success" : "default"} hint="Agents online" loading={!agents} />
          <StatCard label="Completed runs" value={completedCount} icon={CheckCircle2} hint={`of ${executions?.length ?? 0} recent`} loading={execLoading} />
          <StatCard label="Avg confidence" value={`${avgConfidence}%`} icon={Gauge} tone={Number(avgConfidence) >= 80 ? "success" : "default"} hint="Across recent runs" loading={execLoading} />
          <StatCard
            label="Pending approvals"
            value={pendingApprovals.length}
            icon={Inbox}
            tone={pendingApprovals.length ? "warning" : "default"}
            hint={pendingApprovals.length ? "Needs review" : "Queue clear"}
            loading={execLoading}
            onClick={tab !== "approvals" ? () => setTab("approvals") : undefined}
          />
        </section>
      )}

      {/* ── Ask ── */}
      <TabsContent value="ask" className="mt-0">
        <AssistantChat key={chatKey} />
      </TabsContent>

      {/* ── Approvals ── */}
      <TabsContent value="approvals" className="mt-0">
        <Panel glow={pendingApprovals.length > 0} eyebrow="Human in the loop" title="Waiting on your decision" description="Approving or rejecting records a learning signal the agent trains on.">
          {execLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Shimmer key={i} className="h-24" />)}</div>
          ) : (
            <div className="mx-auto max-w-3xl">
              <ApprovalQueue executions={executions} agentName={nameOf} />
            </div>
          )}
        </Panel>
      </TabsContent>

      {/* ── Decisions (Binary Loom) ── */}
      <TabsContent value="decisions" className="mt-0">
        <BinaryLoomTab decisions={decisions ?? []} loading={decLoading} nameOf={nameOf} />
      </TabsContent>

      {/* ── History ── */}
      <TabsContent value="history" className="mt-0">
        <Panel flush eyebrow="Execution log" title="Last 50 runs">
          {execLoading ? (
            <TableSkeleton />
          ) : !executions?.length ? (
            <div className="p-5 pt-0"><EmptyState compact icon={Activity} title="No runs recorded" description="Agent executions will be logged here with confidence, duration and status." /></div>
          ) : (
            <div className="overflow-x-auto border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((e) => {
                    const st = execState(e.status);
                    return (
                      <TableRow key={e.id}>
                        <TableCell><StatusPill status={EXEC_LABEL[st]} tone={EXEC_TONE[st]} pulse={st === "running"} /></TableCell>
                        <TableCell className="whitespace-nowrap text-[13px] font-medium">{nameOf(e.agent_id)}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-[11.5px] text-muted-foreground">{e.event_type}</TableCell>
                        <TableCell><Confidence value={confidencePct(e.confidence_score)} /></TableCell>
                        <TableCell>{e.risk_flags?.length ? <RiskFlags flags={e.risk_flags} max={2} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-right font-mono text-[11.5px] tabular-nums">{fmtLatency(e.duration_ms)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-[11px] text-muted-foreground" title={new Date(e.created_at).toLocaleString()}>{timeAgo(e.created_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </TabsContent>

      {/* ── Learning ── */}
      <TabsContent value="learning" className="mt-0 space-y-3">
        {(() => {
          const pos = learningSignals?.filter((s) => s.is_positive).length ?? 0;
          const neg = learningSignals?.filter((s) => !s.is_positive).length ?? 0;
          const rate = learningSignals?.length ? ((pos / learningSignals.length) * 100).toFixed(0) : 0;
          return (
            <section className="grid grid-cols-3 gap-3">
              <StatCard label="Positive" value={pos} icon={ThumbsUp} tone="success" loading={sigLoading} />
              <StatCard label="Negative" value={neg} icon={ThumbsDown} tone={neg ? "destructive" : "default"} loading={sigLoading} />
              <StatCard label="Approval rate" value={`${rate}%`} icon={UserCheck} loading={sigLoading} />
            </section>
          );
        })()}
        <Panel flush eyebrow="Feedback loop" title="Learning signals">
          {sigLoading ? (
            <TableSkeleton />
          ) : !learningSignals?.length ? (
            <div className="p-5 pt-0"><EmptyState compact icon={Brain} title="No feedback yet" description="Approve or reject an agent's draft and the signal will appear here." action={<Button size="sm" variant="outline" onClick={() => setTab("approvals")}><Inbox />Review approvals</Button>} /></div>
          ) : (
            <div className="overflow-x-auto border-t">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Agent</TableHead><TableHead>Type</TableHead><TableHead>Result</TableHead><TableHead>Feedback</TableHead><TableHead className="text-right">When</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {learningSignals.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap text-[13px] font-medium">{nameOf(s.agent_id)}</TableCell>
                      <TableCell className="font-mono text-[11.5px] text-muted-foreground">{s.signal_type}</TableCell>
                      <TableCell>{s.is_positive ? <StatusPill status="Positive" tone="success" /> : <StatusPill status="Negative" tone="destructive" />}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">{s.feedback ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono text-[11px] text-muted-foreground">{timeAgo(s.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </TabsContent>
    </Tabs>
  );
}

function TableSkeleton() {
  return <div className="space-y-2 p-5 pt-0">{[0, 1, 2, 3, 4].map((i) => <Shimmer key={i} className="h-9" />)}</div>;
}

/* ─── Binary Loom ─── */
function BinaryLoomTab({ decisions, loading, nameOf }: { decisions: Array<Record<string, unknown>>; loading: boolean; nameOf: (id: string) => string }) {
  const binaryDecisions = decisions.filter((d) => d.agent_id === "binary-loom" || d.decision_type === "go_no_go");
  const allDecisions = binaryDecisions.length > 0 ? binaryDecisions : decisions;
  const high = allDecisions.filter((d) => Number(d.confidence) > 0.8).length;
  const flagged = allDecisions.filter((d) => ((d.risk_flags as string[]) ?? []).length > 0).length;

  return (
    <div className="space-y-3">
      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Decisions" value={allDecisions.length} icon={GitBranch} loading={loading} />
        <StatCard label="High confidence" value={high} icon={CheckCircle2} tone="success" hint="> 80%" loading={loading} />
        <StatCard label="Flagged" value={flagged} icon={ShieldAlert} tone={flagged ? "warning" : "default"} loading={loading} />
      </section>
      <Panel
        flush
        eyebrow="Binary Loom · decision weaver"
        title="Go / no-go classifications"
        description="Cross-references budget data with daily reports to classify construction workflows."
      >
        {loading ? (
          <TableSkeleton />
        ) : allDecisions.length === 0 ? (
          <div className="p-5 pt-0"><EmptyState compact icon={GitBranch} title="No decisions recorded" description="When an agent makes a go/no-go call it's logged here with its confidence and any policy flags." /></div>
        ) : (
          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Agent</TableHead><TableHead>Type</TableHead><TableHead>Confidence</TableHead><TableHead>Flags</TableHead><TableHead>Human review</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {allDecisions.slice(0, 20).map((d) => (
                  <TableRow key={d.id as string}>
                    <TableCell className="whitespace-nowrap text-[13px] font-medium">{nameOf(d.agent_id as string)}</TableCell>
                    <TableCell className="font-mono text-[11.5px] text-muted-foreground">{humanize(d.decision_type as string)}</TableCell>
                    <TableCell><Confidence value={confidencePct(d.confidence as number)} /></TableCell>
                    <TableCell>
                      {((d.risk_flags as string[]) ?? []).length > 0 ? <RiskFlags flags={d.risk_flags as string[]} max={2} /> : <span className="text-xs text-muted-foreground">None</span>}
                    </TableCell>
                    <TableCell>
                      {(d.requires_human as boolean)
                        ? <StatusPill status="Required" tone="warning" />
                        : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" />Not needed</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  );
}
