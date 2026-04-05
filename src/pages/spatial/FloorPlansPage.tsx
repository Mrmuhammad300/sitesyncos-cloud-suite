import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Home, ZoomIn, ZoomOut, Maximize2, Grid3X3, Ruler, Wand2, CheckCircle2, XCircle, Plus } from "lucide-react";
import { useFloorPlanVariants, useUpdateFloorPlanVariant } from "@/hooks/useBlenderData";
import { useFloorPlans, useFloorPlanRooms, useCreateFloorPlan, FloorPlan } from "@/hooks/useFloorPlans";

// Fallback data shown when no DB records exist yet
const FALLBACK_FLOORS: FloorPlan[] = [
  { id: "b1", project_id: null, level_name: "Basement 1", level_number: -1, area_sqft: 4200, room_count: 8, status: "Final", layout_json: null, created_at: "", updated_at: "" },
  { id: "g", project_id: null, level_name: "Ground Floor", level_number: 0, area_sqft: 5800, room_count: 12, status: "Final", layout_json: null, created_at: "", updated_at: "" },
  { id: "1", project_id: null, level_name: "Floor 1", level_number: 1, area_sqft: 5400, room_count: 14, status: "Final", layout_json: null, created_at: "", updated_at: "" },
  { id: "2", project_id: null, level_name: "Floor 2", level_number: 2, area_sqft: 5400, room_count: 14, status: "In Review", layout_json: null, created_at: "", updated_at: "" },
  { id: "4", project_id: null, level_name: "Floor 4 – Penthouse", level_number: 4, area_sqft: 5400, room_count: 6, status: "Draft", layout_json: null, created_at: "", updated_at: "" },
];

const statusVariant = (s: string) => s === "Final" ? "default" : "secondary";

export default function FloorPlansPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ level_name: "", level_number: "0", area_sqft: "", room_count: "0", status: "Draft" as FloorPlan["status"] });
  const [formError, setFormError] = useState("");

  const { data: dbFloors = [], isLoading } = useFloorPlans();
  const floors = dbFloors.length > 0 ? dbFloors : FALLBACK_FLOORS;
  const isDemo = dbFloors.length === 0 && !isLoading;

  const currentId = selectedId ?? floors[0]?.id ?? null;
  const floor = floors.find((f) => f.id === currentId) ?? floors[0];

  const { data: rooms = [] } = useFloorPlanRooms(dbFloors.length > 0 ? currentId : null);
  const createFloorPlan = useCreateFloorPlan();
  const updateVariant = useUpdateFloorPlanVariant();
  const { data: variants } = useFloorPlanVariants();

  const handleCreate = () => {
    if (!form.level_name.trim()) { setFormError("Level name is required."); return; }
    setFormError("");
    createFloorPlan.mutate({
      project_id: null,
      level_name: form.level_name.trim(),
      level_number: parseInt(form.level_number) || 0,
      area_sqft: form.area_sqft ? parseFloat(form.area_sqft) : null,
      room_count: parseInt(form.room_count) || 0,
      status: form.status,
      layout_json: null,
    }, {
      onSuccess: () => {
        setCreateOpen(false);
        setForm({ level_name: "", level_number: "0", area_sqft: "", room_count: "0", status: "Draft" });
      },
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Floor Plans</h1>
            <Badge variant="outline" className="text-[10px]">Spatial Workbench</Badge>
            {isDemo && <Badge variant="secondary" className="text-[10px]">Demo</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Generate and review parametric floor plans for each level.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Level
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/spatial/generator")} className="text-xs">
            <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Generate with AI
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Floor plan canvas */}
        <Card className="md:col-span-1 lg:col-span-2">
          <CardContent className="p-0 relative">
            <div className="aspect-[4/3] bg-muted/20 rounded-lg relative overflow-hidden">
              <div className="absolute inset-0" style={{
                backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                opacity: 0.25,
              }} />
              {/* Static floor plan outline */}
              <div className="absolute inset-8 border-2 border-foreground/20 rounded-sm">
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
                  <Button key={i} variant="secondary" size="icon" className="h-7 w-7" aria-label={["Zoom in", "Zoom out", "Fit to screen", "Toggle grid", "Ruler"][i]}>
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
              <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur rounded px-2 py-1 text-xs font-medium">
                {floor?.level_name} — {floor?.area_sqft ? `${floor.area_sqft.toLocaleString()} sqft` : "Area TBD"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Side info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Floor Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Level</span><span className="font-medium">{floor?.level_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Area</span><span className="font-medium">{floor?.area_sqft ? `${floor.area_sqft.toLocaleString()} sqft` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rooms</span><span className="font-medium">{floor?.room_count}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusVariant(floor?.status ?? "")} className="text-[10px] h-5">{floor?.status}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">All Levels</CardTitle></CardHeader>
            <CardContent className="space-y-1 max-h-64 overflow-y-auto">
              {isLoading ? (
                [1,2,3].map(i => <div key={i} className="h-7 rounded bg-muted animate-pulse" />)
              ) : floors.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded transition-colors ${
                    f.id === currentId ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span>{f.level_name}</span>
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
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Room Schedule — {floor?.level_name}</CardTitle></CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {dbFloors.length > 0 ? "No rooms added yet for this level." : "Add floor plan levels to see room data."}
            </p>
          ) : (
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
                {rooms.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{r.room_type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.dimensions || "—"}</TableCell>
                    <TableCell className="text-xs text-right">{r.area_sqft ? `${r.area_sqft} sqft` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create floor plan dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Home className="h-4 w-4" /> Add Floor Level</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Level Name <span className="text-destructive">*</span></Label>
              <Input value={form.level_name} onChange={(e) => setForm({ ...form, level_name: e.target.value })} placeholder="e.g. Ground Floor" />
              {formError && <p className="text-xs text-destructive mt-1">{formError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Level Number</Label>
                <Input type="number" value={form.level_number} onChange={(e) => setForm({ ...form, level_number: e.target.value })} placeholder="0" />
              </div>
              <div>
                <Label>Area (sqft)</Label>
                <Input type="number" value={form.area_sqft} onChange={(e) => setForm({ ...form, area_sqft: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as FloorPlan["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="In Review">In Review</SelectItem>
                  <SelectItem value="Final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createFloorPlan.isPending}>
              {createFloorPlan.isPending ? "Creating..." : "Create Level"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
