import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { HardHat, FileText, FolderOpen, Users, Building2, Wrench, Search } from "lucide-react";

interface SearchResult {
  id: string;
  label: string;
  sub: string;
  url: string;
  icon: React.ElementType;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounce search queries — only fire after 300ms of no typing
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  const enabled = open && debouncedQuery.trim().length >= 1;
  const q = `%${debouncedQuery.trim()}%`;

  const { data: projects = [] } = useQuery({
    queryKey: ["search-projects", debouncedQuery],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, status")
        .ilike("name", q)
        .limit(5);
      return (data ?? []).map<SearchResult>((r) => ({
        id: r.id,
        label: r.name,
        sub: r.status,
        url: "/build/projects",
        icon: HardHat,
      }));
    },
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ["search-rfis", debouncedQuery],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("rfis")
        .select("id, rfi_number, subject, status")
        .or(`subject.ilike.${q},rfi_number.ilike.${q}`)
        .limit(5);
      return (data ?? []).map<SearchResult>((r) => ({
        id: r.id,
        label: `${r.rfi_number} — ${r.subject}`,
        sub: r.status,
        url: "/build/rfis",
        icon: FileText,
      }));
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["search-documents", debouncedQuery],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, title, doc_type")
        .ilike("title", q)
        .limit(5);
      return (data ?? []).map<SearchResult>((r) => ({
        id: r.id,
        label: r.title,
        sub: r.doc_type ?? "Document",
        url: "/ops/documents",
        icon: FolderOpen,
      }));
    },
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["search-tenants", debouncedQuery],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id, name, unit_number")
        .ilike("name", q)
        .limit(5);
      return (data ?? []).map<SearchResult>((r) => ({
        id: r.id,
        label: r.name,
        sub: r.unit_number ? `Unit ${r.unit_number}` : "Tenant",
        url: "/ops/tenants",
        icon: Users,
      }));
    },
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["search-properties", debouncedQuery],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, name, address")
        .ilike("name", q)
        .limit(4);
      return (data ?? []).map<SearchResult>((r) => ({
        id: r.id,
        label: r.name,
        sub: r.address ?? "Property",
        url: "/vault/properties",
        icon: Building2,
      }));
    },
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ["search-work-orders", debouncedQuery],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from("work_orders")
        .select("id, wo_number, title, status")
        .or(`title.ilike.${q},wo_number.ilike.${q}`)
        .limit(4);
      return (data ?? []).map<SearchResult>((r) => ({
        id: r.id,
        label: `${r.wo_number} — ${r.title}`,
        sub: r.status,
        url: "/ops/work-orders",
        icon: Wrench,
      }));
    },
  });

  const groups: { heading: string; results: SearchResult[] }[] = [
    { heading: "Projects", results: projects },
    { heading: "RFIs", results: rfis },
    { heading: "Documents", results: documents },
    { heading: "Tenants", results: tenants },
    { heading: "Properties", results: properties },
    { heading: "Work Orders", results: workOrders },
  ].filter((g) => g.results.length > 0);

  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      setQuery("");
      navigate(url);
    },
    [navigate]
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center h-9 w-full max-w-md rounded-md bg-muted/50 border-0 px-3 gap-2 text-sm text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search projects, documents, tasks…</span>
        <kbd className="hidden sm:inline-flex pointer-events-none select-none items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span>⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search projects, RFIs, documents, tenants…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length === 0 ? (
            <CommandEmpty>Type to search across all modules.</CommandEmpty>
          ) : groups.length === 0 ? (
            <CommandEmpty>No results for "{query}"</CommandEmpty>
          ) : (
            groups.map((group, i) => (
              <span key={group.heading}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={group.heading}>
                  {group.results.map((r) => (
                    <CommandItem
                      key={r.id}
                      value={`${group.heading}-${r.id}`}
                      onSelect={() => handleSelect(r.url)}
                    >
                      <r.icon className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                      <span className="truncate">{r.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">{r.sub}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </span>
            ))
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
