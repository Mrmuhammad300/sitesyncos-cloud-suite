import { useEffect, useState } from "react";
import { AlertTriangle, Check, CheckCheck, FileText, Info, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel, StatusPill, Toolbar } from "@/components/os";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "action";
  module: string;
  time: Date;
  read: boolean;
}

const typeIcons = { info: Info, warning: AlertTriangle, success: Check, action: FileText };
const typeTile = {
  info: "border-info/25 bg-info/10 text-info",
  warning: "border-warning/25 bg-warning/10 text-warning",
  success: "border-success/25 bg-success/10 text-success",
  action: "border-primary/25 bg-primary/10 text-primary",
};
const moduleTag: Record<string, string> = {
  Build: "border-mod-build/25 bg-mod-build/10 text-mod-build",
  Ops: "border-mod-ops/25 bg-mod-ops/10 text-mod-ops",
};

/** What this inbox listens to — mirrors the realtime channel below. */
const SOURCES = [
  { label: "RFIs", event: "INSERT", module: "Build" },
  { label: "Change orders", event: "INSERT", module: "Build" },
  { label: "Daily reports", event: "INSERT", module: "Build" },
  { label: "Draw requests", event: "INSERT", module: "Ops" },
  { label: "Draw decisions", event: "UPDATE", module: "Ops" },
];

