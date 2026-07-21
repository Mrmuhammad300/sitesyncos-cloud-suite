import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Wrench, CheckCircle2, Clock } from "lucide-react";
import { useWorkOrders, useUpdateWorkOrder } from "@/hooks/useOpsData";
import { useChecklistProgress } from "@/hooks/useFieldOps";
import { ChecklistPanel } from "@/components/ChecklistPanel";
import { WorkOrderChat } from "@/components/WorkOrderChat";
import type { Tables } from "@/integrations/supabase/types";

type WorkOrder = Tables<"work_orders">;

const statusConfig: Record<string, string> = {
  Open: "bg-primary/10 text-primary",
  "In Progress": "bg-warning/10 text-warning",
  Completed: "bg-success/10 text-success",
  "On Hold": "bg-muted text-muted-foreground",
  Cancelled: "bg-destructive/10 text-destructive",
};

const priorityColor: Record<string, string> = {
  Emergency: "bg-destructive/10 text-destructive",
  High: "bg-warning/10 text-warning",
  Medium: "bg-accent/10 text-accent",
  Low: "bg-muted text-muted-foreground",
};

const STATUS_STEPS = ["Open", "In Progress", "Completed"] as const;

export default function FieldModePage() {
  const { data: wos = [], isLoading } = useWorkOrders();
  const updateWO = useUpdateWorkOrder();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<WorkOrder | null>(null);

  const openItems = wos.filter((w) => w.status !== "Completed" && w.status !== "Cancelled");
  const filtered = openItems.filter(
    (w) => w.title.toLowerCase().includes(search.toLowerCase()) || w.wo_number.toLowerCase().includes(search.toLowerCase())
  );

  const { data: checklistProgress = {} } = useChecklistProgress(filtered.map((w) => w.id));

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Today's Work</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} open item{filtered.length === 1 ? "" : "s"}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search…" className="pl-9 h-11 text-base" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
            Nothing open. Nice work.
          </CardContent></Card>
        ) : (
          filtered.map((w) => (
            <Card key={w.id} className="cursor-pointer active:scale-[0.99] transition-transform" onClick={() => setActive(w)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-medium truncate">{w.title}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{w.wo_number}{w.property_name ? ` · ${w.property_name}` : ""}</p>
                  </div>
                  <Wrench className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={`text-[10px] ${statusConfig[w.status] ?? ""}`}>{w.status}</Badge>
                  <Badge className={`text-[10px] ${priorityColor[w.priority] ?? ""}`}>{w.priority}</Badge>
                  {w.due_date && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" />{w.due_date}</span>}
                  {checklistProgress[w.id]?.total > 0 && (
                    <span className="text-[10px] text-muted-foreground">{checklistProgress[w.id].done}/{checklistProgress[w.id].total} checklist</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl">
          {active && (
            <div className="space-y-5 pb-6">
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{active.wo_number}</span>
                  {active.title}
                </SheetTitle>
              </SheetHeader>

              <div className="flex gap-2 flex-wrap">
                <Badge className={statusConfig[active.status] ?? ""}>{active.status}</Badge>
                <Badge className={priorityColor[active.priority] ?? ""}>{active.priority}</Badge>
              </div>

              {active.description && <p className="text-sm text-muted-foreground">{active.description}</p>}

              <div className="grid grid-cols-3 gap-2">
                {STATUS_STEPS.map((s) => (
                  <Button
                    key={s}
                    size="lg"
                    variant={active.status === s ? "default" : "outline"}
                    className="h-12 text-xs"
                    onClick={() => {
                      updateWO.mutate({ id: active.id, status: s, completed_date: s === "Completed" ? new Date().toISOString().slice(0, 10) : null });
                      setActive((prev) => (prev ? { ...prev, status: s } : prev));
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>

              <div className="border-t pt-4">
                <ChecklistPanel workOrderId={active.id} />
              </div>

              <div className="border-t pt-4">
                <WorkOrderChat workOrderId={active.id} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
