import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Box, Layers, Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut, Maximize2, Move } from "lucide-react";

const mockModels = [
  { id: "1", name: "Tower A – Structural", type: "IFC", size: "142 MB", elements: 12480, lastUpdated: "2026-03-28" },
  { id: "2", name: "Tower B – MEP Systems", type: "RVT", size: "89 MB", elements: 8320, lastUpdated: "2026-03-30" },
  { id: "3", name: "Podium – Architectural", type: "IFC", size: "204 MB", elements: 18750, lastUpdated: "2026-04-01" },
];

const mockLayers = [
  { name: "Structural", visible: true, color: "hsl(var(--primary))", count: 4200 },
  { name: "MEP – HVAC", visible: true, color: "hsl(var(--accent))", count: 2180 },
  { name: "MEP – Plumbing", visible: true, color: "hsl(221, 83%, 53%)", count: 1640 },
  { name: "MEP – Electrical", visible: false, color: "hsl(48, 96%, 53%)", count: 1320 },
  { name: "Architectural", visible: true, color: "hsl(142, 71%, 45%)", count: 5800 },
  { name: "Site Work", visible: false, color: "hsl(0, 72%, 51%)", count: 980 },
];

export default function ViewerPage() {
  const [selectedModel, setSelectedModel] = useState(mockModels[0].id);
  const [layers, setLayers] = useState(mockLayers);
  const [viewMode, setViewMode] = useState<"perspective" | "ortho">("perspective");

  const toggleLayer = (index: number) => {
    setLayers((prev) => prev.map((l, i) => (i === index ? { ...l, visible: !l.visible } : l)));
  };

  const model = mockModels.find((m) => m.id === selectedModel)!;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">3D Viewer</h1>
            <Badge variant="outline" className="text-[10px]">Spatial Workbench</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Interactive BIM model visualization and clash detection.</p>
        </div>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-[240px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mockModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 3D Viewport */}
        <Card className="lg:col-span-3">
          <CardContent className="p-0 relative">
            <div className="aspect-[16/9] bg-muted/30 rounded-lg flex items-center justify-center relative overflow-hidden">
              {/* Grid floor */}
              <div className="absolute inset-0" style={{
                backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                opacity: 0.3,
              }} />
              {/* Mock 3D wireframe building */}
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-48 h-64 border-2 border-primary/40 rounded-sm relative" style={{ transform: "perspective(600px) rotateX(10deg) rotateY(-20deg)" }}>
                  <div className="absolute inset-2 border border-primary/20 rounded-sm" />
                  <div className="absolute top-4 left-4 right-4 h-px bg-primary/20" />
                  <div className="absolute top-12 left-4 right-4 h-px bg-primary/20" />
                  <div className="absolute top-20 left-4 right-4 h-px bg-primary/20" />
                  <div className="absolute top-28 left-4 right-4 h-px bg-primary/20" />
                  <div className="absolute top-36 left-4 right-4 h-px bg-primary/20" />
                  <div className="absolute top-4 bottom-4 left-1/3 w-px bg-primary/20" />
                  <div className="absolute top-4 bottom-4 left-2/3 w-px bg-primary/20" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{model.name}</p>
              </div>

              {/* Toolbar */}
              <div className="absolute top-3 right-3 flex flex-col gap-1 z-20">
                {[
                  { icon: Move, label: "Pan" },
                  { icon: RotateCcw, label: "Orbit" },
                  { icon: ZoomIn, label: "Zoom In" },
                  { icon: ZoomOut, label: "Zoom Out" },
                  { icon: Maximize2, label: "Fit" },
                ].map((tool) => (
                  <Button key={tool.label} variant="secondary" size="icon" className="h-8 w-8" title={tool.label}>
                    <tool.icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>

              {/* View mode */}
              <div className="absolute bottom-3 left-3 flex gap-1 z-20">
                <Button size="sm" variant={viewMode === "perspective" ? "default" : "secondary"} className="text-xs h-7" onClick={() => setViewMode("perspective")}>Perspective</Button>
                <Button size="sm" variant={viewMode === "ortho" ? "default" : "secondary"} className="text-xs h-7" onClick={() => setViewMode("ortho")}>Orthographic</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Model Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Format</span><span className="font-medium">{model.type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">File Size</span><span className="font-medium">{model.size}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Elements</span><span className="font-medium">{model.elements.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Updated</span><span className="font-medium">{model.lastUpdated}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Layers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {layers.map((layer, i) => (
                <button key={layer.name} onClick={() => toggleLayer(i)} className="flex items-center justify-between w-full text-xs py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: layer.color, opacity: layer.visible ? 1 : 0.3 }} />
                    <span className={layer.visible ? "" : "text-muted-foreground line-through"}>{layer.name}</span>
                  </div>
                  {layer.visible ? <Eye className="h-3 w-3 text-muted-foreground" /> : <EyeOff className="h-3 w-3 text-muted-foreground/40" />}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Elements", value: model.elements.toLocaleString() },
          { label: "Visible Layers", value: `${layers.filter((l) => l.visible).length} / ${layers.length}` },
          { label: "Clash Issues", value: "12" },
          { label: "Annotations", value: "34" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}