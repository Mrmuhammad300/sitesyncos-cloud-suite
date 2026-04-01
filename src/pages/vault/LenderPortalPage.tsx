import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, FileCheck, AlertTriangle, CheckCircle2, Clock, Upload, Eye } from "lucide-react";

const lenders = [
  { id: "L-001", name: "First National Bank", type: "Senior Debt", commitment: "$18,500,000", drawn: "$12,950,000", rate: "SOFR + 225", maturity: "2026-09-15", status: "Active", compliance: 94 },
  { id: "L-002", name: "Pacific Capital Partners", type: "Mezzanine", commitment: "$5,000,000", drawn: "$5,000,000", rate: "12.5% Fixed", maturity: "2027-03-01", status: "Active", compliance: 100 },
  { id: "L-003", name: "Regional Credit Union", type: "Construction", commitment: "$24,000,000", drawn: "$8,400,000", rate: "SOFR + 300", maturity: "2026-12-31", status: "Active", compliance: 87 },
  { id: "L-004", name: "Silverstone Capital", type: "Bridge", commitment: "$7,200,000", drawn: "$7,200,000", rate: "10.0% Fixed", maturity: "2025-06-30", status: "Maturing", compliance: 92 },
];

const covenants = [
  { name: "Debt Service Coverage Ratio", required: "≥ 1.25x", actual: "1.42x", status: "pass" },
  { name: "Loan-to-Value", required: "≤ 75%", actual: "68%", status: "pass" },
  { name: "Minimum Occupancy", required: "≥ 85%", actual: "82%", status: "warning" },
  { name: "Interest Reserve", required: "≥ 6 months", actual: "8 months", status: "pass" },
  { name: "Net Worth Requirement", required: "≥ $10M", actual: "$14.2M", status: "pass" },
  { name: "Quarterly Reporting", required: "By 45th day", actual: "Filed Day 38", status: "pass" },
];

const documents = [
  { name: "Q4 2024 Financial Statements", type: "Financial Report", date: "2025-01-28", status: "Submitted" },
  { name: "Insurance Certificate Renewal", type: "Insurance", date: "2025-01-15", status: "Approved" },
  { name: "Environmental Phase I", type: "Environmental", date: "2024-11-20", status: "Approved" },
  { name: "Appraisal Report - Skyline Tower", type: "Appraisal", date: "2024-10-05", status: "Under Review" },
  { name: "Title Commitment", type: "Legal", date: "2024-09-18", status: "Approved" },
];

export default function LenderPortalPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Lender Portal</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Vault</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Manage lender relationships, draws, and compliance tracking.</p>
        </div>
        <Button size="sm"><Upload className="h-4 w-4 mr-1.5" /> Upload Document</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Commitment</p><p className="text-xl font-bold">$54.7M</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Drawn</p><p className="text-xl font-bold">$33.6M</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Available</p><p className="text-xl font-bold text-success">$21.1M</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Compliance</p><p className="text-xl font-bold">93%</p></CardContent></Card>
      </div>

      <Tabs defaultValue="lenders">
        <TabsList>
          <TabsTrigger value="lenders" className="text-xs">Lenders</TabsTrigger>
          <TabsTrigger value="covenants" className="text-xs">Covenants</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="lenders" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Lender</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Commitment</TableHead>
                    <TableHead className="text-xs">Drawn</TableHead>
                    <TableHead className="text-xs">Rate</TableHead>
                    <TableHead className="text-xs">Maturity</TableHead>
                    <TableHead className="text-xs">Compliance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lenders.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{l.name}</p>
                        <Badge variant="outline" className={`text-[10px] mt-0.5 ${l.status === "Maturing" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{l.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{l.type}</TableCell>
                      <TableCell className="text-sm font-medium">{l.commitment}</TableCell>
                      <TableCell className="text-sm">{l.drawn}</TableCell>
                      <TableCell className="text-xs font-mono">{l.rate}</TableCell>
                      <TableCell className="text-sm">{l.maturity}</TableCell>
                      <TableCell>
                        <div className="w-16">
                          <p className="text-[10px] text-muted-foreground mb-0.5">{l.compliance}%</p>
                          <Progress value={l.compliance} className="h-1.5" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="covenants" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Covenant</TableHead>
                    <TableHead className="text-xs">Required</TableHead>
                    <TableHead className="text-xs">Actual</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {covenants.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="text-sm font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm font-mono">{c.required}</TableCell>
                      <TableCell className="text-sm font-mono font-medium">{c.actual}</TableCell>
                      <TableCell>
                        {c.status === "pass" ? (
                          <Badge variant="outline" className="text-[10px] bg-success/10 text-success"><CheckCircle2 className="h-3 w-3 mr-1" />Pass</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Document</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((d) => (
                    <TableRow key={d.name}>
                      <TableCell className="text-sm font-medium">{d.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.type}</TableCell>
                      <TableCell className="text-sm">{d.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${d.status === "Approved" ? "bg-success/10 text-success" : d.status === "Submitted" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>{d.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
