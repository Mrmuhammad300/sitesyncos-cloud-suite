import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline";
}

interface BulkActionBarProps {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
}

export function BulkActionBar({ count, actions, onClear }: BulkActionBarProps) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border bg-background shadow-lg px-4 py-2.5 animate-in fade-in slide-in-from-bottom-4">
      <span className="text-sm font-medium text-muted-foreground">
        {count} selected
      </span>
      <div className="w-px h-4 bg-border" />
      {actions.map((a) => (
        <Button
          key={a.label}
          size="sm"
          variant={a.variant ?? "outline"}
          className="h-7 text-xs"
          onClick={a.onClick}
        >
          {a.label}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onClear}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
