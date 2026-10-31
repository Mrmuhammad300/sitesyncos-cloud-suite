import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUp, Check, Copy, DollarSign, FileText, HeartPulse, RotateCcw, Sparkles, Square, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MarkdownLite } from "./MarkdownLite";

/* ─── Routing ──────────────────────────────────────────────────────── */

export type InsightType = "daily-report-summary" | "budget-monitor" | "project-health";
export type Provider = "claude" | "lovable";

interface Route {
  type: InsightType;
  agent: string;
  skill: string;
  icon: LucideIcon;
}

const ROUTES: Record<InsightType, Route> = {
  "budget-monitor": { type: "budget-monitor", agent: "Quantum Ledger", skill: "Budget monitor", icon: DollarSign },
  "daily-report-summary": { type: "daily-report-summary", agent: "Binary Loom", skill: "Field report digest", icon: FileText },
  "project-health": { type: "project-health", agent: "Binary Loom", skill: "Project health", icon: HeartPulse },
};

/** Route a free-form question to the insight pipeline that can answer it from live data. */
function routeFor(prompt: string): Route {
  const q = prompt.toLowerCase();
  if (/(budget|cost|spend|spent|overrun|change order|\bco\b|draw|cash|money|\$|variance|contingency|burn)/.test(q)) return ROUTES["budget-monitor"];
  if (/(daily|field|crew|safety|incident|weather|delay|manpower|site log|report)/.test(q)) return ROUTES["daily-report-summary"];
  return ROUTES["project-health"];
}

const PROVIDER_LABEL: Record<Provider, string> = { claude: "Claude", lovable: "Gemini" };

const SUGGESTIONS: { prompt: string; hint: string }[] = [
  { prompt: "Which budgets are trending toward an overrun?", hint: "Budgets · change orders" },
  { prompt: "Summarize the latest daily reports and flag safety issues", hint: "Field reports" },
  { prompt: "Which projects are at risk, and why?", hint: "Schedule · RFIs · submittals" },
  { prompt: "What's the net cost impact of pending change orders?", hint: "Change orders" },
];

