import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CheckCircle2, AlertTriangle, Clock, Search, FileText } from "lucide-react";

interface ComplianceItem {
  id: string;
  category: string;
  requirement: string;
  status: "Compliant" | "Non-Compliant" | "Pending" | "Expired";
  dueDate: string;
  assignee: string;
  lastChecked: string;
}

const mockItems: ComplianceItem[] = [
  { id: "1", category: "Fire Safety", requirement: "Fire alarm system inspection", status: "Compliant", dueDate: "2026-06-15", assignee: "J. Martinez", lastChecked: "2026-03-15" },
  { id: "2", category: "Fire Safety", requirement: "Sprinkler system test", status: "Compliant", dueDate: "2026-07-01", assignee: "J. Martinez", lastChecked: "2026-01-01" },
  { id: "3", category: "Structural", requirement: "Load-bearing wall inspection", status: "Pending", dueDate: "2026-04-10", assignee: "K. Chen", lastChecked: "2025-10-10" },
  { id: "4", category: "Electrical", requirement: "Panel load balancing review", status: "Non-Compliant", dueDate: "2026-03-01", assignee: "R. Patel", lastChecked: "2026-02-28" },
  { id: "5", category: "Environmental", requirement: "Stormwater management plan", status: "Compliant", dueDate: "2026-09-01", assignee: "S. Lee", lastChecked: "2026-03-20" },
  { id: "6", category: "OSHA", requirement: "Fall protection audit", status: "Pending", dueDate: "2026-04-15", assignee: "M. Davis", lastChecked: "2026-01-15" },
  { id: "7", category: "Permits", requirement: "Building permit renewal", status: "Expired", dueDate: "2026-03-15", assignee: "A. Wilson", lastChecked: "2025-03-15" },
  { id: "8", category: "ADA", requirement: "Accessibility compliance review", status: "Compliant", dueDate: "2026-12-01", assignee: "T. Brown", lastChecked: "2026-02-01" },
  { id: "9", category: "Environmental", requirement: "Air quality monitoring", status: "Pending", dueDate: "2026-04-20", assignee: "S. Lee", lastChecked: "2026-03-20" },
  { id: "10", category: "Zoning", requirement: "Setback variance approval", status: "Compliant", dueDate: "2027-01-01", assignee: "A. Wilson", lastChecked: "2026-01-10" },
];

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  Compliant: { color: "text-green-500", icon: CheckCircle2 },
  "Non-Compliant": { color: "text-destructive", icon: AlertTriangle },
  Pending: { color: "text-yellow-500", icon: Clock },
  Expired: { color: "text-destructive", icon: AlertTriangle },
};

export default function CompliancePage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = mockItems
    .filter((i) => tab === "all" || i.status === tab)
    .filter((i) => !search || i.requirement.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));

  const compliant = mockItems.filter((i) => i.status === "Compliant").length;
  const score = Math.round((compliant / mockItems.length) * 100);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Compliance</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Vault</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Track regulatory compliance, inspections, and certification deadlines.</p>
        </div>
        <Button size="sm"><FileText className="h-3.5 w-3.5 mr-1.5" /> Export Report</Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Compliance Score</p>
            <p className="text-2xl font-bold">{score}%</p>
            <Progress value={score} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        {(["Compliant", "Pending", "Non-Compliant", "Expired"] as const).slice(0, 3).map((s) => {
          const count = mockItems.filter((i) => i.status === s).length;
          const cfg = statusConfig[s];
          return (
            <Card key={s}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s}</p>
                <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters & Table */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search requirements…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 text-sm h-9" />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="Compliant" className="text-xs">Compliant</TabsTrigger>
            <TabsTrigger value="Pending" className="text-xs">Pending</TabsTrigger>
            <TabsTrigger value="Non-Compliant" className="text-xs">Issues</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Requirement</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Due Date</TableHead>
                <TableHead className="text-xs">Assignee</TableHead>
                <TableHead className="text-xs">Last Checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const cfg = statusConfig[item.status];
                const Icon = cfg.icon;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{item.category}</Badge></TableCell>
                    <TableCell className="text-xs font-medium">{item.requirement}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1.5 text-xs ${cfg.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {item.status}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.dueDate}</TableCell>
                    <TableCell className="text-xs">{item.assignee}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.lastChecked}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}