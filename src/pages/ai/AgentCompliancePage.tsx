import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, AlertTriangle, Search, FileCheck2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/export";

const FRAMEWORKS = ["SOC 2", "ISO 27001", "HIPAA", "GDPR", "CMMC"] as const;

const STATUS_STYLE: Record<string, string> = {
  satisfied: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  gap: "bg-destructive/10 text-destructive border-destructive/20",
  unverified: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  not_applicable: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  satisfied: "Satisfied",
  gap: "Gap",
  unverified: "Unverified",
  not_applicable: "Not applicable",
};

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
  const [editing, setEditing] = useState<{ mapping: Mapping; control: Control } | null>(null);

  const { data: agents = [] } = useQuery({
    queryKey: ["ai_agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("agent_id, name, agent_type, autonomy_level, is_active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: controls = [] } = useQuery({
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

  const rows = useMemo(() => {
    return mappings
      .map((m) => ({ m, c: controlMap[m.control_id] }))
      .filter((r): r is { m: Mapping; c: Control } => !!r.c)
      .filter((r) => agentFilter === "all" || r.m.agent_id === agentFilter)
      .filter((r) => frameworkFilter === "all" || r.c.framework === frameworkFilter)
      .filter((r) => statusFilter === "all" || r.m.status === statusFilter)
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          r.c.title.toLowerCase().includes(q) ||
          r.c.control_ref.toLowerCase().includes(q) ||
          (agentMap[r.m.agent_id]?.name ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        a.c.framework === b.c.framework
          ? a.c.control_ref.localeCompare(b.c.control_ref)
          : a.c.framework.localeCompare(b.c.framework)
      );
  }, [mappings, controlMap, agentMap, agentFilter, frameworkFilter, statusFilter, search]);

  const scopedMappings = useMemo(
    () =>
      mappings.filter(
        (m) => agentFilter === "all" || m.agent_id === agentFilter
      ),
    [mappings, agentFilter]
  );

  function coverage(framework: string) {
    const inFw = scopedMappings.filter((m) => controlMap[m.control_id]?.framework === framework);
    const required = inFw.filter((m) => m.status !== "not_applicable");
    const satisfied = required.filter((m) => m.status === "satisfied").length;
    const gaps = required.filter((m) => m.status === "gap").length;
    const unverified = required.filter((m) => m.status === "unverified").length;
    return {
      total: required.length,
      satisfied,
      gaps,
      unverified,
      pct: required.length ? Math.round((satisfied / required.length) * 100) : 0,
    };
  }

  const openGaps = scopedMappings.filter((m) => m.status === "gap").length;
  const openUnverified = scopedMappings.filter((m) => m.status === "unverified").length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Automation Compliance</h1>
            <Badge variant="outline" className="text-[10px]">AI &amp; Intelligence</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            SOC 2, ISO 27001, HIPAA, GDPR and CMMC requirements mapped to every automation on the platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportToCSV(
                rows.map((r) => ({
                  automation: agentMap[r.m.agent_id]?.name ?? r.m.agent_id,
                  framework: r.c.framework,
                  control: r.c.control_ref,
                  requirement: r.c.title,
                  status: STATUS_LABEL[r.m.status] ?? r.m.status,
                  owner: r.m.owner ?? "",
                  evidence: r.m.evidence ?? "",
                  last_reviewed: r.m.last_reviewed ?? "",
                })),
                "automation-compliance"
              )
            }
          >
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => remap.mutate()} disabled={remap.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1 ${remap.isPending ? "animate-spin" : ""}`} />
            Re-map requirements
          </Button>
        </div>
      </div>

      {(openGaps > 0 || openUnverified > 0) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm">
              <span className="font-medium">{openGaps} open gap(s)</span> and{" "}
              <span className="font-medium">{openUnverified} unverified requirement(s)</span> across the automations in
              view. Automations still run — this is a warning, not a block. Close gaps before relying on these
              automations in a regulated workflow.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {FRAMEWORKS.map((fw) => {
          const c = coverage(fw);
          return (
            <Card key={fw} className="ss-stat-card">
              <CardContent className="p-0">
                <p className="ss-stat-label flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {fw}
                </p>
                <p className="ss-stat-value">{c.pct}%</p>
                <Progress value={c.pct} className="h-1.5 mt-2" />
                <p className="text-[11px] text-muted-foreground mt-2">
                  {c.satisfied}/{c.total} satisfied · {c.gaps} gap{c.gaps === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search requirement or automation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-52 h-9 text-sm"><SelectValue placeholder="All automations" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All automations</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.agent_id} value={a.agent_id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="All frameworks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All frameworks</SelectItem>
            {FRAMEWORKS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="ss-card-glow">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Automation</TableHead>
                <TableHead className="text-xs">Framework</TableHead>
                <TableHead className="text-xs">Control</TableHead>
                <TableHead className="text-xs">Requirement</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Owner</TableHead>
                <TableHead className="text-xs w-24">Evidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-sm">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                    No mapped requirements match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ m, c }) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs font-medium">
                      {agentMap[m.agent_id]?.name ?? m.agent_id}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{c.framework}</Badge></TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {c.control_ref}
                    </TableCell>
                    <TableCell className="text-xs max-w-[280px]">{c.title}</TableCell>
                    <TableCell>
                      <Select value={m.status} onValueChange={(status) => update.mutate({ id: m.id, status })}>
                        <SelectTrigger className={`h-7 w-32 text-[10px] ${STATUS_STYLE[m.status] ?? ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABEL).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.owner || "—"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px]"
                        onClick={() => setEditing({ mapping: m, control: c })}
                      >
                        <FileCheck2 className="h-3.5 w-3.5 mr-1" />
                        {m.evidence ? "View" : "Add"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editing?.control.framework} {editing?.control.control_ref}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                update.mutate({
                  id: editing.mapping.id,
                  owner: (fd.get("owner") as string) || null,
                  evidence: (fd.get("evidence") as string) || null,
                  notes: (fd.get("notes") as string) || null,
                  last_reviewed: (fd.get("last_reviewed") as string) || null,
                });
                setEditing(null);
              }}
            >
              <div>
                <p className="text-sm font-medium">{editing.control.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{editing.control.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Control owner</Label>
                  <Input name="owner" defaultValue={editing.mapping.owner ?? ""} placeholder="e.g. Security lead" />
                </div>
                <div>
                  <Label className="text-xs">Last reviewed</Label>
                  <Input name="last_reviewed" type="date" defaultValue={editing.mapping.last_reviewed ?? ""} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Evidence</Label>
                <Textarea
                  name="evidence"
                  rows={3}
                  defaultValue={editing.mapping.evidence ?? ""}
                  placeholder="Link or describe the control evidence (log export, policy, config screenshot)…"
                />
              </div>
              <div>
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
