import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TablePagination } from "@/components/TablePagination";
import { ChevronRight, Download, FilePen, FilePlus2, FileX2, RefreshCw, ScrollText, ShieldAlert } from "lucide-react";
import { exportToCSV } from "@/lib/export";
import { EmptyState, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar, type StatusTone } from "@/components/os";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_META: Record<string, { tone: StatusTone; verb: string; icon: typeof FilePen; node: string }> = {
  INSERT: { tone: "success", verb: "created", icon: FilePlus2, node: "border-success/40 bg-success/15 text-success" },
  UPDATE: { tone: "info", verb: "updated", icon: FilePen, node: "border-info/40 bg-info/15 text-info" },
  DELETE: { tone: "destructive", verb: "deleted", icon: FileX2, node: "border-destructive/40 bg-destructive/15 text-destructive" },
};
const FALLBACK_META = { tone: "neutral" as StatusTone, verb: "changed", icon: FilePen, node: "border-border bg-muted text-muted-foreground" };

const TABLE_LABELS: Record<string, string> = {
  projects: "Projects", rfis: "RFIs", submittals: "Submittals",
  change_orders: "Change Orders", daily_reports: "Daily Reports",
  budgets: "Budgets", draw_requests: "Draw Requests", tenants: "Tenants",
  work_orders: "Work Orders", documents: "Documents",
  properties: "Properties", lenders: "Lenders", compliance_items: "Compliance",
};

const PAGE_SIZE = 50;

const changedKeys = (l: AuditLog) => {
  if (!l.old_values || !l.new_values) return [];
  return Object.keys(l.new_values).filter((k) => k !== "updated_at" && JSON.stringify(l.new_values![k]) !== JSON.stringify(l.old_values![k]));
};
const fmtVal = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

