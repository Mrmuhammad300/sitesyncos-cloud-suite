import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Check, CheckCheck, AlertTriangle, Info, FileText, DollarSign, Users } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "action";
  module: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  { id: "1", title: "RFI #042 Response Due", message: "Response to structural clarification is due tomorrow.", type: "warning", module: "Build", time: "10 min ago", read: false },
  { id: "2", title: "Draw Request Approved", message: "Draw #DR-008 for $245,000 has been approved by the lender.", type: "success", module: "Ops", time: "1 hour ago", read: false },
  { id: "3", title: "Change Order Submitted", message: "CO-015 submitted for review — $18,500 scope addition.", type: "action", module: "Build", time: "2 hours ago", read: false },
  { id: "4", title: "Daily Report Filed", message: "DR-2026-091 filed by J. Martinez for Tower A.", type: "info", module: "Build", time: "3 hours ago", read: true },
  { id: "5", title: "Budget Threshold Alert", message: "MEP budget has reached 85% utilization.", type: "warning", module: "Ops", time: "5 hours ago", read: true },
  { id: "6", title: "Lease Expiring Soon", message: "Unit 4B lease for Apex Corp expires in 30 days.", type: "warning", module: "Ops", time: "1 day ago", read: true },
  { id: "7", title: "New Submittal Uploaded", message: "SUB-028 uploaded by architect for review.", type: "info", module: "Build", time: "1 day ago", read: true },
  { id: "8", title: "Compliance Checklist Updated", message: "Fire safety inspection checklist marked complete.", type: "success", module: "Vault", time: "2 days ago", read: true },
];

const typeIcons = { info: Info, warning: AlertTriangle, success: Check, action: FileText };
const typeColors = { info: "text-blue-500", warning: "text-yellow-500", success: "text-green-500", action: "text-primary" };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [tab, setTab] = useState("all");

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
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">System alerts, approvals, and activity across all modules.</p>
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
                <p className="text-sm text-muted-foreground">No notifications to show.</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((n) => {
              const Icon = typeIcons[n.type];
              return (
                <Card key={n.id} className={`transition-colors cursor-pointer hover:bg-muted/30 ${!n.read ? "border-primary/30 bg-primary/[0.03]" : ""}`} onClick={() => markRead(n.id)}>
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
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">{n.time}</span>
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