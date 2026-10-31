import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowUpRight, Bot, CheckCircle2, Gauge, Inbox, Radio, ShieldCheck, Sparkles, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState, PageHeader, Panel, StatCard, StatusPill } from "@/components/os";
import {
  EXEC_DOT, EXEC_LABEL, EXEC_TONE, agentGlyph, autonomyOf, confidencePct, execState, fmtLatency, readMetrics, timeAgo,
} from "@/components/ai/agent-meta";
import { AgentGlyph, AutonomyGauge, Confidence, RiskFlags, Shimmer } from "@/components/ai/primitives";
import { ApprovalQueue } from "@/components/ai/ApprovalQueue";
import { isPendingApproval } from "@/components/ai/approvals";
import { cn } from "@/lib/utils";

type Agent = Tables<"ai_agents">;
type Execution = Tables<"agent_executions">;

interface AgentRollup {
  lastRun: string | null;
  runs: number;
  successRate: number | null;
  latencyMs: number | null;
  running: boolean;
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

  // Distinct sub-key so this richer query doesn't collide with other pages' caches;
  // ["agent_executions"] invalidations still match it by prefix.
  const { data: executions = [], isLoading: execLoading } = useQuery({
    queryKey: ["agent_executions", "roster"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_executions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Execution[];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("ai_agents").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_active }) => {
      await qc.cancelQueries({ queryKey: ["ai_agents"] });
      const prev = qc.getQueryData<Agent[]>(["ai_agents"]);
      qc.setQueryData<Agent[]>(["ai_agents"], (old) => old?.map((a) => (a.id === id ? { ...a, is_active } : a)));
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["ai_agents"], ctx.prev);
      toast.error(e.message || "Couldn't update the agent");
    },
    onSuccess: (_d, v) => toast.success(v.is_active ? "Agent brought online" : "Agent paused"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["ai_agents"] }),
  });

  const nameOf = useMemo(() => {
    const map = new Map(agents.map((a) => [a.agent_id, a.name]));
    return (id: string) => map.get(id) ?? id;
  }, [agents]);

  /** Per-agent rollup: stored metrics first, falling back to what the execution log shows. */
  const rollup = useMemo(() => {
    const out: Record<string, AgentRollup> = {};
    for (const a of agents) {
      const mine = executions.filter((e) => e.agent_id === a.agent_id);
      const finished = mine.filter((e) => ["completed", "failed"].includes(execState(e.status)));
      const durations = mine.map((e) => e.duration_ms).filter((d): d is number => typeof d === "number");
      const m = readMetrics(a.metrics);
      out[a.agent_id] = {
        lastRun: mine[0]?.created_at ?? null,
        runs: m.executions ?? mine.length,
        successRate:
          m.successRate ?? (finished.length ? finished.filter((e) => execState(e.status) === "completed").length / finished.length : null),
        latencyMs: m.latencyMs ?? (durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : null),
        running: mine.some((e) => execState(e.status) === "running"),
      };
    }
    return out;
  }, [agents, executions]);

  const k = useMemo(() => {
    const active = agents.filter((a) => a.is_active).length;
    const rolls = agents.map((a) => rollup[a.agent_id]).filter(Boolean);
    const totalRuns = rolls.reduce((s, r) => s + r.runs, 0);
    const weighted = rolls.filter((r) => r.successRate !== null && r.runs > 0);
    const wRuns = weighted.reduce((s, r) => s + r.runs, 0);
    const success = wRuns ? weighted.reduce((s, r) => s + (r.successRate ?? 0) * r.runs, 0) / wRuns : null;
    const lat = rolls.filter((r) => r.latencyMs !== null);
    const latency = lat.length ? lat.reduce((s, r) => s + (r.latencyMs ?? 0), 0) / lat.length : null;
    const pending = executions.filter(isPendingApproval).length;
    return { active, totalRuns, success, latency, pending };
  }, [agents, rollup, executions]);

  const loading = isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="Your autonomous workforce — risk, cost, schedule and compliance agents, with live status and a human in the loop."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/ai/compliance"><ShieldCheck />Controls</Link>
            </Button>
            <Button asChild>
              <Link to="/ai-assistant"><Sparkles />Ask an agent</Link>
            </Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Agents online"
          value={<>{k.active}<span className="text-base text-muted-foreground">/{agents.length}</span></>}
          icon={Radio}
          hint={agents.length - k.active ? `${agents.length - k.active} paused` : "Full fleet live"}
          tone={k.active ? "success" : "default"}
          loading={loading}
        />
        <StatCard
          label="Executions"
          value={k.totalRuns.toLocaleString()}
          icon={Activity}
          hint={`${executions.length} in recent log`}
          loading={loading}
        />
        <StatCard
          label="Success rate"
          value={k.success === null ? "—" : `${(k.success * 100).toFixed(1)}%`}
          icon={CheckCircle2}
          hint={k.latency === null ? "Run-weighted" : `${fmtLatency(k.latency)} avg latency`}
          tone={k.success === null ? "default" : k.success >= 0.9 ? "success" : "warning"}
          loading={loading}
        />
        <StatCard
          label="Awaiting approval"
          value={k.pending}
          icon={Inbox}
          hint={k.pending ? "Needs a human decision" : "Queue clear"}
          tone={k.pending ? "warning" : "default"}
          loading={execLoading}
        />
      </section>

      {/* ── Roster ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="ss-eyebrow">Fleet roster</h2>
          {!loading && agents.length > 0 && <FleetStrip agents={agents} />}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="ss-card space-y-4 p-4">
                <div className="flex items-center gap-3"><Shimmer className="h-10 w-10 rounded-xl" /><div className="flex-1 space-y-2"><Shimmer className="h-3.5 w-32" /><Shimmer className="h-3 w-20" /></div></div>
                <Shimmer className="h-3 w-full" />
                <div className="grid grid-cols-3 gap-2"><Shimmer className="h-11" /><Shimmer className="h-11" /><Shimmer className="h-11" /></div>
              </div>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No agents deployed yet"
            description="Agents are registered by the orchestrator. Once one is configured it will report status, autonomy and performance here."
            action={<Button size="sm" variant="outline" asChild><Link to="/ai-assistant"><Sparkles />Try the AI Assistant</Link></Button>}
          />
        ) : (
          <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                roll={rollup[a.agent_id]}
                busy={toggle.isPending && toggle.variables?.id === a.id}
                onToggle={(v) => toggle.mutate({ id: a.id, is_active: v })}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Feed + approvals ───────────────────────────────── */}
      <section className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          eyebrow="Execution feed"
          title="What the fleet just did"
          flush
          actions={<Button variant="ghost" size="xs" asChild><Link to="/ai-assistant?tab=history">Full history <ArrowUpRight /></Link></Button>}
        >
          {execLoading ? (
            <div className="space-y-3 p-5 pt-0">{[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-12" />)}</div>
          ) : executions.length === 0 ? (
            <div className="p-5 pt-0">
              <EmptyState compact icon={Activity} title="No executions yet" description="Every agent run — with its confidence and risk flags — will stream in here." />
            </div>
          ) : (
            <ExecutionTimeline executions={executions.slice(0, 12)} nameOf={nameOf} agents={agents} />
          )}
        </Panel>

        <Panel
          className="xl:col-span-5"
          glow={k.pending > 0}
          eyebrow="Human in the loop"
          title="Approval queue"
          actions={k.pending > 0 ? <StatusPill status="Awaiting approval" pulse>{k.pending} waiting</StatusPill> : undefined}
        >
          {execLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Shimmer key={i} className="h-16" />)}</div>
          ) : (
            <ApprovalQueue executions={executions} agentName={nameOf} compact limit={5} />
          )}
        </Panel>
      </section>
    </div>
  );
}

