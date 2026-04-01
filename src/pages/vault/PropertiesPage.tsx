import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Search, Plus, MapPin, DollarSign, TrendingUp, Percent,
  Calendar, Eye, BarChart3, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  status: "Active" | "Under Contract" | "Due Diligence" | "Closed" | "Pipeline";
  price: string;
  priceNum: number;
  sqft: string;
  capRate: string;
  noi: string;
  irr: string;
  yearBuilt: number;
  units: number;
  occupancy: string;
}

const properties: Property[] = [
  { id: "PROP-001", name: "Meridian Office Complex", address: "450 Market St, San Francisco", type: "Office", status: "Active", price: "$28,500,000", priceNum: 28500000, sqft: "185,000", capRate: "6.2%", noi: "$1,767,000", irr: "14.8%", yearBuilt: 2018, units: 0, occupancy: "92%" },
  { id: "PROP-002", name: "Parkside Apartments", address: "2100 Oak Ave, Austin", type: "Multifamily", status: "Under Contract", price: "$15,200,000", priceNum: 15200000, sqft: "120,000", capRate: "5.8%", noi: "$881,600", irr: "16.2%", yearBuilt: 2020, units: 96, occupancy: "97%" },
  { id: "PROP-003", name: "Gateway Retail Center", address: "8900 Highway 71, Denver", type: "Retail", status: "Due Diligence", price: "$9,800,000", priceNum: 9800000, sqft: "65,000", capRate: "7.1%", noi: "$695,800", irr: "12.4%", yearBuilt: 2015, units: 0, occupancy: "88%" },
  { id: "PROP-004", name: "Industrial Hub East", address: "12 Logistics Way, Dallas", type: "Industrial", status: "Active", price: "$34,000,000", priceNum: 34000000, sqft: "250,000", capRate: "5.5%", noi: "$1,870,000", irr: "13.9%", yearBuilt: 2021, units: 0, occupancy: "100%" },
  { id: "PROP-005", name: "Lakeview Condominiums", address: "55 Shoreline Dr, Chicago", type: "Multifamily", status: "Pipeline", price: "$22,000,000", priceNum: 22000000, sqft: "95,000", capRate: "5.2%", noi: "$1,144,000", irr: "15.1%", yearBuilt: 2019, units: 64, occupancy: "94%" },
  { id: "PROP-006", name: "Riverside Medical Office", address: "300 Health Pkwy, Nashville", type: "Office", status: "Closed", price: "$12,400,000", priceNum: 12400000, sqft: "48,000", capRate: "6.8%", noi: "$843,200", irr: "11.7%", yearBuilt: 2017, units: 0, occupancy: "95%" },
];

const portfolioByType = [
  { type: "Office", value: 40900000 },
  { type: "Multifamily", value: 37200000 },
  { type: "Industrial", value: 34000000 },
  { type: "Retail", value: 9800000 },
];

const statusColor: Record<string, string> = {
  Active: "bg-success/10 text-success border-success/20",
  "Under Contract": "bg-primary/10 text-primary border-primary/20",
  "Due Diligence": "bg-warning/10 text-warning border-warning/20",
  Closed: "bg-muted text-muted-foreground",
  Pipeline: "bg-accent/10 text-accent border-accent/20",
};

export default function PropertiesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Property | null>(null);

  const filtered = properties.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.address.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || p.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalValue = properties.reduce((sum, p) => sum + p.priceNum, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Vault</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your property portfolio and acquisition pipeline.</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add Property</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Portfolio Value</p><p className="text-xl font-bold">${(totalValue / 1e6).toFixed(1)}M</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Properties</p><p className="text-xl font-bold">{properties.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Cap Rate</p><p className="text-xl font-bold">6.1%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Occupancy</p><p className="text-xl font-bold">94.3%</p></CardContent></Card>
      </div>

      {/* Chart + Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Portfolio by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={portfolioByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" tickFormatter={(v) => `$${v / 1e6}M`} />
                <ReTooltip formatter={(v: number) => [`$${(v / 1e6).toFixed(1)}M`, "Value"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Office">Office</SelectItem>
                <SelectItem value="Multifamily">Multifamily</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Property</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Price</TableHead>
                <TableHead className="text-xs">Cap Rate</TableHead>
                <TableHead className="text-xs">IRR</TableHead>
                <TableHead className="text-xs w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(p)}>
                  <TableCell>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.address}</p>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] ${statusColor[p.status]}`}>{p.status}</Badge></TableCell>
                  <TableCell className="text-sm">{p.type}</TableCell>
                  <TableCell className="text-sm font-medium">{p.price}</TableCell>
                  <TableCell className="text-sm">{p.capRate}</TableCell>
                  <TableCell className="text-sm font-medium text-success flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />{p.irr}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>{selected.address} · {selected.type}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div><p className="text-xs text-muted-foreground">Price</p><p className="font-bold">{selected.price}</p></div>
                <div><p className="text-xs text-muted-foreground">NOI</p><p className="font-bold">{selected.noi}</p></div>
                <div><p className="text-xs text-muted-foreground">Cap Rate</p><p className="font-bold">{selected.capRate}</p></div>
                <div><p className="text-xs text-muted-foreground">IRR</p><p className="font-bold text-success">{selected.irr}</p></div>
                <div><p className="text-xs text-muted-foreground">Sq Ft</p><p className="font-bold">{selected.sqft}</p></div>
                <div><p className="text-xs text-muted-foreground">Occupancy</p><p className="font-bold">{selected.occupancy}</p></div>
                <div><p className="text-xs text-muted-foreground">Year Built</p><p className="font-bold">{selected.yearBuilt}</p></div>
                {selected.units > 0 && <div><p className="text-xs text-muted-foreground">Units</p><p className="font-bold">{selected.units}</p></div>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
