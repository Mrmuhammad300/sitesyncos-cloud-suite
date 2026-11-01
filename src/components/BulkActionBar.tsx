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
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-xl border bg-popover/95 py-1.5 pl-3 pr-1.5 shadow-[0_24px_60px_-20px_hsl(var(--shadow-color)/0.7)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4"
    >
      <span className="flex shrink-0 items-center gap-2 text-[13px] font-medium">
        <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-primary px-1 font-mono text-[11px] text-primary-foreground tabular-nums">{count}</span>
        selected
      </span>
      <div className="w-px h-4 bg-border" />
      {actions.map((a) => (
        <Button
          key={a.label}
          size="sm"
          variant={a.variant ?? "outline"}
          className="h-7 shrink-0 text-xs"
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
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
