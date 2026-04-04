import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}

export function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
          )
          .reduce<(number | "…")[]>((acc, p, idx, arr) => {
            if (idx > 0 && (arr[idx - 1] as number) < p - 1)
              acc.push("…");
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "…" ? (
              <span key={`e-${i}`} className="px-1">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7 text-xs"
                onClick={() => onPage(p as number)}
              >
                {p}
              </Button>
            )
          )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
