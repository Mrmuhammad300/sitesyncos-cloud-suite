import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useChecklistItems,
  useAddChecklistItem,
  useToggleChecklistItem,
  useDeleteChecklistItem,
} from "@/hooks/useFieldOps";

interface ChecklistPanelProps {
  workOrderId: string;
}

export function ChecklistPanel({ workOrderId }: ChecklistPanelProps) {
  const { profile, user } = useAuth();
  const { data: items = [], isLoading } = useChecklistItems(workOrderId);
  const addItem = useAddChecklistItem();
  const toggleItem = useToggleChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const [newTitle, setNewTitle] = useState("");

  const total = items.length;
  const done = items.filter((i) => i.is_complete).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const completedByName = profile?.display_name || user?.email || null;

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addItem.mutate({ work_order_id: workOrderId, title: newTitle.trim(), sort_order: total });
    setNewTitle("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Checklist</Label>
        {total > 0 && <span className="text-xs font-medium text-muted-foreground">{done}/{total} done</span>}
      </div>
      {total > 0 && <Progress value={pct} className="h-1.5" />}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading checklist…</p>
      ) : (
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 group">
              <Checkbox
                checked={item.is_complete}
                onCheckedChange={(checked) =>
                  toggleItem.mutate({ id: item.id, is_complete: !!checked, completed_by: completedByName })
                }
              />
              <span className={`flex-1 text-sm ${item.is_complete ? "line-through text-muted-foreground" : ""}`}>
                {item.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={() => deleteItem.mutate(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-muted-foreground">No checklist items yet.</p>}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Add a checklist item…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          className="h-8 text-sm"
        />
        <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={handleAdd} disabled={!newTitle.trim() || addItem.isPending}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
