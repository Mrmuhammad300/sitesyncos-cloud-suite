import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Home, ZoomIn, ZoomOut, Maximize2, Grid3X3, Ruler, Wand2, CheckCircle2, XCircle } from "lucide-react";
import { useFloorPlanVariants, useUpdateFloorPlanVariant } from "@/hooks/useBlenderData";

const mockFloors = [
  { id: "b1", label: "Basement 1", rooms: 8, area: "4,200 sqft", status: "Final" },
  { id: "g", label: "Ground Floor", rooms: 12, area: "5,800 sqft", status: "Final" },
  { id: "1", label: "Floor 1", rooms: 14, area: "5,400 sqft", status: "Final" },
  { id: "2", label: "Floor 2", rooms: 14, area: "5,400 sqft", status: "In Review" },
  { id: "3", label: "Floor 3", rooms: 14, area: "5,400 sqft", status: "In Review" },
  { id: "4", label: "Floor 4 – Penthouse", rooms: 6, area: "5,400 sqft", status: "Draft" },
  { id: "r", label: "Roof Plan", rooms: 0, area: "5,800 sqft", status: "Draft" },
];

const mockRooms = [
  { name: "Living Room", area: "380 sqft", type: "Residential", dimensions: "19' × 20'" },
  { name: "Kitchen", area: "180 sqft", type: "Residential", dimensions: "12' × 15'" },
  { name: "Master Bedroom", area: "240 sqft", type: "Residential", dimensions: "15' × 16'" },
  { name: "Bedroom 2", area: "160 sqft", type: "Residential", dimensions: "10' × 16'" },
  { name: "Bathroom 1", area: "80 sqft", type: "Residential", dimensions: "8' × 10'" },
  { name: "Hallway", area: "120 sqft", type: "Circulation", dimensions: "4' × 30'" },
];

export default function FloorPlansPage() {
  const [selectedFloor, setSelectedFloor] = useState("g");
  const floor = mockFloors.find((f) => f.id === selectedFloor)!;
  const navigate = useNavigate();
  const { data: variants } = useFloorPlanVariants();
  const updateVariant = useUpdateFloorPlanVariant();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Floor Plans</h1>
            <Badge variant="outline" className="text-[10px]">Spatial Workbench</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Generate and review parametric floor plans for each level.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/spatial/generator")} className="text-xs">
            <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Generate with AI
          </Button>
          <Select value={selectedFloor} onValueChange={setSelectedFloor}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {mockFloors.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Floor plan canvas */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0 relative">
            <div className="aspect-[4/3] bg-muted/20 rounded-lg relative overflow-hidden">
              {/* Grid */}
              <div className="absolute inset-0" style={{
                backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                opacity: 0.25,
              }} />
              {/* Mock floor plan */}
              <div className="absolute inset-8 border-2 border-foreground/20 rounded-sm">
                {/* Rooms */}
                <div className="absolute top-0 left-0 w-[45%] h-[55%] border-r border-b border-foreground/15 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">Living Room</span>
                </div>
                <div className="absolute top-0 right-0 w-[55%] h-[35%] border-b border-foreground/15 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">Master Bedroom</span>
                </div>
                <div className="absolute top-[35%] right-0 w-[30%] h-[25%] border-b border-l border-foreground/15 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">Bath</span>
                </div>
                <div className="absolute top-[35%] right-[30%] w-[25%] h-[25%] border-b border-foreground/15 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">Bed 2</span>
                </div>
                <div className="absolute bottom-0 left-0 w-[45%] h-[45%] border-r border-foreground/15 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">Kitchen</span>
                </div>
                <div className="absolute bottom-0 right-0 w-[55%] h-[40%] border-foreground/15 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">Hallway</span>
                </div>
              </div>

              {/* Toolbar */}
              <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
                {[ZoomIn, ZoomOut, Maximize2, Grid3X3, Ruler].map((Icon, i) => (
                  <Button key={i} variant="secondary" size="icon" className="h-7 w-7">
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>

              {/* Label */}
              <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur rounded px-2 py-1 text-xs font-medium">
                {floor.label} — {floor.area}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Side info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Floor Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Level</span><span className="font-medium">{floor.label}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Area</span><span className="font-medium">{floor.area}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rooms</span><span className="font-medium">{floor.rooms}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={floor.status === "Final" ? "default" : "secondary"} className="text-[10px] h-5">{floor.status}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Floor list */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">All Levels</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {mockFloors.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFloor(f.id)}
                  className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-colors ${
                    f.id === selectedFloor ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span>{f.label}</span>
                  <Badge variant="outline" className="text-[9px] h-4">{f.status}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI-generated variants */}
      {variants && variants.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-blue-500" /> AI-Generated Variants ({variants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {variants.map((v) => (
                <div key={v.id} className="shrink-0 w-48 border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{v.variant_name ?? `Variant ${v.variant_number}`}</span>
                    <Badge variant="outline" className={`text-[9px] ${
                      v.status === "approved" ? "border-emerald-500/30 text-emerald-600" :
                      v.status === "rejected" ? "border-destructive/30 text-destructive" :
                      "border-muted"
                    }`}>{v.status}</Badge>
                  </div>
                  {v.metrics && (
                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                      <div>{v.metrics.total_area?.toLocaleString()} sqft</div>
                      <div>{v.metrics.room_count} rooms</div>
                      <div>Efficiency: {Math.round((v.metrics.efficiency_ratio ?? 0) * 100)}%</div>
                    </div>
                  )}
                  {v.status === "draft" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="flex-1 h-6 text-[10px] text-emerald-600 border-emerald-500/30"
                        onClick={() => updateVariant.mutate({ id: v.id, status: "approved" })}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-6 text-[10px] text-destructive border-destructive/30"
                        onClick={() => updateVariant.mutate({ id: v.id, status: "rejected" })}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Room schedule */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Room Schedule — {floor.label}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Room</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Dimensions</TableHead>
                <TableHead className="text-xs text-right">Area</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRooms.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="text-xs font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{r.type}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.dimensions}</TableCell>
                  <TableCell className="text-xs text-right">{r.area}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}