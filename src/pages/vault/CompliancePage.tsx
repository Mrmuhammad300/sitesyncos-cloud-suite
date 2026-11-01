import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, FileText, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Meter, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar } from "@/components/os";
import { ScoreRing } from "@/components/vault/ScoreRing";
import { daysUntil } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

const STATUSES = ["Compliant", "Non-Compliant", "Pending", "Expired"];
const ISSUE = new Set(["Non-Compliant", "Expired"]);

/** Columns of the status matrix. Unknown statuses land in "In progress". */
const BUCKETS = [
  { key: "ok", label: "Compliant", match: (s: string) => s === "Compliant", cell: "bg-success/15 text-success border-success/25" },
  { key: "flight", label: "In progress", match: (s: string) => !["Compliant", "Expiring", "Non-Compliant", "Expired"].includes(s), cell: "bg-info/10 text-info border-info/25" },
  { key: "risk", label: "Expiring", match: (s: string) => s === "Expiring", cell: "bg-warning/15 text-warning border-warning/25" },
  { key: "bad", label: "Issue", match: (s: string) => ISSUE.has(s), cell: "bg-destructive/15 text-destructive border-destructive/25" },
] as const;

const fmtDay = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—");

export default function CompliancePage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["compliance_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("compliance_items").select("*").order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("compliance_items").insert({
        category: form.get("category") as string,
        requirement: form.get("requirement") as string,
        status: form.get("status") as string,
        due_date: form.get("due_date") as string || null,
        assignee: form.get("assignee") as string,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["compliance_items"] }); setOpen(false); toast.success("Item added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("compliance_items").update({ status, last_checked: new Date().toISOString().split("T")[0] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["compliance_items"] }); toast.success("Status updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = items
    .filter((i) => tab === "all" || (tab === "issues" ? ISSUE.has(i.status) : i.status === tab))
    .filter((i) => !search || i.requirement.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));

  const compliant = items.filter((i) => i.status === "Compliant").length;
  const score = items.length ? Math.round((compliant / items.length) * 100) : 0;
  const pending = items.filter((i) => i.status === "Pending").length;
  const issues = items.filter((i) => ISSUE.has(i.status)).length;

  const matrix = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.category))).sort();
    return cats.map((c) => {
      const rows = items.filter((i) => i.category === c);
      return {
        category: c,
        total: rows.length,
        score: Math.round((rows.filter((i) => i.status === "Compliant").length / rows.length) * 100),
        counts: BUCKETS.map((b) => rows.filter((i) => b.match(i.status)).length),
      };
    });
  }, [items]);

  const deadlines = useMemo(
    () => items
      .filter((i) => i.due_date && i.status !== "Compliant")
      .map((i) => ({ ...i, days: daysUntil(i.due_date) ?? 0 }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 7),
    [items],
  );
  const overdue = items.filter((i) => i.status !== "Compliant" && (daysUntil(i.due_date) ?? 1) < 0).length;

  const addDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> Add requirement</Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add compliance item</DialogTitle>
          <DialogDescription>Permits, inspections, certifications — anything with a deadline and an owner.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">Category</Label><Input name="category" required placeholder="e.g. Fire Safety, OSHA" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Requirement</Label><Input name="requirement" required /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs">Status</Label>
              <Select name="status" defaultValue="Pending">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Due date</Label><Input name="due_date" type="date" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Assignee</Label><Input name="assignee" /></div>
          <Button type="submit" className="w-full" disabled={create.isPending}>Create</Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        description="Permits, inspections and certifications across the portfolio — what's clear, what's due, what's at risk."
        actions={addDialog}
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Compliance score" value={items.length ? `${score}%` : "—"} icon={ShieldCheck} loading={isLoading}
          tone={!items.length ? "default" : score >= 90 ? "success" : score >= 70 ? "warning" : "destructive"}
          hint={`${compliant} of ${items.length} clear`} />
        <StatCard label="Compliant" value={compliant} icon={CheckCircle2} tone={compliant ? "success" : "default"} loading={isLoading}
          hint={items.length ? `${matrix.length} categories` : "—"} onClick={() => setTab("Compliant")} />
        <StatCard label="Pending" value={pending} icon={Clock} tone={pending ? "warning" : "default"} loading={isLoading}
          hint={deadlines[0] ? `Next due ${fmtDay(deadlines[0].due_date)}` : "Nothing due"} onClick={() => setTab("Pending")} />
        <StatCard label="Issues" value={issues} icon={AlertTriangle} tone={issues ? "destructive" : "default"} loading={isLoading}
          hint={overdue ? `${overdue} past due` : "None past due"} onClick={() => setTab("issues")} />
      </section>

      {!isLoading && items.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No compliance items tracked"
          description="Add permits, inspections and certifications to see a live status matrix and deadline timeline."
          action={<Button size="sm" onClick={() => setOpen(true)}><Plus /> Add requirement</Button>} />
      ) : (
        <>
          <section className="grid grid-cols-1 items-start gap-3 xl:grid-cols-5">
            <Panel className="xl:col-span-3" eyebrow="Status matrix" title="By category" flush
              actions={<ScoreRing value={items.length ? score : null} size={44} stroke={4} />}>
              {isLoading ? (
                <div className="space-y-2 p-5 pt-0">{[0, 1, 2, 3].map((i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />)}</div>
              ) : (
                <div className="overflow-x-auto border-t">
                  <table className="w-full min-w-[520px] border-separate border-spacing-y-1 px-3 text-[13px]">
                    <thead>
                      <tr>
                        <th className="ss-eyebrow px-2 py-2 text-left text-[9px] font-medium">Category</th>
                        {BUCKETS.map((b) => <th key={b.key} className="ss-eyebrow w-[84px] whitespace-nowrap px-1 py-2 text-center text-[9px] font-medium">{b.label}</th>)}
                        <th className="ss-eyebrow w-[120px] px-2 py-2 text-right text-[9px] font-medium">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.map((row) => (
                        <tr key={row.category}>
                          <td className="truncate px-2 py-1 font-medium">{row.category}</td>
                          {row.counts.map((n, i) => (
                            <td key={BUCKETS[i].key} className="px-1 py-1">
                              <div className={cn(
                                "flex h-8 items-center justify-center rounded-md border font-mono text-[12px] tabular-nums transition-colors",
                                n ? BUCKETS[i].cell : "border-dashed border-border text-muted-foreground/40",
                              )}>{n || "·"}</div>
                            </td>
                          ))}
                          <td className="px-2 py-1">
                            <div className="flex items-center gap-2">
                              <Meter value={row.score} tone={row.score >= 90 ? "success" : row.score >= 50 ? "warning" : "destructive"} className="flex-1" />
                              <span className="w-8 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{row.score}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel className="xl:col-span-2" eyebrow="Deadlines" title="What's coming due" actions={<CalendarClock className="h-4 w-4 text-muted-foreground" />}>
              {isLoading ? (
                <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}</div>
              ) : deadlines.length === 0 ? (
                <EmptyState compact icon={CheckCircle2} title="Nothing outstanding" description="Every dated requirement is compliant." />
              ) : (
                <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-border">
                  {deadlines.map((d) => {
                    const late = d.days < 0;
                    const soon = !late && d.days <= 14;
                    return (
                      <li key={d.id} className="relative flex items-start gap-3 py-1.5 pl-6">
                        <span className={cn(
                          "absolute left-0 top-[11px] h-[11px] w-[11px] rounded-full border-2 border-card",
                          late ? "bg-destructive" : soon ? "bg-warning" : "bg-muted-foreground/50",
                        )} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{d.requirement}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{d.category} · {d.assignee || "Unassigned"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={cn("font-mono text-[12px] tabular-nums", late ? "text-destructive" : soon ? "text-warning" : "text-foreground")}>
                            {late ? `${-d.days}d late` : d.days === 0 ? "Today" : `${d.days}d`}
                          </p>
                          <p className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{fmtDay(d.due_date)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Panel>
          </section>

          <Panel flush eyebrow="Register" title="All requirements">
            <Toolbar className="border-t px-5 py-3">
              <SearchField value={search} onChange={setSearch} placeholder="Search requirements…" />
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="h-9">
                  {[
                    ["all", "All", items.length],
                    ["Compliant", "Compliant", compliant],
                    ["Pending", "Pending", pending],
                    ["issues", "Issues", issues],
                  ].map(([v, l, n]) => (
                    <TabsTrigger key={v} value={String(v)} className="gap-1.5 text-xs">
                      {l}<span className="font-mono text-[10px] tabular-nums text-muted-foreground">{n}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </Toolbar>
            {isLoading ? (
              <div className="space-y-2 border-t p-5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="border-t p-5">
                <EmptyState compact icon={FileText} title="No matching requirements" description="Try a different search or status filter."
                  action={<Button size="sm" variant="outline" onClick={() => { setSearch(""); setTab("all"); }}>Clear filters</Button>} />
              </div>
            ) : (
              <div className="overflow-x-auto border-t">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      {["Requirement", "Category", "Status", "Due", "Assignee", "Update"].map((h) => (
                        <th key={h} className="ss-eyebrow px-4 py-2.5 text-[9.5px] font-medium first:pl-5 last:pr-5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {filtered.map((item) => {
                      const d = daysUntil(item.due_date);
                      const late = item.status !== "Compliant" && d !== null && d < 0;
                      return (
                        <tr key={item.id} className="transition-colors hover:bg-surface-2/50">
                          <td className="px-4 py-3 pl-5 font-medium">{item.requirement}</td>
                          <td className="px-4 py-3"><span className="rounded-md border bg-surface-2/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">{item.category}</span></td>
                          <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                          <td className="px-4 py-3">
                            <span className={cn("font-mono text-xs tabular-nums", late ? "text-destructive" : "text-muted-foreground")}>{item.due_date ?? "—"}</span>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-muted-foreground">{item.assignee || "—"}</td>
                          <td className="px-4 py-3 pr-5">
                            <Select value={item.status} onValueChange={(status) => updateStatus.mutate({ id: item.id, status })}>
                              <SelectTrigger className="h-7 w-[148px] text-xs" aria-label={`Update status for ${item.requirement}`}><SelectValue /></SelectTrigger>
                              <SelectContent>{Array.from(new Set([item.status, ...STATUSES])).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
