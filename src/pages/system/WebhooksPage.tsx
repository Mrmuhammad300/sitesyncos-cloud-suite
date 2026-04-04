import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Webhook, Trash2, ExternalLink, CheckCircle2, XCircle, Clock, RefreshCw, Activity } from "lucide-react";
import { useWebhooks, useWebhookDeliveries, useCreateWebhook, useUpdateWebhook, useDeleteWebhook, useToggleWebhook, WEBHOOK_EVENTS, type Webhook as WebhookType } from "@/hooks/useWebhooks";

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusBadge(status: number | null) {
  if (!status) return <Badge variant="outline" className="text-xs text-muted-foreground">—</Badge>;
  if (status >= 200 && status < 300)
    return <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">{status}</Badge>;
  if (status >= 400)
    return <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">{status}</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

function lastTriggeredLabel(ts: string | null) {
  if (!ts) return "Never";
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

// ─── Delivery History panel ───────────────────────────────────────────────────

function DeliveryHistory({ webhookId }: { webhookId: string }) {
  const { data: deliveries = [], isLoading, refetch } = useWebhookDeliveries(webhookId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Recent Deliveries</p>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 rounded bg-muted animate-pulse" />)}</div>
      ) : deliveries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No deliveries yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Event</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Delivered</TableHead>
              <TableHead className="text-xs">Response</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-xs font-mono">{d.event_type}</TableCell>
                <TableCell>{statusBadge(d.response_status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(d.delivered_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {d.response_body ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Create / Edit form ───────────────────────────────────────────────────────

const EMPTY_FORM = { name: "", url: "", secret: "", events: [] as string[] };

interface WebhookFormProps {
  open: boolean;
  onClose: () => void;
  editing: WebhookType | null;
}

function WebhookForm({ open, onClose, editing }: WebhookFormProps) {
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const [form, setForm] = useState(
    editing
      ? { name: editing.name, url: editing.url, secret: editing.secret ?? "", events: editing.events }
      : EMPTY_FORM
  );

  const toggleEvent = (ev: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.url) return;
    if (editing) {
      updateWebhook.mutate({
        id: editing.id,
        name: form.name,
        url: form.url,
        secret: form.secret || null,
        events: form.events,
      }, { onSuccess: onClose });
    } else {
      createWebhook.mutate({
        name: form.name,
        url: form.url,
        secret: form.secret || null,
        events: form.events,
      }, { onSuccess: onClose });
    }
  };

  const isPending = createWebhook.isPending || updateWebhook.isPending;

  // Group events by domain
  const eventGroups: Record<string, string[]> = {};
  for (const ev of WEBHOOK_EVENTS) {
    const [domain] = ev.split(".");
    if (!eventGroups[domain]) eventGroups[domain] = [];
    eventGroups[domain].push(ev);
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Webhook" : "New Webhook"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input
              placeholder="Procore Integration"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">URL * <span className="text-muted-foreground">(must be https://)</span></Label>
            <Input
              placeholder="https://api.example.com/webhooks/sitesyncos"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">
              Signing Secret <span className="text-muted-foreground">(optional — sent as X-SiteSync-Signature HMAC-SHA256)</span>
            </Label>
            <Input
              type="password"
              placeholder="whsec_…"
              value={form.secret}
              onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs mb-2 block">Subscribe to events</Label>
            <div className="space-y-3 border rounded-md p-3 bg-muted/30">
              {Object.entries(eventGroups).map(([domain, events]) => (
                <div key={domain}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{domain}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {events.map(ev => (
                      <label key={ev} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={form.events.includes(ev)}
                          onCheckedChange={() => toggleEvent(ev)}
                        />
                        <span className="text-xs font-mono">{ev.split(".")[1]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{form.events.length} event{form.events.length !== 1 ? "s" : ""} selected</p>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.url || isPending}>
            {isPending ? "Saving…" : editing ? "Save Changes" : "Create Webhook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const { data: webhooks = [], isLoading } = useWebhooks();
  const deleteWebhook = useDeleteWebhook();
  const toggleWebhook = useToggleWebhook();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const detailWebhook = webhooks.find(w => w.id === detailId) ?? null;

  const activeCount = webhooks.filter(w => w.is_active).length;
  const totalDeliveries = webhooks.reduce((s, w) => s + (w.last_status ? 1 : 0), 0);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (w: WebhookType) => { setEditing(w); setFormOpen(true); };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
            <Badge variant="outline" className="text-[10px]">Integrations</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Receive real-time HTTP POST notifications when SiteSync events occur.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> New Webhook
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Webhook className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{webhooks.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold text-success">{activeCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Activity className="h-5 w-5 text-accent" />
          <div><p className="text-xs text-muted-foreground">Triggered</p><p className="text-xl font-bold">{totalDeliveries}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground">Event Types</p><p className="text-xl font-bold">{WEBHOOK_EVENTS.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Detail panel */}
      {detailWebhook && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              {detailWebhook.name}
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDetailId(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="mb-4 h-8">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="deliveries" className="text-xs">Delivery History</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">URL</p>
                    <a href={detailWebhook.url} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-xs font-mono break-all">
                      {detailWebhook.url} <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Last Triggered</p>
                    <p className="text-sm">{lastTriggeredLabel(detailWebhook.last_triggered_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Last Status</p>
                    {statusBadge(detailWebhook.last_status)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Signing Secret</p>
                    <p className="text-xs text-muted-foreground">{detailWebhook.secret ? "••••••••" : "Not set"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Subscribed Events ({detailWebhook.events.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {detailWebhook.events.length > 0
                        ? detailWebhook.events.map(ev => (
                            <Badge key={ev} variant="outline" className="text-[10px] font-mono">{ev}</Badge>
                          ))
                        : <span className="text-xs text-muted-foreground">No events — webhook will never fire</span>
                      }
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="deliveries">
                <DeliveryHistory webhookId={detailWebhook.id} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Webhook list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}
            </div>
          ) : webhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Webhook className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-base font-medium">No webhooks yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Create a webhook to send real-time payloads to external services like Procore, Slack, or your own API.
              </p>
              <Button size="sm" className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1.5" /> Create your first webhook
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Name / URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((w) => (
                  <TableRow
                    key={w.id}
                    className="cursor-pointer"
                    onClick={() => setDetailId(w.id === detailId ? null : w.id)}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Switch
                        checked={w.is_active}
                        onCheckedChange={active => toggleWebhook.mutate({ id: w.id, is_active: active })}
                        className="scale-75"
                      />
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-[260px]">{w.url}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {w.events.length === 0
                          ? <span className="text-xs text-muted-foreground">none</span>
                          : w.events.slice(0, 3).map(ev => (
                              <Badge key={ev} variant="outline" className="text-[10px] font-mono">{ev}</Badge>
                            ))
                        }
                        {w.events.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">+{w.events.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lastTriggeredLabel(w.last_triggered_at)}
                    </TableCell>
                    <TableCell>
                      {w.is_active
                        ? <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />Active</span>
                        : <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" />Disabled</span>
                      }
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit"
                          onClick={() => openEdit(w)}
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete"
                          onClick={() => setDeleteId(w.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Docs callout */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 flex items-start gap-3">
          <Webhook className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-medium">Webhook security</p>
            <p className="text-muted-foreground text-xs">
              Set a signing secret to verify payloads. SiteSync sends an{" "}
              <code className="bg-muted px-1 rounded text-[11px]">X-SiteSync-Signature: sha256=…</code>{" "}
              header computed as <code className="bg-muted px-1 rounded text-[11px]">HMAC-SHA256(secret, body)</code>.
              Verify this on your server before processing the payload.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <WebhookForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the webhook and all its delivery history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteWebhook.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
