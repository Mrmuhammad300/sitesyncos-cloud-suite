import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  children?: ReactNode;
  className?: string;
}

/** Row of filters/search above a table or list. Wraps on small screens. */
export function Toolbar({ children, className }: ToolbarProps) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

interface SearchFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchField({ value, onChange, placeholder = "Search…", className, autoFocus }: SearchFieldProps) {
  return (
    <label className={cn("ss-search flex h-9 min-w-[200px] flex-1 items-center gap-2 py-0 sm:max-w-xs", className)}>
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </label>
  );
}
