import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, Check, CircleDashed, Download, FileCheck2, Grid3x3, List, Minus, RefreshCw, ShieldCheck, X,
} from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/export";
import { EmptyState, PageHeader, Panel, SearchField, Toolbar } from "@/components/os";
import { agentGlyph } from "@/components/ai/agent-meta";
import { AgentGlyph, CoverageRing, Shimmer } from "@/components/ai/primitives";
import { cn } from "@/lib/utils";

const FRAMEWORKS = ["SOC 2", "ISO 27001", "HIPAA", "GDPR", "CMMC"] as const;

type CanonStatus = "satisfied" | "gap" | "unverified" | "not_applicable";

const STATUS_LABEL: Record<CanonStatus, string> = {
  satisfied: "Satisfied",
  gap: "Gap",
  unverified: "Unverified",
  not_applicable: "Not applicable",
};

const STATUS_STYLE: Record<CanonStatus, string> = {
  satisfied: "border-success/25 bg-success/10 text-success",
  gap: "border-destructive/25 bg-destructive/10 text-destructive",
  unverified: "border-warning/25 bg-warning/10 text-warning",
  not_applicable: "border-border bg-muted text-muted-foreground",
};

const STATUS_ICON: Record<CanonStatus, React.ElementType> = {
  satisfied: Check,
  gap: X,
  unverified: CircleDashed,
  not_applicable: Minus,
};

