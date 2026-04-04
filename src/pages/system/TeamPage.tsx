import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Search, Shield, UserCog, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const ALL_ROLES: AppRole[] = [
  "super_admin", "admin", "project_manager", "superintendent",
  "architect", "engineer", "owner", "subcontractor", "lender", "field_staff",
];

const ROLE_COLOR: Record<string, string> = {
  super_admin:     "bg-purple-500/10 text-purple-600 border-purple-500/20",
  admin:           "bg-red-500/10 text-red-600 border-red-500/20",
  project_manager: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  superintendent:  "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  architect:       "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  engineer:        "bg-teal-500/10 text-teal-600 border-teal-500/20",
  owner:           "bg-amber-500/10 text-amber-600 border-amber-500/20",
  subcontractor:   "bg-orange-500/10 text-orange-600 border-orange-500/20",
  lender:          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  field_staff:     "bg-muted text-muted-foreground",
};

function roleLabel(r: string) {
  return r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TeamPage() {
  const qc = useQueryClient();
  const { profile: myProfile } = useAuth();
  const isAdmin = myProfile?.role === "admin" || myProfile?.role === "super_admin";

  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Team</h1>
            <Badge variant="outline" className="text-[10px]">System</Badge>
            {isAdmin && <Badge variant="secondary" className="text-[10px] flex items-center gap-1"><Shield className="h-3 w-3" />Admin View</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage team members and role assignments.
          </p>
        </div>
      </div>

      {/* Role distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([role, count]) => (
          <Card key={role}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{roleLabel(role)}</p>
              <p className="text-xl font-bold">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Role changes require admin privileges. Contact your administrator to modify team roles.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID…"
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ALL_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
        </div>
      ) : (
        <Card>
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    No team members found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {(p.display_name ?? p.user_id).slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{p.display_name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.user_id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${ROLE_COLOR[p.role] ?? ""}`}>
                        {roleLabel(p.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1"
                          onClick={() => { setEditUser(p); setEditRole(p.role); }}
                        >
                          <UserCog className="h-3.5 w-3.5" />Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Invite note */}
      <div className="p-4 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
          <Users className="h-4 w-4" />Inviting New Members
        </p>
        <p>
          New users can register at the login page using your organization's email domain.
          Admins can update their role after their first sign-in.
        </p>
      </div>

      {/* Edit role dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role — {editUser?.display_name ?? "User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Assign Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button
                size="sm"
                disabled={updateRole.isPending}
                onClick={() => editUser && updateRole.mutate({ userId: editUser.user_id, role: editRole })}
              >
                {updateRole.isPending ? "Saving…" : "Save Role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
