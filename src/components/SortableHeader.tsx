import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortDir } from "@/hooks/useTableFeatures";

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentKey: string | null;
  currentDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className,
}: SortableHeaderProps) {
  const active = currentKey === sortKey;
  return (
    <TableHead
      className={cn("cursor-pointer select-none text-xs", className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
        )}
      </div>
    </TableHead>
  );
}
