import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Check, CheckCheck, AlertTriangle, Info, FileText, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
const typeColors = { info: "text-blue-500", warning: "text-yellow-500", success: "text-green-500", action: "text-primary" };

function timeAgo(d: Date): string {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tab, setTab] = useState("all");

  const push = (n: Omit<Notification, "id" | "time" | "read">) => {
    setNotifications(prev => [
      { ...n, id: crypto.randomUUID(), time: new Date(), read: false },
      ...prev,
    ]);
  };

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
          message: `${dr.report_date}${dr.author_name ? ` by ${dr.author_name}` : ""}${dr.safety_incidents > 0 ? ` — ⚠ ${dr.safety_incidents} safety incident(s)` : ""}`,
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
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = tab === "all" ? notifications : tab === "unread" ? notifications.filter((n) => !n.read) : notifications.filter((n) => n.read);

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && <Badge className="text-[10px]">{unreadCount} new</Badge>}
            <Badge variant="secondary" className="text-[10px]">Live</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time alerts and activity across all modules.</p>
        </div>
        <Button size="sm" variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
          <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark All Read
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-2">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {notifications.length === 0
                    ? "Listening for live events… New RFIs, change orders, draw requests, and daily reports will appear here."
                    : "No notifications to show."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((n) => {
              const Icon = typeIcons[n.type];
              return (
                <Card
                  key={n.id}
                  className={`transition-colors cursor-pointer hover:bg-muted/30 ${!n.read ? "border-primary/30 bg-primary/[0.03]" : ""}`}
                  onClick={() => markRead(n.id)}
                >
                  <CardContent className="flex items-start gap-3 py-3 px-4">
                    <div className={`mt-0.5 ${typeColors[n.type]}`}><Icon className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                        <Badge variant="outline" className="text-[9px] h-4 shrink-0">{n.module}</Badge>
                        {!n.read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">{timeAgo(n.time)}</span>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
