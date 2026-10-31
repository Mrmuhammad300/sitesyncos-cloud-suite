import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CalendarPlus, LayoutGrid, Lock, Rows3, Shield, UserCog, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar, type StatusTone } from "@/components/os";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const ALL_ROLES: AppRole[] = [
  "super_admin", "admin", "project_manager", "superintendent",
  "architect", "engineer", "owner", "subcontractor", "lender", "field_staff",
];

/** Role families share a tone so the pills read as groups, not a rainbow. */
const ROLE_TONE: Record<string, StatusTone> = {
  super_admin: "primary", admin: "primary",
  project_manager: "info", superintendent: "info",
  architect: "data", engineer: "data",
  owner: "success", lender: "success",
  subcontractor: "warning", field_staff: "neutral",
};
const ROLE_BAR: Record<StatusTone, string> = {
  primary: "bg-primary", info: "bg-info", data: "bg-data", success: "bg-success", warning: "bg-warning", destructive: "bg-destructive", neutral: "bg-muted-foreground/40",
};
const AVATAR = [
  "from-chart-1/30 to-chart-1/5 text-chart-1",
  "from-chart-2/30 to-chart-2/5 text-chart-2",
  "from-chart-3/30 to-chart-3/5 text-chart-3",
  "from-chart-4/30 to-chart-4/5 text-chart-4",
  "from-chart-5/30 to-chart-5/5 text-chart-5",
];

