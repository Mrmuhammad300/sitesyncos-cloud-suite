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
import { HardHat, FileText, FolderOpen, Users, Building2, Wrench, Search, CornerDownLeft, Moon, Sun, Plus, Sparkles } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

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
  const { resolvedTheme, toggle } = useTheme();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
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
        .select("id, tenant_name, unit")
        .ilike("tenant_name", q)
        .limit(5);
      return (data ?? []).map<SearchResult>((r) => ({
        id: r.id,
        label: r.tenant_name,
        sub: r.unit ? `Unit ${r.unit}` : "Tenant",
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

  const run = (fn: () => void) => {
    setOpen(false);
    setQuery("");
    fn();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex h-8 w-full items-center gap-2 rounded-lg border bg-surface-1/60 px-2.5 text-[13px] text-muted-foreground shadow-[inset_0_1px_2px_0_hsl(var(--shadow-color)/0.08)] transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open command palette"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate text-left">
          <span className="hidden sm:inline">Search or jump to…</span>
          <span className="sm:hidden">Search</span>
        </span>
        <span className="hidden items-center gap-0.5 sm:flex">
          <kbd className="ss-kbd">{isMac ? "⌘" : "Ctrl"}</kbd>
          <kbd className="ss-kbd">K</kbd>
        </span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search records, jump to a module, or run a command…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[min(60vh,440px)]">
          <CommandEmpty>
            <div className="flex flex-col items-center gap-1 py-2">
              <Search className="h-5 w-5 text-muted-foreground/60" />
              <p>No results for “{query}”</p>
            </div>
          </CommandEmpty>

          {groups.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.results.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${group.heading} ${r.label} ${r.sub} ${r.id}`}
                  onSelect={() => handleSelect(r.url)}
                >
                  <r.icon className="text-muted-foreground" />
                  <span className="truncate">{r.label}</span>
                  <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">{r.sub}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          {groups.length > 0 && <CommandSeparator />}

          <CommandGroup heading="Quick actions">
            <CommandItem value="action new project create" onSelect={() => run(() => navigate("/build/projects"))}>
              <Plus className="text-primary" /> New project
            </CommandItem>
            <CommandItem value="action new rfi create" onSelect={() => run(() => navigate("/build/rfis"))}>
              <Plus className="text-primary" /> New RFI
            </CommandItem>
            <CommandItem value="action ask ai assistant copilot" onSelect={() => run(() => navigate("/ai-assistant"))}>
              <Sparkles className="text-mod-ai" /> Ask the AI assistant
            </CommandItem>
            <CommandItem value="action toggle theme dark light mode" onSelect={() => run(toggle)}>
              {resolvedTheme === "dark" ? <Sun /> : <Moon />} Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
            </CommandItem>
          </CommandGroup>

          {MODULES.map((m) => (
            <CommandGroup key={m.key} heading={m.label}>
              {m.items.map((item) => (
                <CommandItem
                  key={item.url}
                  value={`go ${m.label} ${item.title} ${(item.keywords ?? []).join(" ")}`}
                  onSelect={() => handleSelect(item.url)}
                >
                  <item.icon className={cn(`text-${m.tone}`)} />
                  <span>{item.title}</span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">{m.short}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
        <div className="flex items-center justify-between border-t bg-surface-2/50 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="ss-kbd">↑</kbd><kbd className="ss-kbd">↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="ss-kbd"><CornerDownLeft className="h-2.5 w-2.5" /></kbd> open</span>
            <span className="hidden items-center gap-1 sm:flex"><kbd className="ss-kbd">esc</kbd> close</span>
          </span>
          <span className="font-mono uppercase tracking-wider">SiteSync OS</span>
        </div>
      </CommandDialog>
    </>
  );
}