/** Older rows use implementation vocabulary; map it onto the four review states. */
function canon(status: string | null | undefined): CanonStatus {
  const s = (status ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (["satisfied", "implemented", "compliant", "passed", "complete", "completed"].includes(s)) return "satisfied";
  if (["gap", "not_started", "failed", "non_compliant", "missing"].includes(s)) return "gap";
  if (["not_applicable", "n/a", "na"].includes(s)) return "not_applicable";
  return "unverified";
}

interface Control {
  id: string;
  framework: string;
  control_ref: string;
  title: string;
  description: string | null;
  category: string | null;
  applies_to: string[];
}

interface Mapping {
  id: string;
  agent_id: string;
  control_id: string;
  status: string;
  is_required: boolean;
  evidence: string | null;
  owner: string | null;
  last_reviewed: string | null;
  notes: string | null;
}

export default function AgentCompliancePage() {
  const qc = useQueryClient();
  const [agentFilter, setAgentFilter] = useState("all");
  const [frameworkFilter, setFrameworkFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"matrix" | "list">("matrix");
  const [editing, setEditing] = useState<{ mapping: Mapping; control: Control } | null>(null);

  const { data: agents = [] } = useQuery({
    queryKey: ["ai_agents"],
    queryFn: async () => {
      // Full rows: this key is shared with the Agents page, so keep the cached shape identical.
      const { data, error } = await supabase.from("ai_agents").select("*").order("name");
      if (error) throw error;
      return data as Tables<"ai_agents">[];
    },
  });

  const { data: controls = [], isLoading: controlsLoading } = useQuery({
    queryKey: ["compliance_controls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_controls")
        .select("*")
        .order("framework")
        .order("control_ref");
      if (error) throw error;
      return data as Control[];
    },
  });

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ["agent_control_mappings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_control_mappings").select("*");
      if (error) throw error;
      return data as Mapping[];
    },
  });

  const controlMap = useMemo(
    () => Object.fromEntries(controls.map((c) => [c.id, c])) as Record<string, Control>,
    [controls]
  );
  const agentMap = useMemo(
    () => Object.fromEntries(agents.map((a) => [a.agent_id, a])),
    [agents]
  );

  const update = useMutation({
    mutationFn: async (patch: Partial<Mapping> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("agent_control_mappings").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent_control_mappings"] });
      toast.success("Compliance mapping updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remap = useMutation({
    mutationFn: async () => {
      const existing = new Set(mappings.map((m) => `${m.agent_id}|${m.control_id}`));
      const rows: { agent_id: string; control_id: string; status: string }[] = [];
      for (const a of agents) {
        for (const c of controls) {
          const applies = c.applies_to.includes("*") || c.applies_to.includes(a.agent_type ?? "");
          if (applies && !existing.has(`${a.agent_id}|${c.id}`)) {
            rows.push({ agent_id: a.agent_id, control_id: c.id, status: "unverified" });
          }
        }
      }
      if (rows.length === 0) return 0;
      const { error } = await supabase.from("agent_control_mappings").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["agent_control_mappings"] });
      toast.success(n ? `${n} new requirement(s) mapped` : "All automations already mapped");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Frameworks that actually have controls, in canonical order. */
  const frameworks = useMemo(() => {
    const present = Array.from(new Set(controls.map((c) => c.framework)));
    const known = FRAMEWORKS.filter((f) => present.includes(f));
    return [...known, ...present.filter((f) => !(FRAMEWORKS as readonly string[]).includes(f)).sort()];
  }, [controls]);

  const matchesSearch = (c: Control, agentId?: string) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.control_ref.toLowerCase().includes(q) ||
      (agentId ? (agentMap[agentId]?.name ?? "").toLowerCase().includes(q) : false)
    );
  };

  const rows = useMemo(() => {
    return mappings
      .map((m) => ({ m, c: controlMap[m.control_id] }))
      .filter((r): r is { m: Mapping; c: Control } => !!r.c)
      .filter((r) => agentFilter === "all" || r.m.agent_id === agentFilter)
      .filter((r) => frameworkFilter === "all" || r.c.framework === frameworkFilter)
      .filter((r) => statusFilter === "all" || canon(r.m.status) === statusFilter)
      .filter((r) => matchesSearch(r.c, r.m.agent_id))
      .sort((a, b) =>
        a.c.framework === b.c.framework
          ? a.c.control_ref.localeCompare(b.c.control_ref)
          : a.c.framework.localeCompare(b.c.framework)
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappings, controlMap, agentMap, agentFilter, frameworkFilter, statusFilter, search]);

  const scopedMappings = useMemo(
    () =>
      mappings.filter(
        (m) => agentFilter === "all" || m.agent_id === agentFilter
      ),
    [mappings, agentFilter]
  );

  function coverage(framework: string | null) {
    const inFw = scopedMappings.filter((m) => controlMap[m.control_id] && (framework === null || controlMap[m.control_id].framework === framework));
    const required = inFw.filter((m) => canon(m.status) !== "not_applicable");
    const satisfied = required.filter((m) => canon(m.status) === "satisfied").length;
    const gaps = required.filter((m) => canon(m.status) === "gap").length;
    const unverified = required.filter((m) => canon(m.status) === "unverified").length;
    return {
      total: required.length,
      satisfied,
      gaps,
      unverified,
      pct: required.length ? Math.round((satisfied / required.length) * 100) : 0,
    };
  }

  const openGaps = scopedMappings.filter((m) => canon(m.status) === "gap").length;
  const openUnverified = scopedMappings.filter((m) => canon(m.status) === "unverified").length;
  const overall = coverage(null);

  /* Matrix axes */
  const matrixControls = useMemo(
    () =>
      controls
        .filter((c) => (frameworkFilter === "all" || c.framework === frameworkFilter) && matchesSearch(c))
        .sort((a, b) =>
          a.framework === b.framework
            ? a.control_ref.localeCompare(b.control_ref, undefined, { numeric: true })
            : frameworks.indexOf(a.framework) - frameworks.indexOf(b.framework),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [controls, frameworks, frameworkFilter, search],
  );
  const matrixAgents = useMemo(() => {
    const mapped = new Set(mappings.map((m) => m.agent_id));
    return agents.filter((a) => (agentFilter === "all" ? mapped.has(a.agent_id) : a.agent_id === agentFilter));
  }, [agents, mappings, agentFilter]);
  const cell = useMemo(() => new Map(mappings.map((m) => [`${m.agent_id}|${m.control_id}`, m])), [mappings]);

  const loading = isLoading || controlsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automation compliance"
        description="SOC 2, ISO 27001, HIPAA, GDPR and CMMC requirements mapped to every automation on the platform."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                exportToCSV(
                  rows.map((r) => ({
                    automation: agentMap[r.m.agent_id]?.name ?? r.m.agent_id,
                    framework: r.c.framework,
                    control: r.c.control_ref,
                    requirement: r.c.title,
                    status: STATUS_LABEL[canon(r.m.status)],
                    owner: r.m.owner ?? "",
                    evidence: r.m.evidence ?? "",
                    last_reviewed: r.m.last_reviewed ?? "",
                  })),
                  "automation-compliance"
                )
              }
            >
              <Download />Export CSV
            </Button>
            <Button variant="outline" onClick={() => remap.mutate()} disabled={remap.isPending}>
              <RefreshCw className={cn(remap.isPending && "animate-spin")} />
              Re-map requirements
            </Button>
          </>
        }
      />

      {(openGaps > 0 || openUnverified > 0) && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-[13px] leading-relaxed">
            <span className="font-medium">{openGaps} open gap{openGaps === 1 ? "" : "s"}</span> and{" "}
            <span className="font-medium">{openUnverified} unverified requirement{openUnverified === 1 ? "" : "s"}</span> across the automations in
            view. <span className="text-muted-foreground">Automations still run — this is a warning, not a block. Close gaps before relying on these
            automations in a regulated workflow.</span>
          </p>
        </div>
      )}

      {/* ── Coverage rings ── */}
      <section className="stagger grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(210px,1fr))]">
        {loading ? (
          [0, 1, 2, 3, 4, 5].map((i) => <Shimmer key={i} className="h-[132px] rounded-xl" />)
        ) : (
          <>
            <CoverageCard
              label="All frameworks"
              c={overall}
              active={frameworkFilter === "all"}
              onClick={() => setFrameworkFilter("all")}
              primary
            />
            {frameworks.map((fw) => (
              <CoverageCard
                key={fw}
                label={fw}
                c={coverage(fw)}
                active={frameworkFilter === fw}
                onClick={() => setFrameworkFilter(frameworkFilter === fw ? "all" : fw)}
              />
            ))}
          </>
        )}
      </section>

      {/* ── Filters ── */}
      <Toolbar>
        <SearchField value={search} onChange={setSearch} placeholder="Search requirement or automation…" />
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="h-9 w-full text-sm sm:w-52"><SelectValue placeholder="All automations" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All automations</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.agent_id} value={a.agent_id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[calc(50%-4px)] text-sm sm:w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Tabs value={view} onValueChange={(v) => setView(v as "matrix" | "list")} className="sm:ml-auto">
          <TabsList>
            <TabsTrigger value="matrix"><Grid3x3 className="h-3.5 w-3.5" />Matrix</TabsTrigger>
            <TabsTrigger value="list"><List className="h-3.5 w-3.5" />Register</TabsTrigger>
          </TabsList>
        </Tabs>
      </Toolbar>

      {view === "matrix" ? (
        <Panel
          flush
          eyebrow="Coverage matrix"
          title="Controls × automations"
          actions={<StatusLegend />}
        >
          {loading ? (
            <div className="space-y-2 p-5 pt-0">{[0, 1, 2, 3, 4].map((i) => <Shimmer key={i} className="h-10" />)}</div>
          ) : matrixControls.length === 0 || matrixAgents.length === 0 ? (
            <div className="p-5 pt-0">
              <EmptyState
                compact
                icon={ShieldCheck}
                title={controls.length === 0 ? "No controls defined" : "Nothing in view"}
                description={controls.length === 0 ? "Add compliance controls, then re-map requirements to your automations." : "No controls or automations match these filters."}
                action={controls.length > 0 && agents.length > 0 ? <Button size="sm" variant="outline" onClick={() => remap.mutate()}><RefreshCw />Re-map requirements</Button> : undefined}
              />
            </div>
          ) : (
            <div className="overflow-x-auto border-t">
              <table className="w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 w-[180px] min-w-[180px] max-w-[180px] border-b bg-card px-4 py-3 align-bottom sm:w-auto sm:min-w-[320px] sm:max-w-none sm:px-5">
                      <span className="ss-eyebrow text-[9.5px]">Control</span>
                    </th>
                    {matrixAgents.map((a) => (
                      <th key={a.agent_id} className="w-[96px] min-w-[84px] border-b px-1 py-3 align-bottom">
                        <div className="flex flex-col items-center gap-1.5" title={a.name}>
                          <AgentGlyph icon={agentGlyph(a)} size="sm" live={a.is_active} />
                          <span className="max-w-[90px] truncate text-center text-[10.5px] font-medium leading-tight text-muted-foreground">{a.name}</span>
                        </div>
                      </th>
                    ))}
                    <th className="w-[72px] border-b px-3 py-3 text-right align-bottom"><span className="ss-eyebrow text-[9.5px]">Cover</span></th>
                  </tr>
                </thead>
                <tbody>
                  {matrixControls.map((c, ri) => {
                    const prev = matrixControls[ri - 1];
                    const groupStart = !prev || prev.framework !== c.framework;
                    const rowCells = matrixAgents.map((a) => cell.get(`${a.agent_id}|${c.id}`));
                    const req = rowCells.filter((m): m is Mapping => !!m && canon(m.status) !== "not_applicable");
                    const sat = req.filter((m) => canon(m.status) === "satisfied").length;
                    return (
                      <FragmentRow key={c.id} groupStart={groupStart && frameworkFilter === "all"} framework={c.framework} span={matrixAgents.length + 2}>
                        <tr className="group">
                          <th scope="row" className="sticky left-0 z-10 w-[180px] min-w-[180px] max-w-[180px] border-b border-border/60 bg-card px-4 py-2.5 font-normal shadow-[1px_0_0_0_hsl(var(--border))] transition-colors group-hover:bg-surface-2 sm:w-auto sm:max-w-none sm:px-5 sm:shadow-none">
                            <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2.5">
                              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{c.control_ref}</span>
                              <span className="truncate text-[13px]">{c.title}</span>
                            </div>
                          </th>
                          {matrixAgents.map((a, ci) => {
                            const m = rowCells[ci];
                            return (
                              <td key={a.agent_id} className="border-b border-border/60 px-1 py-2 text-center transition-colors group-hover:bg-surface-2/50">
                                <MatrixCell
                                  mapping={m}
                                  dim={!!m && statusFilter !== "all" && canon(m.status) !== statusFilter}
                                  label={`${a.name} · ${c.control_ref}`}
                                  onClick={() => m && setEditing({ mapping: m, control: c })}
                                />
                              </td>
                            );
                          })}
                          <td className="border-b border-border/60 px-3 py-2 text-right font-mono text-[11px] tabular-nums text-muted-foreground transition-colors group-hover:bg-surface-2/50">
                            {req.length ? <><span className="text-foreground">{sat}</span>/{req.length}</> : "—"}
                          </td>
                        </tr>
                      </FragmentRow>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-normal sm:px-5"><span className="ss-eyebrow text-[9.5px]">Automation coverage</span></th>
                    {matrixAgents.map((a) => {
                      const ms = matrixControls.map((c) => cell.get(`${a.agent_id}|${c.id}`)).filter((m): m is Mapping => !!m && canon(m.status) !== "not_applicable");
                      const pct = ms.length ? Math.round((ms.filter((m) => canon(m.status) === "satisfied").length / ms.length) * 100) : null;
                      return (
                        <td key={a.agent_id} className="px-1 py-3 text-center">
                          <span className={cn("font-mono text-[12px] tabular-nums", pct === null ? "text-muted-foreground" : pct >= 80 ? "text-success" : pct >= 50 ? "text-foreground" : "text-warning")}>
                            {pct === null ? "—" : `${pct}%`}
                          </span>
                        </td>
                      );
                    })}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Panel>
      ) : (
        <Panel flush eyebrow="Requirement register" title={`${rows.length} mapped requirement${rows.length === 1 ? "" : "s"}`}>
          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Automation</TableHead>
                  <TableHead>Framework</TableHead>
                  <TableHead>Control</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="w-24 text-right">Evidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [0, 1, 2, 3].map((i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Shimmer className="h-6" /></TableCell></TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-5">
                      <EmptyState compact icon={ShieldCheck} title="No mapped requirements match" description="Clear a filter, or re-map requirements to pick up new automations." />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(({ m, c }) => {
                    const st = canon(m.status);
                    const a = agentMap[m.agent_id];
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap">
                          <span className="flex items-center gap-2 text-[13px] font-medium">
                            {a && <AgentGlyph icon={agentGlyph(a)} size="sm" />}
                            {a?.name ?? m.agent_id}
                          </span>
                        </TableCell>
                        <TableCell><span className="ss-pill border-border bg-surface-2 text-muted-foreground">{c.framework}</span></TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">{c.control_ref}</TableCell>
                        <TableCell className="min-w-[200px] max-w-[300px] text-[13px]">{c.title}</TableCell>
                        <TableCell>
                          <Select value={st} onValueChange={(status) => update.mutate({ id: m.id, status })}>
                            <SelectTrigger className={cn("h-7 w-[132px] rounded-full border text-[11px] font-medium", STATUS_STYLE[st])}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{m.owner || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="xs" variant="ghost" onClick={() => setEditing({ mapping: m, control: c })}>
                            <FileCheck2 />
                            {m.evidence ? "View" : "Add"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="font-mono text-[13px] text-muted-foreground">{editing?.control.framework} · {editing?.control.control_ref}</span>
            </DialogTitle>
            <DialogDescription className="text-foreground">
              <span className="block text-sm font-medium">{editing?.control.title}</span>
              {editing && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {agentMap[editing.mapping.agent_id]?.name ?? editing.mapping.agent_id}
                  {editing.control.description ? ` — ${editing.control.description}` : ""}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const status = fd.get("status") as string;
                update.mutate({
                  id: editing.mapping.id,
                  ...(status && status !== canon(editing.mapping.status) ? { status } : {}),
                  owner: (fd.get("owner") as string) || null,
                  evidence: (fd.get("evidence") as string) || null,
                  notes: (fd.get("notes") as string) || null,
                  last_reviewed: (fd.get("last_reviewed") as string) || null,
                });
                setEditing(null);
              }}
            >
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select name="status" defaultValue={canon(editing.mapping.status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Control owner</Label>
                  <Input name="owner" defaultValue={editing.mapping.owner ?? ""} placeholder="e.g. Security lead" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last reviewed</Label>
                  <Input name="last_reviewed" type="date" defaultValue={editing.mapping.last_reviewed ?? ""} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Evidence</Label>
                <Textarea
                  name="evidence"
                  rows={3}
                  defaultValue={editing.mapping.evidence ?? ""}
                  placeholder="Link or describe the control evidence (log export, policy, config screenshot)…"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea name="notes" rows={2} defaultValue={editing.mapping.notes ?? ""} />
              </div>
              <Button type="submit" className="w-full" disabled={update.isPending}>Save</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Pieces ─────────────────────────────────────────────────────── */

function CoverageCard({
  label, c, active, onClick, primary,
}: {
  label: string;
  c: { total: number; satisfied: number; gaps: number; unverified: number; pct: number };
  active: boolean;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "ss-card ss-interactive flex flex-col gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("ss-eyebrow leading-4", active && "text-foreground")}>{label}</span>
        {primary && <ShieldCheck className="h-3.5 w-3.5 text-mod-ai" />}
      </div>
      <div className="flex items-center gap-3">
        <CoverageRing
          pct={c.pct}
          size={56}
          stroke={5}
          segments={c.total ? [
            { value: c.satisfied, className: "stroke-success" },
            { value: c.unverified, className: "stroke-warning" },
            { value: c.gaps, className: "stroke-destructive" },
          ] : undefined}
        />
        <div className="min-w-0">
          <p className="font-mono text-xl font-medium leading-none tabular-nums">
            {c.satisfied}<span className="text-sm text-muted-foreground">/{c.total}</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">controls met</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] tabular-nums">
        <span className={cn("flex items-center gap-1", c.gaps ? "text-destructive" : "text-muted-foreground")}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />{c.gaps} gap{c.gaps === 1 ? "" : "s"}
        </span>
        <span className={cn("flex items-center gap-1", c.unverified ? "text-warning" : "text-muted-foreground")}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />{c.unverified} unverified
        </span>
      </div>
    </button>
  );
}

function MatrixCell({ mapping, dim, label, onClick }: { mapping?: Mapping; dim: boolean; label: string; onClick: () => void }) {
  if (!mapping) {
    return (
      <span className="mx-auto block h-7 w-7 rounded-md border border-dashed border-border/80" title={`${label}: not mapped`}>
        <span className="sr-only">Not mapped</span>
      </span>
    );
  }
  const st = canon(mapping.status);
  const Icon = STATUS_ICON[st];
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label}: ${STATUS_LABEL[st]}${mapping.evidence ? " · evidence on file" : ""}`}
      className={cn(
        "relative mx-auto flex h-7 w-7 items-center justify-center rounded-md border transition-[transform,opacity] duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        STATUS_STYLE[st],
        dim && "opacity-25",
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {mapping.evidence && <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-data ring-2 ring-card" />}
      <span className="sr-only">{STATUS_LABEL[st]}</span>
    </button>
  );
}

function StatusLegend() {
  return (
    <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground md:flex">
      {(Object.keys(STATUS_LABEL) as CanonStatus[]).map((k) => {
        const Icon = STATUS_ICON[k];
        return (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn("flex h-4 w-4 items-center justify-center rounded border", STATUS_STYLE[k])}><Icon className="h-2.5 w-2.5" strokeWidth={2.5} /></span>
            {STATUS_LABEL[k]}
          </span>
        );
      })}
      <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-data" />Evidence</span>
    </div>
  );
}

function FragmentRow({ groupStart, framework, span, children }: { groupStart: boolean; framework: string; span: number; children: React.ReactNode }) {
  return (
    <>
      {groupStart && (
        <tr>
          <th colSpan={span} className="border-b border-border/60 bg-surface-2/50 px-4 py-1.5 text-left sm:px-5">
            <span className="sticky left-5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-mod-ai">{framework}</span>
          </th>
        </tr>
      )}
      {children}
    </>
  );
}
