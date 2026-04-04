import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TablePagination } from "@/components/TablePagination";
import { Shield, Search, Eye, AlertTriangle, RefreshCw } from "lucide-react";
import { exportToCSV } from "@/lib/export";

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

const ACTION_COLOR: Record<string, string> = {
  INSERT: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  UPDATE: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  DELETE: "bg-destructive/10 text-destructive border-destructive/20",
};

const TABLE_LABELS: Record<string, string> = {
  projects: "Projects", rfis: "RFIs", submittals: "Submittals",
  change_orders: "Change Orders", daily_reports: "Daily Reports",
  budgets: "Budgets", draw_requests: "Draw Requests", tenants: "Tenants",
  work_orders: "Work Orders", documents: "Documents",
  properties: "Properties", lenders: "Lenders", compliance_items: "Compliance",
};

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const { profile } = useAuth();
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

  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">System-wide activity tracking.</p>
        </div>
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <p className="font-medium">Admin access required</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Audit logs are only visible to admin and super_admin users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
            <Badge variant="outline" className="text-[10px]">System</Badge>
            <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
              <Shield className="h-3 w-3" />Admin Only
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total.toLocaleString()} events recorded.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
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
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search record ID or user…"
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setAction(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="INSERT">INSERT</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tableFilter} onValueChange={(v) => { setTable(v); setPage(1); }}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="All tables" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tables</SelectItem>
            {Object.entries(TABLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
        </div>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      {total === 0
                        ? "No audit events yet. Apply the audit_log.sql migration to start tracking."
                        : "No results match your filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("en-US", {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit", second: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${ACTION_COLOR[log.action] ?? ""}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {TABLE_LABELS[log.table_name] ?? log.table_name}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.record_id ? log.record_id.slice(0, 8) + "…" : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.user_id ? log.user_id.slice(0, 8) + "…" : "system"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setDetail(log)}
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPage={(p) => setPage(p)}
          />
        </>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] ${ACTION_COLOR[detail?.action ?? ""] ?? ""}`}>
                {detail?.action}
              </Badge>
              {TABLE_LABELS[detail?.table_name ?? ""] ?? detail?.table_name}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Time: </span>{new Date(detail.created_at).toLocaleString()}</div>
                <div><span className="text-muted-foreground">User: </span><span className="font-mono">{detail.user_id ?? "system"}</span></div>
                <div><span className="text-muted-foreground">Record: </span><span className="font-mono">{detail.record_id ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Table: </span>{detail.table_name}</div>
              </div>
              {detail.old_values && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Previous Values</p>
                  <pre className="text-xs bg-muted rounded p-3 overflow-x-auto">
                    {JSON.stringify(detail.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {detail.new_values && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">New Values</p>
                  <pre className="text-xs bg-muted rounded p-3 overflow-x-auto">
                    {JSON.stringify(detail.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