/* ─── Messages ─────────────────────────────────────────────────────── */

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  route?: Route;
  provider?: Provider;
  usedProvider?: string;
  status?: "thinking" | "streaming" | "done" | "error";
  /** For assistant messages: the prompt that produced it (for retry). */
  prompt?: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function readProvider(): Provider {
  try {
    const v = localStorage.getItem("sitesync-ai-provider");
    return v === "lovable" ? "lovable" : "claude";
  } catch {
    return "claude";
  }
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ─── Component ────────────────────────────────────────────────────── */

export function AssistantChat() {
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [provider, setProviderState] = useState<Provider>(readProvider);
  const [revealed, setRevealed] = useState<Record<string, number>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cancelled = useRef<Set<string>>(new Set());

  const busy = messages.some((m) => m.status === "thinking" || m.status === "streaming");
  const initials = (profile?.display_name || user?.email || "You").split(/[\s@._-]/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

  const setProvider = (p: Provider) => {
    setProviderState(p);
    try { localStorage.setItem("sitesync-ai-provider", p); } catch { /* per-viewer convenience only */ }
  };

  /* Auto-grow the composer. */
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft]);

  /* Keep the newest message in view while the user is near the bottom. */
  const scrollToEnd = useCallback((force = false) => {
    const sc = document.getElementById("main-scroll");
    if (!sc || !endRef.current) return;
    const nearBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 240;
    if (force || nearBottom) endRef.current.scrollIntoView({ block: "end", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  useEffect(() => { scrollToEnd(); }, [messages, revealed, scrollToEnd]);

  /* Progressive reveal ("streaming") of a completed response. */
  useEffect(() => {
    const streaming = messages.find((m) => m.status === "streaming");
    if (!streaming) return;
    const total = streaming.text.length;
    if (prefersReducedMotion()) {
      setRevealed((r) => ({ ...r, [streaming.id]: total }));
      setMessages((ms) => ms.map((m) => (m.id === streaming.id ? { ...m, status: "done" } : m)));
      return;
    }
    const step = Math.max(3, Math.ceil(total / 110));
    const t = window.setInterval(() => {
      setRevealed((r) => {
        const next = Math.min(total, (r[streaming.id] ?? 0) + step);
        if (next >= total) {
          window.clearInterval(t);
          setMessages((ms) => ms.map((m) => (m.id === streaming.id ? { ...m, status: "done" } : m)));
        }
        return { ...r, [streaming.id]: next };
      });
    }, 18);
    return () => window.clearInterval(t);
  }, [messages]);

  const ask = useCallback(
    async (prompt: string, replaceId?: string) => {
      const text = prompt.trim();
      if (!text) return;
      const route = routeFor(text);
      const assistantId = replaceId ?? uid();
      const history = messages.filter((m) => m.status !== "error").slice(-8).map((m) => ({ role: m.role, content: m.text }));

      setMessages((ms) => {
        const pending: Message = { id: assistantId, role: "assistant", text: "", at: Date.now(), route, provider, status: "thinking", prompt: text };
        if (replaceId) return ms.map((m) => (m.id === replaceId ? pending : m));
        return [...ms, { id: uid(), role: "user", text, at: Date.now() }, pending];
      });
      setRevealed((r) => ({ ...r, [assistantId]: 0 }));
      setDraft("");
      requestAnimationFrame(() => scrollToEnd(true));

      try {
        const { data, error } = await supabase.functions.invoke("ai-insights", {
          body: { type: route.type, provider, prompt: text, history },
        });
        if (cancelled.current.has(assistantId)) return;
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const answer: string = (data?.insight ?? "").trim() || "I couldn't find anything to report for that question.";
        setMessages((ms) =>
          ms.map((m) => (m.id === assistantId ? { ...m, text: answer, usedProvider: data?.provider, status: "streaming", at: Date.now() } : m)),
        );
      } catch (e: unknown) {
        if (cancelled.current.has(assistantId)) return;
        const msg = e instanceof Error ? e.message : "The assistant is unavailable right now.";
        toast.error(`${route.agent} couldn't answer — ${msg}`);
        setMessages((ms) => ms.map((m) => (m.id === assistantId ? { ...m, text: msg, status: "error" } : m)));
      }
    },
    [messages, provider, scrollToEnd],
  );

  const stop = () => {
    const live = messages.find((m) => m.status === "thinking" || m.status === "streaming");
    if (!live) return;
    if (live.status === "thinking") {
      cancelled.current.add(live.id);
      setMessages((ms) => ms.filter((m) => m.id !== live.id));
    } else {
      setRevealed((r) => ({ ...r, [live.id]: live.text.length }));
      setMessages((ms) => ms.map((m) => (m.id === live.id ? { ...m, status: "done" } : m)));
    }
  };

  const submit = () => { if (!busy) ask(draft); };
  const preview = useMemo(() => (draft.trim() ? routeFor(draft) : null), [draft]);

  return (
    <div className="relative -mb-16 flex min-h-[calc(100svh-15rem)] flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        {messages.length === 0 ? (
          <EmptyChat onPick={(p) => ask(p)} />
        ) : (
          <ol className="flex-1 space-y-7 pb-6 pt-2" aria-live="polite">
            {messages.map((m) =>
              m.role === "user" ? (
                <UserBubble key={m.id} m={m} initials={initials || "You"} />
              ) : (
                <AssistantTurn
                  key={m.id}
                  m={m}
                  shown={revealed[m.id] ?? m.text.length}
                  onRetry={() => m.prompt && ask(m.prompt, m.id)}
                />
              ),
            )}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Composer ── */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-auto bg-gradient-to-t from-background from-60% to-transparent px-4 pb-4 pt-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <form
          className="mx-auto w-full max-w-3xl"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <div className="ss-card rounded-2xl transition-[border-color,box-shadow] duration-200 focus-within:border-mod-ai/40 focus-within:shadow-[0_0_0_4px_hsl(var(--mod-ai)/0.08),0_18px_40px_-24px_hsl(var(--shadow-color)/0.55)]">
            <label htmlFor="ai-composer" className="sr-only">Ask SiteSync AI</label>
            <textarea
              id="ai-composer"
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask about budgets, field reports or project health…"
              className="block max-h-[200px] w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[14.5px] leading-6 outline-none placeholder:text-muted-foreground/70"
            />
            <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-1">
              <div className="flex rounded-lg border bg-surface-2/60 p-0.5" role="radiogroup" aria-label="Model">
                {(["claude", "lovable"] as Provider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={provider === p}
                    onClick={() => setProvider(p)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11.5px] font-medium transition-colors",
                      provider === p ? "bg-surface-1 text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {PROVIDER_LABEL[p]}
                  </button>
                ))}
              </div>
              <span
                className={cn(
                  "hidden min-w-0 items-center gap-1.5 truncate text-[11.5px] text-muted-foreground transition-opacity sm:flex",
                  preview ? "opacity-100" : "opacity-0",
                )}
                aria-hidden={!preview}
              >
                {preview && (
                  <>
                    <preview.icon className="h-3 w-3 shrink-0 text-mod-ai" />
                    <span className="truncate">Routes to <span className="text-foreground">{preview.agent}</span> · {preview.skill}</span>
                  </>
                )}
              </span>
              <span className="ml-auto hidden font-mono text-[10.5px] text-muted-foreground/80 md:inline">
                <kbd className="ss-kbd">↵</kbd> send · <kbd className="ss-kbd">⇧↵</kbd> newline
              </span>
              {busy ? (
                <Button type="button" size="icon" variant="outline" className="ml-auto h-8 w-8 rounded-lg md:ml-0" onClick={stop} aria-label="Stop">
                  <Square className="fill-current" />
                </Button>
              ) : (
                <Button type="submit" size="icon" className="ml-auto h-8 w-8 rounded-lg md:ml-0" disabled={!draft.trim()} aria-label="Send">
                  <ArrowUp />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/80">
            Answers are generated from your live project, budget and field data. Verify before acting.
          </p>
        </form>
      </div>
    </div>
  );
}

/* ─── Pieces ───────────────────────────────────────────────────────── */

function AiAvatar({ thinking, className }: { thinking?: boolean; className?: string }) {
  return (
    <span className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-mod-ai/30 bg-mod-ai/10 text-mod-ai", className)}>
      {thinking && <span className="absolute inset-0 animate-ping rounded-xl border border-mod-ai/40" />}
      <Sparkles className="h-4 w-4" />
    </span>
  );
}

function EmptyChat({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
      <div className="relative">
        <div className="absolute inset-0 -m-8 rounded-full bg-mod-ai/15 blur-3xl" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-mod-ai/30 bg-gradient-to-b from-mod-ai/20 to-mod-ai/5 text-mod-ai shadow-[0_18px_40px_-20px_hsl(var(--mod-ai)/0.8)]">
          <Sparkles className="h-6 w-6" />
        </div>
      </div>
      <h2 className="ss-display mt-6 text-balance text-[34px] leading-[1.05] sm:text-[42px]">
        What should we <span className="italic text-mod-ai">look into</span>?
      </h2>
      <p className="mt-3 max-w-md text-pretty text-sm text-muted-foreground">
        Ask in plain language. Your question is routed to the agent that owns the data — Quantum Ledger for money, Binary Loom for the field.
      </p>
      <div className="stagger mt-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => {
          const r = routeFor(s.prompt);
          return (
            <button
              key={s.prompt}
              type="button"
              onClick={() => onPick(s.prompt)}
              className="ss-card ss-interactive group flex items-start gap-3 rounded-xl p-3.5 text-left hover:-translate-y-0.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-surface-2 text-muted-foreground transition-colors group-hover:border-mod-ai/30 group-hover:text-mod-ai">
                <r.icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-snug">{s.prompt}</span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{r.agent} · {s.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UserBubble({ m, initials }: { m: Message; initials: string }) {
  return (
    <li className="flex animate-fade-in justify-end gap-3">
      <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[75%]">
        <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md border bg-surface-3 px-4 py-2.5 text-[14px] leading-relaxed">
          {m.text}
        </div>
        <span className="pr-1 font-mono text-[10px] text-muted-foreground">{fmtTime(m.at)}</span>
      </div>
      <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-surface-2 font-mono text-[11px] font-medium text-muted-foreground sm:flex">
        {initials}
      </span>
    </li>
  );
}

function AssistantTurn({ m, shown, onRetry }: { m: Message; shown: number; onRetry: () => void }) {
  const [copied, setCopied] = useState(false);
  const route = m.route;
  const providerLabel = m.usedProvider === "lovable" ? "Gemini" : m.usedProvider === "claude" ? "Claude" : m.provider ? PROVIDER_LABEL[m.provider] : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(m.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  return (
    <li className="flex animate-fade-in gap-3">
      <AiAvatar thinking={m.status === "thinking"} />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[13px] font-semibold">{route?.agent ?? "SiteSync AI"}</span>
          {route && (
            <span className="inline-flex items-center gap-1 rounded-md border border-mod-ai/25 bg-mod-ai/10 px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-mod-ai">
              <route.icon className="h-2.5 w-2.5" />
              {route.skill}
            </span>
          )}
          {providerLabel && <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">via {providerLabel}</span>}
        </div>

        {m.status === "thinking" ? (
          <div className="flex items-center gap-3 py-1" role="status">
            <span className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-mod-ai" style={{ animationDelay: `${i * 140}ms` }} />
              ))}
            </span>
            <span className="text-[13px] text-muted-foreground">{route?.agent ?? "Agent"} is reading live data…</span>
          </div>
        ) : m.status === "error" ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-[13px]">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 space-y-2">
              <p>That request didn't go through. <span className="text-muted-foreground">{m.text}</span></p>
              <Button size="xs" variant="outline" onClick={onRetry}><RotateCcw />Try again</Button>
            </div>
          </div>
        ) : (
          <>
            <MarkdownLite text={m.text.slice(0, shown)} caret={m.status === "streaming"} />
            {m.status === "done" && (
              <div className="-ml-2 flex items-center gap-0.5 pt-0.5 text-muted-foreground">
                <Button size="xs" variant="ghost" onClick={copy} aria-label="Copy response">
                  {copied ? <Check className="text-success" /> : <Copy />}
                  <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                </Button>
                <Button size="xs" variant="ghost" onClick={onRetry} aria-label="Regenerate response">
                  <RotateCcw /><span className="hidden sm:inline">Regenerate</span>
                </Button>
                <span className="ml-auto font-mono text-[10px]">{fmtTime(m.at)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