export default function AuditLogPage() {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const [search, setSearch]       = useState("");
  const [actionFilter, setAction] = useState("all");
  const [tableFilter, setTable]   = useState("all");
  const [page, setPage]           = useState(1);
  const [detail, setDetail]       = useState<AuditLog | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["audit_logs", page, actionFilter, tableFilter],
    enabled: isAdmin,
    queryFn: async () => {
      let q = supabase
        .from("audit_logs" as never)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (actionFilter !== "all") q = q.eq("action", actionFilter) as typeof q;
      if (tableFilter  !== "all") q = q.eq("table_name", tableFilter) as typeof q;

      const { data, error, count } = await q;
      if (error) throw error;
      return { logs: (data ?? []) as AuditLog[], total: count ?? 0 };
    },
  });

  // Resolve actor names (same cache key as the Team page).
  const { data: people = [] } = useQuery({
    queryKey: ["team-profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const nameOf = useMemo(() => {
    const m = new Map(people.map((p) => [p.user_id, p.display_name] as const));
    return (uid: string | null) => {
      if (!uid) return "System";
      if (uid === user?.id) return "You";
      return m.get(uid) ?? uid.slice(0, 8);
    };
  }, [people, user?.id]);

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtered = search.trim()
    ? logs.filter((l) =>
        l.table_name.includes(search.toLowerCase()) ||
        l.record_id?.toLowerCase().includes(search.toLowerCase()) ||
        l.user_id?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const days = useMemo(() => {
    const map = new Map<string, AuditLog[]>();
    for (const l of filtered) {
      const k = new Date(l.created_at).toDateString();
      map.set(k, [...(map.get(k) ?? []), l]);
    }
    return [...map.entries()];
  }, [filtered]);

  const counts = { INSERT: 0, UPDATE: 0, DELETE: 0 } as Record<string, number>;
  logs.forEach((l) => { counts[l.action] = (counts[l.action] ?? 0) + 1; });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit Log" description="System-wide activity tracking." />
        <EmptyState
          icon={ShieldAlert}
          title="Admin access required"
          description="Audit logs are only visible to admin and super_admin users. Ask an administrator if you need an activity report."
        />
      </div>
    );
  }

  const dayLabel = (k: string) => {
    const d = new Date(k);
    const today = new Date().toDateString();
    const yest = new Date(Date.now() - 86_400_000).toDateString();
    const rel = k === today ? "Today" : k === yest ? "Yesterday" : null;
    const abs = d.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
    return { rel, abs };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description={<>Every create, update and delete across the workspace — <span className="ss-num text-foreground">{total.toLocaleString()}</span> events recorded.</>}
        actions={
          <>
            <StatusPill status="Admin only" tone="primary" />
            <Button
              variant="outline"
              disabled={filtered.length === 0}
              onClick={() => exportToCSV(
                filtered.map((l) => ({
                  time: new Date(l.created_at).toLocaleString(),
                  action: l.action,
                  table: l.table_name,
                  record_id: l.record_id ?? "",
                  user_id: l.user_id ?? "",
                })),
                "audit-log"
              )}
            >
              <Download /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={cn(isRefetching && "animate-spin")} /> Refresh
            </Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Events" value={total.toLocaleString()} icon={ScrollText} loading={isLoading} hint="All time" />
        <StatCard label="Created" value={counts.INSERT} icon={FilePlus2} tone="success" loading={isLoading} hint="This page" onClick={() => { setAction("INSERT"); setPage(1); }} />
        <StatCard label="Updated" value={counts.UPDATE} icon={FilePen} tone="info" loading={isLoading} hint="This page" onClick={() => { setAction("UPDATE"); setPage(1); }} />
        <StatCard label="Deleted" value={counts.DELETE} icon={FileX2} tone="destructive" loading={isLoading} hint="This page" onClick={() => { setAction("DELETE"); setPage(1); }} />
      </section>

      <Panel flush eyebrow="Timeline" title="Activity">
        <Toolbar className="border-b px-5 pb-3">
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search table, record or user…" />
          <div className="flex rounded-lg border bg-surface-2/60 p-0.5" role="tablist" aria-label="Action">
            {["all", "INSERT", "UPDATE", "DELETE"].map((a) => (
              <button
                key={a}
                role="tab"
                aria-selected={actionFilter === a}
                onClick={() => { setAction(a); setPage(1); }}
                className={cn("h-7 rounded-md px-2 font-mono text-[10.5px] uppercase tracking-wider transition-colors sm:px-2.5", actionFilter === a ? "bg-surface-1 text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:text-foreground")}
              >
                {a === "all" ? "All" : a}
              </button>
            ))}
          </div>
          <Select value={tableFilter} onValueChange={(v) => { setTable(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Table"><SelectValue placeholder="All tables" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tables</SelectItem>
              {Object.entries(TABLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Toolbar>

        {isLoading ? (
          <div className="space-y-1 p-5">
            {[...Array(8)].map((_, i) => <div key={i} className="h-11 animate-shimmer rounded-md bg-[linear-gradient(90deg,hsl(var(--muted))_0%,hsl(var(--surface-3))_50%,hsl(var(--muted))_100%)] bg-[length:200%_100%]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            {total === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="No audit events yet"
                description="Apply the audit_log.sql migration to start tracking. Every insert, update and delete will be recorded here with who, what and when."
                action={<Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw /> Check again</Button>}
              />
            ) : (
              <EmptyState compact icon={ScrollText} title="No results match your filters" action={<Button size="sm" variant="outline" onClick={() => { setSearch(""); setAction("all"); setTable("all"); }}>Clear filters</Button>} />
            )}
          </div>
        ) : (
          <div>
            {days.map(([day, items]) => {
              const { rel, abs } = dayLabel(day);
              return (
                <section key={day}>
                  <h3 className="sticky top-0 z-[1] flex items-center gap-2 border-b bg-card/95 px-5 py-2 backdrop-blur">
                    {rel && <span className="text-xs font-medium">{rel}</span>}
                    <span className="ss-eyebrow">{abs}</span>
                    <span className="ss-num ml-auto text-[10.5px] text-muted-foreground">{items.length}</span>
                  </h3>
                  <ol className="relative py-1">
                    <span className="absolute bottom-0 left-[103px] top-0 hidden w-px bg-border sm:block" aria-hidden />
                    {items.map((log) => {
                      const meta = ACTION_META[log.action] ?? FALLBACK_META;
                      const Icon = meta.icon;
                      const changed = changedKeys(log);
                      const actor = nameOf(log.user_id);
                      return (
                        <li key={log.id}>
                          <button onClick={() => setDetail(log)} className="group flex w-full items-start gap-3 px-5 py-2 text-left transition-colors hover:bg-accent/50">
                            <time className="ss-num hidden w-[60px] shrink-0 pt-1 text-[11px] text-muted-foreground sm:block">
                              {new Date(log.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </time>
                            <span className={cn("relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", meta.node)}>
                              <Icon className="h-3 w-3" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] leading-6">
                                <span className="font-medium">{actor}</span>{" "}
                                <span className="text-muted-foreground">{meta.verb}</span>{" "}
                                <span className="font-medium">{TABLE_LABELS[log.table_name] ?? log.table_name}</span>{" "}
                                <span className="ss-num rounded border bg-surface-2 px-1 py-px text-[11px] text-muted-foreground">{log.record_id ? log.record_id.slice(0, 8) : "—"}</span>
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <time className="ss-num text-[10.5px] text-muted-foreground sm:hidden">
                                  {new Date(log.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                </time>
                                {changed.slice(0, 4).map((k) => (
                                  <span key={k} className="ss-num rounded bg-info/10 px-1.5 py-px text-[10.5px] text-info">{k}</span>
                                ))}
                                {changed.length > 4 && <span className="ss-num text-[10.5px] text-muted-foreground">+{changed.length - 4}</span>}
                              </div>
                            </div>
                            <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </div>
        )}
      </Panel>

      {total > 0 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPage={(p) => setPage(p)}
        />
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StatusPill status={detail?.action} tone={(ACTION_META[detail?.action ?? ""] ?? FALLBACK_META).tone} className="font-mono" />
              {TABLE_LABELS[detail?.table_name ?? ""] ?? detail?.table_name}
            </DialogTitle>
            <DialogDescription>{detail && new Date(detail.created_at).toLocaleString()}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-1 gap-2 rounded-lg border bg-surface-2/50 p-3 text-xs sm:grid-cols-2">
                {[["Actor", nameOf(detail.user_id)], ["User ID", detail.user_id ?? "system"], ["Record", detail.record_id ?? "—"], ["Table", detail.table_name]].map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="ss-eyebrow">{k}</dt>
                    <dd className="ss-num mt-0.5 truncate">{v}</dd>
                  </div>
                ))}
              </dl>
              {detail.old_values && detail.new_values ? (
                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-[minmax(90px,1fr)_1.4fr_1.4fr] border-b bg-surface-2/60 px-3 py-2 ss-eyebrow">
                    <span>Field</span><span>Before</span><span>After</span>
                  </div>
                  <div className="max-h-[40vh] divide-y overflow-y-auto">
                    {Object.keys({ ...detail.old_values, ...detail.new_values }).map((k) => {
                      const before = fmtVal(detail.old_values![k]);
                      const after = fmtVal(detail.new_values![k]);
                      const diff = before !== after;
                      return (
                        <div key={k} className={cn("grid grid-cols-[minmax(90px,1fr)_1.4fr_1.4fr] gap-2 px-3 py-1.5 font-mono text-[11px]", diff && "bg-info/[0.06]")}>
                          <span className="truncate text-muted-foreground">{k}</span>
                          <span className={cn("break-all", diff ? "text-destructive line-through decoration-destructive/40" : "text-muted-foreground")}>{before}</span>
                          <span className={cn("break-all", diff ? "text-success" : "text-muted-foreground")}>{after}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                [["Previous values", detail.old_values], ["New values", detail.new_values]].map(([label, vals]) =>
                  vals ? (
                    <div key={label as string}>
                      <p className="ss-eyebrow mb-1.5">{label as string}</p>
                      <pre className="overflow-x-auto rounded-lg border bg-surface-2/60 p-3 text-[11px]">{JSON.stringify(vals, null, 2)}</pre>
                    </div>
                  ) : null,
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