/* ─── Agent card ─────────────────────────────────────────────────── */

function AgentCard({ agent: a, roll, busy, onToggle }: { agent: Agent; roll?: AgentRollup; busy: boolean; onToggle: (v: boolean) => void }) {
  const Icon = agentGlyph(a);
  const auto = autonomyOf(a.autonomy_level);
  const sr = roll?.successRate ?? null;
  const live = a.is_active;

  return (
    <article
      className={cn(
        "ss-card ss-interactive group relative flex flex-col overflow-hidden p-4",
        !live && "bg-card/60",
      )}
    >
      {live && <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-mod-ai/10 blur-2xl" />}

      <header className="relative flex items-start gap-3">
        <AgentGlyph icon={Icon} live={live} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold tracking-tight">{a.name}</h3>
          <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
            {a.agent_id} · {a.agent_type}
          </p>
        </div>
        <Switch
          checked={a.is_active}
          disabled={busy}
          onCheckedChange={onToggle}
          aria-label={`${a.is_active ? "Pause" : "Activate"} ${a.name}`}
          className="mt-0.5"
        />
      </header>

      <p className="relative mt-3 line-clamp-2 min-h-[2.5em] text-[12.5px] leading-relaxed text-muted-foreground">
        {a.description || "No description provided."}
      </p>

      <div className="relative mt-3 flex items-center justify-between gap-2">
        <AutonomyGauge level={auto.level} label={auto.label} />
        <span className={cn("flex shrink-0 items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider", live ? "text-success" : "text-muted-foreground")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", live ? "animate-glow-pulse bg-success" : "bg-muted-foreground/50")} />
          {roll?.running ? "Running" : live ? "Live" : "Idle"}
        </span>
      </div>

      <dl className="relative mt-4 grid grid-cols-3 divide-x overflow-hidden rounded-lg border bg-surface-2/40">
        <Metric icon={Gauge} label="Success">
          <span className={cn(sr === null ? "" : sr >= 0.9 ? "text-success" : sr >= 0.8 ? "text-foreground" : "text-warning")}>
            {sr === null ? "—" : `${(sr * 100).toFixed(1)}%`}
          </span>
        </Metric>
        <Metric icon={Timer} label="Latency">{fmtLatency(roll?.latencyMs)}</Metric>
        <Metric icon={Activity} label="Runs">{roll ? roll.runs.toLocaleString() : "—"}</Metric>
      </dl>
      {sr !== null && (
        <div className="relative mt-2 h-0.5 overflow-hidden rounded-full bg-secondary">
          <div className={cn("h-full rounded-full", sr >= 0.9 ? "bg-success" : "bg-warning")} style={{ width: `${sr * 100}%` }} />
        </div>
      )}

      <footer className="relative mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Last run <span className="font-mono text-foreground/80">{timeAgo(roll?.lastRun)}</span></span>
        <span className="font-mono">{auto.short}</span>
      </footer>
    </article>
  );
}

function Metric({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 px-2.5 py-2">
      <dt className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-0.5 truncate font-mono text-[13px] font-medium tabular-nums">{children}</dd>
    </div>
  );
}

/** Segmented live/idle strip — one tick per agent. */
function FleetStrip({ agents }: { agents: Agent[] }) {
  return (
    <div className="flex items-center gap-2" aria-label="Fleet status">
      <div className="flex gap-[3px]">
        {agents.map((a) => (
          <span key={a.id} title={`${a.name}: ${a.is_active ? "live" : "idle"}`} className={cn("h-3 w-1.5 rounded-[2px]", a.is_active ? "bg-success" : "bg-border-strong")} />
        ))}
      </div>
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
        {agents.filter((a) => a.is_active).length} live
      </span>
    </div>
  );
}

/* ─── Timeline ───────────────────────────────────────────────────── */

function ExecutionTimeline({ executions, nameOf, agents }: { executions: Execution[]; nameOf: (id: string) => string; agents: Agent[] }) {
  const byId = new Map(agents.map((a) => [a.agent_id, a]));
  return (
    <ol className="relative border-t px-5 py-2">
      <span className="absolute bottom-6 left-[29px] top-6 w-px bg-border" aria-hidden />
      {executions.map((e) => {
        const st = execState(e.status);
        const agent = byId.get(e.agent_id);
        const Icon = agentGlyph(agent ?? { agent_id: e.agent_id });
        return (
          <li key={e.id} className="relative grid grid-cols-[18px_minmax(0,1fr)] gap-x-3 py-2.5">
            <span className="relative z-10 mt-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border bg-card">
              <span className={cn("h-1.5 w-1.5 rounded-full", EXEC_DOT[st], st === "running" && "animate-glow-pulse")} />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-mod-ai" />
                  <span className="truncate">{nameOf(e.agent_id)}</span>
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">{e.event_type}</span>
                <StatusPill status={EXEC_LABEL[st]} tone={EXEC_TONE[st]} pulse={st === "running"} className="ml-auto" />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Confidence value={confidencePct(e.confidence_score)} />
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{fmtLatency(e.duration_ms)}</span>
                {e.requires_approval && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {e.approval_status === "approved" ? "✓ approved" : e.approval_status === "rejected" ? "✕ rejected" : "needs approval"}
                  </span>
                )}
                <RiskFlags flags={e.risk_flags} max={2} />
                <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">{timeAgo(e.created_at)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