function roleLabel(r: string) {
  return r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
const initialsOf = (p: Profile) => (p.display_name ?? p.user_id).split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function Avatar({ p, size = "md" }: { p: Profile; size?: "md" | "lg" }) {
  return (
    <span className={cn(
      "flex shrink-0 items-center justify-center rounded-full border bg-gradient-to-br font-mono font-medium",
      AVATAR[hash(p.user_id) % AVATAR.length],
      size === "lg" ? "h-11 w-11 text-sm" : "h-8 w-8 text-[11px]",
    )}>
      {initialsOf(p)}
    </span>
  );
}

export default function TeamPage() {
  const qc = useQueryClient();
  const { profile: myProfile, user } = useAuth();
  const isAdmin = myProfile?.role === "admin" || myProfile?.role === "super_admin";

  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("field_staff");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["team-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["team-profiles"] });
      setEditUser(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = profiles.filter((p) => {
    const ms = search === "" ||
      (p.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      p.user_id.toLowerCase().includes(search.toLowerCase());
    const mr = roleFilter === "all" || p.role === roleFilter;
    return ms && mr;
  });

  // Role distribution counts
  const roleCounts = profiles.reduce<Record<string, number>>((acc, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1;
    return acc;
  }, {});
  const distribution = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);
  const admins = profiles.filter((p) => p.role === "admin" || p.role === "super_admin").length;
  const recent = profiles.filter((p) => Date.now() - new Date(p.created_at).getTime() < 30 * 86_400_000).length;

  const openEdit = (p: Profile) => { setEditUser(p); setEditRole(p.role); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Everyone with access to this workspace, and what they're allowed to do."
        actions={
          <>
            {isAdmin && <StatusPill status="Admin view" tone="primary" />}
            <Button variant="outline" onClick={() => toast.info("New members join by signing up with your organization's email domain.")}>
              <UserPlus /> Invite
            </Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Members" value={profiles.length} icon={Users} loading={isLoading} hint="With workspace access" />
        <StatCard label="Admins" value={admins} icon={Shield} tone="primary" loading={isLoading} hint="Can change roles" />
        <StatCard label="Roles in use" value={distribution.length} icon={UserCog} loading={isLoading} hint={`of ${ALL_ROLES.length} available`} />
        <StatCard label="Joined · 30d" value={recent} icon={CalendarPlus} tone="data" loading={isLoading} hint="New this month" />
      </section>

      {distribution.length > 0 && (
        <Panel eyebrow="Composition" title="Role distribution">
          <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
            {distribution.map(([role, count]) => (
              <span key={role} className={cn("h-full border-r border-card last:border-r-0", ROLE_BAR[ROLE_TONE[role] ?? "neutral"])} style={{ width: `${(count / profiles.length) * 100}%` }} title={`${roleLabel(role)}: ${count}`} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {distribution.map(([role, count]) => (
              <li key={role} className="flex items-center gap-2 text-xs">
                <span className={cn("h-2 w-2 rounded-[2px]", ROLE_BAR[ROLE_TONE[role] ?? "neutral"])} />
                <span className="text-muted-foreground">{roleLabel(role)}</span>
                <span className="ss-num">{count}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {!isAdmin && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/10 p-3.5 text-[13px]">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p><span className="font-medium">Read-only.</span> <span className="text-muted-foreground">Role changes require admin privileges — contact your administrator to modify team roles.</span></p>
        </div>
      )}

      <Panel
        flush
        eyebrow="Directory"
        title={<span className="flex items-center gap-2">Members <span className="ss-num text-xs font-normal text-muted-foreground">{filtered.length}</span></span>}
        actions={
          <div className="flex rounded-lg border bg-surface-2/60 p-0.5" role="radiogroup" aria-label="Layout">
            {([["cards", LayoutGrid], ["table", Rows3]] as const).map(([k, Icon]) => (
              <button key={k} role="radio" aria-checked={view === k} aria-label={k === "cards" ? "Card view" : "Table view"} onClick={() => setView(k)}
                className={cn("flex h-7 w-8 items-center justify-center rounded-md transition-colors", view === k ? "bg-surface-1 text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        }
      >
        <Toolbar className="border-b px-5 pb-3">
          <SearchField value={search} onChange={setSearch} placeholder="Search by name or ID…" />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Role filter"><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Toolbar>

        {isLoading ? (
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-36 animate-shimmer rounded-xl bg-[linear-gradient(90deg,hsl(var(--muted))_0%,hsl(var(--surface-3))_50%,hsl(var(--muted))_100%)] bg-[length:200%_100%]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState compact icon={Users} title="No team members found" description="Try a different name or role filter." action={<Button size="sm" variant="outline" onClick={() => { setSearch(""); setRoleFilter("all"); }}>Clear filters</Button>} />
          </div>
        ) : view === "cards" ? (
          <div className="stagger grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((p) => {
              const me = p.user_id === user?.id;
              return (
                <article key={p.id} className="ss-card ss-interactive flex flex-col gap-4 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar p={p} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold">
                        <span className="truncate">{p.display_name ?? "Unnamed"}</span>
                        {me && <span className="rounded border px-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">You</span>}
                      </p>
                      <p className="ss-num truncate text-[11px] text-muted-foreground">{p.user_id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <StatusPill status={roleLabel(p.role)} tone={ROLE_TONE[p.role] ?? "neutral"} />
                    <span className="ss-num text-[11px] text-muted-foreground">Since {fmtDate(p.created_at)}</span>
                  </div>
                  {isAdmin && (
                    <Button size="xs" variant="outline" className="w-full" onClick={() => openEdit(p)}>
                      <UserCog /> Change role
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {isAdmin && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar p={p} />
                        <span className="whitespace-nowrap text-sm font-medium">{p.display_name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="ss-num text-xs text-muted-foreground">{p.user_id.slice(0, 8)}…</TableCell>
                    <TableCell><StatusPill status={roleLabel(p.role)} tone={ROLE_TONE[p.role] ?? "neutral"} /></TableCell>
                    <TableCell className="ss-num whitespace-nowrap text-xs text-muted-foreground">{fmtDate(p.created_at)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button size="xs" variant="ghost" onClick={() => openEdit(p)}><UserCog />Edit</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <div className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-[13px]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-surface-2 text-muted-foreground"><UserPlus className="h-4 w-4" /></span>
        <div>
          <p className="font-medium">Inviting new members</p>
          <p className="mt-0.5 text-muted-foreground">
            New users can register at the login page using your organization's email domain. Admins can update their role after their first sign-in.
          </p>
        </div>
      </div>

      {/* Edit role dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>Update what {editUser?.display_name ?? "this user"} can access.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="flex items-center gap-3 rounded-lg border bg-surface-2/50 p-3">
              <Avatar p={editUser} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{editUser.display_name ?? "User"}</p>
                <p className="ss-num truncate text-[11px] text-muted-foreground">{editUser.user_id}</p>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Assign role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button
                size="sm"
                disabled={updateRole.isPending || editRole === editUser?.role}
                onClick={() => editUser && updateRole.mutate({ userId: editUser.user_id, role: editRole })}
              >
                {updateRole.isPending ? "Saving…" : "Save role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