function timeAgo(d: Date): string {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const isToday = (d: Date) => d.toDateString() === new Date().toDateString();

type Tab = "all" | "unread" | "read";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [channelState, setChannelState] = useState<"connecting" | "live" | "offline">("connecting");
  const [, setTick] = useState(0);

  const push = (n: Omit<Notification, "id" | "time" | "read">) => {
    setNotifications(prev => [
      { ...n, id: crypto.randomUUID(), time: new Date(), read: false },
      ...prev,
    ]);
  };

  // Keep relative timestamps fresh.
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("notifications-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rfis" }, (payload) => {
        const r = payload.new as { rfi_number: string; subject: string; priority: string };
        push({
          title: `New RFI: ${r.rfi_number}`,
          message: r.subject,
          type: r.priority === "High" ? "warning" : "info",
          module: "Build",
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "change_orders" }, (payload) => {
        const co = payload.new as { co_number: string; title: string; amount: number };
        push({
          title: `Change Order Submitted: ${co.co_number}`,
          message: `${co.title} — $${Number(co.amount).toLocaleString()}`,
          type: "action",
          module: "Build",
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "draw_requests" }, (payload) => {
        const d = payload.new as { draw_number: string; title: string; amount: number };
        push({
          title: `Draw Request: ${d.draw_number}`,
          message: `${d.title} — $${Number(d.amount).toLocaleString()}`,
          type: "action",
          module: "Ops",
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "daily_reports" }, (payload) => {
        const dr = payload.new as { report_number: string; author_name: string | null; report_date: string; safety_incidents: number };
        push({
          title: `Daily Report Filed: ${dr.report_number}`,
          message: `${dr.report_date}${dr.author_name ? ` by ${dr.author_name}` : ""}${dr.safety_incidents > 0 ? ` — ${dr.safety_incidents} safety incident(s)` : ""}`,
          type: dr.safety_incidents > 0 ? "warning" : "info",
          module: "Build",
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "draw_requests" }, (payload) => {
        const d = payload.new as { draw_number: string; title: string; status: string };
        if (d.status === "Approved" || d.status === "Rejected") {
          push({
            title: `Draw ${d.status}: ${d.draw_number}`,
            message: d.title,
            type: d.status === "Approved" ? "success" : "warning",
            module: "Ops",
          });
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setChannelState("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setChannelState("offline");
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const byTab = tab === "all" ? notifications : tab === "unread" ? notifications.filter((n) => !n.read) : notifications.filter((n) => n.read);
  const filtered = moduleFilter === "all" ? byTab : byTab.filter((n) => n.module === moduleFilter);
  const groups = [
    { label: "Today", items: filtered.filter((n) => isToday(n.time)) },
    { label: "Earlier", items: filtered.filter((n) => !isToday(n.time)) },
  ].filter((g) => g.items.length > 0);

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const live = channelState === "live";
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: notifications.length },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "read", label: "Read", count: notifications.length - unreadCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Real-time alerts and activity from every module, as it happens."
        actions={
          <>
            <StatusPill status={live ? "Live" : channelState === "offline" ? "Offline" : "Connecting"} tone={live ? "success" : channelState === "offline" ? "neutral" : "warning"} pulse={live} />
            <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheck /> Mark all read
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel
          flush
          eyebrow="Inbox"
          title={<span className="flex items-center gap-2">Activity {unreadCount > 0 && <span className="ss-num rounded-full bg-primary px-1.5 text-[10.5px] font-medium text-primary-foreground">{unreadCount}</span>}</span>}
        >
          <Toolbar className="border-b px-5 pb-3">
            <div className="flex rounded-lg border bg-surface-2/60 p-0.5" role="tablist" aria-label="Read state">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors", tab === t.key ? "bg-surface-1 text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:text-foreground")}
                >
                  {t.label}
                  <span className="ss-num text-[10.5px] text-muted-foreground">{t.count}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {["all", "Build", "Ops"].map((m) => (
                <button
                  key={m}
                  onClick={() => setModuleFilter(m)}
                  aria-pressed={moduleFilter === m}
                  className={cn(
                    "h-7 rounded-full border px-2.5 text-xs transition-colors",
                    moduleFilter === m ? "border-border-strong bg-surface-3 text-foreground" : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {m === "all" ? "All modules" : m}
                </button>
              ))}
            </div>
          </Toolbar>

          {groups.length === 0 ? (
            <div className="p-5">
              {notifications.length === 0 ? (
                <EmptyState
                  icon={Radio}
                  title={<span className="inline-flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>Listening for live events…</span>}
                  description="New RFIs, change orders, draw requests and daily reports will land here the moment they're created — no refresh needed."
                />
              ) : (
                <EmptyState compact icon={CheckCheck} title="Nothing here" description="No notifications match this filter." action={<Button size="sm" variant="outline" onClick={() => { setTab("all"); setModuleFilter("all"); }}>Clear filters</Button>} />
              )}
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.label}>
                <h3 className="ss-eyebrow sticky top-0 z-[1] border-b bg-card/95 px-5 py-2 backdrop-blur">{g.label}</h3>
                <ul className="stagger divide-y">
                  {g.items.map((n) => {
                    const Icon = typeIcons[n.type];
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => markRead(n.id)}
                          className={cn("relative flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent/50", !n.read && "bg-primary/[0.03]")}
                        >
                          {!n.read && <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" aria-label="Unread" />}
                          <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", typeTile[n.type])}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className={cn("text-[13.5px]", n.read ? "font-medium text-muted-foreground" : "font-semibold")}>{n.title}</span>
                              <span className={cn("ss-pill font-mono text-[10px] uppercase tracking-wider", moduleTag[n.module] ?? "border-border bg-muted text-muted-foreground")}>{n.module}</span>
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.message}</span>
                          </span>
                          <span className="ss-num mt-1 shrink-0 text-[10.5px] text-muted-foreground">{timeAgo(n.time)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </Panel>

        <Panel eyebrow="Realtime" title="Live sources" description="Postgres changes streamed over a secure channel." className="lg:self-start">
          <ul className="space-y-1">
            {SOURCES.map((s) => (
              <li key={s.label} className="flex items-center gap-3 rounded-md px-1 py-1.5 text-[13px]">
                <span className="relative flex h-1.5 w-1.5">
                  {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />}
                  <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", live ? "bg-success" : channelState === "offline" ? "bg-muted-foreground/50" : "bg-warning")} />
                </span>
                <span className="flex-1">{s.label}</span>
                <span className="ss-num text-[10px] text-muted-foreground">{s.event}</span>
                <span className={cn("ss-pill font-mono text-[10px] uppercase tracking-wider", moduleTag[s.module])}>{s.module}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
