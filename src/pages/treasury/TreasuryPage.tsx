import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const ledgerEntries = [
  { id: "TXN-4821", date: "2025-03-28", description: "Draw Request #14 - Skyline Tower", debit: "$450,000", credit: "", account: "Construction Payable", project: "Skyline Tower" },
  { id: "TXN-4820", date: "2025-03-27", description: "Lender Advance - First National", debit: "", credit: "$450,000", account: "Loan Proceeds", project: "Skyline Tower" },
  { id: "TXN-4819", date: "2025-03-25", description: "Subcontractor Payment - HVAC", debit: "$128,500", credit: "", account: "Subcontractor Expense", project: "Harbor View" },
  { id: "TXN-4818", date: "2025-03-24", description: "Insurance Premium Q2", debit: "$42,000", credit: "", account: "Insurance Expense", project: "Portfolio" },
  { id: "TXN-4817", date: "2025-03-22", description: "Tenant Rent Receipt - Suite 400", debit: "", credit: "$18,500", account: "Rental Income", project: "Metro Center" },
  { id: "TXN-4816", date: "2025-03-20", description: "Change Order #7 Approval", debit: "$85,200", credit: "", account: "Change Order Reserve", project: "Greenfield" },
  { id: "TXN-4815", date: "2025-03-18", description: "Architecture Fee - Phase 2", debit: "$65,000", credit: "", account: "Professional Fees", project: "Oak Creek" },
  { id: "TXN-4814", date: "2025-03-15", description: "Property Tax Payment", debit: "$34,800", credit: "", account: "Tax Expense", project: "Metro Center" },
];

const milestones = [
  { name: "Foundation Complete", project: "Greenfield Industrial", date: "2025-02-15", amount: "$4,200,000", status: "complete" },
  { name: "Steel Erection 50%", project: "Skyline Tower", date: "2025-03-30", amount: "$2,800,000", status: "current" },
  { name: "Enclosed Building", project: "Harbor View", date: "2025-05-15", amount: "$3,100,000", status: "upcoming" },
  { name: "MEP Rough-In", project: "Skyline Tower", date: "2025-06-20", amount: "$1,900,000", status: "upcoming" },
  { name: "Certificate of Occupancy", project: "Metro Center", date: "2025-04-30", amount: "$870,000", status: "upcoming" },
];

const approvals = [
  { id: "APR-112", type: "Draw Request", amount: "$320,000", requestor: "Sarah Chen", project: "Skyline Tower", date: "2025-03-29", status: "Pending" },
  { id: "APR-111", type: "Change Order", amount: "$85,200", requestor: "James Wilson", project: "Greenfield", date: "2025-03-28", status: "Pending" },
  { id: "APR-110", type: "Invoice", amount: "$42,500", requestor: "Lisa Park", project: "Metro Center", date: "2025-03-27", status: "Approved" },
  { id: "APR-109", type: "Draw Request", amount: "$450,000", requestor: "Mike Torres", project: "Harbor View", date: "2025-03-25", status: "Approved" },
  { id: "APR-108", type: "Budget Revision", amount: "$1,200,000", requestor: "Amy Rodriguez", project: "Oak Creek", date: "2025-03-22", status: "Rejected" },
];

const cashFlowData = [
  { month: "Oct", inflow: 2100, outflow: 1800 },
  { month: "Nov", inflow: 2400, outflow: 2200 },
  { month: "Dec", inflow: 1900, outflow: 2500 },
  { month: "Jan", inflow: 2800, outflow: 2100 },
  { month: "Feb", inflow: 3100, outflow: 2700 },
  { month: "Mar", inflow: 2600, outflow: 3200 },
];

const approvalStatusColor: Record<string, string> = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  Approved: "bg-success/10 text-success border-success/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function TreasuryPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Quantum Ledger</h1>
            <Badge variant="outline" className="text-[10px]">Treasury</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Event-driven ledger, milestones, and approval workflows.</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New Entry</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Assets</p><p className="text-xl font-bold">$186.5M</p><p className="text-[10px] text-success flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />+12.4% YTD</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Liabilities</p><p className="text-xl font-bold">$121.8M</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending Approvals</p><p className="text-xl font-bold text-warning">2</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">MTD Cash Flow</p><p className="text-xl font-bold text-destructive">-$600K</p><p className="text-[10px] text-destructive flex items-center gap-0.5"><ArrowDownRight className="h-3 w-3" />Outflow</p></CardContent></Card>
      </div>

      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger" className="text-xs">Ledger</TabsTrigger>
          <TabsTrigger value="milestones" className="text-xs">Milestones</TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs">Approvals</TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Debit</TableHead>
                    <TableHead className="text-xs text-right">Credit</TableHead>
                    <TableHead className="text-xs">Account</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground">{e.id}</TableCell>
                      <TableCell className="text-sm">{e.date}</TableCell>
                      <TableCell><p className="text-sm font-medium">{e.description}</p><p className="text-[10px] text-muted-foreground">{e.project}</p></TableCell>
                      <TableCell className="text-sm text-right font-medium text-destructive">{e.debit}</TableCell>
                      <TableCell className="text-sm text-right font-medium text-success">{e.credit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.account}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="mt-4 space-y-4">
          {milestones.map((m) => (
            <Card key={m.name}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${m.status === "complete" ? "bg-success/10" : m.status === "current" ? "bg-primary/10" : "bg-muted"}`}>
                  {m.status === "complete" ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.project} · {m.date}</p>
                </div>
                <p className="text-sm font-bold">{m.amount}</p>
                <Badge variant="outline" className={`text-[10px] ${m.status === "complete" ? "bg-success/10 text-success" : m.status === "current" ? "bg-primary/10 text-primary" : ""}`}>
                  {m.status === "complete" ? "Complete" : m.status === "current" ? "In Progress" : "Upcoming"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Requestor</TableHead>
                    <TableHead className="text-xs">Project</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs font-mono">{a.id}</TableCell>
                      <TableCell className="text-sm">{a.type}</TableCell>
                      <TableCell className="text-sm font-medium">{a.amount}</TableCell>
                      <TableCell className="text-sm">{a.requestor}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.project}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${approvalStatusColor[a.status]}`}>{a.status}</Badge></TableCell>
                      <TableCell>
                        {a.status === "Pending" && (
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs text-success">Approve</Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive">Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Cash Flow Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={cashFlowData}>
                  <defs>
                    <linearGradient id="inflowG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outflowG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" tickFormatter={(v) => `$${v}K`} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="inflow" stroke="hsl(142, 76%, 36%)" fill="url(#inflowG)" strokeWidth={2} name="Inflow" />
                  <Area type="monotone" dataKey="outflow" stroke="hsl(0, 84%, 60%)" fill="url(#outflowG)" strokeWidth={2} name="Outflow" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
